/** The nearby private-memory row. Content and kind_value are plaintext ONLY on the device. */
export interface RemoteMemoryRow {
  memory_id: string;
  content: string;
  scope: string;
  created_at: number;
  updated_at: number;
  is_deleted: boolean;
  embedding?: number[];
  embedding_model?: string;
  kind?: string;
  kind_value?: string;
  level?: string;
  folder_id?: string;
  source_chunk_ids?: string;
  proof_count?: number;
  source?: string;
  event_time_start?: number;
  event_time_end?: number;
  event_time_kind?: string;
  topics_user_managed?: boolean;
  topics?: string;
  topics_updated_at?: number;
  media?: string;
  topics_extracted_at?: number;
  topics_extracted_version?: number;
  superseded_by?: string;
  superseded_at?: number;
  last_observed_at?: number;
  fact_type?: string;
  archived_at?: number;
  trust_tier?: string;
  visibility?: string;
  twin_opt_in?: boolean;
  published_at?: number;
  geohash?: string;
}

/** A server snapshot. Pass its version back when writing; device timestamps are not a CAS token. */
export interface RemoteMemoryRecord {
  memory: RemoteMemoryRow;
  version: number;
  server_updated_at: string;
  score?: number;
}

export interface RemoteMemoryReadFilters {
  include_archived?: boolean;
  include_quarantined?: boolean;
  include_superseded?: boolean;
  fact_types?: string[];
}

export interface RemoteMemoryListOptions extends Omit<RemoteMemoryReadFilters, "fact_types"> {
  include_deleted?: boolean;
  include_embeddings?: boolean;
  cursor?: string;
  limit?: number;
  signal?: AbortSignal;
}

export interface RemoteMemoryPage {
  items: RemoteMemoryRecord[];
  next_cursor?: string;
}

export interface RemoteMemoryCandidateOptions extends RemoteMemoryReadFilters {
  scopes?: string[];
  memory_ids?: string[];
  embedding_model?: string;
  strict_model?: boolean;
  include_deleted?: boolean;
  deleted_only?: boolean;
  limit?: number;
  force_ids?: string[];
  signal?: AbortSignal;
}

/**
 * The caller supplies the canonical account key's field encryption on the device.
 * These callbacks and authentication credentials never enter a request body.
 * The encryption format must be the SDK's enc:vN:<hex> field format.
 */
export interface RemoteMemoryPersistenceOptions {
  baseUrl: string;
  getToken: () => Promise<string | null>;
  keyId: string;
  encrypt: (plaintext: string) => Promise<string>;
  decrypt: (ciphertext: string) => Promise<string>;
  fetch?: typeof globalThis.fetch;
  /** Cancellation for the initial account/key check. Individual operations take their own signal. */
  signal?: AbortSignal;
}

/** HTTP failures remain distinguishable, particularly version_conflict and key_mismatch. */
export class RemoteMemoryError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string
  ) {
    super(message);
    this.name = "RemoteMemoryError";
  }
}

/**
 * Remote persistence foundation for MemoryStore, not yet its recall/retain implementation.
 * Nearby is authoritative: every read reaches it and writes use explicit server versions.
 * No local database or replica, import/activation, automatic conflict retry or rollback.
 * Migration must have activated the account under the canonical key before construction.
 */
export interface RemoteMemoryPersistence {
  get(memoryId: string, signal?: AbortSignal): Promise<RemoteMemoryRecord | null>;
  /** One stable memory-id page; follow next_cursor to enumerate. Embeddings are opt-in. */
  list(options?: RemoteMemoryListOptions): Promise<RemoteMemoryPage>;
  /** Whole-row write. Pass a returned snapshot to avoid GET; a number retains the read-before-write path. Version 0 creates. is_deleted writes a tombstone. */
  put(
    memory: RemoteMemoryRow,
    expectedVersion: number | RemoteMemoryRecord,
    signal?: AbortSignal
  ): Promise<RemoteMemoryRecord>;
  /** 1–50 writes in one server transaction; never split or replay a batch. */
  putMany(
    writes: { memory: RemoteMemoryRow; expectedVersion: number | RemoteMemoryRecord }[],
    signal?: AbortSignal
  ): Promise<RemoteMemoryRecord[]>;
  /** Candidate window plus counts for distinguishing empty storage from unavailable vectors. */
  candidateSet(
    embedding: number[],
    options?: RemoteMemoryCandidateOptions
  ): Promise<{
    items: RemoteMemoryRecord[];
    total_count: number;
    unavailable_count: number;
  }>;
  /** Nearby ranks ciphertext using a query vector and metadata; returned winners decrypt on-device. */
  candidates(
    embedding: number[],
    options?: RemoteMemoryCandidateOptions
  ): Promise<RemoteMemoryRecord[]>;
}

const ciphertextPattern = /^enc:v\d+:[0-9a-f]+$/i;
// Mirror nearby's additionalProperties:false row schema. Reject extra fields
// rather than accidentally forwarding credentials or dropping future metadata.
const memoryFields = {
  memory_id: true,
  content: true,
  scope: true,
  created_at: true,
  updated_at: true,
  is_deleted: true,
  embedding: true,
  embedding_model: true,
  kind: true,
  kind_value: true,
  level: true,
  folder_id: true,
  source_chunk_ids: true,
  proof_count: true,
  source: true,
  event_time_start: true,
  event_time_end: true,
  event_time_kind: true,
  topics_user_managed: true,
  topics: true,
  topics_updated_at: true,
  media: true,
  topics_extracted_at: true,
  topics_extracted_version: true,
  superseded_by: true,
  superseded_at: true,
  last_observed_at: true,
  fact_type: true,
  archived_at: true,
  trust_tier: true,
  visibility: true,
  twin_opt_in: true,
  published_at: true,
  geohash: true,
} satisfies Record<keyof RemoteMemoryRow, boolean>;

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function memoryRecord(value: unknown): RemoteMemoryRecord {
  if (
    !record(value) ||
    !record(value.memory) ||
    typeof value.memory.memory_id !== "string" ||
    typeof value.memory.content !== "string" ||
    typeof value.memory.scope !== "string" ||
    typeof value.memory.created_at !== "number" ||
    typeof value.memory.updated_at !== "number" ||
    typeof value.memory.is_deleted !== "boolean" ||
    !Number.isSafeInteger(value.version) ||
    (value.version as number) < 1 ||
    typeof value.server_updated_at !== "string" ||
    (value.score !== undefined &&
      (typeof value.score !== "number" || !Number.isFinite(value.score)))
  ) {
    throw new Error("Invalid nearby private-memory response");
  }
  return value as unknown as RemoteMemoryRecord;
}

/**
 * Connect to an already-active account. Encryption/key failures fail closed; a
 * failed write is never replayed automatically because its outcome may be unknown.
 * @public
 */
export async function createRemoteMemoryPersistence(
  options: RemoteMemoryPersistenceOptions
): Promise<RemoteMemoryPersistence> {
  const base = new URL(options.baseUrl);
  if (
    !/^https?:$/.test(base.protocol) ||
    base.username ||
    base.password ||
    base.search ||
    base.hash
  ) {
    throw new Error(
      "baseUrl must be an HTTP(S) origin or base path without credentials, query or fragment"
    );
  }
  if (!options.keyId || options.keyId.length > 256)
    throw new Error("A canonical keyId is required");
  const root = base.href.replace(/\/$/, "") + "/api/private-memories";
  const fetcher = options.fetch ?? globalThis.fetch;
  const request = async (
    path: string,
    init: RequestInit = {},
    signal?: AbortSignal
  ): Promise<unknown> => {
    const token = await options.getToken();
    if (!token) throw new RemoteMemoryError("Authentication required", 401);
    const response = await fetcher(root + path, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(init.body ? { "Content-Type": "application/json" } : {}),
      },
      redirect: "error",
      signal,
    });
    if (!response.ok) {
      const body: unknown = await response.json().catch(() => null);
      throw new RemoteMemoryError(
        record(body) && typeof body.detail === "string"
          ? body.detail
          : `Nearby request failed (${response.status})`,
        response.status,
        record(body) && typeof body.code === "string" ? body.code : undefined
      );
    }
    return response.json();
  };
  const account = await request("/account", {}, options.signal);
  if (!record(account) || account.state !== "active") {
    throw new RemoteMemoryError(
      "Complete and verify migration before using remote memories",
      409,
      "memory_not_active"
    );
  }
  if (account.key_id !== options.keyId) {
    throw new RemoteMemoryError(
      "The canonical memory key does not match this account",
      409,
      "key_mismatch"
    );
  }

  // Per-returned-snapshot ciphertext, not a replica: weak entries cannot be
  // enumerated or serve reads and disappear when callers release snapshots.
  const snapshots = new WeakMap<
    RemoteMemoryRecord,
    {
      id: string;
      version: number;
      content: string;
      kindValue?: string;
      encryptedContent: string;
      encryptedKindValue?: string;
    }
  >();
  const decode = async (value: unknown): Promise<RemoteMemoryRecord> => {
    const item = memoryRecord(value);
    const decrypt = async (ciphertext: string): Promise<string> => {
      if (!ciphertextPattern.test(ciphertext))
        throw new Error("Nearby returned unencrypted memory content");
      const plaintext = await options.decrypt(ciphertext);
      if (plaintext === ciphertext) throw new Error("Memory decryption failed");
      return plaintext;
    };
    const decoded: RemoteMemoryRecord = {
      ...item,
      memory: {
        ...item.memory,
        content: await decrypt(item.memory.content),
        ...(item.memory.kind_value !== undefined && {
          kind_value: await decrypt(item.memory.kind_value),
        }),
      },
    };
    snapshots.set(decoded, {
      id: item.memory.memory_id,
      version: item.version,
      content: decoded.memory.content,
      kindValue: decoded.memory.kind_value,
      encryptedContent: item.memory.content,
      encryptedKindValue: item.memory.kind_value,
    });
    return decoded;
  };
  const memoryPath = (id: string): string => {
    if (!id || id.length > 128) throw new Error("memory_id must be 1–128 characters");
    return "/memories/" + encodeURIComponent(id);
  };

  const prepareWrite = async (
    memory: RemoteMemoryRow,
    expectedVersion: number | RemoteMemoryRecord,
    signal?: AbortSignal
  ) => {
    if (
      Object.keys(memory).some((key) => !Object.prototype.hasOwnProperty.call(memoryFields, key))
    ) {
      throw new Error("Unknown private-memory fields; refusing to forward them");
    }
    // Callers can edit their snapshot while key derivation/network work awaits.
    // Capture the entire write before the first await, including its vector.
    memory = { ...memory, ...(memory.embedding && { embedding: [...memory.embedding] }) };
    const path = memoryPath(memory.memory_id);
    const snapshot =
      typeof expectedVersion === "number" ? undefined : snapshots.get(expectedVersion);
    if (
      typeof expectedVersion !== "number" &&
      (!snapshot ||
        snapshot.id !== memory.memory_id ||
        snapshot.version !== expectedVersion.version)
    )
      throw new Error(
        "Expected snapshot must be an unmodified version from this persistence instance"
      );
    expectedVersion = typeof expectedVersion === "number" ? expectedVersion : snapshot!.version;
    if (!Number.isSafeInteger(expectedVersion) || expectedVersion < 0)
      throw new Error("expectedVersion must be a nonnegative integer");
    // Re-encrypting unchanged content uses a fresh IV, which the server would
    // interpret as a content edit and clear an omitted embedding. Read the
    // expected server version and reuse its ciphertext when plaintext matches.
    // The final PUT still uses the caller's version: a racing edit must fail.
    const existing =
      expectedVersion === 0 || snapshot ? undefined : memoryRecord(await request(path, {}, signal));
    if (existing && existing.version !== expectedVersion) {
      throw new RemoteMemoryError("The memory changed since it was read", 409, "version_conflict");
    }
    const decoded = existing ? await decode(existing) : undefined;
    const content =
      (snapshot?.content ?? decoded?.memory.content) === memory.content
        ? (snapshot?.encryptedContent ?? existing!.memory.content)
        : await options.encrypt(memory.content);
    const kindValue =
      memory.kind_value === undefined
        ? undefined
        : (snapshot?.kindValue ?? decoded?.memory.kind_value) === memory.kind_value
          ? (snapshot?.encryptedKindValue ?? existing!.memory.kind_value)
          : await options.encrypt(memory.kind_value);
    if (
      !ciphertextPattern.test(content) ||
      (kindValue !== undefined && !ciphertextPattern.test(kindValue))
    ) {
      throw new Error("Field encryption must return SDK ciphertext; refusing to upload plaintext");
    }

    return {
      expected_version: expectedVersion,
      memory: { ...memory, content, ...(kindValue !== undefined && { kind_value: kindValue }) },
    };
  };

  const candidateSet = async (
    embedding: number[],
    candidateOptions: RemoteMemoryCandidateOptions = {}
  ) => {
    const result = await request(
      "/candidates",
      {
        method: "POST",
        body: JSON.stringify({
          embedding,
          limit: candidateOptions.limit ?? 100,
          force_ids: candidateOptions.force_ids ?? [],
          ...Object.fromEntries(
            [
              "scopes",
              "memory_ids",
              "embedding_model",
              "strict_model",
              "include_deleted",
              "deleted_only",
            ]
              .filter(
                (key) => candidateOptions[key as keyof RemoteMemoryCandidateOptions] !== undefined
              )
              .map((key) => [key, candidateOptions[key as keyof RemoteMemoryCandidateOptions]])
          ),
          ...(candidateOptions.fact_types !== undefined && {
            fact_types: candidateOptions.fact_types,
          }),
          ...(candidateOptions.include_archived !== undefined && {
            include_archived: candidateOptions.include_archived,
          }),
          ...(candidateOptions.include_quarantined !== undefined && {
            include_quarantined: candidateOptions.include_quarantined,
          }),
          ...(candidateOptions.include_superseded !== undefined && {
            include_superseded: candidateOptions.include_superseded,
          }),
        }),
      },
      candidateOptions.signal
    );
    if (
      !record(result) ||
      !Array.isArray(result.items) ||
      !Number.isSafeInteger(result.total_count) ||
      (result.total_count as number) < 0 ||
      !Number.isSafeInteger(result.unavailable_count) ||
      (result.unavailable_count as number) < 0
    )
      throw new Error("Invalid nearby candidate response");
    return {
      items: await Promise.all(result.items.map(decode)),
      total_count: result.total_count as number,
      unavailable_count: result.unavailable_count as number,
    };
  };

  return {
    get: async (id, signal) => {
      try {
        return await decode(await request(memoryPath(id), {}, signal));
      } catch (error) {
        if (error instanceof RemoteMemoryError && error.status === 404) return null;
        throw error;
      }
    },
    list: async (listOptions = {}) => {
      const { signal, ...query } = listOptions;
      if (
        query.limit !== undefined &&
        (!Number.isInteger(query.limit) || query.limit < 1 || query.limit > 200)
      ) {
        throw new Error("Page limit must be 1–200");
      }
      const params = new URLSearchParams();
      for (const key of [
        "cursor",
        "limit",
        "include_deleted",
        "include_archived",
        "include_quarantined",
        "include_superseded",
        "include_embeddings",
      ] as const) {
        if (query[key] !== undefined) params.set(key, String(query[key]));
      }
      const page = await request("/memories?" + params.toString(), {}, signal);
      if (
        !record(page) ||
        !Array.isArray(page.items) ||
        (page.next_cursor !== undefined && typeof page.next_cursor !== "string")
      ) {
        throw new Error("Invalid nearby private-memory page");
      }
      return {
        items: await Promise.all(page.items.map(decode)),
        ...(page.next_cursor !== undefined && { next_cursor: page.next_cursor }),
      };
    },
    put: async (memory, expectedVersion, signal) => {
      const write = await prepareWrite(memory, expectedVersion, signal);
      return decode(
        await request(
          memoryPath(write.memory.memory_id),
          {
            method: "PUT",
            body: JSON.stringify({ key_id: options.keyId, ...write }),
          },
          signal
        )
      );
    },
    putMany: async (writes, signal) => {
      if (
        writes.length < 1 ||
        writes.length > 50 ||
        new Set(writes.map((w) => w.memory.memory_id)).size !== writes.length
      )
        throw new Error("Batch must contain 1–50 distinct memory ids");
      // Start all preparations synchronously so every input captures before awaits.
      const prepared = await Promise.all(
        writes.map((w) => prepareWrite(w.memory, w.expectedVersion, signal))
      );
      const result = await request(
        "/memories/batch",
        {
          method: "POST",
          body: JSON.stringify({ key_id: options.keyId, writes: prepared }),
        },
        signal
      );
      if (
        !record(result) ||
        !Array.isArray(result.items) ||
        result.items.length !== prepared.length
      )
        throw new Error("Invalid nearby batch response");
      return Promise.all(result.items.map(decode));
    },
    candidateSet,
    candidates: async (embedding, candidateOptions) =>
      (await candidateSet(embedding, candidateOptions)).items,
  };
}
