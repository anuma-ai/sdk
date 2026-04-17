/**
 * WatermelonChatStorageAdapter — the default `ChatStorageAdapter`
 * implementation, backed by WatermelonDB.
 *
 * This is intentionally a thin wrapper. It delegates to the `*Op` functions
 * in `src/lib/db/chat/operations.ts` so the adapter ships with zero
 * behavioral drift from the existing code paths that `useChatStorage` and
 * friends already use.
 *
 * See `ChatStorageAdapter.ts` for the broader migration plan (issue #458).
 */

import type { Collection, Database } from "@nozbe/watermelondb";
import { Q } from "@nozbe/watermelondb";

import type { EmbeddedWalletSignerFn, SignMessageFn } from "../../react/useEncryption";
import { Conversation, Message } from "../db/chat/models";
import {
  clearMessagesOp,
  conversationToStoredRaw,
  createConversationOp,
  createMessageOp,
  deleteConversationOp,
  getAllFilesOp,
  getConversationOp,
  getConversationsByProjectOp,
  getConversationsOp,
  getMessagesOp,
  type StorageOperationsContext,
  updateConversationProjectOp,
  updateConversationTitleOp,
  updateMessageChunksOp,
  updateMessageEmbeddingOp,
  updateMessageErrorOp,
  updateMessageFeedbackOp,
} from "../db/chat/operations";
import type {
  CreateConversationOptions,
  CreateMessageOptions,
  MessageChunk,
  MessageFeedback,
  StoredConversation,
  StoredFileWithContext,
  StoredMessage,
} from "../db/chat/types";
import type {
  ChatStorageAdapter,
  ChatStorageObservable,
  ConversationQueryOptions,
} from "./ChatStorageAdapter";

/**
 * Context needed to construct a `WatermelonChatStorageAdapter`.
 *
 * Mirrors `StorageOperationsContext` but exposes only the `Database` — the
 * adapter resolves the required collections itself so callers don't have to
 * know the table names.
 */
export interface WatermelonChatStorageAdapterOptions {
  database: Database;
  /** Wallet address for field-level encryption (optional). */
  walletAddress?: string;
  /** Signing function for deriving encryption keys (optional). */
  signMessage?: SignMessageFn;
  /** Silent signing function for embedded wallets (optional). */
  embeddedWalletSigner?: EmbeddedWalletSignerFn;
}

export class WatermelonChatStorageAdapter implements ChatStorageAdapter {
  private readonly ctx: StorageOperationsContext;
  private readonly messages: Collection<Message>;
  private readonly conversations: Collection<Conversation>;

  constructor(options: WatermelonChatStorageAdapterOptions) {
    this.messages = options.database.get<Message>("history");
    this.conversations = options.database.get<Conversation>("conversations");
    this.ctx = {
      database: options.database,
      messagesCollection: this.messages,
      conversationsCollection: this.conversations,
      walletAddress: options.walletAddress,
      signMessage: options.signMessage,
      embeddedWalletSigner: options.embeddedWalletSigner,
    };
  }

  // ---------- Conversations ----------

  getConversation(conversationId: string): Promise<StoredConversation | null> {
    return getConversationOp(this.ctx, conversationId);
  }

  getConversations(options?: ConversationQueryOptions): Promise<StoredConversation[]> {
    if (options?.projectId !== undefined) {
      return getConversationsByProjectOp(this.ctx, options.projectId);
    }
    return getConversationsOp(this.ctx);
  }

  createConversation(options?: CreateConversationOptions): Promise<StoredConversation> {
    return createConversationOp(this.ctx, options);
  }

  updateConversationTitle(conversationId: string, title: string): Promise<boolean> {
    return updateConversationTitleOp(this.ctx, conversationId, title);
  }

  updateConversationProject(conversationId: string, projectId: string | null): Promise<boolean> {
    return updateConversationProjectOp(this.ctx, conversationId, projectId);
  }

  deleteConversation(conversationId: string): Promise<boolean> {
    return deleteConversationOp(this.ctx, conversationId);
  }

  observeConversations(
    options?: ConversationQueryOptions
  ): ChatStorageObservable<StoredConversation[]> {
    const conditions =
      options?.projectId !== undefined
        ? [
            Q.where("project_id", options.projectId === null ? "" : options.projectId),
            Q.where("is_deleted", false),
            Q.sortBy("created_at", Q.desc),
          ]
        : [Q.where("is_deleted", false), Q.sortBy("created_at", Q.desc)];

    const rx = this.conversations.query(...conditions).observe();
    return {
      subscribe: (observer) => {
        const sub = rx.subscribe({
          next: (records) => observer.next(records.map(conversationToStoredRaw)),
          error: observer.error,
          complete: observer.complete,
        });
        return { unsubscribe: () => sub.unsubscribe() };
      },
    };
  }

  // ---------- Messages ----------

  getMessages(conversationId: string): Promise<StoredMessage[]> {
    return getMessagesOp(this.ctx, conversationId);
  }

  createMessage(options: CreateMessageOptions): Promise<StoredMessage> {
    return createMessageOp(this.ctx, options);
  }

  updateMessageEmbedding(
    uniqueId: string,
    vector: number[],
    embeddingModel: string
  ): Promise<StoredMessage | null> {
    return updateMessageEmbeddingOp(this.ctx, uniqueId, vector, embeddingModel);
  }

  updateMessageChunks(
    uniqueId: string,
    chunks: MessageChunk[],
    embeddingModel: string
  ): Promise<StoredMessage | null> {
    return updateMessageChunksOp(this.ctx, uniqueId, chunks, embeddingModel);
  }

  updateMessageError(uniqueId: string, error: string): Promise<StoredMessage | null> {
    return updateMessageErrorOp(this.ctx, uniqueId, error);
  }

  updateMessageFeedback(
    uniqueId: string,
    feedback: MessageFeedback
  ): Promise<StoredMessage | null> {
    return updateMessageFeedbackOp(this.ctx, uniqueId, feedback);
  }

  clearMessages(conversationId: string): Promise<void> {
    return clearMessagesOp(this.ctx, conversationId);
  }

  observeMessages(conversationId: string): ChatStorageObservable<StoredMessage[]> {
    // Raw mapping here: returning decrypted messages would require an async
    // pipeline; callers that need decrypted messages should use `getMessages`
    // and re-fetch on the `next` signal. A follow-up PR will layer a
    // decryption-aware observable.
    const rx = this.messages
      .query(Q.where("conversation_id", conversationId), Q.sortBy("message_id", Q.asc))
      .observe();
    return {
      subscribe: (observer) => {
        const sub = rx.subscribe({
          next: () => {
            // Fetch decrypted view on change.
            void getMessagesOp(this.ctx, conversationId)
              .then(observer.next)
              .catch((err) => {
                observer.error?.(err);
              });
          },
          error: observer.error,
          complete: observer.complete,
        });
        return { unsubscribe: () => sub.unsubscribe() };
      },
    };
  }

  // ---------- Files ----------

  getAllFiles(): Promise<StoredFileWithContext[]> {
    return getAllFilesOp(this.ctx);
  }

  // ---------- Transactions ----------

  /**
   * WatermelonDB nests `database.write()` safely: each method we call inside
   * the callback already wraps its own writes, and Watermelon collapses the
   * nesting under a single action. The callback receives the same adapter
   * instance.
   */
  write<T>(fn: (adapter: ChatStorageAdapter) => Promise<T>): Promise<T> {
    return this.ctx.database.write(() => fn(this));
  }
}
