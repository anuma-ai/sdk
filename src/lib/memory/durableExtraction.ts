import { Q } from "@nozbe/watermelondb";

import { onKeyAvailable } from "../../react/useEncryption.js";
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

/** A message a {@link ExtractionMessageSource} resolves from a queued id. */
export interface ExtractionSourceMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  /** Position in the conversation; must increase with send order. */
  seq: number;
}

/** `ready` runs the job, `later` leaves it queued without counting an attempt, `gone` drops it. */
export type ExtractionSourceStatus = "ready" | "later" | "gone";

/** Resolves queued ids for a conversation that does not live in local chat history. */
export interface ExtractionMessageSource {
  status(conversationId: string): Promise<ExtractionSourceStatus>;
  load(conversationId: string, ids: string[]): Promise<ExtractionSourceMessage[]>;
}

type LoadedMessage = Pick<
  StoredMessage,
  "uniqueId" | "messageId" | "conversationId" | "role" | "content" | "decryptionStatus"
>;

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
  /**
   * Message source for a conversation outside local chat history, or `undefined`
   * for history. Jobs still store only ids; the source resolves them at drain
   * time and is re-checked before every write.
   */
  messageSource?: (conversationId: string) => ExtractionMessageSource | undefined;
  /** Ceiling on one `status` or `load` call of a message source. Defaults to 30 seconds. */
  sourceTimeoutMs?: number;
}

const MAX_JOBS_PER_PASS = 3;
const MAX_ATTEMPTS = 3;
const MAX_FAILED_SESSIONS = 3;
const MIN_FAILED_SESSION_GAP_MS = 60 * 60 * 1000;
const REQUEST_REJECTED_STATUSES = new Set([400, 404, 413, 422]);
const CONTENT_FAILURE_REASONS = new Set([
  "empty-content",
  "invalid-json",
  "null-completion",
  "body-parse-failed",
]);
const BACKOFF_ALLOWANCE_MS = 2_100;
const RETAIN_BUDGET_MS = 120_000;

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

/** The portal's moderation gate refused the batch. Moderation is deterministic
 * for the same text, so retrying — this session or a later one — only re-sends
 * the same input to be flagged again, while the head blocks every newer turn in
 * the conversation. A refused batch of several turns is re-extracted turn by
 * turn so only the refused turns are dropped; a refused single turn is
 * abandoned on the first refusal. */
class FlaggedBatchError extends Error {}

function extracted(result: TurnCompleteEvent): boolean {
  return result.failedCount === 0 && result.outcome !== "empty-after-retry";
}

function batchError(result: TurnCompleteEvent): Error {
  const failure = result.failure;
  if (failure?.reason === "http-terminal") {
    const status = failure.httpStatus;
    if (status !== undefined && REQUEST_REJECTED_STATUSES.has(status))
      return new BatchFailureError(
        `Extraction rejected the batch (HTTP ${status}); not retried this session`,
        true
      );
    return new AccountFailureError(
      `Extraction refused for the account (HTTP ${status ?? "unknown"}); retried next session`
    );
  }
  if (
    result.failedCount > 0 ||
    (failure !== undefined && CONTENT_FAILURE_REASONS.has(failure.reason))
  )
    return new BatchFailureError("Extraction batch incomplete; retained for retry", false);
  return new Error("Extraction batch incomplete; retained for retry");
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
  constructor(
    readonly persistentIds: string[],
    locked: LoadedMessage[]
  ) {
    const counts = new Map<string, number>();
    for (const message of locked) {
      const version = /^enc:(v\d+):/.exec(message.content)?.[1] ?? "unknown";
      const key = `${message.decryptionStatus ?? "no_status"}:${version}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const summary = [...counts].map(([key, count]) => `${key}=${count}`).join(", ");
    super(`Source messages are locked; retained for retry (${summary})`);
  }

  get awaitingKey(): boolean {
    return this.persistentIds.length === 0;
  }
}

function splitTurns(messages: AutoExtractMessage[]): AutoExtractMessage[][] {
  const turns: AutoExtractMessage[][] = [];
  for (const message of messages) {
    const last = turns[turns.length - 1];
    if (!last || (message.role === "user" && last.some((m) => m.role === "user")))
      turns.push([message]);
    else last.push(message);
  }
  return turns;
}

function idsOf(job: ExtractionJob): string[] {
  return JSON.parse(String(job._getRaw("message_ids"))) as string[];
}

function seqOf(job: ExtractionJob): number | undefined {
  const raw = job._getRaw("watermark_seq");
  return typeof raw === "number" && raw > 0 ? raw : undefined;
}

function failedSessionsOf(job: ExtractionJob, head: string): number {
  if (job._getRaw("failed_head") !== head) return 0;
  const raw = job._getRaw("failed_sessions");
  return typeof raw === "number" && raw > 0 ? raw : 0;
}

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
  let activeBatch: AbortController | null = null;
  let running = false;
  let wakeRequested = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let writes: Promise<void> = Promise.resolve();
  let storeFailures = 0;
  const attempts = new Map<string, number>();
  const sessionFailures = new Map<string, { head: string; count: number }>();
  const skippedThisSession = new Set<string>();
  const awaitingKey = new Set<string>();
  let keyEpoch = 0;
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

  async function fromSource<T>(call: Promise<T>): Promise<T> {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        call,
        new Promise<never>((_resolve, reject) => {
          timeout = setTimeout(
            () => reject(new Error("Message source did not answer in time")),
            options.sourceTimeoutMs ?? 30_000
          );
        }),
      ]);
    } finally {
      if (timeout !== undefined) clearTimeout(timeout);
    }
  }

  async function loadFromSource(
    source: ExtractionMessageSource,
    conversationId: string,
    ids: string[]
  ): Promise<(LoadedMessage | null)[]> {
    const byId = new Map(
      (await fromSource(source.load(conversationId, ids))).map((m) => [m.id, m])
    );
    return ids.map((id) => {
      const message = byId.get(id);
      return message
        ? {
            uniqueId: message.id,
            messageId: message.seq,
            conversationId,
            role: message.role,
            content: message.content,
          }
        : null;
    });
  }

  async function sourcesEligible(conversationId: string, ids: string[]): Promise<boolean> {
    const source = options.messageSource?.(conversationId);
    if (source)
      return (
        (await fromSource(source.status(conversationId))) === "ready" &&
        (await loadFromSource(source, conversationId, ids)).every(Boolean)
      );
    return (
      (await storage.conversationsCollection
        .query(Q.where("conversation_id", conversationId), Q.where("is_deleted", false))
        .fetchCount()) > 0 &&
      (await storage.messagesCollection
        .query(Q.where("conversation_id", conversationId), Q.where("id", Q.oneOf(ids)))
        .fetchCount()) === ids.length
    );
  }

  function schedule(delay: number): void {
    if (disposed) return;
    if (running || timer !== undefined) {
      if (running) wakeRequested = true;
      return;
    }
    timer = setTimeout(() => {
      timer = undefined;
      void drain();
    }, delay);
  }

  async function extractBatch(
    messages: AutoExtractMessage[],
    conversationId: string,
    ids: string[],
    jobScope: string,
    jobFolderId: string | null
  ): Promise<TurnCompleteEvent> {
    if (disposed) throw new Error("Extraction session was disposed");
    let watchdog: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;
    const controller = new AbortController();
    activeBatch = controller;
    const model = options.modelForScope?.(jobScope) ?? options.extract.model;
    try {
      return await Promise.race([
        new Promise<TurnCompleteEvent>((resolve, reject) => {
          const worker = createAutoExtractor({
            ...options,
            signal: controller.signal,
            retainCtx: {
              ...options.retainCtx,
              vaultCtx: {
                ...vault,
                canWrite: async () =>
                  !disposed &&
                  !cancelled &&
                  (await sourcesEligible(conversationId, ids)) &&
                  (!vault.canWrite || (await vault.canWrite())) &&
                  !disposed &&
                  !cancelled,
              },
            },
            extract: { ...options.extract, ...(model !== undefined && { model }) },
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
      controller.abort();
      if (activeBatch === controller) activeBatch = null;
      if (watchdog !== undefined) clearTimeout(watchdog);
    }
  }

  async function acknowledge(
    job: ExtractionJob,
    ids: string[],
    loaded: (LoadedMessage | null)[],
    abandoned: boolean
  ): Promise<void> {
    attempts.delete(job.id);
    sessionFailures.delete(job.id);
    skippedThisSession.delete(job.id);
    const sequences = new Map<string, number>();
    for (const message of loaded)
      if (message && message.messageId > 0) sequences.set(message.uniqueId, message.messageId);
    await database.write(async () => {
      if (disposed) return;
      const current = idsOf(job);
      const acknowledged = ids.filter((id) => current.includes(id));
      if (!acknowledged.length) return;
      const done = new Set(acknowledged);
      const remaining = current.filter((id) => !done.has(id));
      await job.update((r) => {
        r._setRaw(
          "message_ids",
          JSON.stringify(
            remaining.length ? [...(abandoned ? [] : acknowledged.slice(-2)), ...remaining] : []
          )
        );
        const newest = acknowledged[acknowledged.length - 1];
        r._setRaw("watermark", newest);
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

  async function recordFailure(
    job: ExtractionJob,
    ids: string[],
    loaded: (LoadedMessage | null)[],
    error: unknown,
    conversationId: string
  ): Promise<boolean> {
    const head = ids[0];
    if (!head || !loaded.some(Boolean)) return false;
    if (error instanceof AccountFailureError) {
      skippedThisSession.add(job.id);
      return false;
    }
    if (error instanceof FlaggedBatchError) {
      await acknowledge(job, ids, loaded, true);
      return true;
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
    let sourceWaiting = false;
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
        if (attempted >= MAX_ATTEMPTS || skippedThisSession.has(job.id) || awaitingKey.has(job.id))
          continue;
        const conversationId = String(job._getRaw("conversation_id"));
        const source = options.messageSource?.(conversationId);
        let sourceStatus: ExtractionSourceStatus | undefined;
        if (source) {
          try {
            sourceStatus = await fromSource(source.status(conversationId));
          } catch (error) {
            reportError(error, conversationId);
            sourceStatus = "later";
          }
          if (sourceStatus === "later") {
            sourceWaiting = true;
            continue;
          }
        }
        if (processed >= MAX_JOBS_PER_PASS) {
          scheduleAfterSuccess = true;
          break;
        }
        processed++;
        const epochAtRead = keyEpoch;
        let ids: string[] = [];
        let loaded: (LoadedMessage | null)[] = [];
        try {
          const present = source
            ? sourceStatus === "ready"
            : (await storage.conversationsCollection
                .query(Q.where("conversation_id", conversationId), Q.where("is_deleted", false))
                .fetchCount()) > 0;
          if (!present) {
            await database.write(() => job.destroyPermanently());
            continue;
          }
          ids = idsOf(job).slice(0, 20);
          loaded = source
            ? await loadFromSource(source, conversationId, ids)
            : await Promise.all(ids.map((id) => getMessageOp(storage, id)));
          const missing = ids.filter((_id, index) => loaded[index] === null);
          if (missing.length) {
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
          const foreign = new Set(
            ids.filter((_id, index) => loaded[index]?.conversationId !== conversationId)
          );
          if (foreign.size) {
            await database.write(() =>
              job.update((r) =>
                r._setRaw(
                  "message_ids",
                  JSON.stringify(idsOf(job).filter((id) => !foreign.has(id)))
                )
              )
            );
            attempts.delete(job.id);
            scheduleAfterSuccess = true;
            reportError(
              new Error(`Dropped ${foreign.size} source id(s) from another conversation`),
              conversationId
            );
            continue;
          }
          const locked = source
            ? []
            : loaded.filter(
                (message): message is LoadedMessage => !!message && isEncrypted(message.content)
              );
          if (locked.length) {
            throw new LockedSourcesError(
              locked.flatMap((message) =>
                message.decryptionStatus === "auth_mismatch" ||
                message.decryptionStatus === "invalid_payload"
                  ? [message.uniqueId]
                  : []
              ),
              locked
            );
          }
          const messages: AutoExtractMessage[] = loaded.flatMap((m) =>
            m && (m.role === "user" || m.role === "assistant")
              ? [{ id: m.uniqueId, role: m.role, content: m.content }]
              : []
          );
          const jobScope = currentScope() === "private" ? "private" : String(job._getRaw("scope"));
          const jobFolderId = (job._getRaw("folder_id") as string | null) ?? null;
          const runExtraction = async (batch: AutoExtractMessage[], batchIds: string[]) => {
            const result = await extractBatch(
              batch,
              conversationId,
              batchIds,
              jobScope,
              jobFolderId
            );
            if (disposed) throw new Error("Extraction session was disposed");
            options.onTurnComplete?.(result);
            return result;
          };
          const flaggedIds = new Set<string>();
          if (messages.length) {
            const result = await runExtraction(messages, ids);
            if (result.failure?.reason === "content-flagged") {
              const turns = splitTurns(messages);
              if (turns.length < 2)
                throw new FlaggedBatchError("Extraction batch refused by moderation; abandoned");
              for (const turn of turns) {
                const turnResult = await runExtraction(
                  turn,
                  turn.map((m) => m.id)
                );
                if (turnResult.failure?.reason === "content-flagged")
                  for (const m of turn) flaggedIds.add(m.id);
                else if (!extracted(turnResult)) throw batchError(turnResult);
              }
              if (flaggedIds.size)
                reportError(
                  new Error(
                    `Dropped ${flaggedIds.size} source id(s) of an extraction batch refused by moderation`
                  ),
                  conversationId
                );
            } else if (!extracted(result)) throw batchError(result);
          }
          await acknowledge(
            job,
            ids,
            loaded,
            ids.slice(-2).some((id) => flaggedIds.has(id))
          );
          scheduleAfterSuccess = true;
        } catch (error) {
          if (disposed) break;
          if (error instanceof LockedSourcesError && error.awaitingKey) {
            reportError(error, conversationId);
            if (keyEpoch === epochAtRead) awaitingKey.add(job.id);
            else scheduleAfterSuccess = true;
            continue;
          }
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
      else if (sourceWaiting) schedule(options.retryDelayMs ?? 30_000);
    }
  }

  function dispose(): void {
    disposed = true;
    activeBatch?.abort(options.signal?.reason);
    if (timer !== undefined) clearTimeout(timer);
    options.signal?.removeEventListener("abort", dispose);
    unsubscribeKey?.();
  }

  const unsubscribeKey = vault.walletAddress
    ? onKeyAvailable(vault.walletAddress, () => {
        keyEpoch++;
        if (!awaitingKey.size) return;
        awaitingKey.clear();
        if (timer !== undefined) {
          clearTimeout(timer);
          timer = undefined;
        }
        schedule(0);
      })
    : undefined;
  if (options.signal?.aborted) dispose();
  else options.signal?.addEventListener("abort", dispose, { once: true });
  schedule(0);
  return {
    processTurn(messages, conversationId) {
      if (disposed || !conversationId || !messages.length) return false;
      const ids = messages.map((m) => m.id);
      const scope = currentScope();
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
            const positions = new Map(ids.map((id, index) => [id, index]));
            const fromSourceConversation = options.messageSource?.(conversationId) !== undefined;
            const watermarks = fromSourceConversation
              ? []
              : existing.flatMap((prior) => {
                  const watermark = prior._getRaw("watermark");
                  return typeof watermark === "string" && watermark ? [watermark] : [];
                });
            if (watermarks.length) {
              const misplaced = new Set(
                await storage.messagesCollection
                  .query(
                    Q.where("id", Q.oneOf(watermarks)),
                    Q.where("conversation_id", Q.notEq(conversationId))
                  )
                  .fetchIds()
              );
              for (const prior of existing)
                if (misplaced.has(String(prior._getRaw("watermark"))))
                  await prior.update((r) => {
                    r._setRaw("watermark", null);
                    r._setRaw("watermark_seq", null);
                  });
            }
            const rows = fromSourceConversation
              ? []
              : await storage.messagesCollection.query(Q.where("id", Q.oneOf(ids))).fetch();
            const foreignRows = new Set(
              rows
                .filter((row) => row._getRaw("conversation_id") !== conversationId)
                .map((row) => row.id)
            );
            const sequences = new Map<string, number>();
            if (fromSourceConversation)
              for (const message of messages)
                if (message.seq !== undefined && message.seq > 0)
                  sequences.set(message.id, message.seq);
            for (const row of rows) {
              if (foreignRows.has(row.id)) continue;
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
            const ordered = fromSourceConversation && ids.every((id) => sequences.has(id));
            if (
              boundary < 0 &&
              !ordered &&
              existing.some(
                (prior) =>
                  idsOf(prior).length > 0 ||
                  seqOf(prior) !== undefined ||
                  (fromSourceConversation && !!prior._getRaw("watermark"))
              )
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
                : fromSourceConversation
                  ? 0
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
            const fresh = ids
              .slice(overlapStart)
              .filter((id) => !foreignSources.has(id) && !foreignRows.has(id));
            if (!fresh.length) return;
            if (job) {
              await job.update((r) =>
                r._setRaw("message_ids", JSON.stringify([...new Set([...idsOf(job), ...fresh])]))
              );
              attempts.delete(job.id);
              awaitingKey.delete(job.id);
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
    dispose,
  };
}
