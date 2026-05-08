/**
 * ChatStorageAdapter — backend-agnostic seam for chat/conversation storage.
 *
 * ## Why this exists
 *
 * Today, react hooks in `src/react/*` and server code in `src/server/*` import
 * WatermelonDB directly (`@nozbe/watermelondb`). That makes it hard to:
 *
 *   - Ship the SDK on backends where WatermelonDB isn't a great fit
 *     (IndexedDB-only web apps, plain SQLite on the server, Postgres, etc).
 *   - Mock storage for tests without pulling in the full Watermelon setup.
 *   - Decouple the *reactive* side of Watermelon (observe/subscribe) from
 *     non-reactive environments like Node servers that don't need it.
 *
 * This interface defines the minimum operation set we actually use across the
 * codebase, based on a survey of `useChatStorage`, the various react hooks,
 * and `src/lib/db/chat/operations.ts`. It is intentionally shaped around the
 * *domain* (conversations, messages, files) rather than the WatermelonDB
 * primitives (Database, Collection, Query).
 *
 * ## Scope of this PR
 *
 * This PR *defines* the seam. It does NOT rewire existing callers — they
 * still use WatermelonDB directly. The default implementation
 * (`WatermelonChatStorageAdapter`) is a thin wrapper that delegates to the
 * existing Watermelon-backed `*Op` functions in `src/lib/db/chat/operations.ts`,
 * so early consumers can start depending on the adapter interface without any
 * behavior change.
 *
 * ## Migration plan
 *
 * 1. (done in this PR) Define `ChatStorageAdapter` + `WatermelonChatStorageAdapter`.
 * 2. Add an adapter-provider React context so hooks can be constructed from
 *    either a raw `Database` (current behavior, via a default adapter) or an
 *    injected adapter.
 * 3. Migrate read hooks first (`useProjects`, `useFiles`, `useSettings`,
 *    `useBackup` variants) — these only need get/query/observe.
 * 4. Migrate `useChatStorage` (the big one) — requires batching and
 *    transactional writes. This is where we will stress-test the `write()`
 *    method.
 * 5. Provide a non-reactive adapter variant (or make `observe*` methods
 *    optional) so server code in `src/server/*` can consume the same
 *    interface without pulling in Watermelon's reactive runtime.
 * 6. Ship alternate implementations: a pure IndexedDB adapter, a SQLite/
 *    better-sqlite3 adapter for server-side use, and a Postgres adapter
 *    that replaces `src/server/pg-adapter.ts` at a higher level.
 *
 * Tracked in issue #458.
 */

import type {
  CreateConversationOptions,
  CreateMessageOptions,
  MessageChunk,
  MessageFeedback,
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
  // ---------- Conversations ----------

  getConversation(conversationId: string): Promise<StoredConversation | null>;

  getConversations(options?: ConversationQueryOptions): Promise<StoredConversation[]>;

  createConversation(options?: CreateConversationOptions): Promise<StoredConversation>;

  updateConversationTitle(conversationId: string, title: string): Promise<boolean>;

  updateConversationProject(conversationId: string, projectId: string | null): Promise<boolean>;

  /** Soft delete. Implementations are responsible for cascading to messages/media. */
  deleteConversation(conversationId: string): Promise<boolean>;

  observeConversations(
    options?: ConversationQueryOptions
  ): ChatStorageObservable<StoredConversation[]>;

  // ---------- Messages ----------

  getMessages(conversationId: string): Promise<StoredMessage[]>;

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

  /** Clears all messages in a conversation (used for the "clear chat" action). */
  clearMessages(conversationId: string): Promise<void>;

  observeMessages(conversationId: string): ChatStorageObservable<StoredMessage[]>;

  // ---------- Files (attachments aggregated from messages) ----------

  getAllFiles(): Promise<StoredFileWithContext[]>;

  // ---------- Transactions ----------

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
