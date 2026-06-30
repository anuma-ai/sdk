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
import { getLogger } from "../logger.js";
import { type PiiRedactor, resolvePiiRedactor } from "../pii/redactor.js";
import { callPortalJsonCompletion, type PortalLlmAuth } from "./portalLlm.js";
import { retain, type RetainContext } from "./retain.js";
import type { RetainOptions, RetainResult } from "./types.js";

// GLOBAL default for ALL background extraction (not gated on privacy mode):
// every conversation's auto-extract runs on this open-weights model
// (Apache-2.0, hosted on Cerebras via the portal). The motivating win is
// privacy-mode chats — where the user deliberately picked an open model and
// shouldn't have their content quietly shipped to a closed provider for
// background work — but the switch is intentionally repo-wide rather than
// conditional. Note "open-weights provider" ≠ on-device: content still goes
// to a third-party inference host (Cerebras), it's just not a closed model.
//
// Yield vs gpt-5-mini: on the LongMemEval extraction bench gpt-oss pulled ~19%
// fewer facts (55 vs 68) at ~7× lower latency, but the downstream A/B shows
// that doesn't cost recall — a paired LongMemEval run (vault, variant s, n=50,
// same answer model) scored 92% (gpt-oss) vs 94% (gpt-5-mini): 45/50 identical,
// 3 discordant (gpt-oss −2 +1), McNemar non-significant. gpt-oss extracts the
// facts that matter, just fewer of them.
//
// NOTE: gpt-oss rejects `response_format: json_object` (see portalLlm.ts) and
// is a reasoning model, so callers must NOT impose a small `max_tokens` cap —
// reasoning tokens count against it and would starve the JSON output.
const DEFAULT_MODEL = "gpt-oss/gpt-oss-120b";
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
- "Prefers matcha over coffee"
- "Lives in San Francisco (since November 2025)"

NOT durable — do NOT extract:
- Search queries or questions ("what time does the gym open?")
- Hypothetical scenarios ("if I were to move to Tokyo...")
- Transient state ("I'm hungry", "running late")
- Things the user is asking the assistant to do ("draft an email")
- Facts that are about the assistant or the world, not about the user
- Information already framed as past-tense gossip about other people
- Vague or non-committal intentions ("I should work out more at some point", "I really need to read more", "maybe I'll learn guitar"). Only extract a plan when it's concrete and committed ("signed up for the Chicago marathon in October").

For each durable fact, output:
- content: a short, self-contained statement, third-person, present-tense ("Lives in San Francisco" not "I live in San Francisco")
- type: one of identity | preference | relationship | plan | ongoing_context | constraint | other
- confidence: 0.0-1.0; how sure you are this is durable AND true. Only include facts >= 0.7.
- sourceMessageIds: which message IDs from the conversation contained the evidence
- entities: named entities mentioned (people, places, things). Optional. Skip generic nouns.
- eventTime: when the event in this fact occurs/occurred. Resolve relative phrases ("yesterday", "next week") against the current date given in the user message. Output one of:
    - { "kind": "point", "start": "YYYY-MM-DD" }     for a single date ("met Sara on March 14, 2026")
    - { "kind": "range", "start": "YYYY-MM-DD", "end": "YYYY-MM-DD" }  for a span ("Japan trip May 4–15, 2026")
    - { "kind": "ongoing", "start": "YYYY-MM-DD" }   for a status that started on a date and continues ("works at Linear since January 2024")
    - null   for facts with no temporal anchor ("favorite color is blue", "speaks Spanish")
  Always use absolute YYYY-MM-DD; never write "yesterday" / "last week" / "next month".

When the user describes a CHANGE, extract only the NEW current state — not the prior state they're replacing. "I left Google, I'm at Riverbend now" → emit "Works at Riverbend" only, NOT "Previously worked at Google". "Moved from Portland to SF" → emit "Lives in San Francisco" only. The resolver supersedes the old memory; don't re-record it as a standalone fact.

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

/**
 * Auth + endpoint for the extraction LLM call. Auth is the dual pattern —
 * one of `apiKey` / `getToken` is required at runtime; see
 * {@link PortalLlmAuth}.
 */
export interface ExtractFactsOptions extends PortalLlmAuth {
  baseUrl?: string;
  model?: string;
  /** Override the global fetch implementation (useful for tests). */
  fetchFn?: typeof fetch;
  /**
   * Reference "now" (Unix ms) for resolving relative temporal phrases in the
   * transcript ("yesterday", "next week", "in two days") into the absolute
   * YYYY-MM-DD anchors the W6 temporal lane indexes on. The transcript itself
   * carries no timestamps, so without an anchor the model resolves relatives
   * against its own training-cutoff guess and emits wrong `eventTime` dates.
   * Defaults to `Date.now()`. Override for back-dated eval corpora and
   * deterministic tests (mirrors {@link RecallOptions.now}).
   */
  now?: number;
  /**
   * Max attempts for the extraction call on a transient failure (default 3).
   * Lower it to bound how long extraction can hold a turn open — e.g. a worker
   * that runs extraction behind an in-flight-turn guard can pass `2` to keep
   * repeated failures from delaying later turns.
   */
  maxAttempts?: number;
  /** Per-attempt timeout (ms) for the extraction call. Defaults to the portal
   * helper's 60s. Combine with {@link maxAttempts} to cap the total time budget. */
  timeoutMs?: number;
  /**
   * Absolute wall-clock budget (ms) across ALL extraction attempts incl. backoff.
   * When set, the loop stops before an attempt that would exceed it, so worst-case
   * latency is bounded rather than `maxAttempts × timeoutMs`.
   */
  totalTimeoutMs?: number;
  /**
   * Override the retry backoff (ms) for a given 1-based attempt index. The
   * extraction call retries transient failures internally (default exponential
   * backoff); pass `() => 0` to retry without delay (useful for tests).
   */
  backoffMs?: (attempt: number) => number;
  /**
   * When set, PII (emails, phones, SSNs, cards, IPs, API keys, …) in the
   * conversation transcript is replaced with tagged placeholders before the
   * extraction call, and the returned facts + entities are de-anonymized so the
   * vault keeps the real values while raw PII never reaches the extraction
   * model (and, via `extractAndRetain`, the consolidation model). Pass `true`
   * for a fresh per-call redactor, or a shared {@link PiiRedactor} to keep
   * placeholder numbering consistent with other calls.
   *
   * NOTE: this does NOT cover the embeddings provider. Facts are stored and
   * embedded with their real values, so to keep PII out of embedding requests
   * set `RetainContext.embeddingOptions.maskInput` (e.g. `redactor.maskText`)
   * as well — the two are independent switches.
   */
  piiRedaction?: boolean | PiiRedactor;
  /**
   * Called when the extraction LLM returned no usable result after exhausting
   * its retries (empty/malformed completion, network/HTTP error) — i.e. a
   * *failure* that drops the turn's facts, as opposed to a legitimate
   * `{candidates: []}` "nothing durable here". Lets callers distinguish a
   * silently-degrading extractor from quiet turns (the two are otherwise
   * indistinguishable). See {@link extractAndRetain}'s `outcome`.
   */
  onExhaustedEmpty?: () => void;
  /**
   * Called when the extractor DID produce candidates but PII de-anonymization
   * dropped every one of them — the model mangled its placeholders (so they
   * can't be restored to real values) or restoring the values blew the length
   * cap. These drops happen before `retain()`, so `failedCount` can't see them,
   * and the turn would otherwise masquerade as a quiet `no-facts` result. Lets
   * H3's `outcome` surface `dropped-after-redaction` so a rising PII-drop rate
   * (i.e. redaction silently eating facts) is alarmable.
   */
  onCandidatesDropped?: () => void;
}

/**
 * Stage 1 — call the LLM to extract candidate facts from the recent
 * conversation. Returns post-validated candidates only (confidence
 * threshold, source-id check, length cap, schema validation). Returns
 * an empty array if the LLM emits malformed JSON or no candidates.
 *
 * A null from `callPortalJsonCompletion` means a *failure* (empty completion,
 * malformed JSON, network/HTTP error) — distinct from a successful
 * `{candidates: []}`, which parses to a non-null object. A failed extraction
 * silently drops the whole turn's memories, so transient failures matter:
 * `callPortalJsonCompletion` retries them internally with backoff (default 3
 * attempts), so a one-off empty/malformed completion from a reasoning-class
 * model doesn't lose the turn. Only an exhausted-retry null reaches here.
 */
export async function extractFacts(
  messages: AutoExtractMessage[],
  options: ExtractFactsOptions
): Promise<ExtractedCandidate[]> {
  if (messages.length === 0) return [];

  // PII redaction: scrub the transcript before it reaches the extraction model,
  // then de-anonymize the returned facts so the vault keeps real values. Only
  // the message *content* is redacted — the `[id]` provenance markers stay
  // intact so `sourceMessageIds` still validates against the original ids.
  const redactor = resolvePiiRedactor(options.piiRedaction);
  const transcript = messages
    .map(
      (m) => `[${m.id}] ${m.role}: ${redactor ? redactor.redactText(m.content).text : m.content}`
    )
    .join("\n");
  // Anchor relative temporal phrases. The transcript has no timestamps, so
  // without this the model dates "yesterday"/"next week" against its own
  // training-cutoff guess (see ExtractFactsOptions.now). Local-midnight basis
  // matches parseLocalCalendarDay so round-tripped anchors stay consistent.
  const today = formatLocalDate(options.now ?? Date.now());
  const parsed = await callPortalJsonCompletion({
    ...(options.apiKey !== undefined && { apiKey: options.apiKey }),
    ...(options.getToken !== undefined && { getToken: options.getToken }),
    ...(options.baseUrl !== undefined && { baseUrl: options.baseUrl }),
    model: options.model ?? DEFAULT_MODEL,
    systemPrompt: SYSTEM_PROMPT,
    userMessage: `Today's date is ${today}. Resolve any relative dates ("yesterday", "next week") against it.\n\nRecent conversation:\n${transcript}\n\nExtract durable user facts.`,
    tag: "memory/extract",
    ...(options.fetchFn && { fetchFn: options.fetchFn }),
    ...(options.maxAttempts !== undefined && { maxAttempts: options.maxAttempts }),
    ...(options.timeoutMs !== undefined && { timeoutMs: options.timeoutMs }),
    ...(options.totalTimeoutMs !== undefined && { totalTimeoutMs: options.totalTimeoutMs }),
    ...(options.backoffMs && { backoffMs: options.backoffMs }),
  });
  // A successful "no facts" response parses to {candidates: []} (non-null),
  // so a null strictly signals failure after retries, never a legit empty.
  if (parsed === null) {
    options.onExhaustedEmpty?.();
    return [];
  }

  // H4: when a candidate's source ids are missing/mangled, fall back to the
  // last user message in the window rather than dropping the fact (provenance
  // is secondary to not losing the memory).
  const fallbackSourceId = [...messages].reverse().find((m) => m.role === "user")?.id;
  const candidates = validateCandidates(
    parsed,
    new Set(messages.map((m) => m.id)),
    fallbackSourceId
  );
  if (!redactor) return candidates;
  const restored = restoreCandidates(candidates, redactor);
  // H3: the extractor found facts but de-anonymization dropped every one
  // (mangled placeholders / over-cap after restore). That degradation is
  // invisible to `failedCount` (it happens before retain) and would otherwise
  // look like a quiet no-facts turn — surface it.
  if (candidates.length > 0 && restored.length === 0) {
    options.onCandidatesDropped?.();
  }
  return restored;
}

/**
 * Restore real PII values in extracted facts (content + entities) — the LLM saw
 * placeholders, so its output references them. Then guard the output:
 * - strip any entity that is still a placeholder the model hallucinated
 *   (no mapping existed, so deAnonymize left it literal);
 * - drop the whole fact when its content still carries a residual placeholder
 *   (an unreliable fact built on an unresolved value), or when restoring real
 *   values pushed it past MAX_CONTENT_LENGTH (validateCandidates capped the
 *   shorter placeholder form). Both keep opaque tokens / over-cap text out of
 *   the vault.
 */
function restoreCandidates(
  candidates: ExtractedCandidate[],
  redactor: PiiRedactor
): ExtractedCandidate[] {
  return candidates
    .map((c) => {
      const content = redactor.restoreForStorage(c.content);
      return {
        candidate: {
          ...c,
          content: content.text,
          entities: c.entities
            .map((e) => redactor.restoreForStorage(e))
            .filter((e) => !e.unresolved)
            .map((e) => e.text),
        },
        // Drop the whole fact when its content still carries an unresolved
        // (hallucinated / mangled-beyond-recognition) placeholder.
        unresolved: content.unresolved,
      };
    })
    .filter((c) => c.candidate.content.length <= MAX_CONTENT_LENGTH && !c.unresolved)
    .map((c) => c.candidate);
}

/**
 * Outcome of the EXTRACTOR stage for a turn — independent of whether the
 * subsequent `retain()` writes landed (that's `failedCount`):
 * - `extracted`         — the extractor produced at least one candidate above
 *                         the confidence floor. Whether those writes succeeded
 *                         is reported separately by `failedCount` — so
 *                         `extracted` + `failedCount > 0` means "found facts but
 *                         writes are failing", which is more signal than
 *                         collapsing it into `no-facts` would give.
 * - `no-facts`          — the extractor ran fine but found nothing durable.
 * - `empty-after-retry` — the extractor returned empty/malformed after
 *                         exhausting retries (a *failure*). Distinguishing this
 *                         from `no-facts` is what makes a silently-degrading
 *                         extractor alarmable rather than invisible.
 * - `dropped-after-redaction` — the extractor found facts but PII
 *                         de-anonymization dropped every one (mangled
 *                         placeholders / over-cap after restore), before retain.
 *                         A degradation `failedCount` can't see; would otherwise
 *                         look like `no-facts`.
 */
export type ExtractOutcome =
  | "extracted"
  | "no-facts"
  | "empty-after-retry"
  | "dropped-after-redaction";

/**
 * Stage 2 — for each extracted candidate, call retain() with auto-merge
 * enabled. The resolver path (decide create/merge/update via a second LLM
 * call against the existing vault) is deferred — the auto-merge inside
 * retain() handles dedup at the cosine-similarity level for hackathon.
 *
 * Returns the candidates that survived validation along with the retain
 * result for each (which captures whether the fact was created, merged,
 * or skipped), plus an `outcome` summarizing why the turn did/didn't produce
 * facts (see {@link ExtractOutcome}).
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
     * Forwarded verbatim to each retain() call — enables the LLM-based
     * consolidation pass (Hindsight facet-dedup) on every write. See
     * `RetainOptions.consolidateOptions` for auth + observability fields.
     */
    consolidateOptions?: RetainOptions["consolidateOptions"];
    /**
     * When provided, persist each candidate's `entities[]` to the
     * entity + memory_entity tables after a successful retain. This
     * powers the W5 graph retrieval lane — recall() can query for
     * memories sharing entities with the user's question.
     */
    entityCtx?: EntityOperationsContext;
    /**
     * Per-candidate failure hook — invoked once per filtered candidate
     * whose `retain()` call threw. Lets UI layers surface "couldn't save
     * X" toasts; without it consumers only see the aggregate
     * `failedCount` and can't name which facts dropped.
     */
    onCandidateFailed?: (candidate: ExtractedCandidate, error: unknown) => void;
  }
): Promise<{
  candidates: ExtractedCandidate[];
  results: RetainResult[];
  failedCount: number;
  outcome: ExtractOutcome;
}> {
  const minConfidence = options.minConfidence ?? DEFAULT_MIN_CONFIDENCE;

  // Consolidation reasons over the same chat-derived facts as extraction and
  // hits an LLM, so it must redact too — otherwise enabling `extract.piiRedaction`
  // alone would still leak the (de-anonymized) facts to the consolidator. Inherit
  // the extraction setting unless the caller set one explicitly on consolidateOptions.
  const resolvedConsolidatePii =
    options.consolidateOptions?.piiRedaction ?? options.extract.piiRedaction;
  const consolidateOptions: RetainOptions["consolidateOptions"] =
    options.consolidateOptions !== undefined
      ? {
          ...options.consolidateOptions,
          ...(resolvedConsolidatePii !== undefined && { piiRedaction: resolvedConsolidatePii }),
        }
      : undefined;

  // Detect degraded-empty results so the caller can tell a degrading extractor
  // from a genuinely quiet turn: `exhaustedEmpty` = the LLM call failed after
  // retries; `droppedAfterRedaction` = facts were found but PII restore dropped
  // them all. Chain any caller-supplied hooks.
  let exhaustedEmpty = false;
  let droppedAfterRedaction = false;
  const callerOnExhaustedEmpty = options.extract.onExhaustedEmpty;
  const callerOnCandidatesDropped = options.extract.onCandidatesDropped;
  const candidates = await extractFacts(messages, {
    ...options.extract,
    onExhaustedEmpty: () => {
      exhaustedEmpty = true;
      callerOnExhaustedEmpty?.();
    },
    onCandidatesDropped: () => {
      droppedAfterRedaction = true;
      callerOnCandidatesDropped?.();
    },
  });
  const filtered = candidates.filter((c) => c.confidence >= minConfidence);

  const log = getLogger();
  // Both arrays grow only on success so consumers can safely pair
  // candidates[i] with results[i] after a mid-batch retain failure.
  const succeededCandidates: ExtractedCandidate[] = [];
  const results: RetainResult[] = [];
  let failedWrites = 0;
  for (const candidate of filtered) {
    try {
      const result = await retain(candidate.content, retainCtx, {
        source: "auto-extracted",
        sourceChunkIds: candidate.sourceMessageIds,
        ...(options.scope !== undefined && { scope: options.scope }),
        ...(options.folderId !== undefined && { folderId: options.folderId }),
        ...(consolidateOptions !== undefined && { consolidateOptions }),
        ...(candidate.eventTime !== null && { eventTime: candidate.eventTime }),
      });
      succeededCandidates.push(candidate);
      results.push(result);

      // W5 — link entities to the freshly persisted memory. Best-effort:
      // a failure here doesn't roll back the retain.
      if (options.entityCtx && candidate.entities.length > 0) {
        try {
          await linkMemoryEntitiesOp(options.entityCtx, result.memoryId, candidate.entities);
        } catch (err) {
          // Entity linking is auxiliary — don't kill the rest of the batch.
          log.warn("[memory/extract] linkMemoryEntitiesOp failed", err);
        }
      }
    } catch (err) {
      // Log per-candidate so a consistently broken write path is visible
      // — the worker's outer onError can't see what we've caught here.
      failedWrites++;
      log.warn("[memory/extract] retain failed for one candidate", err);
      options.onCandidateFailed?.(candidate, err);
    }
  }
  if (failedWrites > 0) {
    log.warn(`[memory/extract] ${failedWrites} of ${filtered.length} candidates failed to retain`);
  }

  const outcome: ExtractOutcome = exhaustedEmpty
    ? "empty-after-retry"
    : filtered.length > 0
      ? "extracted"
      : droppedAfterRedaction
        ? "dropped-after-redaction"
        : "no-facts";

  return { candidates: succeededCandidates, results, failedCount: failedWrites, outcome };
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

function validateCandidates(
  parsed: unknown,
  validIds: Set<string>,
  fallbackSourceId?: string
): ExtractedCandidate[] {
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

    const validSourceIds = Array.isArray(obj.sourceMessageIds)
      ? obj.sourceMessageIds.filter((s): s is string => typeof s === "string" && validIds.has(s))
      : [];
    // H4: don't drop a fact whose provenance is missing/mangled (the model
    // attributed it to an id outside the window, or omitted it). Attribute to
    // the last user message in the window as a best-effort, or leave empty —
    // keeping the memory matters more than perfect provenance.
    const sourceMessageIds =
      validSourceIds.length > 0
        ? validSourceIds
        : fallbackSourceId !== undefined
          ? [fallbackSourceId]
          : [];

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
  // `end` is required for "range", optional for "ongoing" (an LLM-emitted
  // close-out date for a previously-ongoing fact), ignored for "point".
  const end = kindRaw === "point" ? null : parseEventDate(obj.end);
  if (kindRaw === "range" && end === null) return null;
  return { kind: kindRaw, start, end };
}

/**
 * LLM-emitted event date → Unix ms.
 *
 * Date-only "YYYY-MM-DD" strings resolve to local midnight (matching the
 * query-window basis in queryTemporal). ISO strings with an explicit
 * time/offset pass through `Date.parse` as the absolute instant — we
 * deliberately don't snap them to local midnight, because that would
 * shift the calendar day backward for west-of-UTC users on instants
 * near UTC midnight, and would silently break parity with any rows
 * already stored from this code path. Consumers who care about
 * calendar-day matching should ask the LLM for date-only output via
 * the system prompt.
 */
function parseEventDate(raw: unknown): number | null {
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (trimmed.length === 0) return null;
  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (dateOnlyMatch) {
    return parseLocalCalendarDay(
      parseInt(dateOnlyMatch[1], 10),
      parseInt(dateOnlyMatch[2], 10),
      parseInt(dateOnlyMatch[3], 10)
    );
  }
  const ms = Date.parse(trimmed);
  return Number.isFinite(ms) ? ms : null;
}

/**
 * Format a Unix-ms instant as a local YYYY-MM-DD string. Local basis matches
 * {@link parseLocalCalendarDay} so a date emitted here and parsed back lands on
 * the same calendar day for the user's timezone.
 */
function formatLocalDate(ms: number): string {
  const d = new Date(ms);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Build local-midnight ms for a calendar (year, month, day), rejecting
 * out-of-range components rather than silently rolling over. JS's Date
 * constructor accepts `new Date(2026, 1, 30)` and rolls to Mar 2; we
 * round-trip the components and bail on mismatch so a bad LLM emission
 * doesn't land as a wrong temporal anchor.
 */
function parseLocalCalendarDay(year: number, month: number, day: number): number | null {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null;
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > 31) return null;
  const d = new Date(year, month - 1, day);
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) return null;
  const ms = d.getTime();
  return Number.isFinite(ms) ? ms : null;
}
