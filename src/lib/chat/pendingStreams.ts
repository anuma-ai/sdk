import type { StreamResumeHandle } from "./toolLoop";

/**
 * A background turn whose answer may still be generating on the portal.
 * @public
 */
export type PendingStream = StreamResumeHandle & {
  conversationId: string;
  parentMessageId: string;
  assistantMessageId?: string;
  walletAddress?: string;
  createdAt: number;
};

/**
 * Durable record of background turns, so a later session can recover their answers.
 * @public
 */
export interface PendingStreamStore {
  list(): PendingStream[];
  put(stream: PendingStream): void;
  remove(parentMessageId: string): void;
}

/** Longest a portal generation plus its buffer can outlive the request that started it. */
export const PENDING_STREAM_MAX_AGE_MS = 45 * 60 * 1000;

/** Stored id of an answer recovered after its request went away. */
export function backgroundMessageId(inferenceId: string): string {
  return `msg_bg_${inferenceId}`;
}

type KeyValueStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function isPendingStream(value: unknown): value is PendingStream {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.inferenceId === "string" &&
    (v.apiType === "responses" || v.apiType === "completions") &&
    typeof v.conversationId === "string" &&
    typeof v.parentMessageId === "string" &&
    typeof v.createdAt === "number"
  );
}

function defaultStorage(): KeyValueStorage | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

/**
 * A {@link PendingStreamStore} kept in `localStorage` (or any compatible storage).
 * @public
 */
export function createLocalStoragePendingStreams(
  key = "anuma:pending-streams",
  storage: KeyValueStorage | null = defaultStorage(),
  now: () => number = Date.now
): PendingStreamStore {
  const read = (): PendingStream[] => {
    if (!storage) return [];
    try {
      const parsed: unknown = JSON.parse(storage.getItem(key) ?? "[]");
      return Array.isArray(parsed) ? parsed.filter(isPendingStream) : [];
    } catch {
      return [];
    }
  };
  const write = (streams: PendingStream[]) => {
    if (!storage) return;
    try {
      if (streams.length === 0) storage.removeItem(key);
      else storage.setItem(key, JSON.stringify(streams));
    } catch {
      return;
    }
  };
  const fresh = (streams: PendingStream[]) =>
    streams.filter((s) => now() - s.createdAt < PENDING_STREAM_MAX_AGE_MS);

  return {
    list: () => fresh(read()),
    put: (stream) =>
      write([...fresh(read()).filter((s) => s.parentMessageId !== stream.parentMessageId), stream]),
    remove: (parentMessageId) =>
      write(fresh(read()).filter((s) => s.parentMessageId !== parentMessageId)),
  };
}
