/**
 * Queue Types
 *
 * Types for the in-memory write queue that holds operations
 * when encryption keys aren't yet available.
 */

import type { SignMessageFn, EmbeddedWalletSignerFn } from "../../../react/useEncryption";

/**
 * Types of database operations that can be queued.
 */
export type QueuedOperationType =
  | "createConversation"
  | "updateConversationTitle"
  | "createMessage"
  | "updateMessage"
  | "createMedia"
  | "createMediaBatch"
  | "updateMediaMessageId";

/**
 * A single queued database operation.
 */
export interface QueuedOperation {
  /** Unique ID for this operation */
  id: string;
  /** Type of operation */
  type: QueuedOperationType;
  /** Wallet address this operation belongs to */
  walletAddress: string;
  /** When the operation was queued */
  timestamp: number;
  /** Priority for ordering (lower = higher priority). Conversations=0, Messages=1, Media=2 */
  priority: number;
  /** IDs of operations that must complete before this one */
  dependencies: string[];
  /** Operation-specific payload */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload: Record<string, any>;
  /** Number of times this operation has been retried */
  retryCount: number;
  /** Maximum number of retries allowed */
  maxRetries: number;
}

/**
 * Status of a wallet's queue.
 */
export interface QueueStatus {
  /** Number of pending operations */
  pending: number;
  /** Number of operations that failed all retries */
  failed: number;
  /** Whether the queue is currently being flushed */
  isFlushing: boolean;
  /** Whether the queue is paused (e.g., wallet disconnected) */
  isPaused: boolean;
}

/**
 * Result of a flush operation.
 */
export interface FlushResult {
  /** IDs of operations that succeeded */
  succeeded: string[];
  /** Operations that failed with their errors */
  failed: Array<{ id: string; error: string }>;
  /** Total number of operations attempted */
  total: number;
}

/**
 * Encryption context needed to execute queued operations.
 */
export interface QueueEncryptionContext {
  walletAddress: string;
  signMessage: SignMessageFn;
  embeddedWalletSigner?: EmbeddedWalletSignerFn;
}

/**
 * Executor function that runs a single queued operation.
 * Provided by the consumer (e.g., useChatStorage) during flush.
 */
export type OperationExecutor = (
  operation: QueuedOperation,
  encryptionContext: QueueEncryptionContext
) => Promise<void>;
