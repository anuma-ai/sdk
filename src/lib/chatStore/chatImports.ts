import type { CreateMessageOptions, StoredConversation, StoredMessage } from "../db/chat/types";
import type { ChatImport } from "./types";
import {
  acceptedVector,
  conversationSortKey,
  fitChunks,
  fitRecord,
  messageData,
  plain,
} from "./vaultRecords";

const importBatch = 100;
const importChunks = 200;
const importPlaintextBytes = 3_900_000;

export function ms(date: Date | undefined, fallback = 1): number {
  const value = date?.getTime();
  return value && Number.isFinite(value) ? Math.max(1, Math.floor(value)) : fallback;
}

export function bytes(value: unknown): number {
  return new TextEncoder().encode(JSON.stringify(value)).length;
}

export function conversationRecord(
  conversation: StoredConversation,
  messages: readonly StoredMessage[]
): ChatImport {
  const createdAt = ms(conversation.createdAt);
  const data = plain({
    title: conversation.title,
    projectId: conversation.projectId || undefined,
    pinnedAt: conversation.pinnedAt ? ms(conversation.pinnedAt) : undefined,
    lastActivityAt: Math.max(
      ms(conversation.updatedAt, createdAt),
      ...messages.map((m) => ms(m.createdAt))
    ),
  });
  return {
    record: {
      kind: "conversation",
      id: conversation.conversationId,
      conversationId: "",
      sortKey: conversationSortKey(data, createdAt),
      createdAt,
      updatedAt: ms(conversation.updatedAt, createdAt),
      isDeleted: false,
      data,
    },
  };
}

export function messageRecord(message: StoredMessage): ChatImport {
  const {
    uniqueId: _uniqueId,
    messageId: _messageId,
    createdAt: _createdAt,
    updatedAt: _updatedAt,
    decryptionStatus: _status,
    chunks,
    vector,
    ...fields
  } = message;
  const fitted = chunks?.length ? fitChunks(chunks) : undefined;
  const single = fitted ? undefined : acceptedVector(vector);
  const embeddings = fitted?.map((c) => c.vector) ?? (single ? [single] : undefined);
  const record = fitRecord({
    kind: "message",
    id: message.uniqueId,
    conversationId: message.conversationId,
    sortKey: message.messageId,
    createdAt: ms(message.createdAt),
    updatedAt: ms(message.updatedAt, ms(message.createdAt)),
    isDeleted: false,
    data: {
      ...messageData(fields as CreateMessageOptions),
      ...(fitted ? { chunkOffsets: fitted.map((c) => [c.startOffset, c.endOffset]) } : {}),
    },
  });
  return {
    record,
    ...(embeddings ? { embeddings } : {}),
    ...(embeddings && message.embeddingModel ? { embeddingModel: message.embeddingModel } : {}),
  };
}

export function batches(records: readonly ChatImport[]): ChatImport[][] {
  const out: ChatImport[][] = [];
  let batch: ChatImport[] = [];
  let chunks = 0;
  let size = 0;
  for (const item of records) {
    const vectors = item.embeddings?.length ?? 0;
    const itemSize = bytes(item.record);
    if (
      batch.length > 0 &&
      (batch.length >= importBatch ||
        chunks + vectors > importChunks ||
        size + itemSize > importPlaintextBytes)
    ) {
      out.push(batch);
      batch = [];
      chunks = 0;
      size = 0;
    }
    batch.push(item);
    chunks += vectors;
    size += itemSize;
  }
  if (batch.length) out.push(batch);
  return out;
}
