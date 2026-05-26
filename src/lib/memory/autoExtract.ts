/**
 * Auto-extraction worker — W2.
 *
 * After each assistant turn, this pipeline reads the recent conversation,
 * asks an LLM to identify durable user facts, and writes them to the
 * vault via retain(). The user never needs to ask Anuma to remember
 * something — durable facts are captured automatically.
 *
 * Two-stage pipeline (extract → retain). The retain step uses
 * write-time auto-merge (W4) so the same fact re-observed in a later
 * conversation increments proof_count instead of duplicating.
 *
 * Spec: see `tasks/hackathon/auto-extraction-prompt.md`.
 */

import { type EntityOperationsContext, linkMemoryEntitiesOp } from "../db/entities/operations.js";
import { retain, type RetainContext } from "./retain.js";
import type { RetainResult } from "./types.js";

const DEFAULT_MODEL = "openai/gpt-5-mini";
const DEFAULT_BASE_URL = "https://portal.anuma-dev.ai";
const DEFAULT_MIN_CONFIDENCE = 0.7;
const MAX_CONTENT_LENGTH = 200;

const FACT_TYPES = [
  "identity",
  "preference",
  "relationship",
  "plan",
  "ongoing_context",
  "constraint",
  "other",
] as const;

export type FactType = (typeof FACT_TYPES)[number];

const SYSTEM_PROMPT = `You extract durable user facts from conversations for a personal memory system.

A "durable fact" is something the user shared about themselves that should still be true in future conversations. Examples that ARE durable:
- "Partner's name is Sara"
- "Allergic to shellfish"
- "Working on a Rust side project"
- "Prefers async communication over meetings"
- "Has a golden retriever named Biscuit"
- "Switched from coffee to matcha in September 2025"
- "Lives in San Francisco, moved from Portland in November 2025"

NOT durable — do NOT extract:
- Search queries or questions ("what time does the gym open?")
- Hypothetical scenarios ("if I were to move to Tokyo...")
- Transient state ("I'm hungry", "running late")
- Things the user is asking the assistant to do ("draft an email")
- Facts that are about the assistant or the world, not about the user
- Information already framed as past-tense gossip about other people

For each durable fact, output:
- content: a short, self-contained statement, third-person, present-tense ("Lives in San Francisco" not "I live in San Francisco")
- type: one of identity | preference | relationship | plan | ongoing_context | constraint | other
- confidence: 0.0-1.0; how sure you are this is durable AND true. Only include facts >= 0.7.
- sourceMessageIds: which message IDs from the conversation contained the evidence
- entities: named entities mentioned (people, places, things). Optional. Skip generic nouns.
- eventTime: when the event in this fact occurs/occurred. Resolve relative phrases against the conversation date you can infer from context. Output one of:
    - { "kind": "point", "start": "YYYY-MM-DD" }     for a single date ("met Sara on March 14, 2026")
    - { "kind": "range", "start": "YYYY-MM-DD", "end": "YYYY-MM-DD" }  for a span ("Japan trip May 4–15, 2026")
    - { "kind": "ongoing", "start": "YYYY-MM-DD" }   for a status that started on a date and continues ("works at Linear since January 2024")
    - null   for facts with no temporal anchor ("favorite color is blue", "speaks Spanish")
  Always use absolute YYYY-MM-DD; never write "yesterday" / "last week" / "next month".

If a fact UPDATES a prior state ("I moved to SF in November"), still emit it - the resolver decides what to do.

If no durable facts were shared, return {"candidates": []}. Empty results are fine - most turns won't have any.

Output strict JSON matching the schema. No prose.`;

export interface AutoExtractMessage {
  /** Stable message identifier — used for source_chunk_ids provenance. */
  id: string;
  role: "user" | "assistant";
  content: string;
}

export interface ExtractedCandidate {
  content: string;
  type: FactType;
  confidence: number;
  sourceMessageIds: string[];
  entities: string[];
  /** W6 temporal lane — when the event in this fact occurred. Resolved
   *  to absolute timestamps by the LLM; null when the fact has no
   *  temporal anchor. */
  eventTime: {
    kind: "point" | "range" | "ongoing";
    /** Unix ms timestamp of the event start (or point). */
    start: number;
    /** Unix ms timestamp of the event end. Only set when kind='range'. */
    end: number | null;
  } | null;
}

export interface ExtractFactsOptions {
  apiKey: string;
  baseUrl?: string;
  model?: string;
  /** Override the global fetch implementation (useful for tests). */
  fetchFn?: typeof fetch;
}

/**
 * Stage 1 — call the LLM to extract candidate facts from the recent
 * conversation. Returns post-validated candidates only (confidence
 * threshold, source-id check, length cap, schema validation). Returns
 * an empty array if the LLM emits malformed JSON or no candidates.
 */
export async function extractFacts(
  messages: AutoExtractMessage[],
  options: ExtractFactsOptions
): Promise<ExtractedCandidate[]> {
  if (messages.length === 0) return [];

  const transcript = messages.map((m) => `[${m.id}] ${m.role}: ${m.content}`).join("\n");
  const baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
  const model = options.model ?? DEFAULT_MODEL;
  const fetchImpl = options.fetchFn ?? fetch;

  let response: Response;
  try {
    response = await fetchImpl(`${baseUrl}/api/v1/chat/completions`, {
      method: "POST",
      headers: {
        "x-api-key": options.apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: `Recent conversation:\n${transcript}\n\nExtract durable user facts.`,
          },
        ],
        response_format: { type: "json_object" },
      }),
    });
  } catch {
    // Network error: don't block the chat path. Caller treats this as
    // "no facts extracted this turn".
    return [];
  }
  if (!response.ok) return [];

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return [];
  }

  const content = extractContent(body);
  if (!content) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    return [];
  }

  return validateCandidates(parsed, new Set(messages.map((m) => m.id)));
}

/**
 * Stage 2 — for each extracted candidate, call retain() with auto-merge
 * enabled. The resolver path (decide create/merge/update via a second LLM
 * call against the existing vault) is deferred — the auto-merge inside
 * retain() handles dedup at the cosine-similarity level for hackathon.
 *
 * Returns the candidates that survived validation along with the retain
 * result for each (which captures whether the fact was created, merged,
 * or skipped).
 */
export async function extractAndRetain(
  messages: AutoExtractMessage[],
  retainCtx: RetainContext,
  options: {
    extract: ExtractFactsOptions;
    minConfidence?: number;
    /** Override scope/folder for all retained facts. */
    scope?: string;
    folderId?: string | null;
    /**
     * When provided, persist each candidate's `entities[]` to the
     * entity + memory_entity tables after a successful retain. This
     * powers the W5 graph retrieval lane — recall() can query for
     * memories sharing entities with the user's question.
     */
    entityCtx?: EntityOperationsContext;
  }
): Promise<{ candidates: ExtractedCandidate[]; results: RetainResult[] }> {
  const minConfidence = options.minConfidence ?? DEFAULT_MIN_CONFIDENCE;

  const candidates = await extractFacts(messages, options.extract);
  const filtered = candidates.filter((c) => c.confidence >= minConfidence);

  const results: RetainResult[] = [];
  for (const candidate of filtered) {
    try {
      const result = await retain(candidate.content, retainCtx, {
        source: "auto-extracted",
        sourceChunkIds: candidate.sourceMessageIds,
        ...(options.scope !== undefined && { scope: options.scope }),
        ...(options.folderId !== undefined && { folderId: options.folderId }),
        ...(candidate.eventTime !== null && { eventTime: candidate.eventTime }),
      });
      results.push(result);

      // W5 — link entities to the freshly persisted memory. Best-effort:
      // a failure here doesn't roll back the retain.
      if (options.entityCtx && candidate.entities.length > 0) {
        try {
          await linkMemoryEntitiesOp(options.entityCtx, result.memoryId, candidate.entities);
        } catch {
          // Entity linking is auxiliary — don't kill the rest of the batch.
        }
      }
    } catch {
      // One bad write shouldn't kill the rest of the batch.
    }
  }

  return { candidates: filtered, results };
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

function extractContent(body: unknown): string | null {
  if (typeof body !== "object" || body === null) return null;
  const choices = (body as { choices?: unknown }).choices;
  if (!Array.isArray(choices) || choices.length === 0) return null;
  const first = choices[0] as { message?: { content?: unknown } };
  const content = first?.message?.content;
  return typeof content === "string" ? content : null;
}

function validateCandidates(parsed: unknown, validIds: Set<string>): ExtractedCandidate[] {
  if (typeof parsed !== "object" || parsed === null) return [];
  const candidates = (parsed as { candidates?: unknown }).candidates;
  if (!Array.isArray(candidates)) return [];

  const out: ExtractedCandidate[] = [];
  for (const raw of candidates) {
    if (typeof raw !== "object" || raw === null) continue;
    const obj = raw as Record<string, unknown>;

    if (typeof obj.content !== "string") continue;
    const content = obj.content.trim();
    if (content.length === 0 || content.length > MAX_CONTENT_LENGTH) continue;

    if (typeof obj.confidence !== "number" || !Number.isFinite(obj.confidence)) continue;
    const confidence = Math.max(0, Math.min(1, obj.confidence));

    const type =
      typeof obj.type === "string" && (FACT_TYPES as readonly string[]).includes(obj.type)
        ? (obj.type as FactType)
        : "other";

    const sourceMessageIds = Array.isArray(obj.sourceMessageIds)
      ? obj.sourceMessageIds.filter((s): s is string => typeof s === "string" && validIds.has(s))
      : [];
    if (sourceMessageIds.length === 0) continue;

    const entities = Array.isArray(obj.entities)
      ? obj.entities.filter((s): s is string => typeof s === "string")
      : [];

    const eventTime = parseEventTime(obj.eventTime);

    out.push({ content, type, confidence, sourceMessageIds, entities, eventTime });
  }
  return out;
}

/**
 * Parse the LLM's `eventTime` shape into Unix-ms timestamps. Accepts
 * { kind, start, end? } where start/end are YYYY-MM-DD strings (most
 * compliant LLMs), or epoch numbers (defensive fallback). Returns null
 * for malformed shapes — temporal lane just no-ops on those memories.
 */
function parseEventTime(raw: unknown): ExtractedCandidate["eventTime"] {
  if (raw === null || raw === undefined) return null;
  if (typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const kindRaw = obj.kind;
  if (kindRaw !== "point" && kindRaw !== "range" && kindRaw !== "ongoing") return null;
  const start = parseEventDate(obj.start);
  if (start === null) return null;
  const end = kindRaw === "range" ? parseEventDate(obj.end) : null;
  if (kindRaw === "range" && end === null) return null;
  return { kind: kindRaw, start, end };
}

function parseEventDate(raw: unknown): number | null {
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (trimmed.length === 0) return null;
  // YYYY-MM-DD or full ISO. Date.parse handles both; reject on NaN.
  const ms = Date.parse(trimmed);
  return Number.isFinite(ms) ? ms : null;
}
