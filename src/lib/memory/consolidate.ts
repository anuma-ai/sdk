/**
 * Memory consolidation — Hindsight-pattern semantic dedup at retain time.
 *
 * The naive cosine-merge in `retain()` only catches near-string duplicates.
 * It misses paraphrased re-extractions of the same fact across sessions, e.g.
 *
 *   Session A: "User exchanged boots at Zara on 2026-02-05 and is awaiting
 *               the replacement pair."
 *   Session B: "User has a pair of boots at Zara that they swapped earlier
 *               and still need to pick up."
 *
 * These have cosine ~0.7–0.8 — high enough to be obviously the same fact, low
 * enough to slip past the auto-merge floor (0.8, `DEFAULT_AUTO_MERGE_THRESHOLD`
 * in retain.ts). The result is an over-grown vault that confuses the LLM at
 * answer time.
 *
 * Consolidation closes the gap: for each new fact, pull the top-K most
 * similar existing memories (looser threshold), pass to an LLM with explicit
 * rules ported from Hindsight's `consolidation/prompts.py:7-25`, and emit
 *
 *   action="create"  — new distinct fact, write fresh
 *   action="update"  — same facet as `targetId`; replace its content (and
 *                      let `retain()` increment proof_count + union sources)
 *   action="noop"    — the new fact is already adequately captured by an
 *                      existing memory; skip the write
 *
 * Rules carried verbatim from Hindsight:
 * - "ONE OBSERVATION PER DISTINCT FACET"
 * - "MATCH BY ENTITY/FACET, NOT TOPIC"
 * - "NO COMPUTATION" (don't try to sum, decrement, derive from existing facts)
 *
 * Falls back to "create" on any LLM/parse error so a flaky consolidator can't
 * silently swallow a write.
 */

import { type PiiRedactor, resolvePiiRedactor } from "../pii/redactor.js";
import { notifyConsolidationFallback } from "./consolidationFallback.js";
import { callPortalJsonCompletion, type PortalLlmAuth } from "./portalLlm.js";
import type { ConsolidationFallbackReason } from "./types.js";

// Open-weights consolidator. Consolidation reasons over the SAME
// chat-derived facts as extraction, so it stays on an open provider too —
// routing it to a closed third party would reopen the privacy gap the
// (global, open-weights) extractor default closes. NOT gpt-oss-120b (the
// extraction default): gpt-oss returns empty completion content ~30% of the time on
// this single-decision prompt (measured 3/10), which silently degrades every
// affected merge to a create fallback and defeats facet-dedup. ling-2.6-flash
// is reliable here (0/10 empty) and discriminates create/update/noop correctly
// on the benchmark cases. Unlike gpt-oss, ling ACCEPTS `response_format:
// json_object` (verified), so portalLlm.ts sends it — the reliability numbers
// above were measured with response_format on, matching production.
/** Exported so the consolidation eval gates the model production actually runs,
 * rather than a copy of this string that can drift out of sync. */
export const DEFAULT_CONSOLIDATION_MODEL = "inclusionai/ling-2.6-flash";

// Retry budget for TRANSIENT consolidation failures. A transient blip
// (network/timeout/5xx/429/empty completion) that degrades straight to create
// is NOT low-cost: the paraphrased re-extractions consolidation exists to
// catch sit at cosine ~0.7–0.8, below the 0.8 auto-merge floor, so a spurious
// create leaves a permanent near-duplicate that does NOT collapse at read time
// or self-heal via proof_count (different wording → different embedding). 3
// attempts = up to two cheap transient-only retries; the happy path still
// resolves in one attempt and the schema-violation path stays terminal (no
// retry).
const DEFAULT_CONSOLIDATE_ATTEMPTS = 3;
// Bound worst-case retain latency on a hanging portal — consolidation is a
// background quality stage, so cap it well under the extractor's 60s budget.
const DEFAULT_CONSOLIDATE_TOTAL_TIMEOUT_MS = 20_000;

const SYSTEM_PROMPT = `You consolidate a new memory against existing memories from the same user.

A "memory" is a self-contained natural-language fact about the user. Multiple memories about the same EXACT FACET (the same dimension of the same subject) should never coexist — they should be merged into one. Different facets on the same subject (e.g. user's dog's name vs user's dog's age) are SEPARATE memories.

Decide one of four actions:

- "create": the new memory describes a distinct fact not covered by any existing memory. Write it as new.
- "update": the new memory describes the SAME FACET of the SAME SUBJECT as exactly one existing memory, is COMPATIBLE with it, and ADDS INFORMATION — it adds detail or fills in an incomplete value. Return targetId of that existing memory + the consolidated content (richest version of the two). A pure rewording that adds nothing is NOT an update; it is "noop".
- "supersede": the new memory REPLACES a standing fact whose value has CHANGED and is now INCOMPATIBLE with an existing memory ABOUT THE SAME SUBJECT — the old fact was true before but is false now (a state change). Before choosing this, name the subject of the new memory and the subject of each candidate out loud to yourself; if they are different people, the old fact is still TRUE and superseding it would delete a correct memory — choose "create" instead. Return "targetIds": an array of the ids of EVERY existing candidate that describes the SAME standing attribute now being changed — retire ALL stale duplicates of the old value, not just one (the candidate list may contain several paraphrases of the same old fact) + content = the NEW fact. The old memories are kept as history, not overwritten or deleted; do not re-state them.
- "noop": the new memory is already fully captured by an existing memory — same facet of the same subject, no new information. This INCLUDES a restatement in different words ("has two kids" / "has two children"): if the existing memory already tells you everything the new one does, the answer is noop no matter how differently it is worded. Skip the write.

RULES (carry these strictly):

1. ONE OBSERVATION PER DISTINCT FACET. If the new memory is about "user's aunt's twins" and an existing memory is also about "user's aunt's twins", they are the same facet → update, never create.
1a. SAME SUBJECT REQUIRED — check this FIRST, before you look at the facet. The subject is WHO the fact is about: the user, or a specific person or thing in their life (a relative, their manager, their dog Biscuit). "update", "supersede" and "noop" all require the new memory and the existing one to be about the SAME subject. Two memories can share a facet and still have different subjects, and then they are simply two different facts: "User's daughter is allergic to peanuts" and "User is allergic to peanuts" are both about a peanut allergy, but one is about the DAUGHTER and one is about the USER → create, keep both. This holds for EVERY attribute, not just the one in this example — where someone lives, who they work for, what they own, how old they are. A possessive like "user's X" makes X the subject, not the user; strip it and ask "whose fact is this?" before comparing anything. Never retire the user's own value because a fact about somebody else resembles it — the user's fact is still true, and retiring it destroys it.
2. MATCH BY FACET, NOT TOPIC. Two memories both mentioning "Zara" is not enough to merge — only merge if they describe the same property (e.g. both about "user's pending Zara boot exchange"). Two memories about Zara on different topics (e.g. "user shops at Zara" + "user returned a sweater to Zara last week") are separate facets.
3. NO COMPUTATION. Do not sum counts, decrement quantities, or derive new facts from existing ones. If the new memory says "user spent $200 today" and an existing memory says "user spent $150 yesterday", these are TWO SEPARATE EVENTS — create.
4. EVENTS vs STANDING STATE.
   - Distinct EVENTS (episodic — something that happened on a date) are separate memories, even if the same activity: "user went to gym Monday" vs "user went to gym Friday" → create; keep both.
   - A STANDING ATTRIBUTE (an ongoing state: where someone lives/works, relationship status, current role) has ONE current value PER SUBJECT. When the new memory changes that value FOR THE SAME SUBJECT ("Lives in Portland" → "Lives in San Francisco"; "Works at Google" → "Works at Riverbend"; "Engaged" → "Broke up"), the old value is no longer true → supersede (retire the old, record the new). Do NOT create (that leaves a stale contradiction) and do NOT update (that erases the history that the old value was once true). A different subject holding the same attribute is not a value change at all → create.
5. When in doubt between create and update, choose create — EXCEPT when the new memory directly contradicts the current value of a standing attribute in an existing memory ABOUT THE SAME SUBJECT; then choose supersede. Two facts about different subjects never contradict each other, however similarly they read. Over-merging loses information; a live contradiction is worse than either.
6. When in doubt between update and noop, ask whether the existing memory ALONE already answers everything the new one would. If it does, choose noop — a write that changes only the wording costs a re-embed and makes an old fact look newly observed.

OUTPUT — strict JSON, no prose:
{
  "action": "create" | "update" | "supersede" | "noop",
  "targetId": "<existing memory id — required for update/noop, omit for create/supersede>",
  "targetIds": ["<id>", ...],
  "content": "<content — required for create/update/supersede, omit for noop>"
}

For "create": content is the new memory verbatim (or a slight refinement); omit targetId/targetIds.
For "update": content is the merged richest-version, ≤80 words; targetId is the single memory to update.
For "supersede": content is the NEW fact only (≤80 words); "targetIds" lists EVERY stale memory being retired (all candidates describing the same now-changed attribute).
For "noop": no content (existing memory is already correct); targetId is that memory.`;

interface ConsolidationCandidate {
  id: string;
  content: string;
  /** Cosine similarity to the new fact — informational, the LLM does its own judgment. */
  similarity: number;
}

interface ConsolidationResult {
  action: "create" | "update" | "noop" | "supersede";
  /** Defined for update/noop/supersede. For supersede it is the FIRST stale
   * memory being retired (kept for back-compat; see `targetIds` for the full
   * set). */
  targetId?: string;
  /** Defined for supersede: ALL stale memories to retire (every candidate that
   * describes the same standing attribute now being changed), so a value change
   * collapses every duplicate of the old value, not just one. */
  targetIds?: string[];
  /** Defined for create/update/supersede. For supersede it is the NEW fact to
   * persist (the old one is retired, not overwritten). */
  content?: string;
  /**
   * Set when this "create" is a degraded fallback rather than a real
   * decision (LLM failure or schema-violating response). Distinguishes
   * "the model chose create" from "we couldn't get a usable answer" —
   * the latter accumulates duplicates if it happens persistently.
   *
   * Note: retain()'s consolidation path drops the result on "create"
   * (fallback or real), so this field only reaches direct
   * consolidateMemory() callers and tests — `onFallback` is the live
   * observability channel.
   */
  fallbackReason?: ConsolidationFallbackReason;
}

/** Auth is the dual pattern — one of `apiKey` / `getToken` is required at
 * runtime; see {@link PortalLlmAuth}. */
interface ConsolidateOptions extends PortalLlmAuth {
  baseUrl?: string;
  model?: string;
  /** Notified on each degraded fallback. See `RetainOptions.consolidateOptions.onFallback`. */
  onFallback?: (reason: ConsolidationFallbackReason) => void;
  /**
   * Max portal attempts on TRANSIENT failure (network/timeout/5xx/429/empty
   * completion). Defaults to {@link DEFAULT_CONSOLIDATE_ATTEMPTS}. Terminal
   * failures (400/401/403/404, auth, malformed-JSON schema violation) never
   * retry — they degrade to create immediately regardless of this value.
   */
  maxAttempts?: number;
  /**
   * Absolute wall-clock budget across all retries, in ms. Keeps a hanging
   * portal from holding retain open ~maxAttempts× the per-attempt timeout.
   * Defaults to {@link DEFAULT_CONSOLIDATE_TOTAL_TIMEOUT_MS}.
   */
  totalTimeoutMs?: number;
  /**
   * Backoff before each retry, in ms, given the just-failed 1-based attempt.
   * Defaults to the portal helper's exponential+jitter schedule. Tests pass
   * `() => 0` for instant retries (same escape hatch portalLlm.ts exposes).
   */
  backoffMs?: (attempt: number) => number;
  /** Override fetch (for tests). */
  fetchFn?: typeof fetch;
  /**
   * When set, the new fact and the existing candidate contents are PII-redacted
   * before they reach the consolidation model, and the consolidated content it
   * returns is de-anonymized before persistence — so consolidation never leaks
   * the real values it dedups over. Pass `true` or a shared {@link PiiRedactor}.
   */
  piiRedaction?: boolean | PiiRedactor;
}

/**
 * Decide create/update/noop for a new memory against existing similar
 * candidates. On any failure (network, timeout, malformed JSON, schema
 * violation) returns `{ action: "create", content: newContent }` so a
 * flaky consolidator degrades to native dedup at the cosine-merge level.
 */
export async function consolidateMemory(
  newContent: string,
  candidates: ConsolidationCandidate[],
  options: ConsolidateOptions
): Promise<ConsolidationResult> {
  const fallback: ConsolidationResult = {
    action: "create",
    content: newContent,
  };
  const trimmed = newContent.trim();
  if (trimmed.length === 0) return fallback;
  if (candidates.length === 0) return fallback;

  // PII redaction: redact the new fact and the candidate contents before they
  // reach the consolidation model, then de-anonymize the consolidated content
  // it returns (below) so the vault still stores real values. A single
  // redactor keeps placeholders consistent across the new fact and candidates,
  // so the model can still match the same value across them.
  //
  // ASYNC, deliberately: `redactText` is regex-only, so a caller who configured
  // an `nerDetector` gets names, locations and orgs masked only by
  // `redactTextAsync` — and a person or employer is precisely the kind of value
  // two near-duplicate memories are being deduped over here. Without a detector
  // `redactTextAsync` returns `redactText` directly, so the default path is
  // unchanged. NER placeholders come from the same `getPlaceholder` map as the
  // regex ones, so the restore below handles them identically.
  //
  // SEQUENTIAL, and the new fact first, so numbering follows prompt order. The
  // redactor is stateful — racing these would tie `[EMAIL_1]` vs `[EMAIL_2]` to
  // promise resolution order and the model could stop seeing the shared value
  // that makes two memories the same fact.
  const redactor = resolvePiiRedactor(options.piiRedaction);
  const safeTrimmed = redactor ? (await redactor.redactTextAsync(trimmed)).text : trimmed;

  const rows: string[] = [];
  for (const [i, c] of candidates.entries()) {
    const safeContent = redactor ? (await redactor.redactTextAsync(c.content)).text : c.content;
    rows.push(`[${i + 1}] (id: ${c.id}, sim: ${c.similarity.toFixed(2)})\n  ${safeContent}`);
  }
  const candidateText = rows.join("\n");
  const userMessage = `New memory:\n  ${safeTrimmed}\n\nExisting memories (top ${candidates.length} by cosine):\n${candidateText}`;

  let parsed: unknown;
  try {
    parsed = await callPortalJsonCompletion({
      ...(options.apiKey !== undefined && { apiKey: options.apiKey }),
      ...(options.getToken !== undefined && { getToken: options.getToken }),
      ...(options.baseUrl !== undefined && { baseUrl: options.baseUrl }),
      model: options.model ?? DEFAULT_CONSOLIDATION_MODEL,
      systemPrompt: SYSTEM_PROMPT,
      userMessage,
      tag: "memory/consolidate",
      // Retry TRANSIENT failures only (network/timeout/5xx/429/empty) before
      // degrading to create — a transient blip would otherwise leave a
      // permanent below-floor paraphrase that never self-heals (see
      // DEFAULT_CONSOLIDATE_ATTEMPTS). The happy path still resolves in one
      // attempt; terminal failures (400/auth) and schema violations never
      // retry. A total budget keeps a hanging portal from stalling retain.
      maxAttempts: options.maxAttempts ?? DEFAULT_CONSOLIDATE_ATTEMPTS,
      totalTimeoutMs: options.totalTimeoutMs ?? DEFAULT_CONSOLIDATE_TOTAL_TIMEOUT_MS,
      ...(options.backoffMs && { backoffMs: options.backoffMs }),
      ...(options.fetchFn && { fetchFn: options.fetchFn }),
    });
  } catch (err) {
    // Auth-resolution errors (no apiKey/getToken on a truthy options
    // object) throw from callPortalJsonCompletion. Consolidation is an
    // optional quality stage — it must never crash the retain it
    // decorates, and the documented contract is fallback-to-create on
    // ANY failure. Degrade and surface via onFallback + logger.
    return degrade("llm_error", fallback, options, err);
  }
  if (parsed === null) return degrade("llm_error", fallback, options);

  const validIds = new Set(candidates.map((c) => c.id));
  // Fall back to the real `trimmed` (not the redacted form) so a create
  // fallback persists the original; the model-authored content below is
  // de-anonymized explicitly.
  const result = validate(parsed, trimmed, validIds);
  if (!result) return degrade("invalid_response", fallback, options);
  if (redactor && result.content !== undefined) {
    // The consolidation model sometimes echoes "[EMAIL_1]" back mangled (bare
    // "EMAIL_1", re-cased "email_1"); restoreForStorage recovers the real value
    // and reports whether a placeholder-shaped token was left UNRESOLVED.
    const restored = redactor.restoreForStorage(result.content);
    // An unresolved token is one the model invented (never assigned). On the
    // "update" path this content overwrites an existing memory, so don't persist
    // a bogus "[EMAIL_2]" over a good fact — degrade to a create, which retain
    // resolves by keeping the original (real) content.
    if (restored.unresolved) {
      return degrade("invalid_response", fallback, options);
    }
    return { ...result, content: restored.text };
  }
  return result;
}

function degrade(
  reason: ConsolidationFallbackReason,
  fallback: ConsolidationResult,
  options: ConsolidateOptions,
  detail?: unknown
): ConsolidationResult {
  notifyConsolidationFallback(reason, options.onFallback, detail);
  return { ...fallback, fallbackReason: reason };
}

function validate(
  parsed: unknown,
  newContent: string,
  validIds: Set<string>
): ConsolidationResult | null {
  if (typeof parsed !== "object" || parsed === null) return null;
  const obj = parsed as Record<string, unknown>;

  const action = obj.action;
  if (action !== "create" && action !== "update" && action !== "noop" && action !== "supersede") {
    return null;
  }

  if (action === "create") {
    const c = typeof obj.content === "string" ? obj.content.trim() : "";
    return { action: "create", content: c.length > 0 ? c : newContent };
  }

  if (action === "noop") {
    // noop retires nothing — a single valid targetId is enough.
    const targetId = typeof obj.targetId === "string" ? obj.targetId : null;
    if (!targetId || !validIds.has(targetId)) return null;
    return { action: "noop", targetId };
  }

  // update — content is the consolidated form; supersede — content is the NEW
  // fact (targetIds are the stale ones to retire). Both require non-empty content.
  const c = typeof obj.content === "string" ? obj.content.trim() : "";
  if (c.length === 0) return null;

  if (action === "supersede") {
    // Multi-supersede: retire EVERY candidate describing the same now-changed
    // attribute. UNION the multi-id `targetIds[]` with a single `targetId` so
    // neither shape is lost — a model may emit `targetIds: []` alongside a valid
    // `targetId`, or the old single-`targetId` shape with no array at all. Keep
    // only valid, unique ids.
    const rawIds: unknown[] = [
      ...(Array.isArray(obj.targetIds) ? (obj.targetIds as unknown[]) : []),
      ...(typeof obj.targetId === "string" ? [obj.targetId] : []),
    ];
    const targetIds = [
      ...new Set(rawIds.filter((id): id is string => typeof id === "string" && validIds.has(id))),
    ];
    if (targetIds.length === 0) return null;
    return { action: "supersede", targetId: targetIds[0], targetIds, content: c };
  }

  // update — single targetId
  const targetId = typeof obj.targetId === "string" ? obj.targetId : null;
  if (!targetId || !validIds.has(targetId)) return null;
  return { action: "update", targetId, content: c };
}
