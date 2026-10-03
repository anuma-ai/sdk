import { Q } from "@nozbe/watermelondb";

import { isEncrypted } from "../db/chat/encryption.js";
import type { Conversation, Message } from "../db/chat/models.js";
import { getMessageOp, type StorageOperationsContext } from "../db/chat/operations.js";
import type { StoredMessage } from "../db/chat/types.js";
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
  /**
   * Extraction model for a batch, chosen from the scope that batch will be
   * retained under. A queued job keeps its scope across a privacy-mode flip but
   * `extract.model` is whatever this instance was built with, so without this a
   * turn queued in private mode is drained by a public-mode extractor on that
   * extractor's model. Returning `undefined` keeps `extract.model`. A resolver
   * that throws fails the batch, which stays queued for retry: guessing a model
   * is exactly the mistake this exists to prevent.
   */
  modelForScope?: (scope: string) => string | undefined;
  /** Coalesce arrivals after durably recording them. Defaults to 20 seconds. */
  debounceMs?: number;
  /** Retry delay for a failed batch. Defaults to 30 seconds; max three attempts
   * per session. Unfinished jobs remain available on the next resume. */
  retryDelayMs?: number;
  /**
   * Ceiling on one batch, from the extraction call through retention. Defaults
   * to the extraction call's own worst case — `extract.timeoutMs` (60s) x
   * `extract.maxAttempts` (3) plus backoff, or `extract.totalTimeoutMs` when
   * that is smaller — plus a fixed retain budget, so this is a backstop against
   * a promise that never settles rather than a second timeout competing with
   * the call's own. A batch past its ceiling is cancelled: its late writes are
   * refused, so the retry cannot race it into duplicate rows. Without a
   * ceiling, one unsettled promise latched the drain and killed the outbox for
   * the rest of the session.
   */
  batchTimeoutMs?: number;
  /** Clock for the failed-session spacing. Defaults to `Date.now`. */
  now?: () => number;
}

/** Jobs drained per pass. Each one costs a conversation lookup, up to 20
 * decrypting reads and an LLM round trip, so an unbounded loop put the whole
 * backlog on the JS thread at app start. The rest resume on the next pass. */
const MAX_JOBS_PER_PASS = 3;
/** Attempts per job per session before the batch is treated as unrecoverable. */
const MAX_ATTEMPTS = 3;
/** Sessions a head batch may fail in before it is abandoned. Persisted on the
 * job row, so neither a new turn nor a restart resets it. */
const MAX_FAILED_SESSIONS = 3;
/**
 * Minimum wall-clock gap between two counted failed sessions. A "session" is
 * one extractor instance, and three tabs or three remounts on a scope/wallet
 * change are three instances within minutes; without the gap they could
 * abandon a batch before anything had a chance to change. A session inside the
 * gap still stops spending on the batch, it just does not count again.
 */
const MIN_FAILED_SESSION_GAP_MS = 60 * 60 * 1000;
/** Statuses that reject the request as sent — the batch itself — as opposed to
 * the account (401/402/403), which a top-up or re-login fixes. */
const REQUEST_REJECTED_STATUSES = new Set([400, 404, 413, 422]);
/** Give-up reasons that say the model could not answer THIS batch. Transport
 * and budget failures (network, http-retryable, auth-unavailable,
 * time-budget-exhausted) say nothing about the batch and are never counted. */
const CONTENT_FAILURE_REASONS = new Set([
  "empty-content",
  "invalid-json",
  "null-completion",
  "body-parse-failed",
]);
/** Worst-case wait before a retry under the portal helper's default backoff. */
const BACKOFF_ALLOWANCE_MS = 2_100;
// TODO(ceiling): a fixed allowance for retain(): each candidate can run a
// consolidation call (20s budget) sequentially, so a batch with many candidates
// can outlast it. Upgrade path: derive it from the candidate count once
// extraction reports it, or give retain a single batch deadline.
const RETAIN_BUDGET_MS = 120_000;

/** Default batch ceiling: the extraction call's worst case plus retention. */
function defaultBatchTimeoutMs(extract: DurableAutoExtractorOptions["extract"]): number {
  const attempts = Math.max(1, extract.maxAttempts ?? 3);
  const calls = (extract.timeoutMs ?? 60_000) * attempts + BACKOFF_ALLOWANCE_MS * (attempts - 1);
  const extraction =
    extract.totalTimeoutMs !== undefined ? Math.min(extract.totalTimeoutMs, calls) : calls;
  return extraction + RETAIN_BUDGET_MS;
}

/**
 * A failure that points at the batch itself and counts toward abandoning it:
 * a content-shaped give-up or a retain failure (`terminal: false`, retried up
 * to MAX_ATTEMPTS this session), or a request-shaped HTTP rejection
 * (`terminal: true`, not retried this session).
 */
class BatchFailureError extends Error {
  constructor(
    message: string,
    readonly terminal: boolean
  ) {
    super(message);
  }
}

/** An account-level rejection (401/402/403 and other non-request statuses):
 * the batch is skipped for the rest of this session and not counted, so a
 * later session — after a top-up or re-login — extracts it. */
class AccountFailureError extends Error {}

/** Sources whose content did not decrypt. `persistentIds` are the ones the
 * store reported as undecryptable for good (`auth_mismatch`,
 * `invalid_payload`). `key_missing` is also what a session whose key is not
 * loaded yet reports, so it is never counted, and neither is ciphertext read
 * with no key at all. */
class LockedSourcesError extends Error {
  constructor(readonly persistentIds: string[]) {
    super("Source messages are locked; retained for retry");
  }
}

function idsOf(job: ExtractionJob): string[] {
  return JSON.parse(String(job._getRaw("message_ids"))) as string[];
}

function seqOf(job: ExtractionJob): number | undefined {
  const raw = job._getRaw("watermark_seq");
  return typeof raw === "number" && raw > 0 ? raw : undefined;
}

/** Persisted failed-session count for the batch that starts at `head`. */
function failedSessionsOf(job: ExtractionJob, head: string): number {
  if (job._getRaw("failed_head") !== head) return 0;
  const raw = job._getRaw("failed_sessions");
  return typeof raw === "number" && raw > 0 ? raw : 0;
}

/** When the batch that starts at `head` last had a failed session counted. */
function failedAtOf(job: ExtractionJob, head: string): number | undefined {
  if (job._getRaw("failed_head") !== head) return undefined;
  const raw = job._getRaw("failed_at");
  return typeof raw === "number" ? raw : undefined;
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
  // Counted (batch-shaped) failures per job head this session. Unlike
  // `attempts`, a new turn does not reset it: someone chatting once a minute
  // would otherwise re-arm the poison head forever and pay an LLM call for it
  // on every turn without the session ever counting.
  const sessionFailures = new Map<string, { head: string; count: number }>();
  // Jobs this session has stopped spending on: the head failed MAX_ATTEMPTS
  // counted times, was rejected as a request, or hit an account-level status.
  // A new turn does not re-arm them; the next session does.
  const skippedThisSession = new Set<string>();
  const clock = options.now ?? Date.now;
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
    // Set once this batch has settled either way. The watchdog abandons a batch
    // without stopping it, and its late retain() writes would otherwise race the
    // retry into duplicate rows.
    let cancelled = false;
    const model = options.modelForScope?.(jobScope) ?? options.extract.model;
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
                  !cancelled &&
                  (await storage.conversationsCollection
                    .query(Q.where("conversation_id", conversationId), Q.where("is_deleted", false))
                    .fetchCount()) > 0 &&
                  (await storage.messagesCollection
                    .query(Q.where("conversation_id", conversationId), Q.where("id", Q.oneOf(ids)))
                    .fetchCount()) === ids.length &&
                  (!vault.canWrite || (await vault.canWrite())) &&
                  !disposed &&
                  !cancelled,
              },
            },
            // The model follows the job's scope, not the mode alive at drain time.
            extract: { ...options.extract, ...(model !== undefined && { model }) },
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
            options.batchTimeoutMs ?? defaultBatchTimeoutMs(options.extract)
          );
        }),
      ]);
    } finally {
      cancelled = true;
      // Cleared on the winning path too, so the loser never rejects unhandled.
      if (watchdog !== undefined) clearTimeout(watchdog);
    }
  }

  /** Acknowledge a head batch: remove its ids and advance the watermark. An
   * extracted batch leaves its last two ids queued as pronoun context for the
   * next one. An abandoned batch leaves none, and is marked (the limit count
   * against its newest id, which is now the watermark) so `processTurn` does
   * not add that context back either — re-sending the poison as context would
   * fail the next batch the same way. */
  async function acknowledge(
    job: ExtractionJob,
    ids: string[],
    loaded: (StoredMessage | null)[],
    abandoned: boolean
  ): Promise<void> {
    attempts.delete(job.id);
    sessionFailures.delete(job.id);
    skippedThisSession.delete(job.id);
    const sequences = new Map<string, number>();
    for (const message of loaded)
      if (message && message.messageId > 0) sequences.set(message.uniqueId, message.messageId);
    await database.write(async () => {
      // Re-read within the writer: arrivals during extraction must survive.
      const current = idsOf(job);
      // Clearing/deleting history prunes the outbox in the same writer.
      // Never restore removed source ids as overlap or as a watermark.
      const acknowledged = ids.filter((id) => current.includes(id));
      if (!acknowledged.length) return;
      const done = new Set(acknowledged);
      const remaining = current.filter((id) => !done.has(id));
      await job.update((r) => {
        // Keep two source messages for pronoun resolution, not as new evidence.
        r._setRaw(
          "message_ids",
          JSON.stringify(
            remaining.length ? [...(abandoned ? [] : acknowledged.slice(-2)), ...remaining] : []
          )
        );
        const newest = acknowledged[acknowledged.length - 1];
        r._setRaw("watermark", newest);
        // The sequence is the durable half of the anchor and only ever
        // advances: a later batch that acknowledges an older tail must
        // not walk the boundary backwards.
        const sequence = sequences.get(newest);
        if (sequence !== undefined) {
          const prior = seqOf(job);
          r._setRaw("watermark_seq", prior === undefined ? sequence : Math.max(prior, sequence));
        }
        r._setRaw("failed_sessions", abandoned ? MAX_FAILED_SESSIONS : null);
        r._setRaw("failed_head", abandoned ? newest : null);
        r._setRaw("failed_at", null);
      });
    });
  }

  /**
   * Account for a failed batch. Only failures that point at the batch count:
   * content-shaped give-ups and retain failures (after MAX_ATTEMPTS of them
   * this session, however many turns they span), request-shaped HTTP
   * rejections (at once), and sources the store reports as undecryptable for
   * good. Transport, budget, watchdog and read failures never count, and an
   * account-level rejection only pauses the job for this session.
   *
   * A counted session moves the persisted count for that head batch up by one,
   * provided the previous counted session was at least
   * {@link MIN_FAILED_SESSION_GAP_MS} earlier. At {@link MAX_FAILED_SESSIONS}
   * the batch is abandoned so everything queued behind it can still extract.
   * Returns true when the head moved and the job should be drained again.
   */
  async function recordFailure(
    job: ExtractionJob,
    ids: string[],
    loaded: (StoredMessage | null)[],
    error: unknown,
    conversationId: string
  ): Promise<boolean> {
    const head = ids[0];
    // Nothing was read (the lookup itself threw): there is no batch to blame,
    // and no sequences to advance the watermark with.
    if (!head || !loaded.some(Boolean)) return false;
    if (error instanceof AccountFailureError) {
      skippedThisSession.add(job.id);
      return false;
    }
    const counted =
      error instanceof BatchFailureError ||
      (error instanceof LockedSourcesError && error.persistentIds.length > 0);
    if (!counted) return false;
    const prior = sessionFailures.get(job.id);
    const count = prior?.head === head ? prior.count + 1 : 1;
    sessionFailures.set(job.id, { head, count });
    const terminal = error instanceof BatchFailureError && error.terminal;
    if (!terminal && count < MAX_ATTEMPTS) return false;
    // This session is done with the head either way.
    skippedThisSession.add(job.id);
    const now = clock();
    const lastCounted = failedAtOf(job, head);
    if (lastCounted !== undefined && now - lastCounted < MIN_FAILED_SESSION_GAP_MS) return false;
    const failures = failedSessionsOf(job, head) + 1;
    if (failures < MAX_FAILED_SESSIONS) {
      await database.write(() =>
        job.update((r) => {
          r._setRaw("failed_sessions", failures);
          r._setRaw("failed_head", head);
          r._setRaw("failed_at", now);
        })
      );
      return false;
    }
    if (error instanceof LockedSourcesError) {
      const dropped = new Set(error.persistentIds);
      // A dropped source counts as observed: removing it from the queue alone
      // left it past the watermark, so the next turn re-queued it as unseen and
      // it blocked the head for three more sessions. Advance the watermark to
      // the newest dropped id when that moves it forward, and mark it like an
      // abandoned batch so processTurn does not re-send it as context.
      let newest: { id: string; seq: number } | undefined;
      for (const message of loaded)
        if (message && dropped.has(message.uniqueId) && message.messageId > (newest?.seq ?? 0))
          newest = { id: message.uniqueId, seq: message.messageId };
      const advance = newest !== undefined && newest.seq > (seqOf(job) ?? 0) ? newest : undefined;
      await database.write(() =>
        job.update((r) => {
          r._setRaw("message_ids", JSON.stringify(idsOf(job).filter((id) => !dropped.has(id))));
          if (advance) {
            r._setRaw("watermark", advance.id);
            r._setRaw("watermark_seq", advance.seq);
          }
          r._setRaw("failed_sessions", advance ? MAX_FAILED_SESSIONS : null);
          r._setRaw("failed_head", advance ? advance.id : null);
          r._setRaw("failed_at", null);
        })
      );
      attempts.delete(job.id);
      sessionFailures.delete(job.id);
      skippedThisSession.delete(job.id);
      reportError(
        new Error(
          `Dropped ${dropped.size} source id(s) that stayed locked for ${failures} sessions to unblock extraction`
        ),
        conversationId
      );
      return true;
    }
    await acknowledge(job, ids, loaded, true);
    reportError(
      new Error(
        `Abandoned an extraction batch of ${ids.length} source id(s) after it failed in ${failures} sessions`
      ),
      conversationId
    );
    return true;
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
        if (attempted >= MAX_ATTEMPTS || skippedThisSession.has(job.id)) continue;
        if (processed >= MAX_JOBS_PER_PASS) {
          scheduleAfterSuccess = true;
          break;
        }
        processed++;
        const conversationId = String(job._getRaw("conversation_id"));
        let ids: string[] = [];
        let loaded: (StoredMessage | null)[] = [];
        try {
          // A deleted conversation must never be re-learned by a surviving job.
          const conversations = await storage.conversationsCollection
            .query(Q.where("conversation_id", conversationId), Q.where("is_deleted", false))
            .fetchCount();
          if (!conversations) {
            await database.write(() => job.destroyPermanently());
            continue;
          }
          ids = idsOf(job).slice(0, 20);
          loaded = await Promise.all(ids.map((id) => getMessageOp(storage, id)));
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
          // Locked means the CONTENT is still ciphertext: a failed vector,
          // chunks or sources field sets decryptionStatus too, and says nothing
          // about whether the message can be extracted.
          const locked = loaded.filter((message) => message && isEncrypted(message.content));
          if (locked.length) {
            // Per id: one not-yet-unlocked message in the batch must not stop a
            // persistently undecryptable one from being counted.
            throw new LockedSourcesError(
              locked.flatMap((message) =>
                message!.decryptionStatus === "auth_mismatch" ||
                message!.decryptionStatus === "invalid_payload"
                  ? [message!.uniqueId]
                  : []
              )
            );
          }
          const messages: AutoExtractMessage[] = loaded.flatMap((m) =>
            m &&
            m.conversationId === conversationId &&
            (m.role === "user" || m.role === "assistant")
              ? [{ id: m.uniqueId, role: m.role, content: m.content }]
              : []
          );
          let success = messages.length === 0;
          let result: TurnCompleteEvent | undefined;
          if (messages.length) {
            result = await extractBatch(
              messages,
              conversationId,
              ids,
              currentScope() === "private" ? "private" : String(job._getRaw("scope")),
              (job._getRaw("folder_id") as string | null) ?? null
            );
            success = result.failedCount === 0 && result.outcome !== "empty-after-retry";
            options.onTurnComplete?.(result);
          }
          if (!success) {
            const failure = result?.failure;
            if (failure?.reason === "http-terminal") {
              const status = failure.httpStatus;
              if (status !== undefined && REQUEST_REJECTED_STATUSES.has(status))
                throw new BatchFailureError(
                  `Extraction rejected the batch (HTTP ${status}); not retried this session`,
                  true
                );
              throw new AccountFailureError(
                `Extraction refused for the account (HTTP ${status ?? "unknown"}); retried next session`
              );
            }
            if (
              (result?.failedCount ?? 0) > 0 ||
              (failure !== undefined && CONTENT_FAILURE_REASONS.has(failure.reason))
            )
              throw new BatchFailureError("Extraction batch incomplete; retained for retry", false);
            throw new Error("Extraction batch incomplete; retained for retry");
          }
          await acknowledge(job, ids, loaded, false);
          scheduleAfterSuccess = true;
        } catch (error) {
          attempts.set(job.id, attempted + 1);
          retry = true;
          reportError(error, conversationId);
          try {
            if (await recordFailure(job, ids, loaded, error, conversationId))
              scheduleAfterSuccess = true;
          } catch (recordError) {
            reportError(recordError, conversationId);
          }
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
              failedSessionsOf(job, String(ownWatermark)) < MAX_FAILED_SESSIONS &&
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
