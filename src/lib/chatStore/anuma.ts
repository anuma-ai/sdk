import type { AnumaTurn, AnumaTurnOrigin, StoredMessage } from "../db/chat/types";
import { type ChatRecord, type ChatSnapshot, type ChatStore, ChatStoreError } from "./types";
import { conversationSortKey, plain, readAnumaTurn } from "./vaultRecords";

export type { AnumaTurn, AnumaTurnOrigin };
export { readAnumaTurn };

/** The one vault conversation that holds the user's Anuma 1:1 chat. */
export const ANUMA_CONVERSATION_ID = "anuma-1on1";

const maxAttempts = 3;

function object(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/** The message text for a turn's bubbles, so readers that ignore bubbles still see every line. */
export function anumaTurnContent(bubbles: readonly string[]): string {
  return bubbles.join("\n\n");
}

/** The highest message sort key the user has read in the Anuma chat; 0 before anything was read. */
export function anumaLastReadSortKey(conversation: ChatRecord | ChatSnapshot | null): number {
  const record = conversation && "record" in conversation ? conversation.record : conversation;
  const state = record?.data.anuma;
  if (!object(state)) return 0;
  const sortKey = state.lastReadSortKey;
  return Number.isSafeInteger(sortKey) && (sortKey as number) > 0 ? (sortKey as number) : 0;
}

function conflict(error: unknown): boolean {
  return error instanceof ChatStoreError && error.code === "version_conflict";
}

function live(snapshot: ChatSnapshot | null): ChatSnapshot | null {
  if (snapshot?.record.isDeleted)
    throw new ChatStoreError("Anuma conversation was deleted", 409, "conversation_deleted");
  return snapshot;
}

/** Reads the Anuma conversation, creating it on first use; a device that loses the creation race reads the winner's record. */
export async function ensureAnumaConversation(
  store: ChatStore,
  options: { now?: () => number; signal?: AbortSignal } = {}
): Promise<ChatSnapshot> {
  const existing = live(await store.get("conversation", ANUMA_CONVERSATION_ID, options.signal));
  if (existing) return existing;
  const at = (options.now ?? Date.now)();
  const data = plain({ title: "Anuma", lastActivityAt: at, anuma: { lastReadSortKey: 0 } });
  try {
    const [created] = await store.putMany(
      [
        {
          expectedVersion: 0,
          record: {
            kind: "conversation",
            id: ANUMA_CONVERSATION_ID,
            conversationId: "",
            sortKey: conversationSortKey(data, at),
            createdAt: at,
            updatedAt: at,
            isDeleted: false,
            data,
          },
        },
      ],
      options.signal
    );
    return created;
  } catch (error) {
    if (!conflict(error)) throw error;
    const winner = live(await store.get("conversation", ANUMA_CONVERSATION_ID, options.signal));
    if (!winner) throw error;
    return winner;
  }
}

/** Moves the read marker up to `sortKey`; it never moves down, and a concurrent write is re-read and re-applied. */
export async function markAnumaRead(
  store: ChatStore,
  sortKey: number,
  options: { now?: () => number; signal?: AbortSignal } = {}
): Promise<ChatSnapshot> {
  if (!Number.isSafeInteger(sortKey) || sortKey < 0)
    throw new ChatStoreError("Invalid Anuma read marker", 0, "invalid_record");
  const now = options.now ?? Date.now;
  for (let attempt = 1; ; attempt++) {
    const current = await ensureAnumaConversation(store, options);
    const read = anumaLastReadSortKey(current);
    if (sortKey <= read) return current;
    const record = current.record;
    const state = object(record.data.anuma) ? record.data.anuma : {};
    const data = plain({ ...record.data, anuma: { ...state, lastReadSortKey: sortKey } });
    try {
      const [written] = await store.putMany(
        [
          {
            expectedVersion: current.version,
            record: {
              ...record,
              data,
              sortKey: conversationSortKey(data, record.createdAt),
              updatedAt: Math.max(record.updatedAt, now()),
            },
          },
        ],
        options.signal
      );
      return written;
    } catch (error) {
      if (!conflict(error) || attempt >= maxAttempts) throw error;
    }
  }
}

/** Counts Anuma turns the user has not read: assistant turns above both the read marker and the user's latest message. */
export function countUnreadAnumaTurns(
  messages: readonly Pick<StoredMessage, "messageId" | "role" | "anuma" | "uniqueId">[],
  lastReadSortKey: number
): number {
  const answered = Math.max(
    0,
    ...messages.filter((m) => m.role === "user").map((m) => m.messageId)
  );
  const floor = Math.max(lastReadSortKey, answered);
  const turns = new Set<string>();
  for (const m of messages) {
    if (m.role !== "assistant" || m.messageId <= floor) continue;
    turns.add(m.anuma?.turnId ? `turn:${m.anuma.turnId}` : `message:${m.uniqueId}`);
  }
  return turns.size;
}
