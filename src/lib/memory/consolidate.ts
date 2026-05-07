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
 * enough to slip past the 0.85 auto-merge floor. The result is an over-grown
 * vault that confuses the LLM at answer time.
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

const DEFAULT_MODEL = "openai/gpt-5-mini";
const DEFAULT_BASE_URL = "https://portal.anuma-dev.ai";
const REQUEST_TIMEOUT_MS = 20_000;

const SYSTEM_PROMPT = `You consolidate a new memory against existing memories from the same user.

A "memory" is a self-contained natural-language fact about the user. Multiple memories about the same EXACT FACET (the same dimension of the same subject) should never coexist — they should be merged into one. Different facets on the same subject (e.g. user's dog's name vs user's dog's age) are SEPARATE memories.

Decide one of three actions:

- "create": the new memory describes a distinct fact not covered by any existing memory. Write it as new.
- "update": the new memory describes the SAME FACET as exactly one existing memory. Either it adds detail, corrects a value, or rephrases the same fact. Return targetId of that existing memory + the consolidated content (richest version of the two).
- "noop": the new memory is already fully captured by an existing memory — same facet, no new information. Skip the write.

RULES (carry these strictly):

1. ONE OBSERVATION PER DISTINCT FACET. If the new memory is about "user's aunt's twins" and an existing memory is also about "user's aunt's twins", they are the same facet → update, never create.
2. MATCH BY FACET, NOT TOPIC. Two memories both mentioning "Zara" is not enough to merge — only merge if they describe the same property (e.g. both about "user's pending Zara boot exchange"). Two memories about Zara on different topics (e.g. "user shops at Zara" + "user returned a sweater to Zara last week") are separate facets.
3. NO COMPUTATION. Do not sum counts, decrement quantities, or derive new facts from existing ones. If the new memory says "user spent $200 today" and an existing memory says "user spent $150 yesterday", these are TWO SEPARATE EVENTS — create.
4. Events with different occurredAt dates are different memories even if the same activity ("user went to gym Monday" vs "user went to gym Friday" — separate events).
5. When in doubt between create and update, choose create. Over-merging loses information; under-merging is recoverable.

OUTPUT — strict JSON, no prose:
{
  "action": "create" | "update" | "noop",
  "targetId": "<existing memory id, required for update/noop, omit for create>",
  "content": "<consolidated content, required for create/update, omit for noop>"
}

For "create": content is the new memory verbatim (or a slight refinement).
For "update": content is the merged richest-version, ≤80 words.
For "noop": no content (existing memory is already correct).`;

interface ConsolidationCandidate {
  id: string;
  content: string;
  /** Cosine similarity to the new fact — informational, the LLM does its own judgment. */
  similarity: number;
}

interface ConsolidationResult {
  action: "create" | "update" | "noop";
  /** Defined for update/noop. */
  targetId?: string;
  /** Defined for create/update. The final content to persist. */
  content?: string;
}

interface ConsolidateOptions {
  apiKey: string;
  baseUrl?: string;
  model?: string;
  /** Override fetch (for tests). */
  fetchFn?: typeof fetch;
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

  const baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
  const model = options.model ?? DEFAULT_MODEL;
  const fetchImpl = options.fetchFn ?? fetch;

  const candidateText = candidates
    .map((c, i) => `[${i + 1}] (id: ${c.id}, sim: ${c.similarity.toFixed(2)})\n  ${c.content}`)
    .join("\n");
  const userMessage = `New memory:\n  ${trimmed}\n\nExisting memories (top ${candidates.length} by cosine):\n${candidateText}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetchImpl(`${baseUrl}/api/v1/chat/completions`, {
      method: "POST",
      headers: { "x-api-key": options.apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMessage },
        ],
        response_format: { type: "json_object" },
      }),
      signal: controller.signal,
    });
  } catch {
    clearTimeout(timer);
    return fallback;
  }
  clearTimeout(timer);

  if (!response.ok) return fallback;

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return fallback;
  }

  const content = extractContent(body);
  if (!content) return fallback;

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    return fallback;
  }

  const validIds = new Set(candidates.map((c) => c.id));
  return validate(parsed, trimmed, validIds) ?? fallback;
}

function extractContent(body: unknown): string | null {
  if (typeof body !== "object" || body === null) return null;
  const choices = (body as { choices?: unknown }).choices;
  if (!Array.isArray(choices) || choices.length === 0) return null;
  const first = choices[0] as { message?: { content?: unknown } };
  const c = first?.message?.content;
  return typeof c === "string" ? c : null;
}

function validate(
  parsed: unknown,
  newContent: string,
  validIds: Set<string>
): ConsolidationResult | null {
  if (typeof parsed !== "object" || parsed === null) return null;
  const obj = parsed as Record<string, unknown>;

  const action = obj.action;
  if (action !== "create" && action !== "update" && action !== "noop") return null;

  if (action === "create") {
    const c = typeof obj.content === "string" ? obj.content.trim() : "";
    return { action: "create", content: c.length > 0 ? c : newContent };
  }

  // update / noop both require a valid targetId
  const targetId = typeof obj.targetId === "string" ? obj.targetId : null;
  if (!targetId || !validIds.has(targetId)) return null;

  if (action === "noop") {
    return { action: "noop", targetId };
  }

  // update — content is the consolidated form
  const c = typeof obj.content === "string" ? obj.content.trim() : "";
  if (c.length === 0) return null;
  return { action: "update", targetId, content: c };
}
