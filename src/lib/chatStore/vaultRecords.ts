import type {
  AnumaTurn,
  AnumaTurnOrigin,
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
import { type ChatJson, type ChatRecord, ChatStoreError } from "./types";

export type ChatData = { [key: string]: ChatJson };

const PINNED_SORT_BASE = 2 ** 51;
const recordBudgetBytes = 1_040_000;
const storedDims = 1536;
const acceptedDims = new Set([1536, 4096]);
const maxChunks = 16;
const droppable = ["thoughtProcess", "thinking", "sources", "toolCallEvents"] as const;
const messageMetadata = new Set(["conversationId", "uniqueId", "vector", "chunks"]);
const alwaysStored = new Set(["role", "content", "responseDuration"]);
const maxBubbles = 3;
const maxTurnIdBytes = 128;
// Keeps a valid turn far below recordBudgetBytes so fitRecord never cuts a bubbled turn's content.
const maxBubbleBytes = 16_384;
const anumaOrigins = new Set<string>(["intro", "reply"]);

export function plain(value: unknown): ChatData {
  return JSON.parse(JSON.stringify(value ?? {})) as ChatData;
}

function text(value: ChatJson | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function number(value: ChatJson | undefined): number | undefined {
  return typeof value === "number" ? value : undefined;
}

/** Returns `value` as an {@link AnumaTurn} when it is one, otherwise `undefined`. */
export function readAnumaTurn(value: unknown): AnumaTurn | undefined {
  if (!isObject(value)) return undefined;
  const { turnId, bubbles, origin } = value;
  if (
    typeof turnId !== "string" ||
    turnId.length === 0 ||
    new TextEncoder().encode(turnId).length > maxTurnIdBytes
  )
    return undefined;
  if (
    bubbles !== undefined &&
    (!Array.isArray(bubbles) ||
      bubbles.length < 1 ||
      bubbles.length > maxBubbles ||
      !bubbles.every((b) => typeof b === "string") ||
      bubbles.reduce((sum: number, b: string) => sum + new TextEncoder().encode(b).length, 0) >
        maxBubbleBytes)
  )
    return undefined;
  if (origin !== undefined && (typeof origin !== "string" || !anumaOrigins.has(origin)))
    return undefined;
  return {
    turnId,
    ...(bubbles !== undefined ? { bubbles: [...bubbles] } : {}),
    ...(origin !== undefined ? { origin: origin as AnumaTurnOrigin } : {}),
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
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

export function anumaTurnData(value: unknown): AnumaTurn | undefined {
  if (value === undefined) return undefined;
  const turn = readAnumaTurn(value);
  if (!turn) throw new ChatStoreError("Invalid Anuma turn", 0, "invalid_record");
  return turn;
}

export function messageData(options: CreateMessageOptions): ChatData {
  const anuma = anumaTurnData(options.anuma);
  return plain({
    ...Object.fromEntries(
      Object.entries(options).filter(
        ([key, value]) =>
          key !== "anuma" && !messageMetadata.has(key) && (!!value || alwaysStored.has(key))
      )
    ),
    ...(anuma ? { anuma } : {}),
  });
}

export function toMessage(record: ChatRecord): StoredMessage {
  const { chunkOffsets: _offsets, truncated: _truncated, anuma: rawAnuma, ...fields } = record.data;
  const anuma = readAnumaTurn(rawAnuma);
  return {
    ...(anuma ? { anuma } : {}),
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
    const byId = new Map(current.map((l) => [l.memoryId, l]));
    const turn = new Set<string>();
    op.add.forEach((item, i) => {
      if (!item.memoryId || turn.has(item.memoryId)) return;
      turn.add(item.memoryId);
      const known = byId.get(item.memoryId);
      if (known && known.createdAt >= op.at + i) return;
      byId.set(item.memoryId, { memoryId: item.memoryId, score: item.score, createdAt: op.at + i });
    });
    current = [...byId.values()]
      .sort((a, b) => a.createdAt - b.createdAt)
      .slice(-MAX_PER_CONVERSATION);
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
    for (const c of group) {
      const unit = normalized(c.vector!);
      for (let d = 0; d < dims; d++) mean[d] += unit[d];
    }
    out.push({
      vector: normalized(mean),
      startOffset: group[0].startOffset,
      endOffset: group[group.length - 1].endOffset,
    });
  }
  return out;
}
