/**
 * Standalone topic (entity) extraction for EXISTING memories.
 *
 * The conversation pipeline (autoExtract.ts) assigns entities only to facts it
 * extracts from a live transcript — manually created, imported, and edited
 * memories never get LLM topics and used to fall back to a client-side regex.
 * This module is the LLM half of "continuously LLM-managed topics": a batched
 * pass that takes memories already in the vault, asks the extraction model for
 * their named entities, REPLACES their auto-managed links (guarded — a manual
 * edit or delete always wins), and stamps `topics_extracted_at` so the sweep
 * query (`getMemoriesNeedingTopicExtractionOp`) only revisits edited memories.
 *
 * Batching: memories are classified ~10 per LLM call (mirroring the folder
 * Auto-Sort harness) with per-memory content truncation, so a whole-vault
 * backfill or a bulk import costs ceil(n/10) requests, not n.
 */

import { replaceMemoryEntitiesGuardedOp } from "../db/entities/operations.js";
import {
  stampTopicsExtractedAtOp,
  type VaultMemoryOperationsContext,
  vaultMemoryToStored,
} from "../db/memoryVault/operations.js";
import { getLogger } from "../logger.js";
import { type PiiRedactor, resolvePiiRedactor } from "../pii/redactor.js";
import {
  DEFAULT_EXTRACTION_MODEL,
  ENTITY_KIND_GUIDELINES,
  type ExtractedEntity,
  parseEntities,
} from "./autoExtract.js";
import { callPortalJsonCompletion, type PortalLlmAuth } from "./portalLlm.js";

/** Memories per LLM call. Mirrors the folder Auto-Sort batch size — the cost
 * lever that makes a whole-vault backfill viable. */
export const TOPIC_EXTRACTION_BATCH_SIZE = 10;
/** Per-memory content cap in the prompt. Vault facts are short statements;
 * 300 chars covers them while bounding prompt growth on imported blobs. */
const MAX_CHARS_PER_MEMORY = 300;
/** Cap on existing-vocabulary names included in the prompt. */
const MAX_VOCABULARY_NAMES = 100;

// NOTE: bump TOPICS_EXTRACTION_VERSION (db/memoryVault/operations.ts) whenever
// this prompt or DEFAULT_EXTRACTION_MODEL changes, so the sweep re-extracts the
// existing vault under the improved logic instead of keeping stale topics.
const SYSTEM_PROMPT = `You assign topics to saved memories for a personal memory system.

Each memory is a short statement about the user. For each memory, list the NAMED entities it mentions — these become the memory's topics, used to connect related memories in a knowledge graph.

Include only NAMED entities, skip generic/common nouns. ${ENTITY_KIND_GUIDELINES}

Output strict JSON: {"memories": [{"id": string, "entities": [{"name": string, "kind": string}]}]}
- exactly one element per input memory, echoing its id verbatim
- "entities" may be empty when a memory mentions no named entities — most short memories have 0-3
No prose.`;

/** One memory to extract topics for. `content` must be the DECRYPTED text. */
export interface TopicExtractionInput {
  id: string;
  content: string;
}

/**
 * Options for the topic-extraction LLM call. Auth follows the portal dual
 * pattern — one of `apiKey` / `getToken` is required (see {@link PortalLlmAuth}).
 */
export interface TopicExtractOptions extends PortalLlmAuth {
  baseUrl?: string;
  /** Defaults to {@link DEFAULT_EXTRACTION_MODEL} — the sanctioned extraction
   * model. Don't point this at a second model without an eval. */
  model?: string;
  /** Override the global fetch implementation (useful for tests). */
  fetchFn?: typeof fetch;
  maxAttempts?: number;
  timeoutMs?: number;
  totalTimeoutMs?: number;
  backoffMs?: (attempt: number) => number;
  /**
   * The user's existing entity vocabulary (canonical names). Included in the
   * prompt so independent batches reuse canonical names instead of fragmenting
   * ("ZetaChain" / "Zetachain" / "zeta chain" as three graph nodes). Truncated
   * to the first {@link MAX_VOCABULARY_NAMES} names — pass the most-linked
   * names first.
   */
  existingEntityNames?: readonly string[];
  /**
   * When set, PII in memory contents is replaced with tagged placeholders
   * before the LLM call and returned entity names are de-anonymized (entities
   * whose placeholders can't be restored are dropped) — mirrors
   * `ExtractFactsOptions.piiRedaction`. Vault contents hold REAL values, so
   * callers that redact the conversation pipeline must redact this pass too.
   */
  piiRedaction?: boolean | PiiRedactor;
}

/**
 * Ask the extraction LLM for the named entities of each memory, in batches of
 * {@link TOPIC_EXTRACTION_BATCH_SIZE}. Pure LLM step — no persistence.
 *
 * Returns memoryId → entities. A memory PRESENT with an empty array is a
 * successful, explicit "no named entities" answer; a memory ABSENT from the
 * map is UNANSWERED — its batch failed after retries, returned an unusable
 * shape, or the model omitted its id. Callers must retry absent ids in a
 * later sweep, never stamp them.
 */
export async function extractEntitiesForMemories(
  memories: readonly TopicExtractionInput[],
  options: TopicExtractOptions
): Promise<Map<string, ExtractedEntity[]>> {
  const out = new Map<string, ExtractedEntity[]>();
  if (memories.length === 0) return out;
  const redactor = resolvePiiRedactor(options.piiRedaction);

  // Vocabulary names are restored REAL values (that's the point of canonical
  // names), so under PII redaction they must go through the SAME redactor as
  // the contents — same redactor instance ⇒ same placeholder numbering, so a
  // redacted memory still anchors to its redacted vocabulary entry, and the
  // model's placeholder echoes restore alongside the content entities.
  const vocabulary = (options.existingEntityNames ?? [])
    .filter((n) => n.trim().length > 0)
    .slice(0, MAX_VOCABULARY_NAMES)
    .map((n) => (redactor ? redactor.redactText(n).text : n));
  const vocabularyNote =
    vocabulary.length > 0
      ? `The user's existing topics: ${vocabulary.join(", ")}.\nWhen a memory refers to one of these, reuse the EXACT existing name (same spelling and casing) instead of a variant.\n\n`
      : "";

  for (let i = 0; i < memories.length; i += TOPIC_EXTRACTION_BATCH_SIZE) {
    const batch = memories.slice(i, i + TOPIC_EXTRACTION_BATCH_SIZE);
    const listing = batch
      .map((m) => {
        const content = m.content.slice(0, MAX_CHARS_PER_MEMORY);
        return `[${m.id}] ${redactor ? redactor.redactText(content).text : content}`;
      })
      .join("\n");
    const parsed = await callPortalJsonCompletion({
      ...(options.apiKey !== undefined && { apiKey: options.apiKey }),
      ...(options.getToken !== undefined && { getToken: options.getToken }),
      ...(options.baseUrl !== undefined && { baseUrl: options.baseUrl }),
      model: options.model ?? DEFAULT_EXTRACTION_MODEL,
      systemPrompt: SYSTEM_PROMPT,
      userMessage: `${vocabularyNote}Memories:\n${listing}\n\nList each memory's named entities.`,
      tag: "memory/topics",
      ...(options.fetchFn && { fetchFn: options.fetchFn }),
      ...(options.maxAttempts !== undefined && { maxAttempts: options.maxAttempts }),
      ...(options.timeoutMs !== undefined && { timeoutMs: options.timeoutMs }),
      ...(options.totalTimeoutMs !== undefined && { totalTimeoutMs: options.totalTimeoutMs }),
      ...(options.backoffMs && { backoffMs: options.backoffMs }),
    });
    if (parsed === null) {
      // Failed batch — leave its memories absent so the caller retries them
      // in a later sweep instead of stamping them as extracted.
      getLogger().warn(
        `[memory/topics] batch of ${batch.length} failed after retries — will retry next sweep`
      );
      continue;
    }
    const validIds = new Set(batch.map((m) => m.id));
    const byId = parseTopicResponse(parsed, validIds);
    if (byId === null) {
      // Parseable JSON but not our shape at all ({"topics": ...}) — a batch
      // failure, NOT ten "no entities" answers. Stamping would make the whole
      // batch permanently topic-less; leave absent so the next sweep retries.
      getLogger().warn(
        `[memory/topics] batch of ${batch.length} returned an unrecognized shape — will retry next sweep`
      );
      continue;
    }
    for (const m of batch) {
      const entities = byId.get(m.id);
      if (entities === undefined) {
        // The model omitted this id. Treat as UNANSWERED (absent → retried
        // next sweep), never as "no entities" — defaulting an omission to []
        // would stamp the memory permanently topic-less. The prompt demands
        // one element per input; retries are bounded by the caller's caps.
        continue;
      }
      out.set(m.id, redactor ? restoreEntities(entities, redactor) : entities);
    }
  }
  return out;
}

/** Restore real PII values in entity names; drop entities whose placeholders
 * the model mangled beyond restoration (mirrors autoExtract's entity handling). */
function restoreEntities(entities: ExtractedEntity[], redactor: PiiRedactor): ExtractedEntity[] {
  return entities
    .map((e) => ({ kind: e.kind, restored: redactor.restoreForStorage(e.name) }))
    .filter((e) => !e.restored.unresolved)
    .map(
      (e): ExtractedEntity =>
        e.kind !== undefined ? { name: e.restored.text, kind: e.kind } : { name: e.restored.text }
    );
}

/**
 * Validate the LLM's `{"memories": [{id, entities}]}` response.
 *
 * Returns null on a total shape failure (no `memories` array) — the caller
 * treats that as a failed batch to retry, not as answers. Within a valid
 * list, elements with unknown/missing ids are dropped, a duplicated id keeps
 * its FIRST answer (a repeat is model noise, not a correction), and entities
 * go through the same validator as the conversation pipeline
 * ({@link parseEntities}). Ids absent from the returned map are UNANSWERED —
 * the caller must leave them for a later sweep, not stamp them.
 */
function parseTopicResponse(
  parsed: unknown,
  validIds: Set<string>
): Map<string, ExtractedEntity[]> | null {
  if (typeof parsed !== "object" || parsed === null) return null;
  const list = (parsed as { memories?: unknown }).memories;
  if (!Array.isArray(list)) return null;
  const out = new Map<string, ExtractedEntity[]>();
  for (const raw of list) {
    if (typeof raw !== "object" || raw === null) continue;
    const obj = raw as Record<string, unknown>;
    if (typeof obj.id !== "string" || !validIds.has(obj.id) || out.has(obj.id)) continue;
    const entities = Array.isArray(obj.entities) ? parseEntities(obj.entities) : [];
    out.set(obj.id, entities);
  }
  return out;
}

/** Outcome of one {@link extractAndLinkEntitiesForMemoriesOp} run. */
export interface TopicExtractionRunResult {
  /** memoryId → entities the LLM returned (post-validation, post-linking). */
  entitiesByMemory: Map<string, ExtractedEntity[]>;
  /** Memories stamped `topics_extracted_at` this run — includes zero-entity
   * results so quiet memories aren't re-asked every sweep. */
  stampedIds: string[];
  /** Memories NOT processed: missing/deleted/foreign rows, user-managed rows
   * (including ones that became user-managed mid-run), and members of failed
   * LLM batches. Skipped ids are not stamped, so failed batches are retried
   * by a later sweep — callers should apply their own attempt caps. */
  skippedIds: string[];
}

/**
 * Run LLM topic extraction over existing vault memories and persist the
 * results: REPLACE each memory's auto-managed entity links with the extracted
 * set (via {@link replaceMemoryEntitiesGuardedOp} — an edited memory drops the
 * entities its previous content mentioned) and stamp `topics_extracted_at`.
 *
 * User intent is enforced twice: rows already user-managed are skipped up
 * front, and the replace write re-checks the vault row INSIDE its writer
 * (user-managed / deleted / absent ⇒ null, and the memory is neither linked
 * nor stamped) so a manual topic edit or delete landing during the LLM
 * round-trip wins — a manual edit's own replace semantics also erase anything
 * this pass linked just before it. The watermark is captured BEFORE contents
 * are read: an edit landing mid-run keeps `updated_at` > stamp, so the next
 * sweep re-extracts it rather than trusting this run's stale read.
 *
 * Requires `ctx.entityCtx`. Contents are decrypted via the ctx's wallet
 * fields, exactly like the vault read ops; a memory whose decryption fails is
 * skipped (retried next sweep), not fatal to the run.
 */
export async function extractAndLinkEntitiesForMemoriesOp(
  ctx: VaultMemoryOperationsContext,
  memoryIds: readonly string[],
  options: TopicExtractOptions & {
    /** Watermark timestamp (Unix ms) recorded as `topics_extracted_at`.
     * Defaults to now; tests pass a fixed value. */
    now?: number;
  }
): Promise<TopicExtractionRunResult> {
  const entityCtx = ctx.entityCtx;
  if (!entityCtx) {
    throw new Error("extractAndLinkEntitiesForMemoriesOp requires ctx.entityCtx");
  }
  const log = getLogger();
  // Capture the watermark before reading contents — see the doc comment.
  const extractedAt = options.now ?? Date.now();

  const skippedIds: string[] = [];
  const inputs: TopicExtractionInput[] = [];
  for (const id of memoryIds) {
    let record;
    try {
      record = await ctx.vaultMemoryCollection.find(id);
    } catch {
      skippedIds.push(id);
      continue;
    }
    // Truthiness (not `=== true`) on the flag so an unsanitized SQLite `1`
    // can never fail open.
    if (
      record.isDeleted ||
      (ctx.userId !== undefined && record.userId !== ctx.userId) ||
      record.topicsUserManaged
    ) {
      skippedIds.push(id);
      continue;
    }
    try {
      const stored = await vaultMemoryToStored(
        record,
        ctx.walletAddress,
        ctx.signMessage,
        ctx.embeddedWalletSigner
      );
      inputs.push({ id, content: stored.content });
    } catch (err) {
      // A single undecryptable/corrupt row must not abort the whole sweep —
      // skip it (retried next sweep; callers cap attempts) and keep going.
      log.warn("[memory/topics] failed to load memory for extraction", err);
      skippedIds.push(id);
    }
  }

  const entitiesByMemory = await extractEntitiesForMemories(inputs, options);

  const toStamp: string[] = [];
  for (const input of inputs) {
    const entities = entitiesByMemory.get(input.id);
    if (entities === undefined) {
      // Unanswered (failed batch or omitted id) — retry next sweep.
      skippedIds.push(input.id);
      continue;
    }
    try {
      // Replace (not append) so re-extraction of an edited memory drops
      // stale entities. Runs for answered-empty results too — "likes tea"
      // must unlink whatever the previous content mentioned. Null = the
      // in-write guard skipped (user-managed/deleted/absent/read-fault):
      // nothing persisted, so don't stamp.
      const linked = await replaceMemoryEntitiesGuardedOp(entityCtx, input.id, entities);
      if (linked === null) {
        skippedIds.push(input.id);
        entitiesByMemory.delete(input.id);
        continue;
      }
    } catch (err) {
      // Don't stamp a memory whose links failed to persist — leave it for
      // the next sweep rather than recording a pass that didn't land.
      log.warn("[memory/topics] replaceMemoryEntitiesGuardedOp failed", err);
      skippedIds.push(input.id);
      entitiesByMemory.delete(input.id);
      continue;
    }
    toStamp.push(input.id);
  }

  // Stamp in one batch. The op re-checks user-managed inside its writer and
  // returns only the ids it actually stamped — anything it declined (flag
  // flipped mid-run) is reported as skipped.
  const stampedIds = await stampTopicsExtractedAtOp(ctx, toStamp, extractedAt);
  const stampedSet = new Set(stampedIds);
  for (const id of toStamp) {
    if (!stampedSet.has(id)) {
      skippedIds.push(id);
      entitiesByMemory.delete(id);
    }
  }

  return { entitiesByMemory, stampedIds, skippedIds };
}
