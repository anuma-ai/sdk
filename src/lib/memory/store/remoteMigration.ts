import {
  backfillMemoryTopicsOp,
  getAllVaultMemoryRowsOp,
  type VaultMemoryOperationsContext,
} from "../../db/memoryVault/operations.js";
import { serializeSourceChunkIds } from "../../db/memoryVault/sourceChunkIds.js";
import { getLogger } from "../../logger.js";
import { DEFAULT_API_EMBEDDING_MODEL } from "../../memoryEngine/constants.js";
import { generateEmbeddings } from "../../memoryEngine/embeddings.js";
import type { EmbeddingOptions } from "../../memoryEngine/types.js";
import { createDecaySweeper } from "../decayWorker.js";
import {
  decryptMemoryField,
  memoryCipher,
  MemoryKeyError,
  type MemoryKeyRing,
} from "./memoryKeys.js";
import {
  createNearbyRequest,
  type NearbyRequest,
  RemoteMemoryError,
  type RemoteMemoryPersistenceOptions,
  type RemoteMemoryRow,
} from "./remotePersistence.js";
import { storedVector } from "./remotePipeline.js";
import { createRemoteTopicPersistence } from "./remoteTopics.js";

const IMPORT_BATCH = 50;
const EMBED_BATCH = 100;
const LOCAL_VECTOR_DIMS = 4096;
const VERIFY_BATCH = 1000;
const QUERY_IDS = 1000;
const QUERY_PAGE = 200;
const MAX_UPLOAD_PASSES = 3;
const MAX_RATE_LIMIT_WAITS = 10;
const DEFAULT_RATE_LIMIT_WAIT_MS = 10_000;
const MAX_ID_BYTES = 128;
const MAX_CONTENT_BYTES = 32 << 10;
const MAX_TEXT_BYTES = 16 << 10;
const MAX_SHORT_BYTES = 256;
const TEXT_FIELDS = ["topics", "media", "source_chunk_ids"] as const;
const SHORT_FIELDS = [
  "scope",
  "kind",
  "level",
  "folder_id",
  "embedding_model",
  "source",
  "event_time_kind",
  "superseded_by",
  "fact_type",
  "trust_tier",
  "visibility",
  "geohash",
] as const;
const utf8 = new TextEncoder();

const METADATA_FIELDS = [
  "scope",
  "kind",
  "level",
  "folder_id",
  "is_deleted",
  "embedding_model",
  "source_chunk_ids",
  "proof_count",
  "source",
  "event_time_start",
  "event_time_end",
  "event_time_kind",
  "topics_user_managed",
  "topics",
  "topics_updated_at",
  "media",
  "topics_extracted_at",
  "topics_extracted_version",
  "superseded_by",
  "superseded_at",
  "last_observed_at",
  "fact_type",
  "archived_at",
  "trust_tier",
  "visibility",
  "twin_opt_in",
  "published_at",
  "geohash",
] as const;

/**
 * Options for {@link migrateMemoriesToRemote}.
 * @public
 */
export interface MemoryMigrationOptions extends Pick<
  RemoteMemoryPersistenceOptions,
  "baseUrl" | "getToken" | "fetch" | "timeoutMs"
> {
  /** The local vault to read, scoped by `userId` or marked `singleTenant`. */
  vaultCtx: VaultMemoryOperationsContext;
  /** The account's canonical key, which encrypts every uploaded field. */
  canonical: MemoryKeyRing;
  /** Older keys that may have encrypted local rows. */
  fallbacks?: readonly MemoryKeyRing[];
  /** Activate even when some rows could not be migrated. Default false. */
  allowSkipped?: boolean;
  /** Re-embeds rows whose local vector nearby could not rank; without it those rows upload unembedded. */
  embeddingOptions?: EmbeddingOptions;
  /** Explicitly account-owned topics for databases that are not marked singleTenant. */
  topics?: readonly { name: string; kind?: string }[];
  signal?: AbortSignal;
  onProgress?: (progress: MemoryMigrationProgress) => void;
}

/**
 * @public
 */
export interface MemoryMigrationProgress {
  imported: number;
  toImport: number;
}

/**
 * A local row that was not uploaded: no supplied key decrypts it, or nearby would refuse it.
 * @public
 */
export interface MemoryMigrationSkip {
  memoryId: string;
  reason: "unreadable" | "invalid";
}

/**
 * @public
 */
export interface MemoryMigrationResult {
  state: "migrating" | "active";
  total: number;
  imported: number;
  skipped: MemoryMigrationSkip[];
  /** Rows uploaded with a vector embedded during migration. */
  reembedded: number;
  /** Rows uploaded without a vector nearby can rank. */
  unembedded: number;
  /** Deleted rows no supplied key decrypts, uploaded with placeholder content. */
  placeholderTombstones: number;
  /** Rows whose oldest source ids were dropped to fit nearby's limit. */
  truncatedSourceChunkIds: number;
}

interface Revision {
  memory_id: string;
  updated_at: number;
  is_deleted: boolean;
  topics_updated_at: number | null;
  last_observed_at: number | null;
}

type RawRow = Record<string, unknown>;

function text(value: unknown): string | undefined {
  return typeof value === "string" && value !== "" ? value : undefined;
}

function num(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function bool(value: unknown): boolean | undefined {
  if (value === true || value === 1) return true;
  if (value === false || value === 0) return false;
  return undefined;
}

function revision(raw: RawRow): Revision {
  return {
    memory_id: raw.id as string,
    updated_at: num(raw.updated_at) ?? 0,
    is_deleted: bool(raw.is_deleted) ?? false,
    topics_updated_at: num(raw.topics_updated_at) ?? null,
    last_observed_at: num(raw.last_observed_at) ?? null,
  };
}

function embedding(raw: RawRow, model: string): number[] | undefined {
  const value = text(raw.embedding);
  if (!value) return undefined;
  try {
    const vector = JSON.parse(value) as number[];
    const stored = text(raw.embedding_model);
    if (stored === undefined ? vector.length !== LOCAL_VECTOR_DIMS : stored !== model)
      return undefined;
    return storedVector(vector);
  } catch {
    return undefined;
  }
}

function stringArray(value: string): string[] | undefined {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) && parsed.every((id) => typeof id === "string")
      ? parsed
      : undefined;
  } catch {
    return undefined;
  }
}

function sourceChunkIds(raw: RawRow): string | undefined {
  const value = text(raw.source_chunk_ids);
  const ids = value && stringArray(value);
  return ids ? serializeSourceChunkIds(ids) : value;
}

function bytes(value: string | undefined): number {
  return value === undefined ? 0 : utf8.encode(value).length;
}

function fitsNearby(row: RemoteMemoryRow): boolean {
  return (
    bytes(row.memory_id) <= MAX_ID_BYTES &&
    bytes(row.content) <= MAX_CONTENT_BYTES &&
    bytes(row.kind_value) <= MAX_CONTENT_BYTES &&
    TEXT_FIELDS.every((field) => bytes(row[field]) <= MAX_TEXT_BYTES) &&
    SHORT_FIELDS.every((field) => bytes(row[field]) <= MAX_SHORT_BYTES)
  );
}

function invalid(raw: RawRow): boolean {
  const id = raw.id;
  return (
    typeof id !== "string" ||
    id === "" ||
    bytes(id) > MAX_ID_BYTES ||
    !text(raw.scope) ||
    (num(raw.created_at) ?? 0) <= 0 ||
    (num(raw.updated_at) ?? 0) <= 0
  );
}

function metadata(raw: RawRow, model: string): Partial<RemoteMemoryRow> {
  const vector = embedding(raw, model);
  return {
    scope: raw.scope as string,
    kind: text(raw.kind),
    level: text(raw.level),
    folder_id: text(raw.folder_id),
    is_deleted: bool(raw.is_deleted) ?? false,
    ...(vector && { embedding: vector, embedding_model: model }),
    source_chunk_ids: sourceChunkIds(raw),
    proof_count: num(raw.proof_count),
    source: text(raw.source),
    event_time_start: num(raw.event_time_start),
    event_time_end: num(raw.event_time_end),
    event_time_kind: text(raw.event_time_kind),
    topics_user_managed: bool(raw.topics_user_managed),
    topics: text(raw.topics),
    topics_updated_at: num(raw.topics_updated_at),
    media: text(raw.media),
    topics_extracted_at: num(raw.topics_extracted_at),
    topics_extracted_version: num(raw.topics_extracted_version),
    superseded_by: text(raw.superseded_by),
    superseded_at: num(raw.superseded_at),
    last_observed_at: num(raw.last_observed_at),
    fact_type: text(raw.fact_type),
    archived_at: num(raw.archived_at),
    trust_tier: text(raw.trust_tier),
    visibility: text(raw.visibility),
    twin_opt_in: bool(raw.twin_opt_in),
    published_at: num(raw.published_at),
    geohash: text(raw.geohash),
  };
}

function defined<T extends object>(value: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(value).filter(([, field]) => field !== undefined)
  ) as Partial<T>;
}

interface PreparedRow {
  row: RemoteMemoryRow;
  plaintext?: string;
}

async function prepareRow(
  raw: RawRow,
  canonical: MemoryKeyRing,
  rings: readonly MemoryKeyRing[],
  model: string,
  updatedAt: number
): Promise<PreparedRow> {
  const deleted = bool(raw.is_deleted) ?? false;
  const { encrypt } = memoryCipher(canonical);
  const localKindValue = text(raw.kind_value);
  let plaintext: string | undefined;
  let kindValue: string | undefined;
  try {
    plaintext = await decryptMemoryField(typeof raw.content === "string" ? raw.content : "", rings);
    kindValue = localKindValue && (await decryptMemoryField(localKindValue, rings));
  } catch (error) {
    if (!deleted || !(error instanceof MemoryKeyError)) throw error;
    plaintext = undefined;
    kindValue = undefined;
  }
  const row: RemoteMemoryRow = {
    ...defined({
      ...metadata(raw, model),
      kind_value: kindValue === undefined ? undefined : await encrypt(kindValue),
    }),
    memory_id: raw.id as string,
    content: await encrypt(plaintext ?? ""),
    scope: raw.scope as string,
    created_at: raw.created_at as number,
    updated_at: updatedAt,
    is_deleted: deleted,
  };
  return { row, plaintext };
}

async function embedMissing(
  prepared: readonly PreparedRow[],
  options: EmbeddingOptions,
  model: string,
  signal?: AbortSignal
): Promise<void> {
  const needed = prepared.filter((p) => !p.row.embedding && p.plaintext);
  for (const batch of chunks(needed, EMBED_BATCH)) {
    if (signal?.aborted) throw aborted(signal);
    try {
      const vectors = await generateEmbeddings(
        batch.map((p) => p.plaintext!),
        { ...options, taskType: "memory_retain_embed" }
      );
      if (vectors.length !== batch.length) throw new Error("Incomplete migration embeddings");
      const stored = vectors.map(storedVector);
      batch.forEach((p, i) => {
        p.row.embedding = stored[i];
        p.row.embedding_model = model;
      });
    } catch (error) {
      getLogger().warn(
        `[memory/migration] Uploading ${batch.length} row(s) without a vector: embedding failed`,
        error
      );
    }
  }
}

function sameMetadata(local: RawRow, remote: Record<string, unknown>, model: string): boolean {
  const mine = metadata(local, model) as Record<string, unknown>;
  return METADATA_FIELDS.every((field) => {
    const a = mine[field] ?? null;
    const b = remote[field] ?? null;
    if (field === "embedding_model" && a === null) return true;
    if (field === "visibility") return (a ?? "private") === (b ?? "private");
    if (field === "is_deleted" || field === "topics_user_managed" || field === "twin_opt_in")
      return (a ?? false) === (b ?? false);
    return a === b;
  });
}

function chunks<T>(values: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < values.length; i += size) out.push(values.slice(i, i + size));
  return out;
}

function aborted(signal: AbortSignal): Error {
  return signal.reason instanceof Error ? signal.reason : new Error("Memory migration aborted");
}

function wait(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(aborted(signal));
    const onAbort = () => {
      clearTimeout(timer);
      reject(aborted(signal!));
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

async function importBatch(
  request: NearbyRequest,
  keyId: string,
  rows: RemoteMemoryRow[],
  signal?: AbortSignal
): Promise<void> {
  for (let attempt = 0; ; attempt++) {
    try {
      await request(
        "/import",
        { method: "POST", body: JSON.stringify({ key_id: keyId, memories: rows }) },
        signal
      );
      return;
    } catch (error) {
      if (
        !(error instanceof RemoteMemoryError) ||
        error.status !== 429 ||
        attempt >= MAX_RATE_LIMIT_WAITS
      )
        throw error;
      await wait(error.retryAfterMs ?? DEFAULT_RATE_LIMIT_WAIT_MS, signal);
    }
  }
}

async function missingIds(
  request: NearbyRequest,
  revisions: Revision[],
  signal?: AbortSignal
): Promise<Set<string>> {
  const missing = new Set<string>();
  for (const batch of chunks(revisions, VERIFY_BATCH)) {
    const result = await request(
      "/verify",
      { method: "POST", body: JSON.stringify({ memories: batch }) },
      signal
    );
    const ids = (result as { missing?: unknown }).missing;
    if (!Array.isArray(ids)) throw new Error("Invalid nearby verify response");
    for (const id of ids) if (typeof id === "string") missing.add(id);
  }
  return missing;
}

async function remoteMetadata(
  request: NearbyRequest,
  ids: string[],
  signal?: AbortSignal
): Promise<Map<string, Record<string, unknown>>> {
  const rows = new Map<string, Record<string, unknown>>();
  for (const batch of chunks(ids, QUERY_IDS)) {
    let cursor: string | undefined;
    do {
      const page = (await request(
        "/memories/query",
        {
          method: "POST",
          body: JSON.stringify({
            memory_ids: batch,
            include_deleted: true,
            include_archived: true,
            include_quarantined: true,
            include_superseded: true,
            limit: QUERY_PAGE,
            ...(cursor && { cursor }),
          }),
        },
        signal
      )) as { items?: unknown; next_cursor?: unknown };
      if (!Array.isArray(page.items)) throw new Error("Invalid nearby private-memory page");
      for (const item of page.items as { memory?: Record<string, unknown> }[])
        if (item.memory && typeof item.memory.memory_id === "string")
          rows.set(item.memory.memory_id, item.memory);
      cursor = typeof page.next_cursor === "string" ? page.next_cursor : undefined;
    } while (cursor);
  }
  return rows;
}

async function backfillTopics(ctx: VaultMemoryOperationsContext): Promise<void> {
  if (!ctx.entityCtx) return;
  const topicless = (await getAllVaultMemoryRowsOp(ctx))
    .filter((raw) => !text(raw.topics) && !bool(raw.is_deleted))
    .map((raw) => raw.id as string);
  if (topicless.length > 0) await backfillMemoryTopicsOp(ctx, topicless);
}

/**
 * Upload this device's local memories to nearby and, once nearby holds every one, make it authoritative.
 * @throws RemoteMemoryError `key_mismatch` when the account already uses another key.
 * @public
 */
export async function migrateMemoriesToRemote(
  options: MemoryMigrationOptions
): Promise<MemoryMigrationResult> {
  const { canonical, signal } = options;
  const rings = [canonical, ...(options.fallbacks ?? [])];
  const model = options.embeddingOptions?.model ?? DEFAULT_API_EMBEDDING_MODEL;
  const request = createNearbyRequest(options);
  const account = (await request("/account", {}, signal)) as { state?: unknown; key_id?: unknown };
  if (typeof account.key_id === "string" && account.key_id !== canonical.keyId)
    throw new RemoteMemoryError(
      "The account's memories are encrypted under another key",
      409,
      "key_mismatch"
    );
  const active = account.state === "active";
  let claimed = account.key_id === canonical.keyId;

  if (!active) await createDecaySweeper({ vaultCtx: options.vaultCtx }).runSweep();
  await backfillTopics(options.vaultCtx);
  const localTopics =
    options.topics ??
    (options.vaultCtx.singleTenant === true
      ? (
          (await options.vaultCtx.database.get("entity").query().unsafeFetchRaw()) as Record<
            string,
            unknown
          >[]
        )
          .map((t) => ({
            name: String(t.canonical_name ?? "")
              .trim()
              .toLowerCase(),
            ...(typeof t.kind === "string" && { kind: t.kind }),
          }))
          .filter((t) => t.name.length > 0)
      : []);
  if (localTopics.length) await createRemoteTopicPersistence(request).importTopics(localTopics);

  const skipped = new Map<string, MemoryMigrationSkip["reason"]>();
  const reembedded = new Set<string>();
  const unembedded = new Set<string>();
  const placeholders = new Set<string>();
  const truncated = new Set<string>();
  let imported = 0;
  for (let pass = 0; ; pass++) {
    const rows = await getAllVaultMemoryRowsOp(options.vaultCtx);
    for (const raw of rows) if (invalid(raw)) skipped.set(String(raw.id), "invalid");
    const candidates = rows.filter((raw) => !skipped.has(String(raw.id)));
    const missing = await missingIds(request, candidates.map(revision), signal);
    const pending = new Map<string, number>();
    for (const raw of candidates)
      if (missing.has(raw.id as string)) pending.set(raw.id as string, raw.updated_at as number);
    if (pending.size === 0 && !active) {
      const remote = await remoteMetadata(
        request,
        candidates.map((raw) => raw.id as string),
        signal
      );
      const needsVector = (raw: RawRow, server: Record<string, unknown>) =>
        !!options.embeddingOptions && !embedding(raw, model) && server.embedding_model !== model;
      for (const raw of candidates) {
        const server = remote.get(raw.id as string);
        if (
          server &&
          server.updated_at === raw.updated_at &&
          (!sameMetadata(raw, server, model) || needsVector(raw, server))
        )
          pending.set(raw.id as string, (raw.updated_at as number) + 1);
      }
    }

    if (pending.size === 0) {
      const result = (state: MemoryMigrationResult["state"]): MemoryMigrationResult => ({
        state,
        total: rows.length,
        imported,
        skipped: [...skipped].map(([memoryId, reason]) => ({ memoryId, reason })),
        reembedded: reembedded.size,
        unembedded: unembedded.size,
        placeholderTombstones: placeholders.size,
        truncatedSourceChunkIds: truncated.size,
      });
      if (skipped.size > 0 && !options.allowSkipped) return result("migrating");
      if (!claimed) await importBatch(request, canonical.keyId, [], signal);
      if (!active)
        await request(
          "/account",
          { method: "PUT", body: JSON.stringify({ state: "active" }) },
          signal
        );
      return result("active");
    }
    if (pass >= MAX_UPLOAD_PASSES)
      throw new RemoteMemoryError(
        "Nearby still reports memories missing after importing them",
        409,
        "migration_incomplete"
      );

    const prepared: PreparedRow[] = [];
    for (const raw of candidates) {
      const updatedAt = pending.get(raw.id as string);
      if (updatedAt === undefined) continue;
      try {
        prepared.push(await prepareRow(raw, canonical, rings, model, updatedAt));
      } catch (error) {
        if (!(error instanceof MemoryKeyError)) throw error;
        skipped.set(raw.id as string, "unreadable");
      }
    }
    const usable = new Set(prepared.filter((p) => p.row.embedding).map((p) => p.row.memory_id));
    if (options.embeddingOptions)
      await embedMissing(prepared, options.embeddingOptions, model, signal);
    const local = new Map(candidates.map((raw) => [raw.id as string, raw]));
    const upload: RemoteMemoryRow[] = [];
    for (const { row, plaintext } of prepared) {
      const id = row.memory_id;
      if (!fitsNearby(row)) {
        skipped.set(id, "invalid");
        continue;
      }
      upload.push(row);
      const track = (set: Set<string>, on: boolean) => (on ? set.add(id) : set.delete(id));
      track(reembedded, !!row.embedding && !usable.has(id));
      track(unembedded, !row.embedding);
      track(placeholders, plaintext === undefined);
      track(truncated, row.source_chunk_ids !== text(local.get(id)!.source_chunk_ids));
    }
    let sent = 0;
    options.onProgress?.({ imported: sent, toImport: upload.length });
    for (const batch of chunks(upload, IMPORT_BATCH)) {
      await importBatch(request, canonical.keyId, batch, signal);
      claimed = true;
      sent += batch.length;
      options.onProgress?.({ imported: sent, toImport: upload.length });
    }
    imported += sent;
  }
}
