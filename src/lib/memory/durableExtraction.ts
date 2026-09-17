import { Q } from "@nozbe/watermelondb";

import { isEncrypted } from "../db/chat/encryption.js";
import type { Conversation, Message } from "../db/chat/models.js";
import { getMessageOp, type StorageOperationsContext } from "../db/chat/operations.js";
import { ExtractionJob } from "../db/extractionJobs/models.js";
import type { AutoExtractMessage } from "./autoExtract.js";
import {
  type AutoExtractor,
  createAutoExtractor,
  type CreateAutoExtractorOptions,
  type TurnCompleteEvent,
} from "./autoExtractWorker.js";

export interface DurableAutoExtractorOptions extends CreateAutoExtractorOptions {
  /** Coalesce arrivals after durably recording them. Defaults to 20 seconds. */
  debounceMs?: number;
  /** Retry delay for a failed batch. Defaults to 30 seconds; max three attempts
   * per session. Unfinished jobs remain available on the next resume. */
  retryDelayMs?: number;
}

function idsOf(job: ExtractionJob): string[] {
  return JSON.parse(String(job._getRaw("message_ids"))) as string[];
}

/** Durable client extraction. Call once per authenticated database session.
 * Resumes pending jobs on creation, reads bounded batches from encrypted
 * history, and acknowledges only successful batches. No plaintext snapshots
 * or pending facts are written to platform preferences. */
export function createDurableAutoExtractor(options: DurableAutoExtractorOptions): AutoExtractor {
  const vault = options.retainCtx.vaultCtx;
  const database = vault.database;
  const owner = vault.userId ?? vault.walletAddress;
  if (!owner) throw new Error("Durable extraction requires a user or wallet owner");
  const jobs = database.get<ExtractionJob>(ExtractionJob.table);
  const storage: StorageOperationsContext = {
    database,
    messagesCollection: database.get<Message>("history"),
    conversationsCollection: database.get<Conversation>("conversations"),
    walletAddress: vault.walletAddress,
    signMessage: vault.signMessage,
    embeddedWalletSigner: vault.embeddedWalletSigner,
  };
  const scope = options.scope ?? "private";
  const folderId = options.folderId ?? null;
  let disposed = false;
  let running = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let writes: Promise<void> = Promise.resolve();
  let storeFailures = 0;
  // TODO(ceiling): Three attempts per session bound outage traffic. Persist a
  // next-attempt timestamp with backoff for unattended recovery in long-lived sessions.
  const attempts = new Map<string, number>();
  const reportError = (error: unknown, conversationId?: string) => {
    try {
      options.onError?.(error instanceof Error ? error : new Error(String(error)), conversationId);
    } catch {
      /* Diagnostics must not prevent durable retries. */
    }
  };

  function schedule(delay: number): void {
    if (disposed || running || timer !== undefined) return;
    timer = setTimeout(() => {
      timer = undefined;
      void drain();
    }, delay);
  }

  async function drain(): Promise<void> {
    if (disposed || running) return;
    running = true;
    let retry = false;
    let scheduleAfterSuccess = false;
    try {
      await writes;
      const pending = await jobs
        .query(Q.where("owner_key", owner!), Q.where("message_ids", Q.notEq("[]")))
        .fetch();
      storeFailures = 0;
      for (const job of pending) {
        if (disposed) break;
        if ((attempts.get(job.id) ?? 0) >= 3) continue;
        const conversationId = String(job._getRaw("conversation_id"));
        try {
          // A deleted conversation must never be re-learned by a surviving job.
          const conversations = await storage.conversationsCollection
            .query(Q.where("conversation_id", conversationId), Q.where("is_deleted", false))
            .fetchCount();
          if (!conversations) {
            await database.write(() => job.destroyPermanently());
            continue;
          }
          const ids = idsOf(job).slice(0, 20);
          const loaded = await Promise.all(ids.map((id) => getMessageOp(storage, id)));
          if (loaded.some((message) => message === null))
            throw new Error("Source messages not yet available; retained for retry");
          if (
            loaded.some(
              (message) => message && (message.decryptionStatus || isEncrypted(message.content))
            )
          ) {
            throw new Error("Source messages are locked; retained for retry");
          }
          const messages: AutoExtractMessage[] = loaded.flatMap((m) =>
            m &&
            m.conversationId === conversationId &&
            (m.role === "user" || m.role === "assistant")
              ? [{ id: m.uniqueId, role: m.role, content: m.content }]
              : []
          );
          let success = messages.length === 0;
          if (messages.length) {
            const result = await new Promise<TurnCompleteEvent>((resolve, reject) => {
              const worker = createAutoExtractor({
                ...options,
                retainCtx: {
                  ...options.retainCtx,
                  vaultCtx: {
                    ...vault,
                    canWrite: async () =>
                      !disposed &&
                      (await storage.conversationsCollection
                        .query(
                          Q.where("conversation_id", conversationId),
                          Q.where("is_deleted", false)
                        )
                        .fetchCount()) > 0 &&
                      (await storage.messagesCollection
                        .query(
                          Q.where("conversation_id", conversationId),
                          Q.where("id", Q.oneOf(ids))
                        )
                        .fetchCount()) === ids.length &&
                      (!vault.canWrite || (await vault.canWrite())) &&
                      !disposed,
                  },
                },
                // Never publish a private queued observation after a mode flip.
                scope: scope === "private" ? "private" : String(job._getRaw("scope")),
                folderId: (job._getRaw("folder_id") as string | null) ?? null,
                cursorStore: undefined,
                windowSize: 20,
                maxWindowSize: 20,
                onTurnComplete: resolve,
                onError: reject,
              });
              worker.processTurn(messages, conversationId);
              worker.dispose();
            });
            success = result.failedCount === 0 && result.outcome !== "empty-after-retry";
            options.onTurnComplete?.(result);
          }
          if (!success) throw new Error("Extraction batch incomplete; retained for retry");
          attempts.delete(job.id);
          await database.write(async () => {
            // Re-read within the writer: arrivals during extraction must survive.
            const current = idsOf(job);
            // Clearing/deleting history prunes the outbox in the same writer.
            // Never restore removed source ids as overlap or as a watermark.
            const acknowledged = ids.filter((id) => current.includes(id));
            if (!acknowledged.length) return;
            const done = new Set(acknowledged);
            const remaining = current.filter((id) => !done.has(id));
            if (remaining.length) {
              // Keep two source messages for pronoun resolution, not as new evidence.
              await job.update((r) =>
                r._setRaw("message_ids", JSON.stringify([...acknowledged.slice(-2), ...remaining]))
              );
            } else await job.update((r) => r._setRaw("message_ids", "[]"));
            await job.update((r) => r._setRaw("watermark", acknowledged[acknowledged.length - 1]));
          });
          scheduleAfterSuccess = true;
        } catch (error) {
          attempts.set(job.id, (attempts.get(job.id) ?? 0) + 1);
          retry = true;
          reportError(error, conversationId);
        }
      }
    } catch (error) {
      retry = ++storeFailures < 3;
      reportError(error);
    } finally {
      running = false;
      if (retry || scheduleAfterSuccess) schedule(retry ? (options.retryDelayMs ?? 30_000) : 0);
    }
  }

  schedule(0);
  return {
    processTurn(messages, conversationId) {
      if (disposed || !conversationId || !messages.length) return false;
      const ids = messages.map((m) => m.id);
      // Serialized per instance; the database writer also serializes separate
      // instances sharing this database. Scope is part of the job identity.
      writes = writes
        .then(() =>
          database.write(async () => {
            const existing = await jobs
              .query(Q.where("owner_key", owner), Q.where("conversation_id", conversationId))
              .fetch();
            const job = existing.find(
              (candidate) =>
                candidate._getRaw("scope") === scope &&
                (candidate._getRaw("folder_id") ?? null) === folderId
            );
            // Source ownership survives mode/folder changes. Advance after every
            // already queued or examined source, not merely this scope's cursor:
            // replaying the supplied history into a new shared job would publish
            // private observations. Existing queued batches remain oldest-first.
            const positions = new Map(ids.map((id, index) => [id, index]));
            let boundary = -1;
            const foreignSources = new Set<string>();
            for (const prior of existing) {
              const sources = [...idsOf(prior), String(prior._getRaw("watermark") ?? "")];
              for (const id of sources) {
                boundary = Math.max(boundary, positions.get(id) ?? -1);
                if (prior !== job) foreignSources.add(id);
              }
            }
            if (!existing.length && options.cursorStore) {
              try {
                const cursor = options.cursorStore.get(conversationId);
                if (cursor) boundary = Math.max(boundary, positions.get(cursor) ?? -1);
              } catch (error) {
                reportError(error, conversationId);
              }
            }
            const start =
              boundary >= 0
                ? boundary + 1
                : Math.max(0, ids.length - Math.max(1, options.windowSize ?? 6));
            if (start >= ids.length) return;
            const ownWatermark = job?._getRaw("watermark");
            const overlapStart =
              job && boundary >= 0 && ids[boundary] === ownWatermark
                ? Math.max(0, boundary - 1)
                : start;
            const fresh = ids.slice(overlapStart).filter((id) => !foreignSources.has(id));
            if (!fresh.length) return;
            if (job) {
              await job.update((r) =>
                r._setRaw("message_ids", JSON.stringify([...new Set([...idsOf(job), ...fresh])]))
              );
              attempts.delete(job.id);
            } else {
              await jobs.create((r) => {
                r._setRaw("owner_key", owner);
                r._setRaw("conversation_id", conversationId);
                r._setRaw("scope", scope);
                r._setRaw("folder_id", folderId);
                r._setRaw("message_ids", JSON.stringify([...new Set(fresh)]));
              });
            }
          })
        )
        .then(() => schedule(options.debounceMs ?? 20_000))
        .catch((error) => reportError(error, conversationId));
      return true;
    },
    isProcessing: () => running,
    dispose() {
      disposed = true;
      if (timer !== undefined) clearTimeout(timer);
      // Accepted writes still persist; pending jobs resume in the next instance.
    },
  };
}
