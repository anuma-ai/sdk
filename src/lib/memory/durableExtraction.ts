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

export interface DurableAutoExtractorOptions extends Omit<CreateAutoExtractorOptions, "scope"> {
  /**
   * Scope for facts retained from newly queued turns. Pass an accessor to have
   * a privacy-mode flip observed at write time: a plain string is sampled once
   * at construction, which makes correctness depend on the caller disposing and
   * recreating the extractor on every flip. An accessor that throws is treated
   * as `"private"` — the direction that cannot publish.
   */
  scope?: string | (() => string);
  /** Coalesce arrivals after durably recording them. Defaults to 20 seconds. */
  debounceMs?: number;
  /** Retry delay for a failed batch. Defaults to 30 seconds; max three attempts
   * per session. Unfinished jobs remain available on the next resume. */
  retryDelayMs?: number;
  /**
   * Ceiling on one batch, from the extraction call through retention. Defaults
   * to 180 seconds — deliberately above the extraction call's own budget
   * (`timeoutMs`, 60s per attempt, x `maxAttempts`), so this is a backstop
   * against a promise that never settles at all rather than a second timeout
   * competing with that one. Use `timeoutMs`/`totalTimeoutMs` to bound the LLM
   * call itself. Without a ceiling here, one unsettled promise latched the
   * drain and killed the outbox for the rest of the session.
   */
  batchTimeoutMs?: number;
}

/** Jobs drained per pass. Each one costs a conversation lookup, up to 20
 * decrypting reads and an LLM round trip, so an unbounded loop put the whole
 * backlog on the JS thread at app start. The rest resume on the next pass. */
const MAX_JOBS_PER_PASS = 3;
/** Attempts per job per session before the batch is treated as unrecoverable. */
const MAX_ATTEMPTS = 3;

function idsOf(job: ExtractionJob): string[] {
  return JSON.parse(String(job._getRaw("message_ids"))) as string[];
}

function seqOf(job: ExtractionJob): number | undefined {
  const raw = job._getRaw("watermark_seq");
  return typeof raw === "number" && raw > 0 ? raw : undefined;
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
  const folderId = options.folderId ?? null;
  let disposed = false;
  let running = false;
  let wakeRequested = false;
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
  const currentScope = (): string => {
    try {
      const value = typeof options.scope === "function" ? options.scope() : options.scope;
      return value ?? "private";
    } catch (error) {
      reportError(error);
      return "private";
    }
  };

  function schedule(delay: number): void {
    if (disposed) return;
    if (running || timer !== undefined) {
      // A turn that lands mid-drain must not lose its wake-up. The drain only
      // rescheduled on retry or after acknowledging something, so a pass that
      // found nothing left the newly written job sitting in the outbox with no
      // timer until the next turn — exactly the queued-correction case this
      // exists to fix.
      if (running) wakeRequested = true;
      return;
    }
    timer = setTimeout(() => {
      timer = undefined;
      void drain();
    }, delay);
  }

  /** One extraction batch, bounded so a promise that never settles cannot
   * latch `running` for the rest of the session. */
  async function extractBatch(
    messages: AutoExtractMessage[],
    conversationId: string,
    ids: string[],
    jobScope: string,
    jobFolderId: string | null
  ): Promise<TurnCompleteEvent> {
    let watchdog: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        new Promise<TurnCompleteEvent>((resolve, reject) => {
          const worker = createAutoExtractor({
            ...options,
            retainCtx: {
              ...options.retainCtx,
              vaultCtx: {
                ...vault,
                canWrite: async () =>
                  !disposed &&
                  (await storage.conversationsCollection
                    .query(Q.where("conversation_id", conversationId), Q.where("is_deleted", false))
                    .fetchCount()) > 0 &&
                  (await storage.messagesCollection
                    .query(Q.where("conversation_id", conversationId), Q.where("id", Q.oneOf(ids)))
                    .fetchCount()) === ids.length &&
                  (!vault.canWrite || (await vault.canWrite())) &&
                  !disposed,
              },
            },
            // Never publish a private queued observation after a mode flip.
            scope: jobScope,
            folderId: jobFolderId,
            cursorStore: undefined,
            windowSize: 20,
            maxWindowSize: 20,
            onTurnComplete: resolve,
            onError: reject,
          });
          worker.processTurn(messages, conversationId);
          worker.dispose();
        }),
        new Promise<never>((_resolve, reject) => {
          watchdog = setTimeout(
            () => reject(new Error("Extraction did not settle in time; retained for retry")),
            options.batchTimeoutMs ?? 180_000
          );
        }),
      ]);
    } finally {
      // Cleared on the winning path too, so the loser never rejects unhandled.
      if (watchdog !== undefined) clearTimeout(watchdog);
    }
  }

  async function drain(): Promise<void> {
    if (disposed || running) return;
    running = true;
    wakeRequested = false;
    let retry = false;
    let scheduleAfterSuccess = false;
    try {
      await writes;
      const pending = await jobs
        .query(Q.where("owner_key", owner!), Q.where("message_ids", Q.notEq("[]")))
        .fetch();
      storeFailures = 0;
      let processed = 0;
      for (const job of pending) {
        if (disposed) break;
        const attempted = attempts.get(job.id) ?? 0;
        if (attempted >= MAX_ATTEMPTS) continue;
        if (processed >= MAX_JOBS_PER_PASS) {
          scheduleAfterSuccess = true;
          break;
        }
        processed++;
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
          const missing = ids.filter((_id, index) => loaded[index] === null);
          if (missing.length) {
            // A write-ordering gap resolves on retry; an id destroyed outside
            // deleteMessageOp never does, and throwing forever wedged this job
            // and everything queued behind it. Retry first, then drop the ids.
            if (attempted < MAX_ATTEMPTS - 1)
              throw new Error("Source messages not yet available; retained for retry");
            const dropped = new Set(missing);
            await database.write(() =>
              job.update((r) =>
                r._setRaw(
                  "message_ids",
                  JSON.stringify(idsOf(job).filter((id) => !dropped.has(id)))
                )
              )
            );
            attempts.delete(job.id);
            scheduleAfterSuccess = true;
            reportError(
              new Error(
                `Dropped ${missing.length} unresolvable source id(s) to unblock extraction`
              ),
              conversationId
            );
            continue;
          }
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
            const result = await extractBatch(
              messages,
              conversationId,
              ids,
              currentScope() === "private" ? "private" : String(job._getRaw("scope")),
              (job._getRaw("folder_id") as string | null) ?? null
            );
            success = result.failedCount === 0 && result.outcome !== "empty-after-retry";
            options.onTurnComplete?.(result);
          }
          if (!success) throw new Error("Extraction batch incomplete; retained for retry");
          attempts.delete(job.id);
          const sequences = new Map<string, number>();
          for (const message of loaded)
            if (message && message.messageId > 0)
              sequences.set(message.uniqueId, message.messageId);
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
            const newest = acknowledged[acknowledged.length - 1];
            await job.update((r) => {
              r._setRaw("watermark", newest);
              // The sequence is the durable half of the anchor and only ever
              // advances: a later batch that acknowledges an older tail must
              // not walk the boundary backwards.
              const sequence = sequences.get(newest);
              if (sequence !== undefined) {
                const prior = seqOf(job);
                r._setRaw(
                  "watermark_seq",
                  prior === undefined ? sequence : Math.max(prior, sequence)
                );
              }
            });
          });
          scheduleAfterSuccess = true;
        } catch (error) {
          attempts.set(job.id, attempted + 1);
          retry = true;
          reportError(error, conversationId);
        }
      }
    } catch (error) {
      retry = ++storeFailures < 3;
      reportError(error);
    } finally {
      running = false;
      const woken = wakeRequested;
      wakeRequested = false;
      if (retry || scheduleAfterSuccess || woken)
        schedule(retry ? (options.retryDelayMs ?? 30_000) : 0);
    }
  }

  schedule(0);
  return {
    processTurn(messages, conversationId) {
      if (disposed || !conversationId || !messages.length) return false;
      const ids = messages.map((m) => m.id);
      const scope = currentScope();
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
            // `history.message_id` is the conversation ordinal, assigned max+1
            // and never reused, so it orders the window even after a delete.
            // Legacy rows can hold duplicated ordinals (count-based assignment,
            // see getMessagesPageOp); a collision at the boundary skips that one
            // message rather than re-observing it — the safe direction — and the
            // next message takes max+1, which clears the boundary again.
            const rows = await storage.messagesCollection
              .query(Q.where("id", Q.oneOf(ids)))
              .fetch();
            const sequences = new Map<string, number>();
            for (const row of rows) {
              const sequence = Number(row._getRaw("message_id"));
              if (Number.isFinite(sequence) && sequence > 0) sequences.set(row.id, sequence);
            }
            let boundary = -1;
            let observedSeq = 0;
            const foreignSources = new Set<string>();
            for (const prior of existing) {
              const sources = [...idsOf(prior), String(prior._getRaw("watermark") ?? "")];
              for (const id of sources) {
                boundary = Math.max(boundary, positions.get(id) ?? -1);
                if (prior !== job) foreignSources.add(id);
              }
              observedSeq = Math.max(observedSeq, seqOf(prior) ?? 0);
              for (const id of idsOf(prior))
                observedSeq = Math.max(observedSeq, sequences.get(id) ?? 0);
            }
            // Place the boundary by sequence, not by position: deleting the
            // message that set the watermark removes its id from this window,
            // and resolving the anchor by id alone then lost the boundary and
            // re-enqueued observed history under whatever scope is current.
            if (observedSeq > 0)
              ids.forEach((id, index) => {
                const sequence = sequences.get(id);
                if (sequence !== undefined && sequence <= observedSeq)
                  boundary = Math.max(boundary, index);
              });
            if (!existing.length && options.cursorStore) {
              try {
                const cursor = options.cursorStore.get(conversationId);
                if (cursor) boundary = Math.max(boundary, positions.get(cursor) ?? -1);
              } catch (error) {
                reportError(error, conversationId);
              }
            }
            // A job that still holds provenance we could not place in this
            // window means the anchor is lost, not that the conversation is
            // new. Enqueue nothing: "I lost my place" must never mean
            // "re-observe under whatever scope is current". A cleared job holds
            // neither ids nor a sequence, so a genuine reset still starts over.
            if (
              boundary < 0 &&
              existing.some((prior) => idsOf(prior).length > 0 || seqOf(prior) !== undefined)
            ) {
              reportError(
                new Error("Extraction boundary unresolved; skipped rather than re-observing"),
                conversationId
              );
              return;
            }
            const start =
              boundary >= 0
                ? boundary + 1
                : Math.max(0, ids.length - Math.max(1, options.windowSize ?? 6));
            if (start >= ids.length) return;
            const ownWatermark = job?._getRaw("watermark");
            const atOwnWatermark =
              !!job &&
              boundary >= 0 &&
              (ids[boundary] === ownWatermark ||
                (sequences.get(ids[boundary]) !== undefined &&
                  sequences.get(ids[boundary]) === seqOf(job)));
            const overlapStart = atOwnWatermark ? Math.max(0, boundary - 1) : start;
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
