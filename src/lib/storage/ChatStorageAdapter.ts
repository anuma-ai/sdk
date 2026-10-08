import type {
  CreateConversationOptions,
  CreateMessageOptions,
  GetMessagesPageOptions,
  MessageChunk,
  MessageFeedback,
  MessageSkeleton,
  StoredConversation,
  StoredFileWithContext,
  StoredMessage,
} from "../db/chat/types";

/**
 * Minimal interface for an observable (reactive) query result.
 *
 * Shaped to be compatible with RxJS-style `Observable` (which is what
 * WatermelonDB returns) and with a simple polling fallback, so non-reactive
 * backends can implement it without depending on rxjs.
 */
export interface ChatStorageObservable<T> {
  subscribe(observer: {
    next: (value: T) => void;
    error?: (err: unknown) => void;
    complete?: () => void;
  }): { unsubscribe: () => void };
}

/**
 * Common filter options for conversation queries. Kept deliberately narrow —
 * most call sites only need these.
 */
export interface ConversationQueryOptions {
  /** If set, only return conversations in this project. `null` = no project. */
  projectId?: string | null;
}

/**
 * Backend-agnostic interface for chat/conversation storage.
 *
 * The method set mirrors the operations we actually use across the SDK:
 * `*Op` functions in `src/lib/db/chat/operations.ts` plus the `observe*`
 * patterns used by react hooks. Targeted updates (e.g., `updateMessageError`)
 * are exposed as separate methods rather than a generic `update()` because
 * several of them have special semantics (encryption bypass for embeddings,
 * unique constraints on feedback, etc).
 */
export interface ChatStorageAdapter {
  getConversation(conversationId: string): Promise<StoredConversation | null>;

  getConversations(options?: ConversationQueryOptions): Promise<StoredConversation[]>;

  createConversation(options?: CreateConversationOptions): Promise<StoredConversation>;

  updateConversationTitle(conversationId: string, title: string): Promise<boolean>;

  updateConversationProject(conversationId: string, projectId: string | null): Promise<boolean>;

  /** Pin or unpin a conversation. Pinning stamps `pinnedAt`; list queries are
   * NOT reordered — consumers sort pinned chats first using `pinnedAt`. */
  updateConversationPinned(conversationId: string, pinned: boolean): Promise<boolean>;

  /** Soft delete. Implementations are responsible for cascading to messages/media. */
  deleteConversation(conversationId: string): Promise<boolean>;

  observeConversations(
    options?: ConversationQueryOptions
  ): ChatStorageObservable<StoredConversation[]>;

  getMessages(conversationId: string): Promise<StoredMessage[]>;

  /**
   * Paginated display read: newest `limit` messages (optionally below
   * `beforeMessageId`), ascending, with embeddings skipped. See
   * `getMessagesPageOp`.
   *
   * Optional so this is an additive, non-breaking interface change (same
   * rationale as {@link updateMessageFileIds}). The default
   * {@link WatermelonChatStorageAdapter} provides it.
   */
  getMessagesPage?(
    conversationId: string,
    options: GetMessagesPageOptions
  ): Promise<StoredMessage[]>;

  /**
   * Whole-thread branch-tree skeleton (no decrypt). See
   * `getMessageSkeletonsOp`. Optional for the same additive-change rationale.
   */
  getMessageSkeletons?(conversationId: string): Promise<MessageSkeleton[]>;

  /** Total message count for a conversation. Optional (additive change). */
  getMessageCount?(conversationId: string): Promise<number>;

  createMessage(options: CreateMessageOptions): Promise<StoredMessage>;

  updateMessageEmbedding(
    uniqueId: string,
    vector: number[],
    embeddingModel: string
  ): Promise<StoredMessage | null>;

  updateMessageChunks(
    uniqueId: string,
    chunks: MessageChunk[],
    embeddingModel: string
  ): Promise<StoredMessage | null>;

  updateMessageError(uniqueId: string, error: string): Promise<StoredMessage | null>;

  updateMessageFeedback(uniqueId: string, feedback: MessageFeedback): Promise<StoredMessage | null>;

  /**
   * Replace a message's attached media ids (`fileIds`). Used to attach a
   * generated artifact (e.g. a rendered document PDF) to the assistant message
   * that produced it, after streaming. Pass the FULL desired list.
   *
   * Optional so this is an additive, non-breaking interface change: only hosts
   * wiring document/artifact generation need it, and existing custom adapters
   * keep compiling without implementing it. The default
   * {@link WatermelonChatStorageAdapter} provides it.
   */
  updateMessageFileIds?(uniqueId: string, fileIds: string[]): Promise<StoredMessage | null>;

  /** Clears all messages in a conversation (used for the "clear chat" action). */
  clearMessages(conversationId: string): Promise<void>;

  observeMessages(conversationId: string): ChatStorageObservable<StoredMessage[]>;

  getAllFiles(): Promise<StoredFileWithContext[]>;

  /**
   * Run a set of mutations inside a single write transaction. Any mutation
   * calls made on the adapter inside the callback are grouped into one atomic
   * write on backends that support it.
   *
   * On backends without transaction support, this may fall back to sequential
   * writes. Implementations must document the guarantee they provide.
   */
  write<T>(fn: (adapter: ChatStorageAdapter) => Promise<T>): Promise<T>;
}
