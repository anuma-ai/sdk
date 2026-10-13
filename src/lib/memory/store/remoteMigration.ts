import {
  getAllVaultMemoryRowsOp,
  type VaultMemoryOperationsContext,
} from "../../db/memoryVault/operations.js";
import { MemoryKeyError, type MemoryKeyRing, reencryptMemoryField } from "./memoryKeys.js";
import {
  createNearbyRequest,
  type NearbyRequest,
  RemoteMemoryError,
  type RemoteMemoryPersistenceOptions,
  type RemoteMemoryRow,
} from "./remotePersistence.js";
import { storedVector } from "./remotePipeline.js";

const IMPORT_BATCH = 50;
const VERIFY_BATCH = 1000;
const MAX_PASSES = 3;
const MAX_RATE_LIMIT_WAITS = 10;
const DEFAULT_RATE_LIMIT_WAIT_MS = 10_000;
const MAX_FIELD_BYTES = 32 << 10;

/**
 * Options for {@link migrateMemoriesToRemote}.
 * @public
 */
export interface MemoryMigrationOptions extends Pick<
  RemoteMemoryPersistenceOptions,
  "baseUrl" | "getToken" | "fetch" | "timeoutMs"
> {
  /** The local vault to read. Its `userId` scopes which rows are migrated. */
  vaultCtx: VaultMemoryOperationsContext;
  /** The account's canonical key. Every uploaded field is encrypted under it. */
  canonical: MemoryKeyRing;
  /** Older keys that may have encrypted local rows. */
  fallbacks?: readonly MemoryKeyRing[];
  /** Activate even when some rows could not be migrated. Default false. */
  allowSkipped?: boolean;
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
}

interface Revision {
  memory_id: string;
  updated_at: number;
  is_deleted: boolean;
  topics_updated_at: number | null;
  last_observed_at: number | null;
}

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

function revision(raw: Record<string, unknown>): Revision {
  return {
    memory_id: raw.id as string,
    updated_at: num(raw.updated_at) ?? 0,
    is_deleted: bool(raw.is_deleted) ?? false,
    topics_updated_at: num(raw.topics_updated_at) ?? null,
    last_observed_at: num(raw.last_observed_at) ?? null,
  };
}

function embedding(raw: Record<string, unknown>): number[] | undefined {
  const value = text(raw.embedding);
  if (!value) return undefined;
  try {
    return storedVector(JSON.parse(value) as number[]);
  } catch {
    return undefined;
  }
}

function invalid(raw: Record<string, unknown>): boolean {
  const id = raw.id;
  return (
    typeof id !== "string" ||
    id === "" ||
    id.length > 128 ||
    !text(raw.scope) ||
    (num(raw.created_at) ?? 0) <= 0 ||
    (num(raw.updated_at) ?? 0) <= 0
  );
}

async function remoteRow(
  raw: Record<string, unknown>,
  canonical: MemoryKeyRing,
  fallbacks: readonly MemoryKeyRing[]
): Promise<RemoteMemoryRow | null> {
  const content = await reencryptMemoryField(
    typeof raw.content === "string" ? raw.content : "",
    canonical,
    fallbacks
  );
  const kindValue = text(raw.kind_value);
  const encryptedKindValue = kindValue
    ? await reencryptMemoryField(kindValue, canonical, fallbacks)
    : undefined;
  if (content.length > MAX_FIELD_BYTES || (encryptedKindValue?.length ?? 0) > MAX_FIELD_BYTES)
    return null;
  const vector = embedding(raw);
  const optional: Partial<RemoteMemoryRow> = {
    kind: text(raw.kind),
    kind_value: encryptedKindValue,
    level: text(raw.level),
    folder_id: text(raw.folder_id),
    ...(vector && { embedding: vector, embedding_model: text(raw.embedding_model) }),
    source_chunk_ids: text(raw.source_chunk_ids),
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
  return {
    memory_id: raw.id as string,
    content,
    scope: raw.scope as string,
    created_at: raw.created_at as number,
    updated_at: raw.updated_at as number,
    is_deleted: bool(raw.is_deleted) ?? false,
    ...(Object.fromEntries(
      Object.entries(optional).filter(([, value]) => value !== undefined)
    ) as Partial<RemoteMemoryRow>),
  };
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
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(aborted(signal));
      },
      { once: true }
    );
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

/**
 * Upload this device's local memories to nearby's private-memory store and, once nearby
 * holds every one, make it authoritative. Safe to rerun: rows nearby already has are not resent.
 * @throws RemoteMemoryError `key_mismatch` when the account already uses another key.
 * @public
 */
export async function migrateMemoriesToRemote(
  options: MemoryMigrationOptions
): Promise<MemoryMigrationResult> {
  const { canonical, signal } = options;
  const fallbacks = options.fallbacks ?? [];
  const request = createNearbyRequest(options);
  const account = (await request("/account", {}, signal)) as { state?: unknown; key_id?: unknown };
  if (typeof account.key_id === "string" && account.key_id !== canonical.keyId)
    throw new RemoteMemoryError(
      "The account's memories are encrypted under another key",
      409,
      "key_mismatch"
    );

  const skipped = new Map<string, MemoryMigrationSkip["reason"]>();
  let imported = 0;
  let total = 0;
  for (let pass = 0; pass < MAX_PASSES; pass++) {
    const rows = await getAllVaultMemoryRowsOp(options.vaultCtx);
    total = rows.length;
    for (const raw of rows) if (invalid(raw)) skipped.set(String(raw.id), "invalid");
    const candidates = rows.filter((raw) => !skipped.has(String(raw.id)));
    const missing = await missingIds(request, candidates.map(revision), signal);
    if (missing.size === 0) {
      const result = (state: MemoryMigrationResult["state"]) => ({
        state,
        total,
        imported,
        skipped: [...skipped].map(([memoryId, reason]) => ({ memoryId, reason })),
      });
      if (skipped.size > 0 && !options.allowSkipped) return result("migrating");
      if (account.state !== "active")
        await request(
          "/account",
          { method: "PUT", body: JSON.stringify({ state: "active" }) },
          signal
        );
      return result("active");
    }

    const upload: RemoteMemoryRow[] = [];
    for (const raw of candidates) {
      if (!missing.has(raw.id as string)) continue;
      try {
        const row = await remoteRow(raw, canonical, fallbacks);
        if (row) upload.push(row);
        else skipped.set(raw.id as string, "invalid");
      } catch (error) {
        if (!(error instanceof MemoryKeyError)) throw error;
        skipped.set(raw.id as string, "unreadable");
      }
    }
    let sent = 0;
    options.onProgress?.({ imported: sent, toImport: upload.length });
    for (const batch of chunks(upload, IMPORT_BATCH)) {
      await importBatch(request, canonical.keyId, batch, signal);
      sent += batch.length;
      options.onProgress?.({ imported: sent, toImport: upload.length });
    }
    imported += sent;
  }
  throw new RemoteMemoryError(
    "Nearby still reports memories missing after importing them",
    409,
    "migration_incomplete"
  );
}
