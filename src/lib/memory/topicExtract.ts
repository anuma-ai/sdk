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
const MAX_CHARS_PER_MEMORY = 300;
const MAX_VOCABULARY_NAMES = 100;
const MAX_COMPLETION_TOKENS = 8192;

const SYSTEM_PROMPT = `You assign topics to saved memories for a personal memory system.

Each memory is a short statement about the user. For each memory, list the NAMED entities it mentions — these become the memory's topics, used to connect related memories in a knowledge graph.

Include only NAMED entities, skip generic/common nouns. A topic must identify a specific thing the user could recognize by name; if it would be equally true of thousands of unrelated memories, leave it out:
- SKIP bare generic nouns even when the memory capitalizes them or a calendar entry is titled that way — "Home", "Work", "Meeting", "Lunch", "Birthday", "Appointment", "Trip", "Today", "Friday", "March" are NOT topics.
- KEEP the specific thing instead, when the memory names one: "Blue Bottle on Valencia" over "cafe", "Chicago Marathon" over "event", "Hollowpoint Labs" over "work".
- Prefer 0 entities over a weak one. A memory whose only candidate is a generic noun has NO entities.
${ENTITY_KIND_GUIDELINES}

Each memory below is written as "<id>: <text>". Output strict JSON: {"memories": [{"id": string, "entities": [{"name": string, "kind": string}]}]}
- exactly one element per input memory; copy its id EXACTLY as written (the token before the first ": "), with no brackets, quotes, or extra characters
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
  /**
   * Optional per-call request path override, forwarded to
   * {@link callPortalJsonCompletion}. When set, topic extraction POSTs to
   * `baseUrl + endpointOverride` instead of the default
   * `/api/v1/chat/completions`. The body follows the transport, not the path: a
   * model that needs the Responses API is moved from a `.../chat/completions`
   * override to its sibling `.../responses` with a Responses-shaped body. Lets callers route
   * this internal-utility pass to a dedicated endpoint. Invalid values throw at
   * call time (see {@link validateEndpointOverride}).
   */
  endpointOverride?: string;
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

  const vocabulary: string[] = [];
  for (const name of (options.existingEntityNames ?? [])
    .filter((n) => n.trim().length > 0)
    .slice(0, MAX_VOCABULARY_NAMES)) {
    vocabulary.push(redactor ? (await redactor.redactTextAsync(name)).text : name);
  }
  const vocabularyNote =
    vocabulary.length > 0
      ? `The user's existing topics: ${vocabulary.join(", ")}.\nWhen a memory refers to one of these, reuse the EXACT existing name (same spelling, casing, spacing and punctuation) instead of a variant — if "Foo.ai" is listed, never emit "Foo ai" or "Foo AI", and if "Jane Roe" is listed, emit that rather than a bare "Jane".\n\n`
      : "";

  for (let i = 0; i < memories.length; i += TOPIC_EXTRACTION_BATCH_SIZE) {
    const batch = memories.slice(i, i + TOPIC_EXTRACTION_BATCH_SIZE);
    const rows: string[] = [];
    for (const m of batch) {
      const content = m.content.slice(0, MAX_CHARS_PER_MEMORY).replace(/\s+/g, " ").trim();
      rows.push(`${m.id}: ${redactor ? (await redactor.redactTextAsync(content)).text : content}`);
    }
    const listing = rows.join("\n");
    const parsed = await callPortalJsonCompletion({
      ...(options.apiKey !== undefined && { apiKey: options.apiKey }),
      ...(options.getToken !== undefined && { getToken: options.getToken }),
      ...(options.baseUrl !== undefined && { baseUrl: options.baseUrl }),
      taskType: "memory_topic",
      ...(options.endpointOverride !== undefined && {
        endpointOverride: options.endpointOverride,
      }),
      model: options.model ?? DEFAULT_EXTRACTION_MODEL,
      systemPrompt: SYSTEM_PROMPT,
      userMessage: `${vocabularyNote}Memories:\n${listing}\n\nList each memory's named entities.`,
      tag: "memory/topics",
      extra: { max_completion_tokens: MAX_COMPLETION_TOKENS },
      ...(options.fetchFn && { fetchFn: options.fetchFn }),
      ...(options.maxAttempts !== undefined && { maxAttempts: options.maxAttempts }),
      ...(options.timeoutMs !== undefined && { timeoutMs: options.timeoutMs }),
      ...(options.totalTimeoutMs !== undefined && { totalTimeoutMs: options.totalTimeoutMs }),
      ...(options.backoffMs && { backoffMs: options.backoffMs }),
    });
    if (parsed === null) {
      getLogger().warn(
        `[memory/topics] batch of ${batch.length} failed after retries — will retry next sweep`
      );
      continue;
    }
    const validIds = new Set(batch.map((m) => m.id));
    const byId = parseTopicResponse(parsed, validIds);
    if (byId === null) {
      getLogger().warn(
        `[memory/topics] batch of ${batch.length} returned an unrecognized shape — will retry next sweep`
      );
      continue;
    }
    for (const m of batch) {
      const entities = byId.get(m.id);
      if (entities === undefined) {
        continue;
      }
      out.set(m.id, redactor ? restoreEntities(entities, redactor) : entities);
    }
  }
  return out;
}

function restoreEntities(entities: ExtractedEntity[], redactor: PiiRedactor): ExtractedEntity[] {
  return entities
    .map((e) => ({ kind: e.kind, restored: redactor.restoreForStorage(e.name) }))
    .filter((e) => !e.restored.unresolved)
    .map(
      (e): ExtractedEntity =>
        e.kind !== undefined ? { name: e.restored.text, kind: e.kind } : { name: e.restored.text }
    );
}

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
    if (typeof obj.id !== "string") continue;
    const id = obj.id
      .trim()
      .replace(/:$/, "")
      .replace(/^\[([\s\S]*)\]$/, "$1")
      .trim();
    if (!validIds.has(id) || out.has(id)) continue;
    const entities = Array.isArray(obj.entities) ? parseEntities(obj.entities) : [];
    out.set(id, entities);
  }
  return out;
}

/**
 * Why one memory was skipped by a topic sweep.
 *
 * Split along the line that actually matters operationally — did the sweep
 * DECLINE this row on purpose, or did something BREAK:
 *
 * Deliberate (healthy; a sweep of nothing but these is a success):
 * - `excluded`        — deleted, owned by another user, or `topicsUserManaged`.
 * - `link-declined`   — the entity-link write's in-row guard declined (the row
 *                       became user-managed / deleted / absent mid-run).
 * - `stamp-declined`  — same, caught by the stamp op's own re-check.
 *
 * Degraded (something is wrong; see {@link isDegradedTopicSkip}):
 * - `llm-unanswered`  — the batch failed or the model omitted this id. THE one
 *                       to alarm on: it is how a wholly broken sweep looks.
 * - `unreadable`      — the row could not be loaded/decrypted.
 * - `not-found`       — the lookup threw (absent row or read fault).
 * - `link-failed`     — the entity-link write threw.
 *
 * @public
 */
export type TopicSkipReason =
  | "excluded"
  | "link-declined"
  | "stamp-declined"
  | "llm-unanswered"
  | "unreadable"
  | "not-found"
  | "link-failed";

const DEGRADED_TOPIC_SKIP: Record<TopicSkipReason, boolean> = {
  excluded: false,
  "link-declined": false,
  "stamp-declined": false,
  "llm-unanswered": true,
  unreadable: true,
  "not-found": true,
  "link-failed": true,
};

/**
 * Whether a skip reason means the sweep FAILED on that row, rather than
 * deliberately passing over it.
 *
 * Exported so callers classify identically instead of each re-deriving the
 * split — the reason this type exists is that one wrong grouping turns a broken
 * sweep back into a healthy-looking one.
 *
 * @public
 */
export function isDegradedTopicSkip(reason: TopicSkipReason): boolean {
  return DEGRADED_TOPIC_SKIP[reason] === true;
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
  /**
   * Why each id in {@link skippedIds} was skipped.
   *
   * `skippedIds` alone cannot distinguish a sweep that deliberately declined
   * work from one that FAILED: a run where every LLM batch errored and a run
   * over rows the user has taken manual control of produce an identical array.
   * That is the same blindness `outcome: 'empty-after-retry'` had before #888 —
   * a degradation wearing the shape of normal control flow.
   *
   * It matters here because topics feed the entity recall lane, so a silently
   * failing sweep means memories that exist but cannot be found by entity, with
   * nothing in production saying so.
   *
   * Populated in lockstep with `skippedIds` (single `skip()` helper), so the two
   * cannot drift. Group by {@link isDegradedTopicSkip} to separate "declined" from
   * "broke".
   */
  skippedReasons: Map<string, TopicSkipReason>;
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
 *
 * @deprecated App code: use `MemoryStore.maintenance.extractTopics` (`createLocalMemoryStore`).
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
  const extractedAt = options.now ?? Date.now();

  const skippedIds: string[] = [];
  const skippedReasons = new Map<string, TopicSkipReason>();
  const skip = (id: string, reason: TopicSkipReason): void => {
    if (skippedReasons.has(id)) return;
    skippedIds.push(id);
    skippedReasons.set(id, reason);
  };
  const inputs: TopicExtractionInput[] = [];
  for (const id of new Set(memoryIds)) {
    let record;
    try {
      record = await ctx.vaultMemoryCollection.find(id);
    } catch (err) {
      log.warn("[memory/topics] vault lookup failed for extraction", err);
      skip(id, "not-found");
      continue;
    }
    if (
      record.isDeleted ||
      (ctx.userId !== undefined && record.userId !== ctx.userId) ||
      record.topicsUserManaged
    ) {
      skip(id, "excluded");
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
      log.warn("[memory/topics] failed to load memory for extraction", err);
      skip(id, "unreadable");
    }
  }

  const entitiesByMemory = await extractEntitiesForMemories(inputs, options);

  const toStamp: string[] = [];
  for (const input of inputs) {
    const entities = entitiesByMemory.get(input.id);
    if (entities === undefined) {
      skip(input.id, "llm-unanswered");
      continue;
    }
    try {
      const linked = await replaceMemoryEntitiesGuardedOp(entityCtx, input.id, entities);
      if (linked === null) {
        skip(input.id, "link-declined");
        entitiesByMemory.delete(input.id);
        continue;
      }
    } catch (err) {
      log.warn("[memory/topics] replaceMemoryEntitiesGuardedOp failed", err);
      skip(input.id, "link-failed");
      entitiesByMemory.delete(input.id);
      continue;
    }
    toStamp.push(input.id);
  }

  const stampedIds = await stampTopicsExtractedAtOp(ctx, toStamp, extractedAt);
  const stampedSet = new Set(stampedIds);
  for (const id of toStamp) {
    if (!stampedSet.has(id)) {
      skip(id, "stamp-declined");
      entitiesByMemory.delete(id);
    }
  }

  return { entitiesByMemory, stampedIds, skippedIds, skippedReasons };
}
