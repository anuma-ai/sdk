/**
 * Queue Manager
 *
 * In-memory queue for database operations when encryption keys aren't yet available.
 * Operations are held in memory and flushed to the database once the key becomes available.
 *
 * Key design decisions:
 * - In-memory only: queue is lost on page refresh (acceptable since user must re-auth anyway)
 * - Per-wallet isolation: each wallet has its own queue
 * - Dependency tracking: operations are flushed in correct order (conversation before messages)
 * - Max 1000 operations per wallet to prevent memory leaks
 */

import type {
  QueuedOperation,
  QueuedOperationType,
  QueueStatus,
  FlushResult,
  QueueEncryptionContext,
  OperationExecutor,
} from "./types";

const MAX_OPERATIONS_PER_WALLET = 1000;
const DEFAULT_MAX_RETRIES = 3;

/** Priority levels for operation types (lower = higher priority) */
const OPERATION_PRIORITY: Record<QueuedOperationType, number> = {
  createConversation: 0,
  updateConversationTitle: 1,
  createMessage: 2,
  updateMessage: 3,
  createMedia: 4,
  createMediaBatch: 4,
  updateMediaMessageId: 5,
};

let idCounter = 0;
function generateQueueId(): string {
  return `queue_${Date.now()}_${++idCounter}`;
}

/**
 * Topological sort of operations respecting dependencies.
 * Falls back to priority + timestamp ordering for independent operations.
 */
export function topologicalSort(operations: QueuedOperation[]): QueuedOperation[] {
  const opMap = new Map<string, QueuedOperation>();
  for (const op of operations) {
    opMap.set(op.id, op);
  }

  const visited = new Set<string>();
  const sorted: QueuedOperation[] = [];

  function visit(op: QueuedOperation): void {
    if (visited.has(op.id)) return;
    visited.add(op.id);

    // Visit dependencies first
    for (const depId of op.dependencies) {
      const dep = opMap.get(depId);
      if (dep && !visited.has(depId)) {
        visit(dep);
      }
    }

    sorted.push(op);
  }

  // Sort by priority then timestamp before visiting to ensure stable ordering
  const prioritySorted = [...operations].sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return a.timestamp - b.timestamp;
  });

  for (const op of prioritySorted) {
    visit(op);
  }

  return sorted;
}

/**
 * Exponential backoff delay for retries.
 * 1s, 2s, 4s for retryCount 0, 1, 2
 */
function exponentialBackoff(retryCount: number): number {
  return Math.pow(2, retryCount) * 1000;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Determines if an error is transient and worth retrying.
 */
function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return (
      msg.includes("network") ||
      msg.includes("timeout") ||
      msg.includes("fetch") ||
      msg.includes("econnreset") ||
      msg.includes("econnrefused")
    );
  }
  return false;
}

export class QueueManager {
  /** Per-wallet operation queues: wallet address -> operation id -> operation */
  private queues = new Map<string, Map<string, QueuedOperation>>();
  /** Per-wallet flushing state */
  private flushing = new Set<string>();
  /** Per-wallet paused state */
  private paused = new Set<string>();
  /** Per-wallet failed operations (exceeded max retries) */
  private failedOps = new Map<string, Map<string, QueuedOperation>>();
  /** Change listeners: wallet address -> callbacks */
  private listeners = new Map<string, Set<() => void>>();

  /**
   * Queue a new operation for a wallet.
   * @returns The operation ID, or null if queue is full.
   */
  queueOperation(
    walletAddress: string,
    type: QueuedOperationType,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    payload: Record<string, any>,
    dependencies: string[] = [],
    maxRetries: number = DEFAULT_MAX_RETRIES
  ): string | null {
    let walletQueue = this.queues.get(walletAddress);
    if (!walletQueue) {
      walletQueue = new Map();
      this.queues.set(walletAddress, walletQueue);
    }

    if (walletQueue.size >= MAX_OPERATIONS_PER_WALLET) {
      console.warn(
        `[QueueManager] Queue full for ${walletAddress} (${MAX_OPERATIONS_PER_WALLET} ops). Rejecting new operation.`
      );
      return null;
    }

    const id = generateQueueId();
    const operation: QueuedOperation = {
      id,
      type,
      walletAddress,
      timestamp: Date.now(),
      priority: OPERATION_PRIORITY[type],
      dependencies,
      payload,
      retryCount: 0,
      maxRetries,
    };

    walletQueue.set(id, operation);
    this.notifyListeners(walletAddress);

    return id;
  }

  /**
   * Get all pending operations for a wallet, sorted by dependency order.
   */
  getOperations(walletAddress: string): QueuedOperation[] {
    const walletQueue = this.queues.get(walletAddress);
    if (!walletQueue || walletQueue.size === 0) return [];
    return topologicalSort([...walletQueue.values()]);
  }

  /**
   * Remove a specific operation from the queue.
   */
  removeOperation(walletAddress: string, operationId: string): void {
    const walletQueue = this.queues.get(walletAddress);
    if (walletQueue) {
      walletQueue.delete(operationId);
      if (walletQueue.size === 0) {
        this.queues.delete(walletAddress);
      }
      this.notifyListeners(walletAddress);
    }
  }

  /**
   * Get the status of a wallet's queue.
   */
  getStatus(walletAddress: string): QueueStatus {
    const walletQueue = this.queues.get(walletAddress);
    const failedQueue = this.failedOps.get(walletAddress);

    return {
      pending: walletQueue?.size ?? 0,
      failed: failedQueue?.size ?? 0,
      isFlushing: this.flushing.has(walletAddress),
      isPaused: this.paused.has(walletAddress),
    };
  }

  /**
   * Flush all queued operations for a wallet by executing them with encryption.
   *
   * @param encryptionContext - Wallet address and signing functions for encryption
   * @param executor - Function that executes each operation against the database
   * @returns Result with succeeded/failed operation IDs
   */
  async flush(
    encryptionContext: QueueEncryptionContext,
    executor: OperationExecutor
  ): Promise<FlushResult> {
    const { walletAddress } = encryptionContext;

    // Prevent concurrent flushes for the same wallet
    if (this.flushing.has(walletAddress)) {
      return { succeeded: [], failed: [], total: 0 };
    }

    const walletQueue = this.queues.get(walletAddress);
    if (!walletQueue || walletQueue.size === 0) {
      return { succeeded: [], failed: [], total: 0 };
    }

    this.flushing.add(walletAddress);
    this.notifyListeners(walletAddress);

    const operations = this.getOperations(walletAddress);
    const total = operations.length;
    const succeeded: string[] = [];
    const failed: Array<{ id: string; error: string }> = [];
    const succeededSet = new Set<string>();

    try {
      for (const op of operations) {
        // Check if paused
        if (this.paused.has(walletAddress)) {
          break;
        }

        // Check if all dependencies are met
        const depsUnmet = op.dependencies.some(
          (depId) => !succeededSet.has(depId)
        );
        if (depsUnmet) {
          // If a dependency failed, this operation also fails
          const depFailed = op.dependencies.some((depId) =>
            failed.some((f) => f.id === depId)
          );
          if (depFailed) {
            failed.push({
              id: op.id,
              error: "Dependency failed",
            });
            this.moveToFailed(walletAddress, op);
            continue;
          }
          // Dependencies not yet processed (shouldn't happen with topological sort)
          // but handle gracefully
          failed.push({
            id: op.id,
            error: "Dependencies not yet resolved",
          });
          continue;
        }

        // Try to execute the operation
        let lastError: unknown;
        let success = false;

        while (op.retryCount <= op.maxRetries) {
          try {
            await executor(op, encryptionContext);
            success = true;
            break;
          } catch (err) {
            lastError = err;
            if (isRetryableError(err) && op.retryCount < op.maxRetries) {
              op.retryCount++;
              await sleep(exponentialBackoff(op.retryCount - 1));
            } else {
              break;
            }
          }
        }

        if (success) {
          succeeded.push(op.id);
          succeededSet.add(op.id);
          walletQueue.delete(op.id);
        } else {
          const errorMsg =
            lastError instanceof Error
              ? lastError.message
              : String(lastError ?? "Unknown error");
          failed.push({ id: op.id, error: errorMsg });
          this.moveToFailed(walletAddress, op);
          walletQueue.delete(op.id);
        }
      }

      // Clean up empty queue
      if (walletQueue.size === 0) {
        this.queues.delete(walletAddress);
      }
    } finally {
      this.flushing.delete(walletAddress);
      this.notifyListeners(walletAddress);
    }

    return { succeeded, failed, total };
  }

  /**
   * Clear all queued operations for a wallet.
   */
  clear(walletAddress: string): void {
    this.queues.delete(walletAddress);
    this.failedOps.delete(walletAddress);
    this.notifyListeners(walletAddress);
  }

  /**
   * Pause the queue for a wallet (stops flush mid-way).
   */
  pause(walletAddress: string): void {
    this.paused.add(walletAddress);
  }

  /**
   * Resume the queue for a wallet.
   */
  resume(walletAddress: string): void {
    this.paused.delete(walletAddress);
  }

  /**
   * Register a listener for queue changes on a wallet.
   * @returns Unsubscribe function
   */
  onQueueChange(walletAddress: string, callback: () => void): () => void {
    let walletListeners = this.listeners.get(walletAddress);
    if (!walletListeners) {
      walletListeners = new Set();
      this.listeners.set(walletAddress, walletListeners);
    }
    walletListeners.add(callback);

    return () => {
      walletListeners!.delete(callback);
      if (walletListeners!.size === 0) {
        this.listeners.delete(walletAddress);
      }
    };
  }

  /**
   * Check if a wallet has any pending operations.
   */
  hasPending(walletAddress: string): boolean {
    const queue = this.queues.get(walletAddress);
    return queue !== undefined && queue.size > 0;
  }

  /** Move a failed operation to the failed set. */
  private moveToFailed(walletAddress: string, op: QueuedOperation): void {
    let failedQueue = this.failedOps.get(walletAddress);
    if (!failedQueue) {
      failedQueue = new Map();
      this.failedOps.set(walletAddress, failedQueue);
    }
    failedQueue.set(op.id, op);
  }

  /** Notify all listeners for a wallet. */
  private notifyListeners(walletAddress: string): void {
    const walletListeners = this.listeners.get(walletAddress);
    if (walletListeners) {
      for (const cb of walletListeners) {
        try {
          cb();
        } catch {
          // Ignore listener errors
        }
      }
    }
  }
}

/** Singleton queue manager instance */
export const queueManager = new QueueManager();
