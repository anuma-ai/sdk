import type { Collection, Database } from "@nozbe/watermelondb";
import { Q } from "@nozbe/watermelondb";
import { v7 as uuidv7 } from "uuid";

import type { EmbeddedWalletSignerFn, SignMessageFn } from "../../../react/useEncryption";
import { requestEncryptionKey } from "../../../react/useEncryption";
import { getLogger } from "../../logger";
import { cosineSimilarity } from "../../memoryEngine/vector";
import { decodeChunkVector } from "../../memoryEngine/vectorEncoding";
import { decryptJsonField } from "../encryption-utils";
import { ExtractionJob } from "../extractionJobs/models";
import { decryptConversationFields, encryptConversationFields } from "./conversationEncryption";
import {
  decryptField,
  decryptMessageFields,
  encryptMessageFields,
  isEncrypted,
} from "./encryption";
import { Conversation, Message } from "./models";
import {
  type ChunkSearchResult,
  type CreateConversationOptions,
  type CreateMessageOptions,
  generateConversationId,
  type GetConversationsPageOptions,
  type GetMessagesPageOptions,
  type LazyStoredConversation,
  type MessageChunk,
  type MessageFeedback,
  type MessageSkeleton,
  type StoredConversation,
  type StoredFileWithContext,
  type StoredMessage,
  type StoredMessageWithSimilarity,
  type UpdateMessageOptions,
} from "./types";

interface MessageProjectionOptions {
  /**
   * Skip the `vector`/`chunks` embedding columns entirely (no raw read, no
   * JSON.parse, no decrypt). Display readers never use them — the embedding
   * float arrays are the single heaviest per-row cost of a message fetch.
   */
  skipEmbeddings?: boolean;
}

function messageToStoredRaw(
  message: Message,
  projection?: MessageProjectionOptions
): StoredMessage {
  const convId = String(message._getRaw("conversation_id"));

  const parseJsonField = <T>(rawValue: string | number | boolean | null): T | undefined => {
    if (!rawValue) return undefined;
    if (typeof rawValue === "string") {
      if (rawValue.startsWith("enc:")) return rawValue as T;
      try {
        return JSON.parse(rawValue) as T;
      } catch {
        return undefined;
      }
    }
    return rawValue as T;
  };

  const skipEmbeddings = projection?.skipEmbeddings === true;
  const sourcesRaw = message._getRaw("sources");
  const vectorRaw = skipEmbeddings ? null : message._getRaw("vector");
  const chunksRaw = skipEmbeddings ? null : message._getRaw("chunks");
  const thoughtProcessRaw = message._getRaw("thought_process");
  const toolCallEventsRaw = message._getRaw("tool_call_events");

  return {
    uniqueId: message.id,
    messageId: message.messageId,
    conversationId: convId,
    role: message.role,
    content: message.content,
    model: message.model,
    imageModel: message.imageModel,
    files: message.files,
    fileIds: message.fileIds,
    createdAt: message.createdAt,
    updatedAt: message.updatedAt,
    vector: skipEmbeddings ? undefined : parseJsonField(vectorRaw),
    embeddingModel: message.embeddingModel,
    chunks: skipEmbeddings ? undefined : parseJsonField(chunksRaw),
    usage: message.usage,
    sources: parseJsonField(sourcesRaw),
    responseDuration: message.responseDuration,
    wasStopped: message.wasStopped,
    error: message.error,
    thoughtProcess: parseJsonField(thoughtProcessRaw),
    thinking: message.thinking,
    parentMessageId: message.parentMessageId,
    feedback: message.feedback || null,
    toolCallEvents: parseJsonField(toolCallEventsRaw),
    origin: message.origin,
  };
}

async function messageToStored(
  message: Message,
  walletAddress?: string,
  signMessage?: SignMessageFn,
  embeddedWalletSigner?: EmbeddedWalletSignerFn,
  projection?: MessageProjectionOptions
): Promise<StoredMessage> {
  const baseMessage = messageToStoredRaw(message, projection);

  if (walletAddress) {
    return await decryptMessageFields(
      baseMessage,
      walletAddress,
      signMessage,
      embeddedWalletSigner
    );
  }

  return baseMessage;
}

function rawDate(value: unknown): Date {
  return new Date(typeof value === "number" ? value : 0);
}

function messageRawToStoredRaw(
  raw: Record<string, unknown>,
  projection?: MessageProjectionOptions
): StoredMessage {
  const parseJsonField = <T>(rawValue: unknown): T | undefined => {
    if (!rawValue) return undefined;
    if (typeof rawValue === "string") {
      if (rawValue.startsWith("enc:")) return rawValue as T;
      try {
        return JSON.parse(rawValue) as T;
      } catch {
        return undefined;
      }
    }
    return rawValue as T;
  };

  const skipEmbeddings = projection?.skipEmbeddings === true;
  const vectorRaw = skipEmbeddings ? null : raw.vector;
  const chunksRaw = skipEmbeddings ? null : raw.chunks;

  return {
    uniqueId: raw.id as string,
    messageId: raw.message_id as number,
    conversationId: (raw.conversation_id as string) ?? "",
    role: (raw.role ?? "") as StoredMessage["role"],
    content: (raw.content as string) ?? "",
    model: raw.model as string | undefined,
    imageModel: raw.image_model as string | undefined,
    files: parseJsonField<StoredMessage["files"]>(raw.files),
    fileIds: parseJsonField<StoredMessage["fileIds"]>(raw.file_ids),
    createdAt: rawDate(raw.created_at),
    updatedAt: rawDate(raw.updated_at),
    vector: skipEmbeddings ? undefined : parseJsonField(vectorRaw),
    embeddingModel: raw.embedding_model as string | undefined,
    chunks: skipEmbeddings ? undefined : parseJsonField(chunksRaw),
    usage: parseJsonField<StoredMessage["usage"]>(raw.usage),
    sources: parseJsonField(raw.sources),
    responseDuration: raw.response_duration as number | undefined,
    wasStopped:
      raw.was_stopped === null || raw.was_stopped === undefined
        ? (raw.was_stopped as boolean | undefined)
        : raw.was_stopped === true || raw.was_stopped === 1,
    error: raw.error as string | undefined,
    thoughtProcess: parseJsonField(raw.thought_process),
    thinking: raw.thinking as string | undefined,
    parentMessageId: raw.parent_message_id as string | undefined,
    feedback: (raw.feedback as StoredMessage["feedback"]) || null,
    toolCallEvents: parseJsonField(raw.tool_call_events),
    origin: raw.origin as StoredMessage["origin"],
  };
}

async function messageRawToStored(
  raw: Record<string, unknown>,
  walletAddress?: string,
  signMessage?: SignMessageFn,
  embeddedWalletSigner?: EmbeddedWalletSignerFn,
  projection?: MessageProjectionOptions
): Promise<StoredMessage> {
  const baseMessage = messageRawToStoredRaw(raw, projection);

  if (walletAddress) {
    return await decryptMessageFields(
      baseMessage,
      walletAddress,
      signMessage,
      embeddedWalletSigner
    );
  }

  return baseMessage;
}

export function conversationToStoredRaw(conversation: Conversation): StoredConversation {
  return {
    uniqueId: conversation.id,
    conversationId: conversation.conversationId,
    title: conversation.title,
    projectId: conversation.projectId,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
    isDeleted: conversation.isDeleted,
    pinnedAt: conversation.pinnedAt,
  };
}

async function conversationToStored(
  conversation: Conversation,
  walletAddress?: string,
  signMessage?: SignMessageFn,
  embeddedWalletSigner?: EmbeddedWalletSignerFn
): Promise<StoredConversation> {
  const baseConversation = conversationToStoredRaw(conversation);

  if (walletAddress) {
    return await decryptConversationFields(
      baseConversation,
      walletAddress,
      signMessage,
      embeddedWalletSigner
    );
  }

  return baseConversation;
}

function conversationRawToStoredRaw(raw: Record<string, unknown>): StoredConversation {
  const pinnedAt = raw.pinned_at as number | null | undefined;
  return {
    uniqueId: raw.id as string,
    conversationId: (raw.conversation_id as string) ?? "",
    title: (raw.title as string) ?? "",
    projectId: raw.project_id as string | undefined,
    createdAt: rawDate(raw.created_at),
    updatedAt: rawDate(raw.updated_at),
    isDeleted: raw.is_deleted === true || raw.is_deleted === 1,
    pinnedAt: typeof pinnedAt === "number" ? new Date(pinnedAt) : null,
  };
}

async function conversationRawToStored(
  raw: Record<string, unknown>,
  walletAddress?: string,
  signMessage?: SignMessageFn,
  embeddedWalletSigner?: EmbeddedWalletSignerFn
): Promise<StoredConversation> {
  const baseConversation = conversationRawToStoredRaw(raw);
  if (walletAddress) {
    return await decryptConversationFields(
      baseConversation,
      walletAddress,
      signMessage,
      embeddedWalletSigner
    );
  }
  return baseConversation;
}

export interface StorageOperationsContext {
  database: Database;
  messagesCollection: Collection<Message>;
  conversationsCollection: Collection<Conversation>;
  /** Wallet address for encryption (optional - when present, enables field-level encryption) */
  walletAddress?: string;
  /** Function to sign a message for encryption key derivation */
  signMessage?: SignMessageFn;
  /** Function for silent signing with embedded wallets */
  embeddedWalletSigner?: EmbeddedWalletSignerFn;
}

export async function createConversationOp(
  ctx: StorageOperationsContext,
  opts?: CreateConversationOptions,
  defaultTitle: string = "New Conversation"
): Promise<StoredConversation> {
  const convId = opts?.conversationId || generateConversationId();
  const title = opts?.title || defaultTitle;

  const convOpts: CreateConversationOptions = {
    conversationId: convId,
    title,
    projectId: opts?.projectId,
  };
  const encryptedOpts =
    ctx.walletAddress && ctx.signMessage
      ? await encryptConversationFields(
          convOpts,
          ctx.walletAddress,
          ctx.signMessage,
          ctx.embeddedWalletSigner
        )
      : convOpts;

  const created = await ctx.database.write(async () => {
    return await ctx.conversationsCollection.create((conv) => {
      conv._setRaw("conversation_id", convId);
      conv._setRaw("title", encryptedOpts.title || title);
      if (opts?.projectId) conv._setRaw("project_id", opts.projectId);
      conv._setRaw("is_deleted", false);
    });
  });

  return conversationToStored(
    created,
    ctx.walletAddress,
    ctx.signMessage,
    ctx.embeddedWalletSigner
  );
}

export async function getConversationOp(
  ctx: StorageOperationsContext,
  id: string
): Promise<StoredConversation | null> {
  const results = await ctx.conversationsCollection
    .query(Q.where("conversation_id", id), Q.where("is_deleted", false))
    .fetch();

  return results.length > 0
    ? await conversationToStored(
        results[0],
        ctx.walletAddress,
        ctx.signMessage,
        ctx.embeddedWalletSigner
      )
    : null;
}

export async function getConversationsOp(
  ctx: StorageOperationsContext
): Promise<StoredConversation[]> {
  const results = (await ctx.conversationsCollection
    .query(Q.where("is_deleted", false), Q.sortBy("created_at", Q.desc))
    .unsafeFetchRaw()) as Record<string, unknown>[];

  return Promise.all(
    results.map((raw) =>
      conversationRawToStored(raw, ctx.walletAddress, ctx.signMessage, ctx.embeddedWalletSigner)
    )
  );
}

function conversationRawToLazyStored(raw: Record<string, unknown>): LazyStoredConversation {
  const pinnedAt = raw.pinned_at as number | null | undefined;
  return {
    uniqueId: raw.id as string,
    conversationId: (raw.conversation_id as string) ?? "",
    encryptedTitle: (raw.title as string) ?? "",
    projectId: raw.project_id as string | undefined,
    createdAt: rawDate(raw.created_at),
    updatedAt: rawDate(raw.updated_at),
    isDeleted: raw.is_deleted === true || raw.is_deleted === 1,
    pinnedAt: typeof pinnedAt === "number" ? new Date(pinnedAt) : null,
  };
}

/**
 * Lazy variant of {@link getConversationsOp}.
 *
 * Returns conversations with their raw stored title under
 * `encryptedTitle` instead of a decrypted `title`. Callers should pair
 * this with {@link decryptConversationTitle} (or the underlying
 * `decryptField`) and decrypt only when a row is rendered.
 *
 * Behavior is identical to `getConversationsOp` except for the title
 * projection — sort order, soft-delete filtering, and active-conversation
 * scoping all match.
 *
 * Encryption context on `ctx` is intentionally ignored: this op never
 * decrypts. That is also why the test for this op asserts call count
 * for `decryptField` is exactly zero.
 */
export async function getConversationsLazyOp(
  ctx: StorageOperationsContext
): Promise<LazyStoredConversation[]> {
  const results = (await ctx.conversationsCollection
    .query(Q.where("is_deleted", false), Q.sortBy("created_at", Q.desc))
    .unsafeFetchRaw()) as Record<string, unknown>[];

  return results.map(conversationRawToLazyStored);
}

/**
 * Keyset-paginated, lazy (no-decrypt) variant of {@link getConversationsLazyOp}.
 *
 * Returns at most `limit` conversations (newest first by `created_at`), each
 * with its raw stored title under `encryptedTitle` — pair with
 * {@link decryptConversationTitle} to decrypt on render. Page through older
 * threads by passing the oldest loaded `createdAt` as `before` plus the
 * uniqueIds held at that boundary as `boundaryExcludeUniqueIds`.
 *
 * Decrypts nothing and builds no WatermelonDB Model (the never-evicted
 * RecordCache stays empty — web Pile-2). Sort order, soft-delete filtering,
 * and the encrypted-title projection all match `getConversationsLazyOp`.
 */
export async function getConversationsPageOp(
  ctx: StorageOperationsContext,
  options?: GetConversationsPageOptions
): Promise<LazyStoredConversation[]> {
  const limit = Math.floor(options?.limit ?? 200);
  if (!Number.isFinite(limit) || limit < 1) return [];

  const exclude = new Set(options?.boundaryExcludeUniqueIds ?? []);

  const clauses = [Q.where("is_deleted", false)];
  if (options?.before !== undefined) {
    clauses.push(
      exclude.size > 0
        ? Q.where("created_at", Q.lte(options.before))
        : Q.where("created_at", Q.lt(options.before))
    );
  }

  const fetched = (await ctx.conversationsCollection
    .query(...clauses, Q.sortBy("created_at", Q.desc), Q.take(limit + exclude.size))
    .unsafeFetchRaw()) as Record<string, unknown>[];

  const results =
    exclude.size > 0 ? fetched.filter((raw) => !exclude.has(raw.id as string)) : fetched;

  return results.slice(0, limit).map(conversationRawToLazyStored);
}

/**
 * Lazy variant of {@link getConversationsByProjectOp}.
 *
 * Same encrypted-title projection as {@link getConversationsLazyOp},
 * filtered by project assignment. Pass `null` to retrieve conversations
 * with no project.
 */
export async function getConversationsByProjectLazyOp(
  ctx: StorageOperationsContext,
  projectId: string | null
): Promise<LazyStoredConversation[]> {
  const results = (await ctx.conversationsCollection
    .query(
      Q.where("project_id", projectId === null ? "" : projectId),
      Q.where("is_deleted", false),
      Q.sortBy("created_at", Q.desc)
    )
    .unsafeFetchRaw()) as Record<string, unknown>[];

  return results.map(conversationRawToLazyStored);
}

export async function updateConversationTitleOp(
  ctx: StorageOperationsContext,
  id: string,
  title: string
): Promise<boolean> {
  const results = await ctx.conversationsCollection
    .query(Q.where("conversation_id", id), Q.where("is_deleted", false))
    .fetch();

  if (results.length > 0) {
    const encryptedOpts =
      ctx.walletAddress && ctx.signMessage
        ? await encryptConversationFields(
            { title },
            ctx.walletAddress,
            ctx.signMessage,
            ctx.embeddedWalletSigner
          )
        : { title };
    const encryptedTitle = encryptedOpts.title || title;

    await ctx.database.write(async () => {
      await results[0].update((conv) => {
        conv._setRaw("title", encryptedTitle);
      });
    });
    return true;
  }
  return false;
}

/**
 * Soft delete a conversation.
 * Note: useChatStorage hooks automatically cascade delete messages and media.
 */
export async function deleteConversationOp(
  ctx: StorageOperationsContext,
  id: string
): Promise<boolean> {
  const results = await ctx.conversationsCollection
    .query(Q.where("conversation_id", id), Q.where("is_deleted", false))
    .fetch();

  if (results.length > 0) {
    await ctx.database.write(async () => {
      await results[0].update((conv) => {
        conv._setRaw("is_deleted", true);
      });
      const jobs = ctx.database.schema?.tables[ExtractionJob.table]
        ? await ctx.database
            .get<ExtractionJob>(ExtractionJob.table)
            .query(Q.where("conversation_id", id))
            .fetch()
        : [];
      for (const job of jobs) await job.destroyPermanently();
    });
    return true;
  }
  return false;
}

/**
 * Update a conversation's project assignment.
 * Pass null to remove the conversation from any project.
 */
export async function updateConversationProjectOp(
  ctx: StorageOperationsContext,
  id: string,
  projectId: string | null
): Promise<boolean> {
  const results = await ctx.conversationsCollection
    .query(Q.where("conversation_id", id), Q.where("is_deleted", false))
    .fetch();

  if (results.length > 0) {
    await ctx.database.write(async () => {
      await results[0].update((conv) => {
        conv._setRaw("project_id", projectId === null ? "" : projectId);
      });
    });
    return true;
  }
  return false;
}

/**
 * Pin or unpin a conversation.
 *
 * Pinning stamps `pinned_at` with the current time; unpinning clears it.
 * Note that list queries (`getConversationsOp` etc.) are NOT reordered by
 * this — they keep sorting by `created_at`. Consumers sort pinned chats
 * first using the `pinnedAt` field (most recently pinned first). The
 * `.update()` call bumps `updated_at`, which is what flags the row for
 * backup sync.
 */
export async function updateConversationPinnedOp(
  ctx: StorageOperationsContext,
  id: string,
  pinned: boolean
): Promise<boolean> {
  const results = await ctx.conversationsCollection
    .query(Q.where("conversation_id", id), Q.where("is_deleted", false))
    .fetch();

  if (results.length > 0) {
    await ctx.database.write(async () => {
      await results[0].update((conv) => {
        conv._setRaw("pinned_at", pinned ? Date.now() : null);
      });
    });
    return true;
  }
  return false;
}

/**
 * Get conversations filtered by project ID.
 * Pass null to get conversations that don't belong to any project.
 */
export async function getConversationsByProjectOp(
  ctx: StorageOperationsContext,
  projectId: string | null
): Promise<StoredConversation[]> {
  const results = (await ctx.conversationsCollection
    .query(
      Q.where("project_id", projectId === null ? "" : projectId),
      Q.where("is_deleted", false),
      Q.sortBy("created_at", Q.desc)
    )
    .unsafeFetchRaw()) as Record<string, unknown>[];

  return Promise.all(
    results.map((raw) =>
      conversationRawToStored(raw, ctx.walletAddress, ctx.signMessage, ctx.embeddedWalletSigner)
    )
  );
}

export async function getMessagesOp(
  ctx: StorageOperationsContext,
  convId: string
): Promise<StoredMessage[]> {
  const results = (await ctx.messagesCollection
    .query(Q.where("conversation_id", convId), Q.sortBy("message_id", Q.asc))
    .unsafeFetchRaw()) as Record<string, unknown>[];

  return Promise.all(
    results.map((raw) =>
      messageRawToStored(raw, ctx.walletAddress, ctx.signMessage, ctx.embeddedWalletSigner)
    )
  );
}

export async function getMessageCountOp(
  ctx: StorageOperationsContext,
  convId: string
): Promise<number> {
  return await ctx.messagesCollection.query(Q.where("conversation_id", convId)).fetchCount();
}

/**
 * Paginated display read: the newest `limit` messages of a conversation (or of
 * the range below `beforeMessageId`), returned in ASCENDING message_id order.
 *
 * Unlike {@link getMessagesOp} this skips the `vector`/`chunks` embedding
 * columns entirely — display consumers drop them anyway, and parsing +
 * decrypting embedding arrays is the dominant cost of a full-thread read.
 */
export async function getMessagesPageOp(
  ctx: StorageOperationsContext,
  convId: string,
  opts: GetMessagesPageOptions
): Promise<StoredMessage[]> {
  const limit = Math.floor(opts.limit);
  if (!Number.isFinite(limit) || limit < 1) return [];

  const exclude = new Set(opts.boundaryExcludeUniqueIds ?? []);

  const clauses = [Q.where("conversation_id", convId)];
  if (opts.beforeMessageId !== undefined) {
    clauses.push(
      exclude.size > 0
        ? Q.where("message_id", Q.lte(opts.beforeMessageId))
        : Q.where("message_id", Q.lt(opts.beforeMessageId))
    );
  }

  const fetched = (await ctx.messagesCollection
    .query(...clauses, Q.sortBy("message_id", Q.desc), Q.take(limit + exclude.size))
    .unsafeFetchRaw()) as Record<string, unknown>[];

  const results = (
    exclude.size > 0 ? fetched.filter((raw) => !exclude.has(raw.id as string)) : fetched
  ).slice(0, limit);

  results.reverse();

  return Promise.all(
    results.map((raw) =>
      messageRawToStored(raw, ctx.walletAddress, ctx.signMessage, ctx.embeddedWalletSigner, {
        skipEmbeddings: true,
      })
    )
  );
}

/**
 * Whole-thread skeleton read for branch-tree construction: every message's
 * ids/role/parent linkage with NO field decryption — except `content`, which
 * is decrypted only for user-role rows whose parent is also user-role (the
 * regeneration artifacts branch logic classifies by content prefix; see
 * {@link MessageSkeleton}).
 */
export async function getMessageSkeletonsOp(
  ctx: StorageOperationsContext,
  convId: string
): Promise<MessageSkeleton[]> {
  const results = (await ctx.messagesCollection
    .query(Q.where("conversation_id", convId), Q.sortBy("message_id", Q.asc))
    .unsafeFetchRaw()) as Record<string, unknown>[];

  const roleById = new Map<string, string>();
  for (const raw of results) {
    roleById.set(raw.id as string, raw.role as string);
  }

  const skeletons: MessageSkeleton[] = results.map((raw) => ({
    uniqueId: raw.id as string,
    messageId: raw.message_id as number,
    conversationId: (raw.conversation_id as string) ?? "",
    role: (raw.role ?? "") as MessageSkeleton["role"],
    createdAt: rawDate(raw.created_at),
    parentMessageId: (raw.parent_message_id as string | null | undefined) ?? undefined,
    model: (raw.model as string | null | undefined) ?? undefined,
  }));

  const artifactIndices: number[] = [];
  for (let i = 0; i < results.length; i++) {
    const raw = results[i];
    const parentMessageId = raw.parent_message_id as string | null | undefined;
    if (raw.role !== "user" || !parentMessageId) continue;
    if (roleById.get(parentMessageId) === "user") {
      artifactIndices.push(i);
    }
  }

  const address = ctx.walletAddress;
  if (artifactIndices.length > 0 && address) {
    if (ctx.signMessage) {
      try {
        await requestEncryptionKey(address, ctx.signMessage, ctx.embeddedWalletSigner);
      } catch (error) {
        getLogger().warn("Failed to request encryption key for skeleton decryption:", error);
      }
    }
    await Promise.all(
      artifactIndices.map(async (i) => {
        skeletons[i].content = await decryptField(results[i].content as string, address);
      })
    );
  } else {
    for (const i of artifactIndices) {
      skeletons[i].content = results[i].content as string;
    }
  }

  return skeletons;
}

/**
 * Tool-call-event id scan for the send hot path: collect every stored
 * `toolCallEvents[].id` across a conversation WITHOUT building StoredMessages
 * and WITHOUT any field decryption — `tool_call_events` is a plaintext JSON
 * column (encryptMessageFields never touches it), so the dedup set the sender
 * needs is a cheap column read. The previous shape (getMessagesOp) parsed and
 * decrypted every embedding column in the thread just to build this set.
 * unsafeFetchRaw (NOT fetch): never pin a Model per row (web Pile-2).
 */
export async function getToolCallEventIdsOp(
  ctx: StorageOperationsContext,
  convId: string
): Promise<Set<string>> {
  const results = (await ctx.messagesCollection
    .query(Q.where("conversation_id", convId))
    .unsafeFetchRaw()) as Record<string, unknown>[];

  const ids = new Set<string>();
  for (const raw of results) {
    const value = raw.tool_call_events;
    if (!value) continue;
    let events: { id?: string | null }[] | undefined;
    if (typeof value === "string") {
      try {
        events = JSON.parse(value) as { id?: string | null }[];
      } catch {
        continue;
      }
    } else if (Array.isArray(value)) {
      events = value as { id?: string | null }[];
    }
    if (!Array.isArray(events)) continue;
    for (const evt of events) {
      if (evt && evt.id) ids.add(evt.id);
    }
  }
  return ids;
}

/**
 * Clear all messages in a conversation.
 * Clears file_ids before deletion.
 * Note: useChatStorage hooks automatically cascade delete media.
 */
export async function clearMessagesOp(
  ctx: StorageOperationsContext,
  convId: string
): Promise<void> {
  await ctx.database.write(async () => {
    const messages = await ctx.messagesCollection.query(Q.where("conversation_id", convId)).fetch();
    const jobs = ctx.database.schema?.tables[ExtractionJob.table]
      ? await ctx.database
          .get<ExtractionJob>(ExtractionJob.table)
          .query(Q.where("conversation_id", convId))
          .fetch()
      : [];
    for (const job of jobs) {
      await job.update((row) => {
        row._setRaw("message_ids", "[]");
        row._setRaw("watermark", null);
        row._setRaw("watermark_seq", null);
      });
    }
    for (const message of messages) {
      await message.update((msg) => {
        msg._setRaw("file_ids", null);
        msg._setRaw("files", null);
      });
      await message.destroyPermanently();
    }
  });
}

/**
 * Delete a single message by its unique ID.
 * Clears file_ids before deletion and returns the unique ID.
 * Note: Callers should use deleteMediaByMessageOp to cascade delete media.
 */
export async function deleteMessageOp(
  ctx: StorageOperationsContext,
  uniqueId: string
): Promise<string | null> {
  let message;
  try {
    message = await ctx.messagesCollection.find(uniqueId);
  } catch {
    return null;
  }

  await ctx.database.write(async () => {
    const jobs = ctx.database.schema?.tables[ExtractionJob.table]
      ? await ctx.database
          .get<ExtractionJob>(ExtractionJob.table)
          .query(Q.where("conversation_id", message.conversationId))
          .fetch()
      : [];
    for (const job of jobs) {
      const ids = JSON.parse(String(job._getRaw("message_ids"))) as string[];
      await job.update((row) => {
        row._setRaw("message_ids", JSON.stringify(ids.filter((id) => id !== uniqueId)));
        if (row._getRaw("watermark") === uniqueId) row._setRaw("watermark", null);
      });
    }
    await message.update((msg) => {
      msg._setRaw("file_ids", null);
      msg._setRaw("files", null);
    });
    await message.destroyPermanently();
  });

  return uniqueId;
}

async function encryptMessageOptsIfNeeded(
  ctx: StorageOperationsContext,
  opts: CreateMessageOptions
): Promise<Record<string, unknown>> {
  return ctx.walletAddress && ctx.signMessage
    ? await encryptMessageFields(opts, ctx.walletAddress, ctx.signMessage, ctx.embeddedWalletSigner)
    : (opts as unknown as Record<string, unknown>);
}

function applyMessageFields(msg: Message, encryptedOpts: Record<string, unknown>): void {
  msg._setRaw("conversation_id", encryptedOpts.conversationId as string);
  msg._setRaw("role", encryptedOpts.role as string);
  msg._setRaw("content", encryptedOpts.content as string);
  if (encryptedOpts.model) msg._setRaw("model", encryptedOpts.model as string);
  if (encryptedOpts.imageModel) msg._setRaw("image_model", encryptedOpts.imageModel as string);
  if (encryptedOpts.files) msg._setRaw("files", JSON.stringify(encryptedOpts.files));
  if (encryptedOpts.fileIds) msg._setRaw("file_ids", JSON.stringify(encryptedOpts.fileIds));
  if (encryptedOpts.usage) msg._setRaw("usage", JSON.stringify(encryptedOpts.usage));
  if (encryptedOpts.sources) {
    const sourcesValue =
      typeof encryptedOpts.sources === "string"
        ? encryptedOpts.sources
        : JSON.stringify(encryptedOpts.sources);
    msg._setRaw("sources", sourcesValue);
  }
  if (encryptedOpts.responseDuration !== undefined)
    msg._setRaw("response_duration", encryptedOpts.responseDuration as number);
  if (encryptedOpts.vector) {
    const vectorValue =
      typeof encryptedOpts.vector === "string"
        ? encryptedOpts.vector
        : JSON.stringify(encryptedOpts.vector);
    msg._setRaw("vector", vectorValue);
  }
  if (encryptedOpts.embeddingModel)
    msg._setRaw("embedding_model", encryptedOpts.embeddingModel as string);
  if (encryptedOpts.wasStopped) msg._setRaw("was_stopped", encryptedOpts.wasStopped as boolean);
  if (encryptedOpts.error) msg._setRaw("error", encryptedOpts.error as string);
  if (encryptedOpts.thoughtProcess) {
    const tpValue =
      typeof encryptedOpts.thoughtProcess === "string"
        ? encryptedOpts.thoughtProcess
        : JSON.stringify(encryptedOpts.thoughtProcess);
    msg._setRaw("thought_process", tpValue);
  }
  if (encryptedOpts.thinking) msg._setRaw("thinking", encryptedOpts.thinking as string);
  if (encryptedOpts.parentMessageId)
    msg._setRaw("parent_message_id", encryptedOpts.parentMessageId as string);
  if (encryptedOpts.toolCallEvents) {
    const tceValue =
      typeof encryptedOpts.toolCallEvents === "string"
        ? encryptedOpts.toolCallEvents
        : JSON.stringify(encryptedOpts.toolCallEvents);
    msg._setRaw("tool_call_events", tceValue);
  }
  if (encryptedOpts.origin) msg._setRaw("origin", encryptedOpts.origin as string);
}

export async function createMessageOp(
  ctx: StorageOperationsContext,
  opts: CreateMessageOptions
): Promise<StoredMessage> {
  if (opts.uniqueId) {
    let existing: Message | null;
    try {
      existing = await ctx.messagesCollection.find(opts.uniqueId);
    } catch {
      existing = null;
    }
    if (existing) {
      return messageToStored(
        existing,
        ctx.walletAddress,
        ctx.signMessage,
        ctx.embeddedWalletSigner
      );
    }
  }

  const newest = await ctx.messagesCollection
    .query(
      Q.where("conversation_id", opts.conversationId),
      Q.sortBy("message_id", Q.desc),
      Q.take(1)
    )
    .fetch();
  const messageId = (newest[0]?.messageId ?? 0) + 1;

  const encryptedOpts = await encryptMessageOptsIfNeeded(ctx, opts);

  const created = await ctx.database.write(async () => {
    return await ctx.messagesCollection.create((msg) => {
      if (opts.uniqueId) msg._raw.id = opts.uniqueId;
      msg._setRaw("message_id", messageId);
      applyMessageFields(msg, encryptedOpts);
    });
  });

  return messageToStored(created, ctx.walletAddress, ctx.signMessage, ctx.embeddedWalletSigner);
}

/**
 * Create-or-update a message keyed by `opts.uniqueId`.
 *
 * This is the reconciliation primitive behind detach → resume. When a stream
 * is detached, the SDK persists the partial assistant row under a caller-owned
 * `assistantUniqueId`. A later resume completes that same row — it must NOT
 * create a second assistant message. WatermelonDB's `create()` throws on a
 * duplicate id, which is exactly the race this op resolves: it `find()`s the
 * existing row and `update()`s it in place, or `create()`s it when absent.
 *
 * The result is the single-assistant-row invariant: for a given
 * `assistantUniqueId`, abort-then-resume yields one row, updated, never two.
 *
 * `uniqueId` is required (it's the reconciliation key). On UPDATE the work is
 * delegated to the `_updateMessageOp` machinery, whose `!== undefined` field
 * guards are load-bearing for the clear: the resume path passes
 * `wasStopped: false` to CLEAR an earlier interrupted finalization's stopped
 * flag — `_updateMessageOp` honors the explicit `false`, where the create
 * path's truthy guard would not. On CREATE (the first persist for an id) there
 * is no prior flag to clear and the `was_stopped` column defaults false, so the
 * asymmetry is invisible. `message_id` (the conversation ordinal) is left
 * untouched by the update path.
 */
export async function upsertMessageOp(
  ctx: StorageOperationsContext,
  opts: CreateMessageOptions & { uniqueId: string }
): Promise<StoredMessage> {
  const results = await ctx.messagesCollection.query(Q.where("id", opts.uniqueId)).fetch();
  const existing = results.length > 0 ? results[0] : null;

  if (!existing) {
    return createMessageOp(ctx, opts);
  }

  const updateOpts: UpdateMessageOptions = {
    content: opts.content,
    model: opts.model,
    imageModel: opts.imageModel,
    files: opts.files,
    fileIds: opts.fileIds,
    usage: opts.usage,
    sources: opts.sources,
    responseDuration: opts.responseDuration,
    vector: opts.vector,
    embeddingModel: opts.embeddingModel,
    wasStopped: opts.wasStopped,
    error: opts.error,
    thoughtProcess: opts.thoughtProcess,
    thinking: opts.thinking,
    toolCallEvents: opts.toolCallEvents,
  };
  const updated = await _updateMessageOp(ctx, opts.uniqueId, updateOpts);
  return (
    updated ??
    messageToStored(existing, ctx.walletAddress, ctx.signMessage, ctx.embeddedWalletSigner)
  );
}

/**
 * Fetch a single message by its uniqueId (the WatermelonDB record id),
 * decrypted to a StoredMessage. Returns null if not found. O(1) indexed
 * lookup — prefer this over scanning `getMessagesOp` across every conversation
 * when you already hold a message id.
 */
export async function getMessageOp(
  ctx: StorageOperationsContext,
  uniqueId: string
): Promise<StoredMessage | null> {
  let message;
  try {
    message = await ctx.messagesCollection.find(uniqueId);
  } catch (error) {
    if (error instanceof Error && /not found/i.test(error.message)) {
      return null;
    }
    throw error;
  }
  return messageToStored(message, ctx.walletAddress, ctx.signMessage, ctx.embeddedWalletSigner);
}

export async function updateMessageEmbeddingOp(
  ctx: StorageOperationsContext,
  uniqueId: string,
  vector: number[],
  embeddingModel: string
): Promise<StoredMessage | null> {
  let message;
  try {
    message = await ctx.messagesCollection.find(uniqueId);
  } catch {
    return null;
  }

  await ctx.database.write(async () => {
    await message.update((msg) => {
      msg._setRaw("vector", JSON.stringify(vector));
      if (msg.origin === "chunks_discarded" && vector.length > 0) {
        msg._setRaw("origin", "message");
      }
      msg._setRaw("embedding_model", embeddingModel);
    });
  });

  return messageToStored(message, ctx.walletAddress, ctx.signMessage, ctx.embeddedWalletSigner);
}

export async function updateMessageChunksOp(
  ctx: StorageOperationsContext,
  uniqueId: string,
  chunks: MessageChunk[],
  embeddingModel: string
): Promise<StoredMessage | null> {
  let message;
  try {
    message = await ctx.messagesCollection.find(uniqueId);
  } catch {
    return null;
  }

  const storedChunks = chunks.map(({ text: _text, ...rest }) => rest);

  await ctx.database.write(async () => {
    await message.update((msg) => {
      msg._setRaw("chunks", JSON.stringify(storedChunks));
      if (
        msg.origin === "chunks_discarded" &&
        storedChunks.length > 0 &&
        storedChunks.every((chunk) => chunk.vector.length > 0)
      ) {
        msg._setRaw("origin", "message");
      }
      msg._setRaw("embedding_model", embeddingModel);
    });
  });

  return messageToStored(message, ctx.walletAddress, ctx.signMessage, ctx.embeddedWalletSigner);
}

const STRIP_CHUNK_TEXT_PAGE_SIZE = 100;

function chunksWithoutText(raw: unknown): object[] | null {
  if (typeof raw !== "string") return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!Array.isArray(parsed)) return null;
  const hasText = parsed.some(
    (chunk) =>
      chunk !== null &&
      typeof chunk === "object" &&
      Object.prototype.hasOwnProperty.call(chunk, "text")
  );
  if (!hasText) return null;
  return parsed.map((chunk: unknown) => {
    if (chunk === null || typeof chunk !== "object") return chunk as object;
    const { text: _text, ...rest } = chunk as Record<string, unknown>;
    return rest;
  });
}

/**
 * Removes the plaintext `text` that rows chunked before sdk#889 still carry in
 * their `chunks` column. Since #889 `updateMessageChunksOp` never writes it, so
 * a stored `text` key identifies exactly the rows written before that change.
 * Readers rebuild the snippet from the offsets every row already has; a row
 * edited after it was chunked fails `resolveChunkText`'s coverage check and
 * shows the whole message instead.
 *
 * Every device must call it: each strips only its own local copy. Backups hold
 * whole rows encrypted, and a restore brings the text back until the next call.
 * Idempotent: a stripped row no longer matches, so calling it once per session
 * is safe. `updated_at` is kept as it was, so backup sync does not re-upload
 * every old row (the chunk vectors are most of each row's size).
 *
 * Reads raw rows a page at a time and builds Models only for the rows it
 * changes, so unchanged candidates never enter the record cache, and each
 * write stays small enough not to hold up chat saves.
 *
 * @returns Number of rows stripped.
 */
export async function stripLegacyChunkTextOp(ctx: StorageOperationsContext): Promise<number> {
  const candidateIds = await ctx.messagesCollection
    .query(Q.where("chunks", Q.like(`%${Q.sanitizeLikeString('"text":')}%`)))
    .fetchIds();

  let stripped = 0;
  for (let start = 0; start < candidateIds.length; start += STRIP_CHUNK_TEXT_PAGE_SIZE) {
    const pageIds = candidateIds.slice(start, start + STRIP_CHUNK_TEXT_PAGE_SIZE);
    const rows = (await ctx.messagesCollection
      .query(Q.where("id", Q.oneOf(pageIds)))
      .unsafeFetchRaw()) as Record<string, unknown>[];

    const changedIds = rows
      .filter((row) => chunksWithoutText(row.chunks) !== null)
      .map((row) => String(row.id));
    if (changedIds.length === 0) continue;

    await ctx.database.write(async () => {
      const messages = await ctx.messagesCollection
        .query(Q.where("id", Q.oneOf(changedIds)))
        .fetch();
      const updates = messages.flatMap((message) => {
        const raw = message._raw as unknown as { chunks: unknown; updated_at: number };
        const chunks = chunksWithoutText(raw.chunks);
        if (!chunks) return [];
        const updatedAt = raw.updated_at;
        return [
          message.prepareUpdate((msg) => {
            msg._setRaw("chunks", JSON.stringify(chunks));
            msg._setRaw("updated_at", updatedAt);
          }),
        ];
      });
      await ctx.database.batch(...updates);
      stripped += updates.length;
    });
  }
  return stripped;
}

export async function updateMessageErrorOp(
  ctx: StorageOperationsContext,
  uniqueId: string,
  error: string
): Promise<StoredMessage | null> {
  let message;
  try {
    message = await ctx.messagesCollection.find(uniqueId);
  } catch {
    return null;
  }

  await ctx.database.write(async () => {
    await message.update((msg) => {
      msg._setRaw("error", error);
    });
  });

  return messageToStored(message, ctx.walletAddress, ctx.signMessage, ctx.embeddedWalletSigner);
}

/**
 * Update the feedback (like/dislike) for a message.
 * Each regenerated response can have its own independent feedback.
 *
 * @param ctx - Storage operations context
 * @param uniqueId - The unique ID of the message to update
 * @param feedback - 'like', 'dislike', or null to clear feedback
 * @returns The updated message or null if not found
 */
export async function updateMessageFeedbackOp(
  ctx: StorageOperationsContext,
  uniqueId: string,
  feedback: MessageFeedback
): Promise<StoredMessage | null> {
  let message;
  try {
    message = await ctx.messagesCollection.find(uniqueId);
  } catch {
    return null;
  }

  await ctx.database.write(async () => {
    await message.update((msg) => {
      msg._setRaw("feedback", feedback ?? null);
    });
  });

  return messageToStored(message, ctx.walletAddress, ctx.signMessage, ctx.embeddedWalletSigner);
}

/**
 * Replace the `fileIds` (attached media ids) of an existing message.
 *
 * Used to attach generated artifacts (e.g. a rendered document PDF) to the
 * assistant message that produced them, after streaming completes. Pass the
 * FULL desired list — callers read the current `fileIds` and append before
 * calling, so a concurrent write can't clobber prior attachments.
 *
 * @param ctx - Storage operations context
 * @param uniqueId - The unique ID of the message to update
 * @param fileIds - The complete new list of attached media ids
 * @returns The updated message or null if not found
 */
export async function updateMessageFileIdsOp(
  ctx: StorageOperationsContext,
  uniqueId: string,
  fileIds: string[]
): Promise<StoredMessage | null> {
  return _updateMessageOp(ctx, uniqueId, { fileIds });
}

async function _updateMessageOp(
  ctx: StorageOperationsContext,
  uniqueId: string,
  opts: UpdateMessageOptions
): Promise<StoredMessage | null> {
  let message;
  try {
    message = await ctx.messagesCollection.find(uniqueId);
  } catch {
    return null;
  }

  const encryptedOpts: Record<string, unknown> =
    ctx.walletAddress && ctx.signMessage
      ? await encryptMessageFields(
          opts,
          ctx.walletAddress,
          ctx.signMessage,
          ctx.embeddedWalletSigner
        )
      : (opts as unknown as Record<string, unknown>);

  await ctx.database.write(async () => {
    await message.update((msg) => {
      if (encryptedOpts.content !== undefined)
        msg._setRaw("content", encryptedOpts.content as string);
      if (encryptedOpts.model !== undefined) msg._setRaw("model", encryptedOpts.model as string);
      if (encryptedOpts.imageModel !== undefined)
        msg._setRaw("image_model", encryptedOpts.imageModel as string);
      if (encryptedOpts.files !== undefined)
        msg._setRaw("files", JSON.stringify(encryptedOpts.files));
      if (encryptedOpts.fileIds !== undefined)
        msg._setRaw("file_ids", JSON.stringify(encryptedOpts.fileIds));
      if (encryptedOpts.usage !== undefined)
        msg._setRaw("usage", JSON.stringify(encryptedOpts.usage));
      if (encryptedOpts.sources !== undefined) {
        const sourcesValue =
          typeof encryptedOpts.sources === "string"
            ? encryptedOpts.sources
            : JSON.stringify(encryptedOpts.sources);
        msg._setRaw("sources", sourcesValue);
      }
      if (encryptedOpts.responseDuration !== undefined)
        msg._setRaw("response_duration", encryptedOpts.responseDuration as number);
      if (encryptedOpts.vector !== undefined) {
        const vectorValue =
          typeof encryptedOpts.vector === "string"
            ? encryptedOpts.vector
            : JSON.stringify(encryptedOpts.vector);
        msg._setRaw("vector", vectorValue);
      }
      if (encryptedOpts.embeddingModel !== undefined)
        msg._setRaw("embedding_model", encryptedOpts.embeddingModel as string);
      if (encryptedOpts.wasStopped !== undefined)
        msg._setRaw("was_stopped", encryptedOpts.wasStopped as boolean);
      if (encryptedOpts.error !== undefined)
        msg._setRaw("error", encryptedOpts.error === null ? "" : (encryptedOpts.error as string));
      if (encryptedOpts.thoughtProcess !== undefined) {
        const tpValue =
          typeof encryptedOpts.thoughtProcess === "string"
            ? encryptedOpts.thoughtProcess
            : JSON.stringify(encryptedOpts.thoughtProcess);
        msg._setRaw("thought_process", tpValue);
      }
      if (encryptedOpts.thinking !== undefined)
        msg._setRaw(
          "thinking",
          encryptedOpts.thinking === null ? "" : (encryptedOpts.thinking as string)
        );
      if (encryptedOpts.feedback !== undefined)
        msg._setRaw("feedback", encryptedOpts.feedback as string | null);
      if (encryptedOpts.toolCallEvents !== undefined) {
        const tceValue =
          typeof encryptedOpts.toolCallEvents === "string"
            ? encryptedOpts.toolCallEvents
            : JSON.stringify(encryptedOpts.toolCallEvents);
        msg._setRaw("tool_call_events", tceValue);
      }
    });
  });

  return messageToStored(message, ctx.walletAddress, ctx.signMessage, ctx.embeddedWalletSigner);
}

function resolveChunkText(
  content: string,
  chunk: Pick<MessageChunk, "text" | "startOffset" | "endOffset"> | undefined,
  chunksInRow: readonly Pick<MessageChunk, "endOffset">[] | undefined
): string {
  if (!chunk) return content;
  if (typeof chunk.text === "string" && chunk.text.length > 0) return chunk.text;

  const { startOffset: start, endOffset: end } = chunk;
  if (!Number.isInteger(start) || !Number.isInteger(end)) return content;
  if (start < 0 || end <= start || end > content.length) return content;

  const covered = chunksInRow?.reduce((max, c) => Math.max(max, c.endOffset ?? 0), 0) ?? 0;
  if (covered !== content.length) return content;

  return content.slice(start, end);
}

async function readRawJsonField<T>(
  raw: Record<string, unknown>,
  column: string,
  walletAddress?: string
): Promise<T | undefined> {
  const value = raw[column] as string | undefined;
  if (!value) return undefined;

  if (walletAddress && isEncrypted(value)) {
    return await decryptJsonField<T>(value, walletAddress);
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return undefined;
  }
}

export async function searchMessagesOp(
  ctx: StorageOperationsContext,
  queryVector: number[],
  options?: {
    limit?: number;
    minSimilarity?: number;
    conversationId?: string;
  }
): Promise<StoredMessageWithSimilarity[]> {
  const { limit = 10, minSimilarity = 0.5, conversationId } = options || {};

  const activeConversations = await ctx.conversationsCollection
    .query(Q.where("is_deleted", false))
    .fetch();
  const activeConversationIds = new Set(
    activeConversations.map((c) => String(c._getRaw("conversation_id")))
  );

  const queryConditions = conversationId ? [Q.where("conversation_id", conversationId)] : [];

  const messages = (await ctx.messagesCollection
    .query(...queryConditions)
    .unsafeFetchRaw()) as Record<string, unknown>[];

  const candidates: { message: Record<string, unknown>; similarity: number }[] = [];

  for (const message of messages) {
    const msgConvId = String(message.conversation_id);
    if (!activeConversationIds.has(msgConvId)) continue;

    const messageVector = await readRawJsonField<number[]>(message, "vector", ctx.walletAddress);
    if (!messageVector || messageVector.length === 0) continue;

    const similarity = cosineSimilarity(queryVector, messageVector);
    if (similarity >= minSimilarity) {
      candidates.push({ message, similarity });
    }
  }

  const topK = candidates.sort((a, b) => b.similarity - a.similarity).slice(0, limit);

  return Promise.all(
    topK.map(async ({ message, similarity }) => {
      const stored = await messageRawToStored(
        message,
        ctx.walletAddress,
        ctx.signMessage,
        ctx.embeddedWalletSigner
      );
      return { ...stored, similarity };
    })
  );
}

/**
 * Decrypted, model-native chunk vectors for one message, cached across recall
 * calls so the chunk lane doesn't re-decrypt + re-JSON.parse every message's
 * embeddings on every query. Keyed by message id; `version` is the message's
 * `updated_at` at cache time, so a re-embed (which bumps `updated_at`) misses
 * and repopulates. Vectors are stored Float32 — model-native precision, half
 * the RAM of float64 `number[]` — mirroring the vault embedding cache (#705).
 * Content text is deliberately NOT cached (see searchChunksOp): it isn't
 * needed for scoring, and keeping decrypted content out of the cache preserves
 * the SDK's data-at-rest posture.
 */
export interface CachedChunkVectors {
  /** Message `updated_at` (ms) at cache time — the invalidation token. */
  version: number;
  /**
   * Per-chunk embedding vectors, index-aligned with the message's decrypted
   * `chunks` array (empty-vector chunks kept as zero-length placeholders so
   * indices stay aligned). Empty when the message has only a whole-message
   * `fallback` vector.
   */
  chunks: Float32Array[];
  /** Whole-message vector when the message was embedded without chunking. */
  fallback?: Float32Array;
}

/**
 * Cache consumed by {@link searchChunksOp}, keyed by message id. A plain `Map`
 * (satisfied by the LRU from `createChunkVectorCache`) — mirrors
 * `VaultEmbeddingCache` so consumers get the same `clear()`/`delete()`
 * ergonomics on an encryption-key reset.
 */
export type ChunkVectorCache = Map<string, CachedChunkVectors>;

/**
 * Search through message chunks for fine-grained semantic search.
 * Returns the matching chunk text along with the parent message.
 */
export async function searchChunksOp(
  ctx: StorageOperationsContext,
  queryVector: number[],
  options?: {
    limit?: number;
    minSimilarity?: number;
    conversationId?: string;
    /**
     * Skip every message in this conversation BEFORE scoring, so it can't take
     * top-K slots. Filtering after the cut (what recall() used to do) lets a
     * long current conversation fill all `limit` slots and leaves
     * past-conversation recall with nothing.
     */
    excludeConversationId?: string;
    /**
     * Current embedding model. When set, messages whose stored
     * `embedding_model` is non-null and differs are skipped — their vectors
     * live in a different space, so cosine against the current-model query is
     * meaningless (and the dim-mismatch path returns 0 silently). Null/absent
     * `embedding_model` is grandfathered as current-model-compatible. Skipped
     * messages are re-embedded out-of-band by `chunkAndEmbedAllMessages`.
     */
    embeddingModel?: string;
    /**
     * Optional decrypted-vector cache. When provided, the per-query decrypt +
     * JSON.parse of every message's chunk vectors is skipped on warm entries
     * (validated by `updated_at`), which is the dominant cost of the chunk
     * lane. Omit for the legacy always-decrypt behavior.
     */
    chunkCache?: ChunkVectorCache;
  }
): Promise<ChunkSearchResult[]> {
  const {
    limit = 10,
    minSimilarity = 0.5,
    conversationId,
    excludeConversationId,
    embeddingModel,
    chunkCache,
  } = options || {};

  const activeConversations = await ctx.conversationsCollection
    .query(Q.where("is_deleted", false))
    .fetch();
  const activeConversationIds = new Set(
    activeConversations.map((c) => String(c._getRaw("conversation_id")))
  );

  const queryConditions = conversationId ? [Q.where("conversation_id", conversationId)] : [];

  const messages = (await ctx.messagesCollection
    .query(...queryConditions)
    .unsafeFetchRaw()) as Record<string, unknown>[];

  type Candidate = {
    message: Record<string, unknown>;
    similarity: number;
    chunkTextSource:
      | {
          kind: "chunk";
          chunk: MessageChunk;
          siblings: readonly Pick<MessageChunk, "endOffset">[];
        }
      | { kind: "chunk-cached"; chunkIndex: number; version: number }
      | { kind: "message" };
  };
  const candidates: Candidate[] = [];
  let staleSkipped = 0;
  let unreadableVectors = 0;

  for (const message of messages) {
    const msgConvId = String(message.conversation_id);
    if (!activeConversationIds.has(msgConvId)) continue;
    if (excludeConversationId !== undefined && msgConvId === excludeConversationId) continue;

    if (embeddingModel) {
      const storedModel = message.embedding_model as string | null | undefined;
      if (storedModel !== null && storedModel !== undefined && storedModel !== embeddingModel) {
        staleSkipped++;
        continue;
      }
    }

    const version = Number(message.updated_at) || 0;
    const cached = chunkCache?.get(message.id as string);
    if (cached && cached.version === version) {
      if (cached.chunks.length > 0) {
        for (let ci = 0; ci < cached.chunks.length; ci++) {
          const vec = cached.chunks[ci];
          if (vec.length === 0) continue;
          const similarity = cosineSimilarity(queryVector, vec);
          if (similarity >= minSimilarity) {
            candidates.push({
              message,
              similarity,
              chunkTextSource: { kind: "chunk-cached", chunkIndex: ci, version },
            });
          }
        }
      } else if (cached.fallback) {
        const similarity = cosineSimilarity(queryVector, cached.fallback);
        if (similarity >= minSimilarity) {
          candidates.push({ message, similarity, chunkTextSource: { kind: "message" } });
        }
      }
      continue;
    }

    const chunks = await readRawJsonField<MessageChunk[]>(message, "chunks", ctx.walletAddress);

    if (chunks && chunks.length > 0) {
      const vectors: Float32Array[] = chunks.map((chunk) =>
        decodeChunkVector(chunk.vector, () => {
          unreadableVectors++;
        })
      );
      chunkCache?.set(message.id as string, { version, chunks: vectors });

      for (let ci = 0; ci < chunks.length; ci++) {
        const vec = vectors[ci];
        if (vec.length === 0) continue;
        const similarity = cosineSimilarity(queryVector, vec);
        if (similarity >= minSimilarity) {
          candidates.push({
            message,
            similarity,
            chunkTextSource: { kind: "chunk", chunk: chunks[ci], siblings: chunks },
          });
        }
      }
    } else {
      const messageVector = await readRawJsonField<number[]>(message, "vector", ctx.walletAddress);
      if (!messageVector || messageVector.length === 0) continue;

      const fallback = Float32Array.from(messageVector);
      chunkCache?.set(message.id as string, { version, chunks: [], fallback });

      const similarity = cosineSimilarity(queryVector, fallback);
      if (similarity >= minSimilarity) {
        candidates.push({ message, similarity, chunkTextSource: { kind: "message" } });
      }
    }
  }

  if (staleSkipped > 0) {
    getLogger().warn(
      `searchChunksOp: skipped ${staleSkipped} messages whose embedding model differs from ` +
        `the current model (${embeddingModel}) — re-embed via chunkAndEmbedAllMessages`
    );
  }

  if (unreadableVectors > 0) {
    getLogger().warn(
      `searchChunksOp: could not read ${unreadableVectors} chunk vectors and left them out of ` +
        `ranking — the stored value is corrupt, so those chunks stay unsearchable until the ` +
        `message is re-embedded via chunkAndEmbedAllMessages`
    );
  }

  const topK = candidates.sort((a, b) => b.similarity - a.similarity).slice(0, limit);

  const uniqueMessages = new Map<string, Record<string, unknown>>();
  for (const c of topK) uniqueMessages.set(c.message.id as string, c.message);

  const storedById = new Map<string, StoredMessage>(
    await Promise.all(
      Array.from(uniqueMessages, async ([id, m]) => {
        const stored = await messageRawToStored(
          m,
          ctx.walletAddress,
          ctx.signMessage,
          ctx.embeddedWalletSigner
        );
        return [id, stored] as const;
      })
    )
  );

  const chunkStateByMsgId = new Map<string, { version: number; chunks: MessageChunk[] }>();
  const needsChunkText = new Set<string>();
  for (const c of topK) {
    if (c.chunkTextSource.kind === "chunk-cached") needsChunkText.add(c.message.id as string);
  }
  await Promise.all(
    Array.from(needsChunkText, async (id) => {
      const m = uniqueMessages.get(id)!;
      const parsed = await readRawJsonField<MessageChunk[]>(m, "chunks", ctx.walletAddress);
      const version = Number(m.updated_at) || 0;
      if (parsed) chunkStateByMsgId.set(id, { version, chunks: parsed });
    })
  );

  return topK.map(({ message, similarity, chunkTextSource }) => {
    const stored = { ...storedById.get(message.id as string)! };
    let chunkText: string;
    if (chunkTextSource.kind === "chunk") {
      chunkText = resolveChunkText(stored.content, chunkTextSource.chunk, chunkTextSource.siblings);
    } else if (chunkTextSource.kind === "chunk-cached") {
      const state = chunkStateByMsgId.get(message.id as string);
      const chunk =
        state && state.version === chunkTextSource.version
          ? state.chunks[chunkTextSource.chunkIndex]
          : undefined;
      chunkText = resolveChunkText(stored.content, chunk, state?.chunks);
    } else {
      chunkText = stored.content;
    }
    return { chunkText, message: stored, similarity };
  });
}

async function _getMessagesWithEmbeddingsOp(
  ctx: StorageOperationsContext,
  conversationId?: string
): Promise<StoredMessage[]> {
  const activeConversations = await ctx.conversationsCollection
    .query(Q.where("is_deleted", false))
    .fetch();
  const activeConversationIds = new Set(
    activeConversations.map((c) => String(c._getRaw("conversation_id")))
  );

  const queryConditions = conversationId ? [Q.where("conversation_id", conversationId)] : [];

  const messages = (await ctx.messagesCollection
    .query(...queryConditions)
    .unsafeFetchRaw()) as Record<string, unknown>[];

  const filtered = messages.filter((m) => {
    const msgConvId = String(m.conversation_id);
    const vectorRaw = m.vector;
    return (
      vectorRaw &&
      typeof vectorRaw === "string" &&
      vectorRaw.length > 0 &&
      activeConversationIds.has(msgConvId)
    );
  });

  return Promise.all(
    filtered.map((msg) =>
      messageRawToStored(msg, ctx.walletAddress, ctx.signMessage, ctx.embeddedWalletSigner)
    )
  );
}

/**
 * Get all files from all conversations, sorted by creation date (newest first).
 * Returns files with conversation context for building file browser UIs.
 */
export async function getAllFilesOp(
  ctx: StorageOperationsContext,
  options?: {
    /** Filter files by conversation ID */
    conversationId?: string;
    /** Maximum number of files to return */
    limit?: number;
  }
): Promise<StoredFileWithContext[]> {
  const { conversationId, limit } = options || {};

  const activeConversations = await ctx.conversationsCollection
    .query(Q.where("is_deleted", false))
    .fetch();
  const activeConversationIds = new Set(
    activeConversations.map((c) => String(c._getRaw("conversation_id")))
  );

  const queryConditions = conversationId ? [Q.where("conversation_id", conversationId)] : [];

  const messages = await ctx.messagesCollection
    .query(...queryConditions, Q.sortBy("created_at", Q.desc))
    .fetch();

  const filesWithContext: StoredFileWithContext[] = [];

  for (const message of messages) {
    const msgConvId = String(message._getRaw("conversation_id"));
    if (!activeConversationIds.has(msgConvId)) continue;

    const files = message.files;
    if (!files || files.length === 0) continue;

    for (const file of files) {
      filesWithContext.push({
        ...file,
        conversationId: msgConvId,
        createdAt: message.createdAt,
        messageRole: message.role,
      });
    }

    if (limit && filesWithContext.length >= limit) {
      return filesWithContext.slice(0, limit);
    }
  }

  return filesWithContext;
}

/**
 * Create a synthetic StoredMessage from CreateMessageOptions without a DB round-trip.
 * Used when writes are queued (encryption key not yet available).
 * When opts.uniqueId is provided, it is used as-is so the synthetic message
 * shares the same identity as the consumer's in-flight streaming placeholder.
 * Otherwise a temporary "queued_*" ID is generated and will be replaced on flush.
 */
export function makeSyntheticStoredMessage(opts: CreateMessageOptions): StoredMessage {
  const now = new Date();
  return {
    uniqueId: opts.uniqueId || `queued_${uuidv7()}`,
    messageId: Number.MAX_SAFE_INTEGER,
    conversationId: opts.conversationId,
    role: opts.role,
    content: opts.content,
    model: opts.model,
    files: opts.files,
    fileIds: opts.fileIds,
    createdAt: now,
    updatedAt: now,
    vector: opts.vector,
    embeddingModel: opts.embeddingModel,
    usage: opts.usage,
    sources: opts.sources,
    responseDuration: opts.responseDuration,
    wasStopped: opts.wasStopped,
    error: opts.error,
    thoughtProcess: opts.thoughtProcess,
    thinking: opts.thinking,
    parentMessageId: opts.parentMessageId,
    toolCallEvents: opts.toolCallEvents,
    origin: opts.origin,
  };
}

/**
 * Create a synthetic StoredConversation from CreateConversationOptions without a DB round-trip.
 * Used when writes are queued (encryption key not yet available).
 */
export function makeSyntheticStoredConversation(
  opts?: CreateConversationOptions,
  defaultTitle?: string
): StoredConversation {
  const now = new Date();
  return {
    uniqueId: `queued_${uuidv7()}`,
    conversationId: opts?.conversationId || generateConversationId(),
    title: opts?.title || defaultTitle || "New Conversation",
    projectId: opts?.projectId,
    createdAt: now,
    updatedAt: now,
    isDeleted: false,
  };
}
