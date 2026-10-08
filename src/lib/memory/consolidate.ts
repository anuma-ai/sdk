import { type PiiRedactor, resolvePiiRedactor } from "../pii/redactor.js";
import { notifyConsolidationFallback } from "./consolidationFallback.js";
import { callPortalJsonCompletion, type PortalLlmAuth } from "./portalLlm.js";
import type { ConsolidationFallbackReason } from "./types.js";

/** Exported so the consolidation eval gates the model production actually runs,
 * rather than a copy of this string that can drift out of sync. */
export const DEFAULT_CONSOLIDATION_MODEL = "inclusionai/ling-2.6-flash";

const DEFAULT_CONSOLIDATE_ATTEMPTS = 3;
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
  "content": "<content — required for create/update/supersede, omit for noop>",
  "newSubject": "<required for supersede: WHO the new memory is about>",
  "targetSubject": "<required for supersede: WHO the memory in targetId is about>",
  "targetSubjects": ["<required for supersede: WHO each memory you are retiring is about — one entry per retired id>"]
}

For "create": content is the new memory verbatim (or a slight refinement); omit targetId/targetIds.
For "update": content is the merged richest-version, ≤80 words; targetId is the single memory to update.
For "supersede": content is the NEW fact only (≤80 words); "targetIds" lists EVERY stale memory being retired (all candidates describing the same now-changed attribute). You MUST also name the subjects: "newSubject" for the new memory, and one entry in "targetSubjects" for EACH memory you are retiring (use "targetSubject" as well when you retire a single memory). List a subject ONLY for the memories you are actually retiring, not for every candidate you were shown. Write the plain subject, not a sentence: "the user", "the user's sister", "the user's manager", "Biscuit the dog". Rule 1a means a supersede is only valid when every one of those subjects is the SAME as "newSubject"; name them and check them against each other before you commit to the action. If ANY of them differs, the answer is "create" — do not retire the ones that match and keep the rest, because a group that mixes subjects was grouped wrongly in the first place. A subjectless fact ("Lives in Denver", "Works at Riverbend") is about "the user" — the extractor omits the subject when it is the user, so treat the absence of a subject as the user, never as unknown.
For "noop": no content (existing memory is already correct); targetId is that memory.`;

interface ConsolidationCandidate {
  id: string;
  content: string;
  similarity: number;
}

interface ConsolidationResult {
  action: "create" | "update" | "noop" | "supersede";
  targetId?: string;
  targetIds?: string[];
  content?: string;
  fallbackReason?: ConsolidationFallbackReason;
}

interface ConsolidateOptions extends PortalLlmAuth {
  baseUrl?: string;
  model?: string;
  onFallback?: (reason: ConsolidationFallbackReason) => void;
  maxAttempts?: number;
  totalTimeoutMs?: number;
  backoffMs?: (attempt: number) => number;
  fetchFn?: typeof fetch;
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
      taskType: "memory_consolidate",
      model: options.model ?? DEFAULT_CONSOLIDATION_MODEL,
      systemPrompt: SYSTEM_PROMPT,
      userMessage,
      tag: "memory/consolidate",
      maxAttempts: options.maxAttempts ?? DEFAULT_CONSOLIDATE_ATTEMPTS,
      totalTimeoutMs: options.totalTimeoutMs ?? DEFAULT_CONSOLIDATE_TOTAL_TIMEOUT_MS,
      ...(options.backoffMs && { backoffMs: options.backoffMs }),
      ...(options.fetchFn && { fetchFn: options.fetchFn }),
    });
  } catch (err) {
    return degrade("llm_error", fallback, options, err);
  }
  if (parsed === null) return degrade("llm_error", fallback, options);

  const validIds = new Set(candidates.map((c) => c.id));
  const result = validate(parsed, trimmed, validIds);
  if (!result) return degrade("invalid_response", fallback, options);
  if (redactor && result.content !== undefined) {
    const restored = redactor.restoreForStorage(result.content);
    if (restored.unresolved) {
      return degrade("invalid_response", fallback, options);
    }
    return reportRefusal({ ...result, content: restored.text }, options);
  }
  return reportRefusal(result, options);
}

function reportRefusal(
  result: ConsolidationResult,
  options: ConsolidateOptions
): ConsolidationResult {
  if (result.fallbackReason) {
    notifyConsolidationFallback(result.fallbackReason, options.onFallback);
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

function normalizeSubject(raw: unknown): string {
  if (typeof raw !== "string") return "";
  let s = raw
    .trim()
    .toLowerCase()
    .replace(/[.,;:!?]+$/u, "")
    .trim();
  s = s.replace(/^the\s+/u, "");
  s = s.replace(/^users'?\s+/u, "").replace(/^user's\s+/u, "");
  return s.trim();
}

const USER_SUBJECT_ALIASES = new Set(["user", "themselves", "themself", "they", "me", "self"]);

function subjectKey(raw: unknown): string {
  const s = normalizeSubject(raw);
  if (s.length === 0) return "";
  return USER_SUBJECT_ALIASES.has(s) ? "user" : s;
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
    const targetId = typeof obj.targetId === "string" ? obj.targetId : null;
    if (!targetId || !validIds.has(targetId)) return null;
    return { action: "noop", targetId };
  }

  const c = typeof obj.content === "string" ? obj.content.trim() : "";
  if (c.length === 0) return null;

  if (action === "supersede") {
    const rawIds: unknown[] = [
      ...(Array.isArray(obj.targetIds) ? (obj.targetIds as unknown[]) : []),
      ...(typeof obj.targetId === "string" ? [obj.targetId] : []),
    ];
    const targetIds = [
      ...new Set(rawIds.filter((id): id is string => typeof id === "string" && validIds.has(id))),
    ];
    if (targetIds.length === 0) return null;

    const newSubject = subjectKey(obj.newSubject);
    if (newSubject.length > 0) {
      const positional = Array.isArray(obj.targetSubjects) ? (obj.targetSubjects as unknown[]) : [];
      const statedSubjects = [
        ...positional.map((s) => subjectKey(s)),
        subjectKey(obj.targetSubject),
      ];
      if (statedSubjects.some((s) => s.length > 0 && s !== newSubject)) {
        return { action: "create", content: c, fallbackReason: "subject_mismatch" };
      }
    }

    return { action: "supersede", targetId: targetIds[0], targetIds, content: c };
  }

  const targetId = typeof obj.targetId === "string" ? obj.targetId : null;
  if (!targetId || !validIds.has(targetId)) return null;
  return { action: "update", targetId, content: c };
}
