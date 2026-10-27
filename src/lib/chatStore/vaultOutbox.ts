import type { ChatJson, ChatRecord, ChatRecordKind, ChatWrite } from "./types";
import {
  applyLinkOps,
  type ChatData,
  conversationSortKey,
  fitRecord,
  type LinkOp,
} from "./vaultRecords";

export interface ChatPatch {
  seq: number;
  kind: ChatRecordKind;
  id: string;
  conversationId: string;
  create?: { sortKey: number; createdAt: number; data: ChatData };
  set?: { [field: string]: ChatJson };
  linkOps?: LinkOp[];
  delete?: true;
  embeddings?: number[][];
  embeddingModel?: string;
  updatedAt: number;
  attempted?: true;
}

/** Durable home for sealed outbox slots, one per running backend, so writes survive a reload while vault is unreachable. */
export interface ChatOutboxStorage {
  slots(): Promise<string[]>;
  get(slot: string): Promise<string | null>;
  set(slot: string, sealed: string | null): Promise<void>;
}

/** The part of the Web Locks API the outbox uses to tell a live tab's slot from an orphaned one. */
export interface ChatOutboxLocks {
  request<T>(
    name: string,
    options: { ifAvailable?: boolean },
    callback: (lock: object | null) => Promise<T> | T
  ): Promise<T>;
}

export function patchKey(patch: Pick<ChatPatch, "kind" | "id">): string {
  return `${patch.kind}/${patch.id}`;
}

export function mergePatch(earlier: ChatPatch, later: ChatPatch): ChatPatch {
  return {
    seq: earlier.seq,
    kind: earlier.kind,
    id: earlier.id,
    conversationId: earlier.conversationId,
    ...(earlier.create ? { create: earlier.create } : {}),
    ...(earlier.set || later.set ? { set: { ...earlier.set, ...later.set } } : {}),
    ...(earlier.linkOps || later.linkOps
      ? { linkOps: [...(earlier.linkOps ?? []), ...(later.linkOps ?? [])] }
      : {}),
    ...(earlier.delete || later.delete ? { delete: true as const } : {}),
    ...((later.embeddings ?? earlier.embeddings)
      ? { embeddings: later.embeddings ?? earlier.embeddings }
      : {}),
    ...((later.embeddingModel ?? earlier.embeddingModel)
      ? { embeddingModel: later.embeddingModel ?? earlier.embeddingModel }
      : {}),
    updatedAt: Math.max(earlier.updatedAt, later.updatedAt),
    ...(earlier.attempted || later.attempted ? { attempted: true as const } : {}),
  };
}

function withoutNulls(data: ChatData): ChatData {
  return Object.fromEntries(Object.entries(data).filter(([, value]) => value !== null));
}

export function applyPatch(base: ChatRecord | undefined, patch: ChatPatch): ChatRecord | undefined {
  if (base?.isDeleted) return base;
  if (patch.delete && !base) return undefined;
  const start: ChatRecord | undefined =
    base ??
    (patch.create && {
      kind: patch.kind,
      id: patch.id,
      conversationId: patch.conversationId,
      sortKey: patch.create.sortKey,
      createdAt: patch.create.createdAt,
      updatedAt: patch.updatedAt,
      isDeleted: false,
      data: patch.create.data,
    });
  if (!start) return undefined;
  const updatedAt = Math.max(start.updatedAt, patch.updatedAt);
  if (patch.delete) return { ...start, isDeleted: true, data: {}, updatedAt };
  let data: ChatData = { ...start.data, ...patch.set };
  if (patch.kind === "conversation") {
    const before = typeof start.data.lastActivityAt === "number" ? start.data.lastActivityAt : 0;
    const after = typeof data.lastActivityAt === "number" ? data.lastActivityAt : 0;
    data.lastActivityAt = Math.max(before, after);
  }
  if (patch.linkOps) data = applyLinkOps(data, patch.linkOps);
  data = withoutNulls(data);
  return {
    ...start,
    data,
    updatedAt,
    sortKey:
      patch.kind === "conversation" ? conversationSortKey(data, start.createdAt) : start.sortKey,
  };
}

function sameJson(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function sameRecord(a: ChatRecord, b: ChatRecord): boolean {
  return a.sortKey === b.sortKey && a.isDeleted === b.isDeleted && sameJson(a.data, b.data);
}

export function toWrite(
  base: { record: ChatRecord; version: number } | undefined,
  patch: ChatPatch
): ChatWrite | null | undefined {
  const record = applyPatch(base?.record, patch);
  if (!record) return undefined;
  if (base && patch.embeddings === undefined && sameRecord(base.record, record)) return null;
  return {
    record: fitRecord(record),
    expectedVersion: base?.version ?? 0,
    ...(patch.embeddings !== undefined && !record.isDeleted
      ? { embeddings: patch.embeddings }
      : {}),
    ...(patch.embeddingModel !== undefined && !record.isDeleted
      ? { embeddingModel: patch.embeddingModel }
      : {}),
  };
}

const maxWrites = 25;
const maxChunks = 200;
const maxPlaintextBytes = 3_900_000;

export function nextBatch(patches: Iterable<ChatPatch>, limit = maxWrites): ChatPatch[] {
  const batch: ChatPatch[] = [];
  let chunks = 0;
  let bytes = 0;
  for (const patch of patches) {
    const size = JSON.stringify(patch).length;
    const vectors = patch.embeddings?.length ?? 0;
    if (
      batch.length > 0 &&
      (batch.length >= limit || chunks + vectors > maxChunks || bytes + size > maxPlaintextBytes)
    )
      break;
    batch.push(patch);
    chunks += vectors;
    bytes += size;
  }
  return batch;
}

export async function saveOutbox(
  storage: ChatOutboxStorage,
  slot: string,
  encrypt: (plaintext: string) => Promise<string>,
  patches: readonly ChatPatch[]
): Promise<void> {
  await storage.set(
    slot,
    patches.length ? await encrypt(JSON.stringify({ schema: 1, patches })) : null
  );
}

export async function loadOutbox(
  storage: ChatOutboxStorage,
  slot: string,
  decrypt: (ciphertext: string) => Promise<string>
): Promise<ChatPatch[]> {
  const sealed = await storage.get(slot);
  if (!sealed) return [];
  const parsed = JSON.parse(await decrypt(sealed)) as { schema?: number; patches?: ChatPatch[] };
  return parsed.schema === 1 && Array.isArray(parsed.patches) ? parsed.patches : [];
}
