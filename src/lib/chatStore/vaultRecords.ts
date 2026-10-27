import type {
  CreateMessageOptions,
  MessageChunk,
  MessageSkeleton,
  StoredConversation,
  StoredConversationSummary,
  StoredMessage,
} from "../db/chat/types";
import { MAX_PER_CONVERSATION } from "../db/conversationMemory/operations";
import type {
  ConversationMemoryInput,
  StoredConversationMemory,
} from "../db/conversationMemory/types";
import type { ChatJson, ChatRecord } from "./types";

export type ChatData = { [key: string]: ChatJson };

const PINNED_SORT_BASE = 2 ** 51;
const recordBudgetBytes = 1_040_000;
const storedDims = 1536;
const acceptedDims = new Set([1536, 4096]);
const maxChunks = 16;
const droppable = ["thoughtProcess", "thinking", "sources", "toolCallEvents"] as const;
const messageMetadata = new Set(["conversationId", "uniqueId", "vector", "chunks"]);
const alwaysStored = new Set(["role", "content", "responseDuration"]);

export function plain(value: unknown): ChatData {
  return JSON.parse(JSON.stringify(value ?? {})) as ChatData;
}

function text(value: ChatJson | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function number(value: ChatJson | undefined): number | undefined {
  return typeof value === "number" ? value : undefined;
}

export function conversationSortKey(data: ChatData, createdAt: number): number {
  const pinnedAt = number(data.pinnedAt);
  if (pinnedAt) return PINNED_SORT_BASE + pinnedAt;
  return number(data.lastActivityAt) ?? createdAt;
}

export function toConversation(record: ChatRecord): StoredConversation {
  const pinnedAt = number(record.data.pinnedAt);
  const projectId = text(record.data.projectId);
  return {
    uniqueId: record.id,
    conversationId: record.id,
    title: text(record.data.title) ?? "",
    ...(projectId ? { projectId } : {}),
    createdAt: new Date(record.createdAt),
    updatedAt: new Date(record.updatedAt),
    isDeleted: record.isDeleted,
    pinnedAt: pinnedAt ? new Date(pinnedAt) : null,
  };
}

export function messageData(options: CreateMessageOptions): ChatData {
  return plain(
    Object.fromEntries(
      Object.entries(options).filter(
        ([key, value]) => !messageMetadata.has(key) && (!!value || alwaysStored.has(key))
      )
    )
  );
}

export function toMessage(record: ChatRecord): StoredMessage {
  const { chunkOffsets: _offsets, truncated: _truncated, ...fields } = record.data;
  return {
    ...(fields as unknown as Omit<
      StoredMessage,
      "uniqueId" | "messageId" | "conversationId" | "createdAt" | "updatedAt"
    >),
    uniqueId: record.id,
    messageId: record.sortKey,
    conversationId: record.conversationId,
    createdAt: new Date(record.createdAt),
    updatedAt: new Date(record.updatedAt),
  };
}

/** Byte offsets of each stored vector's chunk in the content; absent means the whole message. */
export function chunkOffsets(record: ChatRecord): [number, number][] | undefined {
  const offsets = record.data.chunkOffsets;
  return Array.isArray(offsets) ? (offsets as [number, number][]) : undefined;
}

export function toSkeletons(records: readonly ChatRecord[]): MessageSkeleton[] {
  const roleById = new Map(records.map((r) => [r.id, text(r.data.role)]));
  return records.map((r) => {
    const parentMessageId = text(r.data.parentMessageId);
    const model = text(r.data.model);
    const artifact =
      r.data.role === "user" && !!parentMessageId && roleById.get(parentMessageId) === "user";
    return {
      uniqueId: r.id,
      messageId: r.sortKey,
      conversationId: r.conversationId,
      role: (text(r.data.role) ?? "") as MessageSkeleton["role"],
      createdAt: new Date(r.createdAt),
      ...(parentMessageId ? { parentMessageId } : {}),
      ...(model ? { model } : {}),
      ...(artifact ? { content: text(r.data.content) ?? "" } : {}),
    };
  });
}

export function toSummary(record: ChatRecord): StoredConversationSummary {
  return {
    uniqueId: record.id,
    conversationId: record.id,
    summary: text(record.data.summary) ?? "",
    summarizedUpTo: text(record.data.summarizedUpTo) ?? "",
    tokenCount: number(record.data.tokenCount) ?? 0,
    createdAt: new Date(record.createdAt),
    updatedAt: new Date(record.updatedAt),
  };
}

interface Link {
  memoryId: string;
  score: number;
  createdAt: number;
}

export type LinkOp = { clear: true } | { add: ConversationMemoryInput[]; at: number };

function links(data: ChatData): Link[] {
  return Array.isArray(data.links) ? (data.links as unknown as Link[]) : [];
}

export function applyLinkOps(data: ChatData, ops: readonly LinkOp[]): ChatData {
  let current = links(data);
  for (const op of ops) {
    if ("clear" in op) {
      current = [];
      continue;
    }
    const seen = new Set(current.map((l) => l.memoryId));
    const added: Link[] = [];
    for (const item of op.add) {
      if (!item.memoryId || seen.has(item.memoryId)) continue;
      seen.add(item.memoryId);
      added.push({ memoryId: item.memoryId, score: item.score, createdAt: op.at + added.length });
    }
    current = [...current, ...added].slice(-MAX_PER_CONVERSATION);
  }
  return plain({ links: current });
}

export function toLinks(record: ChatRecord): StoredConversationMemory[] {
  return links(record.data).map((l) => ({
    uniqueId: `${record.id}:${l.memoryId}`,
    conversationId: record.id,
    memoryId: l.memoryId,
    score: l.score,
    createdAt: new Date(l.createdAt),
  }));
}

function bytes(value: unknown): number {
  return new TextEncoder().encode(JSON.stringify(value)).length;
}

/** Shrinks a message until its record fits vault's payload limit, marking what it dropped. */
export function fitRecord(record: ChatRecord): ChatRecord {
  if (record.kind !== "message" || bytes(record) <= recordBudgetBytes) return record;
  const data: ChatData = { ...record.data };
  const truncated: string[] = [];
  for (const field of droppable) {
    if (bytes({ ...record, data }) <= recordBudgetBytes) break;
    if (data[field] === undefined) continue;
    delete data[field];
    truncated.push(field);
  }
  const content = text(data.content) ?? "";
  const over = bytes({ ...record, data }) - recordBudgetBytes;
  if (over > 0) {
    const encoded = new TextEncoder().encode(content);
    data.content = new TextDecoder()
      .decode(encoded.slice(0, Math.max(0, encoded.length - over - 64)))
      .replace(/�$/, "");
    truncated.push("content");
  }
  return { ...record, data: { ...data, truncated } };
}

export function acceptedVector(vector: readonly number[] | undefined): number[] | undefined {
  if (!vector || !acceptedDims.has(vector.length)) return undefined;
  if (!vector.every(Number.isFinite) || !vector.slice(0, storedDims).some((x) => x !== 0))
    return undefined;
  return [...vector];
}

function normalized(vector: number[]): number[] {
  const norm = Math.hypot(...vector) || 1;
  return vector.map((x) => x / norm);
}

/** Folds a message's chunks into at most 16 by averaging neighbours, so long messages stay searchable. */
export function fitChunks(chunks: readonly MessageChunk[]): MessageChunk[] | undefined {
  const usable = chunks.map((c) => ({ ...c, vector: acceptedVector(c.vector) }));
  if (usable.length === 0 || usable.some((c) => !c.vector)) return undefined;
  if (usable.length <= maxChunks) return usable as MessageChunk[];
  const out: MessageChunk[] = [];
  for (let g = 0; g < maxChunks; g++) {
    const group = usable.slice(
      Math.floor((g * usable.length) / maxChunks),
      Math.floor(((g + 1) * usable.length) / maxChunks)
    );
    const dims = group[0].vector!.length;
    const mean = new Array<number>(dims).fill(0);
    for (const c of group) for (let d = 0; d < dims; d++) mean[d] += normalized(c.vector!)[d];
    out.push({
      vector: normalized(mean),
      startOffset: group[0].startOffset,
      endOffset: group[group.length - 1].endOffset,
    });
  }
  return out;
}
