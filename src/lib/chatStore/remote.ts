import { createNearbyRequest, RemoteMemoryError } from "../memory/store/remotePersistence.js";
import {
  type ChatAccount,
  type ChatAttachment,
  type ChatImport,
  type ChatJson,
  type ChatPresignedUrl,
  type ChatRecord,
  type ChatRecordKind,
  type ChatRef,
  type ChatRevision,
  type ChatSearchHit,
  type ChatSnapshot,
  type ChatStore,
  ChatStoreError,
  type ChatWrite,
  type RemoteChatStoreOptions,
} from "./types.js";

const kinds = new Set(["conversation", "message", "summary", "project", "memory_links", "setting"]);
const cipherPattern = /^enc:v\d+:(?:[0-9a-f]{2}){28,}$/i;
const maxPayload = 2 * 1024 * 1024;
const storedDims = 1536;
const maxRequestCiphertext = 8 * 1024 * 1024;
const maxGetRefs = 50;
const maxImportRecords = 100;
const maxVerifyRevisions = 1000;
const maxChunksPerRecord = 16;
const maxChunksPerRequest = 200;
const maxAttachmentBytes = 50 * 1024 * 1024;
const attachmentIdPattern = /^[0-9a-f]{32}$/;
const metadata = [
  "kind",
  "id",
  "conversationId",
  "sortKey",
  "createdAt",
  "updatedAt",
  "isDeleted",
] as const;

interface WireRecord {
  kind: ChatRecordKind;
  id: string;
  conversation_id: string;
  sort_key: number;
  created_at: number;
  updated_at: number;
  is_deleted: boolean;
  payload: string;
}

function object(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/** Whether vault accepts `value` as a record or conversation id. */
export function validChatId(value: unknown): value is string {
  return id(value);
}

function id(value: unknown): value is string {
  return (
    typeof value === "string" &&
    new TextEncoder().encode(value).length <= 128 &&
    value.length > 0 &&
    value !== "." &&
    value !== ".." &&
    !value.includes("/") &&
    !value.includes("\\") &&
    !hasControl(value) &&
    new TextDecoder().decode(new TextEncoder().encode(value)) === value
  );
}

function hasControl(value: string): boolean {
  return Array.from(value).some((char) => {
    const code = char.charCodeAt(0);
    return code < 32 || (code >= 127 && code <= 159);
  });
}

function integer(value: unknown, minimum = 0): value is number {
  return Number.isSafeInteger(value) && (value as number) >= minimum;
}

function json(value: unknown, ancestors = new Set<object>()): value is ChatJson {
  if (value === null || typeof value === "string" || typeof value === "boolean") return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value !== "object" || ancestors.has(value)) return false;
  if (Array.isArray(value) && Object.keys(value).length !== value.length) return false;
  if (
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) !== Object.prototype &&
    Object.getPrototypeOf(value) !== null
  )
    return false;
  ancestors.add(value);
  const valid = Object.values(value).every((v) => json(v, ancestors));
  ancestors.delete(value);
  return valid;
}

function validRecord(value: unknown): value is ChatRecord {
  if (
    !object(value) ||
    typeof value.kind !== "string" ||
    !kinds.has(value.kind) ||
    !id(value.id) ||
    !integer(value.sortKey) ||
    !integer(value.createdAt, 1) ||
    !integer(value.updatedAt, 1) ||
    typeof value.isDeleted !== "boolean" ||
    !object(value.data) ||
    !json(value.data) ||
    Object.keys(value).some(
      (key) => ![...metadata, "data"].includes(key as (typeof metadata)[number])
    )
  )
    return false;
  const root = rootKind(value.kind);
  return root ? value.conversationId === "" : id(value.conversationId);
}

function rootKind(kind: string): boolean {
  return kind === "conversation" || kind === "project" || kind === "setting";
}

function embeddings(write: {
  record: ChatRecord;
  embeddings?: number[][];
  embeddingModel?: string;
}) {
  if (write.embeddings === undefined) return true;
  return (
    Array.isArray(write.embeddings) &&
    !write.record.isDeleted &&
    (write.record.kind === "message" || write.record.kind === "summary") &&
    write.embeddings.length <= maxChunksPerRecord &&
    (write.embeddingModel === undefined ||
      (typeof write.embeddingModel === "string" && write.embeddingModel.length <= 256)) &&
    Array.from({ length: write.embeddings.length }, (_, i) => i).every((i) =>
      vector(write.embeddings?.[i])
    )
  );
}

function vector(v: unknown): boolean {
  if (!Array.isArray(v) || (v.length !== 1536 && v.length !== 4096)) return false;
  let nonZero = false;
  for (let i = 0; i < v.length; i++) {
    const x: unknown = v[i];
    if (typeof x !== "number" || !Number.isFinite(x)) return false;
    if (i < storedDims && x !== 0) nonZero = true;
  }
  return nonZero;
}

function vectorFields(write: { embeddings?: number[][]; embeddingModel?: string }) {
  return {
    ...(write.embeddings !== undefined
      ? { embeddings: write.embeddings.map((v) => v.slice(0, storedDims)) }
      : {}),
    ...(write.embeddingModel !== undefined ? { embedding_model: write.embeddingModel } : {}),
  };
}

function text(value: unknown): value is string {
  return typeof value === "string";
}

function timestamp(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function presigned(value: unknown): ChatPresignedUrl {
  if (
    !object(value) ||
    !text(value.url) ||
    !/^https:\/\//.test(value.url) ||
    !text(value.method) ||
    !object(value.headers) ||
    !Object.values(value.headers).every(text) ||
    !timestamp(value.expires_at)
  )
    invalid();
  return {
    url: value.url,
    method: value.method,
    headers: value.headers as Record<string, string>,
    expiresAt: value.expires_at,
  };
}

function attachment(value: unknown): ChatAttachment {
  if (
    !object(value) ||
    !text(value.attachment_id) ||
    !attachmentIdPattern.test(value.attachment_id) ||
    !integer(value.size_bytes, 1) ||
    (value.state !== "pending" && value.state !== "committed") ||
    (value.owner_kind !== undefined &&
      value.owner_kind !== "message" &&
      value.owner_kind !== "summary") ||
    (value.owner_id !== undefined && !id(value.owner_id)) ||
    !timestamp(value.created_at) ||
    (value.committed_at !== undefined && !timestamp(value.committed_at))
  )
    invalid();
  return {
    id: value.attachment_id,
    sizeBytes: value.size_bytes,
    state: value.state,
    ...(value.owner_kind !== undefined ? { ownerKind: value.owner_kind } : {}),
    ...(value.owner_id !== undefined ? { ownerId: value.owner_id } : {}),
    createdAt: value.created_at,
    ...(value.committed_at !== undefined ? { committedAt: value.committed_at } : {}),
  };
}

function ref(value: unknown): ChatRef {
  if (!object(value) || !text(value.kind) || !kinds.has(value.kind) || !id(value.id)) invalid();
  return { kind: value.kind as ChatRecordKind, id: value.id };
}

function sameMetadata(a: ChatRecord, b: ChatRecord): boolean {
  return metadata.every((key) => a[key] === b[key]);
}

function wire(record: ChatRecord, payload: string): WireRecord {
  return {
    kind: record.kind,
    id: record.id,
    conversation_id: record.conversationId,
    sort_key: record.sortKey,
    created_at: record.createdAt,
    updated_at: record.updatedAt,
    is_deleted: record.isDeleted,
    payload,
  };
}

function invalid(): never {
  throw new ChatStoreError("Invalid encrypted chat record or response", 0, "invalid_record");
}

/** Connect to owner-scoped server storage using the account's canonical device-held cipher. */
export async function createRemoteChatStore(options: RemoteChatStoreOptions): Promise<ChatStore> {
  if (
    !options.keyId ||
    new TextEncoder().encode(options.keyId).length > 256 ||
    hasControl(options.keyId)
  )
    invalid();
  const keyId = options.keyId;
  const encrypt = options.encrypt;
  const decrypt = options.decrypt;
  const nearby = createNearbyRequest({ ...options }, "/api/private-chats");
  const request: typeof nearby = async (...args) => {
    try {
      return await nearby(...args);
    } catch (error) {
      if (error instanceof RemoteMemoryError)
        throw new ChatStoreError(error.message, error.status, error.code, error.retryAfterMs);
      throw error;
    }
  };
  const account = await request("/account", {}, options.signal);
  if (!object(account) || !integer(account.account_id, 1) || typeof account.key_id !== "string")
    invalid();
  const accountId = account.account_id;
  if (account.key_id && account.key_id !== keyId)
    throw new ChatStoreError("Canonical chat key does not match", 409, "key_mismatch");

  const decode = async (value: unknown): Promise<ChatSnapshot> => {
    if (
      !object(value) ||
      !object(value.record) ||
      !integer(value.version, 1) ||
      typeof value.server_updated_at !== "string" ||
      !Number.isFinite(Date.parse(value.server_updated_at))
    )
      invalid();
    const r = value.record;
    const plain = {
      kind: r.kind,
      id: r.id,
      conversationId: r.conversation_id,
      sortKey: r.sort_key,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      isDeleted: r.is_deleted,
      data: {},
    };
    if (!validRecord(plain) || typeof r.payload !== "string" || r.payload.length > maxPayload)
      invalid();
    if (plain.isDeleted && r.payload === "")
      return { record: plain, version: value.version, serverUpdatedAt: value.server_updated_at };
    if (!cipherPattern.test(r.payload)) invalid();
    const envelope: unknown = JSON.parse(await decrypt(r.payload));
    if (
      !object(envelope) ||
      envelope.schema !== 1 ||
      envelope.account_id !== accountId ||
      envelope.key_id !== keyId ||
      !validRecord(envelope.record) ||
      !sameMetadata(plain, envelope.record)
    )
      invalid();
    return {
      record: envelope.record,
      version: value.version,
      serverUpdatedAt: value.server_updated_at,
    };
  };

  const seal = async (record: ChatRecord, signal?: AbortSignal): Promise<string> => {
    if (record.isDeleted) return "";
    const payload = await encrypt(
      JSON.stringify({ schema: 1, account_id: accountId, key_id: keyId, record })
    );
    signal?.throwIfAborted();
    if (!cipherPattern.test(payload) || payload.length > maxPayload) invalid();
    return payload;
  };

  const capture = <
    T extends { record: ChatRecord; embeddings?: number[][]; embeddingModel?: string },
  >(
    items: readonly T[],
    max: number,
    signal?: AbortSignal
  ): T[] => {
    if (!Array.isArray(items) || items.length < 1 || items.length > max) invalid();
    const seen = new Set<string>();
    let chunks = 0;
    return items.map((item: T) => {
      signal?.throwIfAborted();
      if (!validRecord(item.record) || !embeddings(item)) invalid();
      chunks += item.embeddings?.length ?? 0;
      if (chunks > maxChunksPerRequest) invalid();
      const copy = JSON.parse(JSON.stringify(item)) as T;
      const recordKey = `${copy.record.kind}/${copy.record.id}`;
      if (seen.has(recordKey)) invalid();
      seen.add(recordKey);
      return copy;
    });
  };

  const putMany = async (
    writes: readonly ChatWrite[],
    signal?: AbortSignal
  ): Promise<ChatSnapshot[]> => {
    if (Array.isArray(writes) && writes.some((w: ChatWrite) => !integer(w.expectedVersion)))
      invalid();
    const captured = capture(writes, 25, signal);
    let bytes = 0;
    const prepared: ({ record: WireRecord; expected_version: number } & ReturnType<
      typeof vectorFields
    >)[] = [];
    for (const write of captured) {
      const payload = await seal(write.record, signal);
      bytes += payload.length;
      if (bytes > maxRequestCiphertext) invalid();
      prepared.push({
        record: wire(write.record, payload),
        expected_version: write.expectedVersion,
        ...vectorFields(write),
      });
    }
    const result = await request(
      "/records/batch",
      {
        method: "POST",
        body: JSON.stringify({ account_id: accountId, key_id: keyId, writes: prepared }),
      },
      signal
    );
    if (!object(result) || !Array.isArray(result.items) || result.items.length !== prepared.length)
      invalid();
    const out: ChatSnapshot[] = [];
    for (let i = 0; i < result.items.length; i++) {
      const value: unknown = result.items[i];
      const deleted = prepared[i].record.is_deleted;
      if (
        !object(value) ||
        !object(value.record) ||
        value.record.kind !== prepared[i].record.kind ||
        value.record.id !== prepared[i].record.id ||
        value.record.payload !== prepared[i].record.payload ||
        (deleted
          ? value.record.is_deleted !== true || !integer(value.version, 1)
          : value.version !== prepared[i].expected_version + 1)
      )
        invalid();
      out.push(await decode(value));
    }
    signal?.throwIfAborted();
    return out;
  };

  return {
    async get(kind, recordId, signal) {
      if (!kinds.has(kind) || !id(recordId)) invalid();
      let value: unknown;
      try {
        value = await request(
          `/records/${kind}/${encodeURIComponent(recordId)}?account_id=${accountId}`,
          {},
          signal
        );
      } catch (error) {
        if (error instanceof ChatStoreError && error.status === 404) return null;
        throw error;
      }
      const result = await decode(value);
      if (result.record.kind !== kind || result.record.id !== recordId) invalid();
      signal?.throwIfAborted();
      return result;
    },
    async list(query) {
      const limit = query.limit ?? 20;
      const parent = query.conversationId ?? "";
      if (
        !kinds.has(query.kind) ||
        !integer(limit, 1) ||
        (query.includeDeleted !== undefined && typeof query.includeDeleted !== "boolean") ||
        limit > 200 ||
        (query.cursor?.length ?? 0) > 2048 ||
        (rootKind(query.kind) ? parent !== "" : !id(parent))
      )
        invalid();
      const params = new URLSearchParams({
        account_id: String(accountId),
        kind: query.kind,
        limit: String(limit),
        conversation_id: parent,
        include_deleted: String(query.includeDeleted ?? false),
      });
      if (query.cursor) params.set("cursor", query.cursor);
      const value = await request(`/records?${params}`, {}, query.signal);
      if (
        !object(value) ||
        !Array.isArray(value.items) ||
        value.items.length > limit ||
        (value.next_cursor !== undefined &&
          (typeof value.next_cursor !== "string" || value.next_cursor.length > 2048)) ||
        (value.total !== undefined && !integer(value.total))
      )
        invalid();
      const items: ChatSnapshot[] = [];
      for (const item of value.items) {
        const result = await decode(item);
        if (
          result.record.kind !== query.kind ||
          result.record.conversationId !== parent ||
          (!query.includeDeleted && result.record.isDeleted)
        )
          invalid();
        items.push(result);
      }
      query.signal?.throwIfAborted();
      return {
        items,
        ...(value.next_cursor ? { nextCursor: value.next_cursor } : {}),
        ...(value.total !== undefined ? { total: value.total } : {}),
      };
    },
    putMany,
    async getMany(refs, signal) {
      if (!Array.isArray(refs)) invalid();
      const wanted = new Map<string, ChatRef>();
      for (const r of refs) {
        const checked = ref(r);
        wanted.set(`${checked.kind}/${checked.id}`, checked);
      }
      const found = new Map<string, ChatSnapshot>();
      let pending = [...wanted.values()];
      while (pending.length > 0) {
        const batch = pending.slice(0, maxGetRefs);
        pending = pending.slice(maxGetRefs);
        const value = await request(
          "/records/get",
          { method: "POST", body: JSON.stringify({ account_id: accountId, refs: batch }) },
          signal
        );
        if (
          !object(value) ||
          !Array.isArray(value.items) ||
          (value.remaining !== undefined && !Array.isArray(value.remaining))
        )
          invalid();
        const asked = new Set(batch.map((r) => `${r.kind}/${r.id}`));
        for (const item of value.items) {
          const snapshot = await decode(item);
          const key = `${snapshot.record.kind}/${snapshot.record.id}`;
          if (!asked.has(key) || found.has(key)) invalid();
          found.set(key, snapshot);
        }
        const remaining = ((value.remaining as unknown[] | undefined) ?? []).map(ref);
        if (
          remaining.some((r) => !asked.has(`${r.kind}/${r.id}`) || found.has(`${r.kind}/${r.id}`))
        )
          invalid();
        if (remaining.length > 0 && value.items.length === 0) invalid();
        pending = [...remaining, ...pending];
      }
      signal?.throwIfAborted();
      return [...wanted.keys()].flatMap((key) => {
        const snapshot = found.get(key);
        return snapshot ? [snapshot] : [];
      });
    },
    async account(signal) {
      const value = await request("/account", {}, signal);
      if (
        !object(value) ||
        value.account_id !== accountId ||
        !text(value.key_id) ||
        (value.state !== "none" && value.state !== "migrating" && value.state !== "active") ||
        !integer(value.record_count) ||
        !integer(value.storage_bytes) ||
        !integer(value.vector_count) ||
        (value.changes_cursor !== undefined &&
          (!text(value.changes_cursor) || value.changes_cursor.length > 2048))
      )
        invalid();
      if (value.key_id && value.key_id !== keyId)
        throw new ChatStoreError("Canonical chat key does not match", 409, "key_mismatch");
      const out: ChatAccount = {
        keyId: value.key_id,
        state: value.state,
        recordCount: value.record_count,
        storageBytes: value.storage_bytes,
        vectorCount: value.vector_count,
        ...(value.changes_cursor ? { changesCursor: value.changes_cursor } : {}),
      };
      return out;
    },
    async importRecords(records, signal) {
      const captured = capture<ChatImport>(records, maxImportRecords, signal);
      let bytes = 0;
      const prepared = [];
      for (const item of captured) {
        const payload = await seal(item.record, signal);
        bytes += payload.length;
        if (bytes > maxRequestCiphertext) invalid();
        prepared.push({ record: wire(item.record, payload), ...vectorFields(item) });
      }
      const value = await request(
        "/import",
        {
          method: "POST",
          body: JSON.stringify({ account_id: accountId, key_id: keyId, records: prepared }),
        },
        signal
      );
      if (!object(value) || !integer(value.written) || value.written > prepared.length) invalid();
      return value.written;
    },
    async verify(revisions, signal) {
      if (!Array.isArray(revisions) || revisions.length > maxVerifyRevisions) invalid();
      const asked = new Set<string>();
      const wireRevisions = revisions.map((r: ChatRevision) => {
        const checked = ref(r);
        if (!integer(r.updatedAt, 1) || typeof r.isDeleted !== "boolean") invalid();
        asked.add(`${checked.kind}/${checked.id}`);
        return {
          kind: checked.kind,
          id: checked.id,
          updated_at: r.updatedAt,
          is_deleted: r.isDeleted,
        };
      });
      if (wireRevisions.length === 0) return [];
      const value = await request(
        "/verify",
        {
          method: "POST",
          body: JSON.stringify({ account_id: accountId, revisions: wireRevisions }),
        },
        signal
      );
      if (!object(value) || !Array.isArray(value.missing)) invalid();
      const missing = value.missing.map(ref);
      if (missing.some((r) => !asked.has(`${r.kind}/${r.id}`))) invalid();
      return missing;
    },
    async activate(signal) {
      const value = await request(
        "/account",
        { method: "PUT", body: JSON.stringify({ account_id: accountId, state: "active" }) },
        signal
      );
      if (!object(value) || value.state !== "active" || typeof value.transitioned !== "boolean")
        invalid();
      return value.transitioned;
    },
    async changes(cursor, options) {
      const limit = options?.limit ?? 100;
      const kindsFilter = options?.kinds;
      if (
        !integer(limit, 1) ||
        limit > 200 ||
        (cursor !== undefined && (!text(cursor) || cursor.length > 2048)) ||
        (kindsFilter !== undefined &&
          (!Array.isArray(kindsFilter) ||
            kindsFilter.length === 0 ||
            new Set(kindsFilter).size !== kindsFilter.length ||
            kindsFilter.some((k) => !kinds.has(k))))
      )
        invalid();
      const params = new URLSearchParams({ account_id: String(accountId), limit: String(limit) });
      if (cursor) params.set("cursor", cursor);
      if (kindsFilter) params.set("kinds", kindsFilter.join(","));
      const value = await request(`/changes?${params}`, {}, options?.signal);
      if (
        !object(value) ||
        !Array.isArray(value.items) ||
        value.items.length > limit ||
        (value.next_cursor !== undefined && !text(value.next_cursor)) ||
        (value.changes_cursor !== undefined && !text(value.changes_cursor))
      )
        invalid();
      const items: ChatSnapshot[] = [];
      for (const item of value.items) items.push(await decode(item));
      options?.signal?.throwIfAborted();
      return {
        items,
        ...(value.next_cursor ? { nextCursor: value.next_cursor } : {}),
        changesCursor: value.changes_cursor ?? cursor ?? "",
      };
    },
    async search(embedding, options) {
      const limit = options?.limit ?? 20;
      const kindsFilter = options?.kinds;
      if (
        !Array.isArray(embedding) ||
        !embeddings({
          record: { ...emptyMessage, isDeleted: false },
          embeddings: [embedding as number[]],
        }) ||
        !integer(limit, 1) ||
        limit > 50 ||
        (kindsFilter !== undefined &&
          (!Array.isArray(kindsFilter) ||
            kindsFilter.length === 0 ||
            kindsFilter.some((k) => k !== "message" && k !== "summary"))) ||
        (options?.conversationId !== undefined && !id(options.conversationId)) ||
        (options?.excludeConversationId !== undefined && !id(options.excludeConversationId)) ||
        (options?.embeddingModel !== undefined &&
          (!text(options.embeddingModel) || options.embeddingModel.length > 256))
      )
        invalid();
      const value = await request(
        "/search",
        {
          method: "POST",
          body: JSON.stringify({
            account_id: accountId,
            embedding: embedding.slice(0, storedDims),
            limit,
            ...(kindsFilter ? { kinds: kindsFilter } : {}),
            ...(options?.conversationId ? { conversation_id: options.conversationId } : {}),
            ...(options?.excludeConversationId
              ? { exclude_conversation_id: options.excludeConversationId }
              : {}),
            ...(options?.embeddingModel ? { embedding_model: options.embeddingModel } : {}),
          }),
        },
        options?.signal
      );
      if (!object(value) || !Array.isArray(value.items) || value.items.length > limit) invalid();
      const hits: ChatSearchHit[] = [];
      for (const item of value.items) {
        if (
          !object(item) ||
          !integer(item.chunk) ||
          typeof item.score !== "number" ||
          !Number.isFinite(item.score)
        )
          invalid();
        const snapshot = await decode(item);
        if (
          snapshot.record.isDeleted ||
          (kindsFilter !== undefined &&
            !kindsFilter.includes(snapshot.record.kind as "message" | "summary")) ||
          (snapshot.record.kind !== "message" && snapshot.record.kind !== "summary") ||
          (options?.conversationId !== undefined &&
            snapshot.record.conversationId !== options.conversationId) ||
          snapshot.record.conversationId === options?.excludeConversationId
        )
          invalid();
        hits.push({ ...snapshot, chunk: item.chunk, score: item.score });
      }
      options?.signal?.throwIfAborted();
      return hits;
    },
    async deleteAll(signal) {
      const value = await request(`/records?account_id=${accountId}`, { method: "DELETE" }, signal);
      if (!object(value) || !integer(value.deleted)) invalid();
      return value.deleted;
    },
    attachments: {
      async create(sizeBytes, signal) {
        if (!integer(sizeBytes, 1) || sizeBytes > maxAttachmentBytes) invalid();
        const value = await request(
          "/attachments",
          {
            method: "POST",
            body: JSON.stringify({ account_id: accountId, size_bytes: sizeBytes }),
          },
          signal
        );
        if (!object(value)) invalid();
        const created = attachment(value.attachment);
        if (created.sizeBytes !== sizeBytes || created.state !== "pending") invalid();
        return { attachment: created, upload: presigned(value.upload) };
      },
      async commit(attachmentId, owner, signal) {
        if (
          !attachmentIdPattern.test(attachmentId) ||
          !object(owner) ||
          (owner.kind !== "message" && owner.kind !== "summary") ||
          !id(owner.id)
        )
          invalid();
        const value = await request(
          `/attachments/${attachmentId}/commit`,
          {
            method: "POST",
            body: JSON.stringify({
              account_id: accountId,
              owner_kind: owner.kind,
              owner_id: owner.id,
            }),
          },
          signal
        );
        if (!object(value)) invalid();
        const committed = attachment(value.attachment);
        if (
          committed.id !== attachmentId ||
          committed.state !== "committed" ||
          committed.ownerKind !== owner.kind ||
          committed.ownerId !== owner.id
        )
          invalid();
        return committed;
      },
      async get(attachmentId, signal) {
        if (!attachmentIdPattern.test(attachmentId)) invalid();
        let value: unknown;
        try {
          value = await request(`/attachments/${attachmentId}?account_id=${accountId}`, {}, signal);
        } catch (error) {
          if (error instanceof ChatStoreError && error.status === 404) return null;
          throw error;
        }
        if (!object(value)) invalid();
        const found = attachment(value.attachment);
        if (found.id !== attachmentId) invalid();
        return {
          attachment: found,
          ...(value.download !== undefined ? { download: presigned(value.download) } : {}),
        };
      },
      async delete(attachmentId, signal) {
        if (!attachmentIdPattern.test(attachmentId)) invalid();
        await request(
          `/attachments/${attachmentId}?account_id=${accountId}`,
          { method: "DELETE" },
          signal
        );
      },
    },
  };
}

const emptyMessage: ChatRecord = {
  kind: "message",
  id: "query",
  conversationId: "query",
  sortKey: 0,
  createdAt: 1,
  updatedAt: 1,
  isDeleted: false,
  data: {},
};
