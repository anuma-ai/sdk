import { getLogger } from "../logger.js";
import { type PiiRedactor, resolvePiiRedactor } from "../pii/redactor.js";
import { type DecayInput, type DecayVerdict, lastActivityAt } from "./decay.js";
import type { DecayClassifier } from "./decayWorker.js";
import { callPortalJsonCompletion, type PortalLlmAuth } from "./portalLlm.js";

const DEFAULT_MODEL = "inclusionai/ling-2.6-flash";
const DEFAULT_ATTEMPTS = 2;
const DEFAULT_TOTAL_TIMEOUT_MS = 12_000;
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
  const redactor: PiiRedactor | undefined = resolvePiiRedactor(options.piiRedaction ?? true);

  return {
    async classify(
      input: DecayInput,
      ruleVerdict: DecayVerdict,
      now: number
    ): Promise<DecayVerdict> {
      if (ruleVerdict === "delete") return ruleVerdict;
      if (!input.id) return ruleVerdict;
      if (!options.apiKey && !options.getToken) return ruleVerdict;

      let content: string | null;
      try {
        content = await options.getContent(input.id);
      } catch {
        return ruleVerdict;
      }
      if (!content || content.trim().length === 0) return ruleVerdict;

      const trimmed = content.trim().slice(0, MAX_CONTENT_CHARS);
      const safe = redactor ? (await redactor.redactTextAsync(trimmed)).text : trimmed;
      const meta = `factType: ${input.factType ?? "none"}; ageDays: ${ageDays(lastActivityAt(input), now)}`;

      let parsed: unknown;
      try {
        parsed = await callPortalJsonCompletion({
          ...(options.apiKey !== undefined && { apiKey: options.apiKey }),
          ...(options.getToken !== undefined && { getToken: options.getToken }),
          ...(options.baseUrl !== undefined && { baseUrl: options.baseUrl }),
          taskType: "memory_decay",
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
      return verdict ?? ruleVerdict;
    },
  };
}

function ageDays(activityAt: number, now: number): number {
  if (!Number.isFinite(activityAt) || !Number.isFinite(now)) return 0;
  return Math.max(0, Math.floor((now - activityAt) / (24 * 60 * 60 * 1000)));
}

function parseVerdict(parsed: unknown): DecayVerdict | null {
  if (typeof parsed !== "object" || parsed === null) return null;
  const v = (parsed as { verdict?: unknown }).verdict;
  if (v === "keep" || v === "archive") return v;
  return null;
}
