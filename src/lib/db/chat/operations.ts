import type { Collection, Database } from "@nozbe/watermelondb";
import { Q } from "@nozbe/watermelondb";
import { v7 as uuidv7 } from "uuid";

import type { EmbeddedWalletSignerFn, SignMessageFn } from "../../../react/useEncryption";
import { requestEncryptionKey } from "../../../react/useEncryption";
import { getLogger } from "../../logger";
import { cosineSimilarity } from "../../memoryEngine/vector";
import { decryptJsonField } from "../encryption-utils";
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
  // Use _getRaw for fields that may be encrypted - the @json decorator fails on encrypted strings
  const convId = String(message._getRaw("conversation_id"));

  // For JSON fields that may be encrypted, get raw value and parse if not encrypted
  const parseJsonField = <T>(rawValue: string | number | boolean | null): T | undefined => {
    if (!rawValue) return undefined;
    if (typeof rawValue === "string") {
      // If encrypted, return the string for later decryption
      if (rawValue.startsWith("enc:")) return rawValue as T;
      // Otherwise parse as JSON
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
  };
}

/**
 * Converts a Message model to StoredMessage, decrypting fields if encryption context is available.
 */
async function messageToStored(
  message: Message,
  walletAddress?: string,
  signMessage?: SignMessageFn,
  embeddedWalletSigner?: EmbeddedWalletSignerFn,
  projection?: MessageProjectionOptions
): Promise<StoredMessage> {
  // decryptMessageFields short-circuits on undefined vector/chunks, so the
  // skipEmbeddings projection needs no changes on the decrypt side.
  const baseMessage = messageToStoredRaw(message, projection);

  // Decrypt fields if wallet address provided
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

/**
 * Converts a Conversation model to StoredConversation, decrypting fields if encryption context is available.
 */
async function conversationToStored(
  conversation: Conversation,
  walletAddress?: string,
  signMessage?: SignMessageFn,
  embeddedWalletSigner?: EmbeddedWalletSignerFn
): Promise<StoredConversation> {
  const baseConversation = conversationToStoredRaw(conversation);

  // Decrypt fields if wallet address provided
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

  // Encrypt conversation fields if encryption context is available
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
  const results = await ctx.conversationsCollection
    .query(Q.where("is_deleted", false), Q.sortBy("created_at", Q.desc))
    .fetch();

  return Promise.all(
    results.map((conv) =>
      conversationToStored(conv, ctx.walletAddress, ctx.signMessage, ctx.embeddedWalletSigner)
    )
  );
}

/**
 * Lazy projection of a Conversation: keeps the raw stored title under
 * `encryptedTitle` instead of decrypting eagerly.
 *
 * Synchronous and pure — no encryption context needed and no DB write.
 * This is the entire point: callers can hold thousands of these in a
 * Zustand store without paying the per-row decrypt cost or holding
 * plaintext titles in RAM.
 */
function conversationToLazyStored(conversation: Conversation): LazyStoredConversation {
  return {
    uniqueId: conversation.id,
    conversationId: conversation.conversationId,
    encryptedTitle: conversation.title,
    projectId: conversation.projectId,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
    isDeleted: conversation.isDeleted,
    pinnedAt: conversation.pinnedAt,
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
  const results = await ctx.conversationsCollection
    .query(Q.where("is_deleted", false), Q.sortBy("created_at", Q.desc))
    .fetch();

  return results.map(conversationToLazyStored);
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
  const results = await ctx.conversationsCollection
    .query(
      Q.where("project_id", projectId === null ? "" : projectId),
      Q.where("is_deleted", false),
      Q.sortBy("created_at", Q.desc)
    )
    .fetch();

  return results.map(conversationToLazyStored);
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
    // Encrypt title if encryption context is available
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
  const results = await ctx.conversationsCollection
    .query(
      Q.where("project_id", projectId === null ? "" : projectId),
      Q.where("is_deleted", false),
      Q.sortBy("created_at", Q.desc)
    )
    .fetch();

  return Promise.all(
    results.map((conv) =>
      conversationToStored(conv, ctx.walletAddress, ctx.signMessage, ctx.embeddedWalletSigner)
    )
  );
}

export async function getMessagesOp(
  ctx: StorageOperationsContext,
  convId: string
): Promise<StoredMessage[]> {
  const results = await ctx.messagesCollection
    .query(Q.where("conversation_id", convId), Q.sortBy("message_id", Q.asc))
    .fetch();

  return Promise.all(
    results.map((msg) =>
      messageToStored(msg, ctx.walletAddress, ctx.signMessage, ctx.embeddedWalletSigner)
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
  // Guard the limit before it reaches Q.take: SQLite treats `LIMIT -1` as
  // "no limit", so an unvalidated negative (e.g. an off-by-one underflow on
  // a window-size computation) would silently fetch and decrypt the ENTIRE
  // conversation while the caller still believes the read was bounded. A
  // non-positive page is an empty page; fractional limits are floored.
  const limit = Math.floor(opts.limit);
  if (!Number.isFinite(limit) || limit < 1) return [];

  // legacy data may hold duplicated message_ids (count-based assignment +
  // deletes) — see GetMessagesPageOptions.boundaryExcludeUniqueIds.
  const exclude = new Set(opts.boundaryExcludeUniqueIds ?? []);

  const clauses = [Q.where("conversation_id", convId)];
  if (opts.beforeMessageId !== undefined) {
    clauses.push(
      exclude.size > 0
        ? Q.where("message_id", Q.lte(opts.beforeMessageId))
        : Q.where("message_id", Q.lt(opts.beforeMessageId))
    );
  }

  const fetched = await ctx.messagesCollection
    .query(...clauses, Q.sortBy("message_id", Q.desc), Q.take(limit + exclude.size))
    .fetch();

  // Drop the caller's already-held boundary rows, keep the newest `limit`.
  const results = (
    exclude.size > 0 ? fetched.filter((msg) => !exclude.has(msg.id)) : fetched
  ).slice(0, limit);

  // Fetched newest-first to take the tail; consumers expect ascending.
  results.reverse();

  return Promise.all(
    results.map((msg) =>
      messageToStored(msg, ctx.walletAddress, ctx.signMessage, ctx.embeddedWalletSigner, {
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
  const results = await ctx.messagesCollection
    .query(Q.where("conversation_id", convId), Q.sortBy("message_id", Q.asc))
    .fetch();

  const roleById = new Map<string, string>();
  for (const msg of results) {
    roleById.set(msg.id, msg.role);
  }

  const skeletons: MessageSkeleton[] = results.map((msg) => ({
    uniqueId: msg.id,
    messageId: msg.messageId,
    conversationId: String(msg._getRaw("conversation_id")),
    role: msg.role,
    createdAt: msg.createdAt,
    // WatermelonDB surfaces unset text columns as null at runtime — normalize
    // to undefined so `parentMessageId ?? undefined` keying works everywhere.
    parentMessageId: msg.parentMessageId ?? undefined,
    model: msg.model ?? undefined,
  }));

  // Second pass: decrypt content ONLY for user rows parented by a user row.
  const artifactIndices: number[] = [];
  for (let i = 0; i < results.length; i++) {
    const msg = results[i];
    if (msg.role !== "user" || !msg.parentMessageId) continue;
    if (roleById.get(msg.parentMessageId) === "user") {
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
        skeletons[i].content = await decryptField(results[i].content, address);
      })
    );
  } else {
    for (const i of artifactIndices) {
      skeletons[i].content = results[i].content;
    }
  }

  return skeletons;
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
  const messages = await ctx.messagesCollection.query(Q.where("conversation_id", convId)).fetch();

  await ctx.database.write(async () => {
    for (const message of messages) {
      // Clear file references before deletion
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
async function _deleteMessageOp(
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
    // Clear file references before deletion
    await message.update((msg) => {
      msg._setRaw("file_ids", null);
      msg._setRaw("files", null);
    });
    await message.destroyPermanently();
  });

  return uniqueId;
}

/**
 * Encrypt the message option fields when an encryption context is present.
 * Returns a flat record whose string fields may now be ciphertext.
 */
async function encryptMessageOptsIfNeeded(
  ctx: StorageOperationsContext,
  opts: CreateMessageOptions
): Promise<Record<string, unknown>> {
  return ctx.walletAddress && ctx.signMessage
    ? await encryptMessageFields(opts, ctx.walletAddress, ctx.signMessage, ctx.embeddedWalletSigner)
    : (opts as unknown as Record<string, unknown>);
}

/**
 * Write the (possibly encrypted) message fields onto a WatermelonDB message
 * record. Shared by createMessageOp and upsertMessageOp so create and update
 * stay byte-for-byte consistent — the single-assistant-row reconciliation
 * invariant depends on an update writing exactly what a create would.
 *
 * `message_id` is intentionally NOT written here: it's assigned once at create
 * time (sequential within the conversation) and must stay stable across an
 * upsert update so a reconciled row keeps its original ordinal.
 */
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
    // Sources may already be encrypted as a string, or may be an object to serialize
    const sourcesValue =
      typeof encryptedOpts.sources === "string"
        ? encryptedOpts.sources
        : JSON.stringify(encryptedOpts.sources);
    msg._setRaw("sources", sourcesValue);
  }
  if (encryptedOpts.responseDuration !== undefined)
    msg._setRaw("response_duration", encryptedOpts.responseDuration as number);
  if (encryptedOpts.vector) {
    // Vector may already be encrypted as a string, or may be an array to serialize
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
    // ThoughtProcess may already be encrypted as a string, or may be an object to serialize
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
}

export async function createMessageOp(
  ctx: StorageOperationsContext,
  opts: CreateMessageOptions
): Promise<StoredMessage> {
  // Idempotency guard: the consumer pre-allocates `uniqueId` as the record's stable
  // id (so the persisted message shares the streaming placeholder's React key), and
  // the offline/retry operation queue can replay this op (or a double-submit can
  // fire it twice). A second create with an already-used id throws the LokiJS
  // "Duplicate key for property id: <id>" error, which surfaced ~daily in the chat
  // path. If the message is already persisted, return it instead of recreating.
  //
  // On replay the FIRST-persisted row wins: we return it as-is and do not refresh
  // its content from `opts`. Callers reusing a `uniqueId` with diverging fields
  // (e.g. edited-then-resubmitted content) must use `upsertMessageOp` instead,
  // which reconciles the row in place.
  //
  // Only `find()` is guarded — a miss means "not yet persisted", so we fall through
  // to create. `messageToStored()` runs outside the catch so a genuine failure
  // (e.g. decryption of an existing row) propagates instead of masquerading as a
  // miss and falling through to a create() that would re-throw the duplicate-key
  // error this guard exists to prevent. Mirrors the find pattern in the update ops.
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

  // max(message_id) + 1, NOT count + 1: after a mid-thread delete (or a
  // create racing a partial backup restore) the row count is lower than the
  // highest assigned id, so count + 1 would REUSE an existing message_id.
  // Duplicated ids have no stable ordering and break message_id-cursor
  // pagination (see getMessagesPageOp's boundaryExcludeUniqueIds).
  const newest = await ctx.messagesCollection
    .query(
      Q.where("conversation_id", opts.conversationId),
      Q.sortBy("message_id", Q.desc),
      Q.take(1)
    )
    .fetch();
  const messageId = (newest[0]?.messageId ?? 0) + 1;

  // Encrypt message fields if encryption context is available.
  // encryptMessageFields returns Record<string, unknown> with the same keys as opts,
  // but string fields may now be encrypted strings.
  const encryptedOpts = await encryptMessageOptsIfNeeded(ctx, opts);

  const created = await ctx.database.write(async () => {
    return await ctx.messagesCollection.create((msg) => {
      // Use pre-allocated ID when provided so the persisted message shares the
      // same React key as the consumer's in-flight streaming placeholder.
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

  // No row yet — this is the first persist for this id. Delegate to create so
  // the sequential message_id and pre-allocated id logic stay in one place.
  if (!existing) {
    return createMessageOp(ctx, opts);
  }

  // Map the create-shaped opts onto an UpdateMessageOptions and reuse the
  // shared update machinery so create/update field semantics never drift and
  // explicit `wasStopped: false` / `error: null` clears land.
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
  // _updateMessageOp only returns null when the row vanished between our find
  // and its own — re-find via create would violate the single-row invariant,
  // so surface the original row's stored form instead.
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
  } catch {
    return null;
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

  // Note: Embeddings are stored unencrypted as they are not user-generated content
  // and are used for vector similarity search. They are only encrypted when stored
  // as part of a full message via createMessageOp/updateMessageOp.
  await ctx.database.write(async () => {
    await message.update((msg) => {
      msg._setRaw("vector", JSON.stringify(vector));
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

  // Note: Chunks contain embeddings used for vector search, stored unencrypted
  // for the same reasons as updateMessageEmbeddingOp.
  await ctx.database.write(async () => {
    await message.update((msg) => {
      msg._setRaw("chunks", JSON.stringify(chunks));
      msg._setRaw("embedding_model", embeddingModel);
    });
  });

  return messageToStored(message, ctx.walletAddress, ctx.signMessage, ctx.embeddedWalletSigner);
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

  // Error strings are not encrypted (they are system-generated, not user content)
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

  // Feedback is not encrypted (it's not user-generated content, just a flag)
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

  // Encrypt update fields if encryption context is available
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

/**
 * Reads a JSON field from a WatermelonDB model using _getRaw, handling encrypted values.
 * The @json decorator fails on encrypted strings, so this uses _getRaw + manual parsing.
 */
async function readJsonField<T>(
  model: Message,
  column: string,
  walletAddress?: string
): Promise<T | undefined> {
  const raw = model._getRaw(column) as string | undefined;
  if (!raw) return undefined;

  if (walletAddress && isEncrypted(raw)) {
    return await decryptJsonField<T>(raw, walletAddress);
  }

  try {
    return JSON.parse(raw) as T;
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
    // Use _getRaw for reliable raw column access
    activeConversations.map((c) => String(c._getRaw("conversation_id")))
  );

  const queryConditions = conversationId ? [Q.where("conversation_id", conversationId)] : [];

  const messages = await ctx.messagesCollection.query(...queryConditions).fetch();

  // First pass: score every candidate by similarity. Decrypting just
  // the vector field is unavoidable here since vectors are stored
  // encrypted, but the previous implementation also fully-decrypted
  // every above-threshold message (content, thinking, sources, chunks,
  // thoughtProcess, toolCallEvents) BEFORE the top-K slice. For a
  // search across thousands of messages where dozens clear the
  // threshold but only `limit` survive top-K, that wasted N*K JSON
  // decrypts and the corresponding plaintext allocations.
  //
  // The two-pass version below decrypts only the surviving K. The
  // sort key, set of returned messages, and the externally-observable
  // shape are identical to the eager version.
  const candidates: { message: Message; similarity: number }[] = [];

  for (const message of messages) {
    // Use _getRaw for reliable raw column access
    const msgConvId = String(message._getRaw("conversation_id"));
    if (!activeConversationIds.has(msgConvId)) continue;

    const messageVector = await readJsonField<number[]>(message, "vector", ctx.walletAddress);
    if (!messageVector || messageVector.length === 0) continue;

    const similarity = cosineSimilarity(queryVector, messageVector);
    if (similarity >= minSimilarity) {
      candidates.push({ message, similarity });
    }
  }

  // Sort then slice — same comparator as before. Stable ordering on
  // ties is preserved because `Array.prototype.sort` is stable in
  // modern engines and `messages` was iterated in fetch order.
  const topK = candidates.sort((a, b) => b.similarity - a.similarity).slice(0, limit);

  // Decrypt only the top-K survivors.
  return Promise.all(
    topK.map(async ({ message, similarity }) => {
      const stored = await messageToStored(
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
     * Current embedding model. When set, messages whose stored
     * `embedding_model` is non-null and differs are skipped — their vectors
     * live in a different space, so cosine against the current-model query is
     * meaningless (and the dim-mismatch path returns 0 silently). Null/absent
     * `embedding_model` is grandfathered as current-model-compatible. Skipped
     * messages are re-embedded out-of-band by `chunkAndEmbedAllMessages`.
     */
    embeddingModel?: string;
  }
): Promise<ChunkSearchResult[]> {
  const { limit = 10, minSimilarity = 0.5, conversationId, embeddingModel } = options || {};

  const activeConversations = await ctx.conversationsCollection
    .query(Q.where("is_deleted", false))
    .fetch();
  const activeConversationIds = new Set(
    // Use _getRaw for reliable raw column access
    activeConversations.map((c) => String(c._getRaw("conversation_id")))
  );

  const queryConditions = conversationId ? [Q.where("conversation_id", conversationId)] : [];

  const messages = await ctx.messagesCollection.query(...queryConditions).fetch();

  // Same two-pass shape as searchMessagesOp: score everything first,
  // then decrypt only the survivors of the top-K cut.
  //
  // Each candidate keeps a `chunkTextSource` describing how to compute
  // the final `chunkText`:
  //   - "chunk": text comes straight from the chunk record (already
  //     plaintext on this code path because `readJsonField` decrypted
  //     the whole `chunks` payload above).
  //   - "message": fallback path uses the decrypted message content,
  //     so we delay reading it until after the top-K slice.
  type Candidate = {
    message: Message;
    similarity: number;
    chunkTextSource: { kind: "chunk"; text: string } | { kind: "message" };
  };
  const candidates: Candidate[] = [];
  let staleSkipped = 0;

  for (const message of messages) {
    // Use _getRaw for reliable raw column access
    const msgConvId = String(message._getRaw("conversation_id"));
    if (!activeConversationIds.has(msgConvId)) continue;

    // Skip stale-model vectors: a non-null embedding_model that differs from
    // the current model lives in an incompatible vector space. Null is
    // grandfathered (legacy rows were embedded with the current model).
    if (embeddingModel) {
      const storedModel = message._getRaw("embedding_model") as string | null | undefined;
      if (storedModel !== null && storedModel !== undefined && storedModel !== embeddingModel) {
        staleSkipped++;
        continue;
      }
    }

    // Use _getRaw to read JSON fields that may be encrypted - the @json decorator fails on encrypted strings
    const chunks = await readJsonField<MessageChunk[]>(message, "chunks", ctx.walletAddress);

    // If message has chunks, search through them
    if (chunks && chunks.length > 0) {
      for (const chunk of chunks) {
        if (!chunk.vector || chunk.vector.length === 0) continue;

        const similarity = cosineSimilarity(queryVector, chunk.vector);
        if (similarity >= minSimilarity) {
          candidates.push({
            message,
            similarity,
            chunkTextSource: { kind: "chunk", text: chunk.text },
          });
        }
      }
    } else {
      // Fallback to whole message vector if no chunks
      const messageVector = await readJsonField<number[]>(message, "vector", ctx.walletAddress);
      if (!messageVector || messageVector.length === 0) continue;

      const similarity = cosineSimilarity(queryVector, messageVector);
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

  const topK = candidates.sort((a, b) => b.similarity - a.similarity).slice(0, limit);

  // Decrypt only the surviving messages, and dedupe by message id so a
  // message whose multiple chunks survive top-K is decrypted exactly
  // once instead of once per surviving chunk. This collapses the
  // worst-case N×messageToStored fan-out the prior shape had.
  const uniqueMessages = new Map<string, Message>();
  for (const c of topK) uniqueMessages.set(c.message.id, c.message);

  const storedById = new Map<string, StoredMessage>(
    await Promise.all(
      Array.from(uniqueMessages, async ([id, m]) => {
        const stored = await messageToStored(
          m,
          ctx.walletAddress,
          ctx.signMessage,
          ctx.embeddedWalletSigner
        );
        return [id, stored] as const;
      })
    )
  );

  // Shallow-clone the StoredMessage per result so two chunks from the
  // same parent message don't share a top-level object reference.
  // Without this clone, a caller mutating `result.message.foo` on one
  // chunk would silently mutate every sibling chunk's `.message` too —
  // the prior shape called `messageToStored` independently per chunk
  // and returned distinct objects, so we preserve that contract.
  return topK.map(({ message, similarity, chunkTextSource }) => {
    const stored = { ...storedById.get(message.id)! };
    const chunkText = chunkTextSource.kind === "chunk" ? chunkTextSource.text : stored.content;
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
    // Use _getRaw for reliable raw column access
    activeConversations.map((c) => String(c._getRaw("conversation_id")))
  );

  const queryConditions = conversationId ? [Q.where("conversation_id", conversationId)] : [];

  const messages = await ctx.messagesCollection.query(...queryConditions).fetch();

  const filtered = messages.filter((m) => {
    // Use _getRaw for reliable raw column access - the @json decorator fails on encrypted strings
    const msgConvId = String(m._getRaw("conversation_id"));
    const vectorRaw = m._getRaw("vector");
    return (
      vectorRaw &&
      typeof vectorRaw === "string" &&
      vectorRaw.length > 0 &&
      activeConversationIds.has(msgConvId)
    );
  });

  return Promise.all(
    filtered.map((msg) =>
      messageToStored(msg, ctx.walletAddress, ctx.signMessage, ctx.embeddedWalletSigner)
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

  // Get active conversations
  const activeConversations = await ctx.conversationsCollection
    .query(Q.where("is_deleted", false))
    .fetch();
  const activeConversationIds = new Set(
    // Use _getRaw for reliable raw column access
    activeConversations.map((c) => String(c._getRaw("conversation_id")))
  );

  // Build query conditions
  const queryConditions = conversationId ? [Q.where("conversation_id", conversationId)] : [];

  // Fetch all messages, sorted by creation date descending
  const messages = await ctx.messagesCollection
    .query(...queryConditions, Q.sortBy("created_at", Q.desc))
    .fetch();

  // Extract files from messages
  const filesWithContext: StoredFileWithContext[] = [];

  for (const message of messages) {
    // Skip messages from deleted conversations
    // Use _getRaw for reliable raw column access
    const msgConvId = String(message._getRaw("conversation_id"));
    if (!activeConversationIds.has(msgConvId)) continue;

    // Skip messages without files
    const files = message.files;
    if (!files || files.length === 0) continue;

    // Add each file with conversation context
    for (const file of files) {
      filesWithContext.push({
        ...file,
        conversationId: msgConvId,
        createdAt: message.createdAt,
        messageRole: message.role,
      });
    }

    // Check limit
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
    messageId: Number.MAX_SAFE_INTEGER, // Placeholder — DB assigns real sequential ID on flush
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
