import { createNearbyRequest, RemoteMemoryError } from "../memory/store/remotePersistence.js";
import {
  type ChatJson,
  type ChatRecord,
  type ChatRecordKind,
  type ChatSnapshot,
  type ChatStore,
  ChatStoreError,
  type ChatWrite,
  type RemoteChatStoreOptions,
} from "./types.js";

const kinds = new Set(["conversation", "message", "summary", "project", "memory_links"]);
const cipherPattern = /^enc:v\d+:(?:[0-9a-f]{2}){28,}$/i;
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
  const root = value.kind === "conversation" || value.kind === "project";
  return root ? value.conversationId === "" && value.sortKey === 0 : id(value.conversationId);
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
    if (
      !validRecord(plain) ||
      typeof r.payload !== "string" ||
      r.payload.length > 2 * 1024 * 1024 ||
      !cipherPattern.test(r.payload)
    )
      invalid();
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

  const putMany = async (
    writes: readonly ChatWrite[],
    signal?: AbortSignal
  ): Promise<ChatSnapshot[]> => {
    if (!Array.isArray(writes) || writes.length < 1 || writes.length > 25) invalid();
    const seen = new Set<string>();
    const captured = writes.map((write: ChatWrite) => {
      signal?.throwIfAborted();
      if (!validRecord(write.record) || !integer(write.expectedVersion)) invalid();
      const record: ChatRecord = JSON.parse(JSON.stringify(write.record)) as ChatRecord;
      const recordKey = `${record.kind}/${record.id}`;
      if (seen.has(recordKey)) invalid();
      seen.add(recordKey);
      return { record, expectedVersion: write.expectedVersion };
    });
    let bytes = 0;
    const prepared: { record: WireRecord; expected_version: number }[] = [];
    for (const write of captured) {
      const record = write.record;
      const payload = await encrypt(
        JSON.stringify({ schema: 1, account_id: accountId, key_id: keyId, record })
      );
      signal?.throwIfAborted();
      if (!cipherPattern.test(payload) || payload.length > 2 * 1024 * 1024) invalid();
      bytes += payload.length;
      if (bytes > 8 * 1024 * 1024) invalid();
      prepared.push({ record: wire(record, payload), expected_version: write.expectedVersion });
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
      if (
        !object(value) ||
        value.version !== prepared[i].expected_version + 1 ||
        !object(value.record) ||
        value.record.payload !== prepared[i].record.payload
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
        limit > 50 ||
        (query.cursor?.length ?? 0) > 2048 ||
        (query.kind === "conversation" || query.kind === "project" ? parent !== "" : !id(parent))
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
          (typeof value.next_cursor !== "string" || value.next_cursor.length > 2048))
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
      return { items, ...(value.next_cursor ? { nextCursor: value.next_cursor } : {}) };
    },
    putMany,
  };
}
