/**
 * Optional content-reading decay classifier (PR5).
 *
 * The rule engine ({@link ./decay}.classifyDecay) decides keep/archive/delete
 * from plaintext columns ALONE — it never sees `content`, which is what keeps
 * the default decay sweep zero-knowledge. That is the right default, but it is
 * weakest on BORDERLINE rows: an `other`/untyped fact, or a `plan` with no
 * event end, whose staleness is a pure `updated_at` guess.
 *
 * This factory builds a {@link DecayClassifier} that reads the DECRYPTED content
 * of such a row and returns keep-vs-archive. The sweeper consults it ONLY for a
 * borderline row whose CURRENT rule verdict is `keep` — a rule archive/delete
 * short-circuits before the classifier ever runs (see `decayWorker.verdictFor` +
 * `isBorderline`). So its whole job is to REFINE a still-kept borderline row
 * toward EARLIER archive when the content shows it is genuinely ephemeral (a
 * finished one-off plan, an expired temporary state) — turning a weak age-only
 * "keep" into an "archive" sooner.
 *
 * DIRECTIONALITY IS DELIBERATE (a security property, not a shortcoming): it can
 * move a borderline keep → archive, never the reverse. It CANNOT rescue /
 * keep-alive a row the rule would archive — the escalation gate makes that path
 * unreachable, and archive is reversible while un-archiving poison would not be.
 * Enabling a classifier hands whoever answers the portal (incl. a malicious /
 * MITM'd endpoint) a lever, and that lever must only ever archive-reversibly.
 *
 * ZERO-KNOWLEDGE CONTRACT (the caller MUST honor this):
 *   - `getContent` is supplied by the caller and MUST be gated on wallet-key
 *     availability: return `null` when no key is loaded. With no content the
 *     classifier degrades to the rule verdict — never blocks, never guesses.
 *   - When it does read content and calls the portal, the content is
 *     PII-redacted first. Redaction is OPT-OUT, not opt-in: it defaults ON when
 *     the consumer omits `piiRedaction`, so a caller can never accidentally
 *     egress raw PII. Pass `piiRedaction: false` to deliberately disable it.
 *   - Egress is bounded by the SWEEPER, not this classifier: the sweep caps
 *     invocations per pass and never re-sends an unchanged (id, updated_at) row
 *     (see `decayWorker`), so a stable borderline "keep" row egresses once.
 *   - It only ever chooses keep vs archive, and only for a row the rule already
 *     keeps. It NEVER escalates to `delete` and NEVER un-archives — hard-delete
 *     is exclusively the deterministic archived-past-window mechanic (rule 1),
 *     and a row the rule wants archived is archived regardless of this layer.
 *
 * Fails to the rule verdict (keep) on any error, missing id, no key, or
 * malformed response — like every other optional LLM layer in this subsystem it
 * can only refine a borderline keep toward archive, never make the sweep worse.
 *
 * RESIDUAL SCOPE (accepted): a genuinely durable fact MISTYPED as `other`/null
 * and never re-mentioned within its medium TTL WILL age-archive — this layer can
 * only bring that archive EARLIER, never prevent it. Accepted because it is
 * recoverable: archived rows stay in the Archived section, Restore clears
 * `archived_at`, and any re-observation resets the TTL. The alternative — a
 * keep-alive lever — is exactly the capability a hostile portal must NOT have.
 *
 * SECURITY (MEDIUM, residual) — this is a NEW portal call surface carrying
 * (redacted) memory content. It is opt-in (you must construct + pass it) and
 * gated on key availability. Beyond widening which models see facts, a
 * malicious / MITM'd portal can steer the verdict — but only to ARCHIVE a row
 * (reversible; never a hard delete). Gate it on trust in the portal.
 */

import { getLogger } from "../logger.js";
import { type PiiRedactor, resolvePiiRedactor } from "../pii/redactor.js";
import type { DecayInput, DecayVerdict } from "./decay.js";
import type { DecayClassifier } from "./decayWorker.js";
import { callPortalJsonCompletion, type PortalLlmAuth } from "./portalLlm.js";

/** Open-weights, reliable-JSON model — same rationale as consolidate.ts. */
const DEFAULT_MODEL = "inclusionai/ling-2.6-flash";
/** Background quality stage — retry a transient blip once, don't hold long. */
const DEFAULT_ATTEMPTS = 2;
const DEFAULT_TOTAL_TIMEOUT_MS = 12_000;
/** Cap the content sent — a durable fact is short; anything longer is trimmed. */
const MAX_CONTENT_CHARS = 400;

const SYSTEM_PROMPT = `You maintain a personal memory system. A stored fact about a user is currently being KEPT, but it is a borderline case decided only by a weak age signal. Your job is to decide whether its content shows it has actually become STALE and should be archived early, or should keep being kept.

You are given one memory's content plus light metadata. Decide:
- "archive": the fact is clearly ephemeral or now past — a completed one-off plan, an expired temporary state, an event that has already happened and won't recur.
- "keep": the fact is still a durable, useful thing to know about the user (identity, a lasting preference, an ongoing situation, a constraint like an allergy), OR you are unsure.

Rules:
- Durable traits (allergies, dietary needs, long-standing preferences, relationships, where they live/work) are "keep", even if old — do NOT archive them early.
- A concrete plan or temporary state whose moment has passed is "archive".
- When genuinely uncertain, choose "keep" — archive early only for clearly-ephemeral facts.

Output strict JSON, no prose: { "verdict": "keep" | "archive" }`;

/**
 * Auth + wiring for {@link createLlmDecayClassifier}. Auth is the dual pattern —
 * one of `apiKey` / `getToken` is required at runtime (see {@link PortalLlmAuth}).
 * @public
 */
export interface LlmDecayClassifierOptions extends PortalLlmAuth {
  baseUrl?: string;
  model?: string;
  /** Override fetch (tests). */
  fetchFn?: typeof fetch;
  /** Max portal attempts on a TRANSIENT failure. Default 2. */
  maxAttempts?: number;
  /** Absolute wall-clock budget across attempts. Default 12s. */
  totalTimeoutMs?: number;
  /** Backoff before each retry (ms). Tests pass `() => 0`. */
  backoffMs?: (attempt: number) => number;
  /**
   * PII redaction for the outbound content. OPT-OUT: defaults to ON (a fresh
   * per-call redactor) when omitted, so decrypted content is never egressed
   * raw by accident. Pass a shared {@link PiiRedactor} to keep placeholder
   * numbering consistent with other calls, or `false` to deliberately disable
   * redaction. The verdict returned is a bare enum — nothing to de-anonymize.
   */
  piiRedaction?: boolean | PiiRedactor;
  /**
   * Resolve a memory's DECRYPTED content by id. The caller supplies this and
   * MUST gate it on wallet-key availability — return `null` when no key is
   * loaded so the classifier degrades to the rule verdict (zero-knowledge).
   * A throw is treated the same as `null` (fail to the rule verdict).
   */
  getContent: (id: string) => Promise<string | null>;
}

/**
 * Build a {@link DecayClassifier} that reads a borderline row's decrypted
 * content and returns a keep/archive verdict via a cheap portal LLM. Pass it as
 * `createDecaySweeper({ classifier })`. See the module docstring for the
 * zero-knowledge contract. Returns the rule verdict on any failure and never
 * escalates to `delete`.
 * @public
 */
export function createLlmDecayClassifier(options: LlmDecayClassifierOptions): DecayClassifier {
  // Redaction is OPT-OUT: default to a fresh redactor when `piiRedaction` is
  // omitted so decrypted content can never egress unredacted by accident. Only
  // an explicit `false` disables it (resolvePiiRedactor(false) → undefined).
  const redactor: PiiRedactor | undefined = resolvePiiRedactor(options.piiRedaction ?? true);

  return {
    async classify(
      input: DecayInput,
      ruleVerdict: DecayVerdict,
      now: number
    ): Promise<DecayVerdict> {
      // Never let a content read escalate to a hard delete — delete is the
      // deterministic archived-past-window mechanic only. If the rule already
      // says delete (it shouldn't for a borderline row, but be defensive),
      // don't second-guess it with content.
      if (ruleVerdict === "delete") return ruleVerdict;
      if (!input.id) return ruleVerdict;
      if (!options.apiKey && !options.getToken) return ruleVerdict;

      let content: string | null;
      try {
        content = await options.getContent(input.id);
      } catch {
        // No key / read failed → keep it zero-knowledge; use the rule verdict.
        return ruleVerdict;
      }
      if (!content || content.trim().length === 0) return ruleVerdict;

      const trimmed = content.trim().slice(0, MAX_CONTENT_CHARS);
      const safe = redactor ? redactor.redactText(trimmed).text : trimmed;
      const meta = `factType: ${input.factType ?? "none"}; ageDays: ${ageDays(input.updatedAt, now)}`;

      let parsed: unknown;
      try {
        parsed = await callPortalJsonCompletion({
          ...(options.apiKey !== undefined && { apiKey: options.apiKey }),
          ...(options.getToken !== undefined && { getToken: options.getToken }),
          ...(options.baseUrl !== undefined && { baseUrl: options.baseUrl }),
          model: options.model ?? DEFAULT_MODEL,
          systemPrompt: SYSTEM_PROMPT,
          userMessage: `Memory content:\n  ${safe}\n\nMetadata: ${meta}\n\nShould this be kept or archived?`,
          tag: "memory/decay-classifier",
          maxAttempts: options.maxAttempts ?? DEFAULT_ATTEMPTS,
          totalTimeoutMs: options.totalTimeoutMs ?? DEFAULT_TOTAL_TIMEOUT_MS,
          ...(options.backoffMs && { backoffMs: options.backoffMs }),
          ...(options.fetchFn && { fetchFn: options.fetchFn }),
        });
      } catch (err) {
        getLogger().warn(
          `[memory/decay-classifier] call failed; using rule verdict: ${
            err instanceof Error ? err.message : String(err)
          }`
        );
        return ruleVerdict;
      }

      const verdict = parseVerdict(parsed);
      // Malformed / missing → trust the rule engine.
      return verdict ?? ruleVerdict;
    },
  };
}

/** Whole days between `updatedAt` and the sweep's injected `now` (for the
 * prompt's age hint). Uses the injected clock — NOT wall-clock `Date.now()` — so
 * a fixed-`now` sweep is deterministic. */
function ageDays(updatedAt: number, now: number): number {
  if (!Number.isFinite(updatedAt) || !Number.isFinite(now)) return 0;
  return Math.max(0, Math.floor((now - updatedAt) / (24 * 60 * 60 * 1000)));
}

/** Parse `{ verdict: "keep" | "archive" }`. Returns null on anything else — the
 * classifier never emits `delete`, so an unexpected value falls back to rules. */
function parseVerdict(parsed: unknown): DecayVerdict | null {
  if (typeof parsed !== "object" || parsed === null) return null;
  const v = (parsed as { verdict?: unknown }).verdict;
  if (v === "keep" || v === "archive") return v;
  return null;
}
