import { type Collection, Q } from "@nozbe/watermelondb";

import type { Message } from "./models";

function parseEventIds(value: unknown): Set<string> {
  const ids = new Set<string>();
  let events: unknown;
  try {
    events = typeof value === "string" ? JSON.parse(value) : value;
  } catch {
    return ids;
  }
  if (!Array.isArray(events)) return ids;
  for (const event of events as unknown[]) {
    if (!event || typeof event !== "object") continue;
    const id = (event as { id?: unknown }).id;
    if (typeof id === "string" && id) ids.add(id);
  }
  return ids;
}

async function fetchEventRows(
  collection: Collection<Message>,
  conversationId: string
): Promise<Record<string, unknown>[]> {
  try {
    return (await collection
      .query(
        Q.unsafeSqlQuery(
          'select "id", "tool_call_events" from "history" where "conversation_id" = ? ' +
            'and "_status" != \'deleted\' and "tool_call_events" is not null ' +
            "and \"tool_call_events\" not in ('', '[]')",
          [conversationId]
        )
      )
      .unsafeFetchRaw()) as Record<string, unknown>[];
  } catch (error) {
    if (!(error instanceof Error) || !/unsafeSqlQuery.*not supported/.test(error.message)) {
      throw error;
    }
    return (await collection
      .query(
        Q.where("conversation_id", conversationId),
        Q.where("tool_call_events", Q.notEq(null)),
        Q.where("tool_call_events", Q.notIn(["", "[]"])),
        Q.unsafeLokiTransform((rows: Record<string, unknown>[]) =>
          rows.map(({ id, tool_call_events }) => ({ id, tool_call_events }))
        )
      )
      .unsafeFetchRaw()) as Record<string, unknown>[];
  }
}

class ToolCallEventIndex {
  private conversations = new Map<string, Map<string, number>>();
  private messages = new Map<string, { conversationId: string; ids: Set<string> }>();
  private pending = new Map<string, Promise<void>>();
  private resetCount: number;

  constructor(private collection: Collection<Message>) {
    this.resetCount = collection.database._resetCount;
    collection.experimentalSubscribe((changes) => {
      for (const { record, type } of changes) {
        this.replace(
          record.id,
          type === "destroyed" ? undefined : record.conversationId,
          type === "destroyed" ? undefined : record._getRaw("tool_call_events")
        );
      }
    });
  }

  private replace(messageId: string, conversationId?: string, value?: unknown): void {
    const previous = this.messages.get(messageId);
    if (previous) {
      const counts = this.conversations.get(previous.conversationId)!;
      for (const id of previous.ids) {
        const count = counts.get(id)! - 1;
        if (count === 0) counts.delete(id);
        else counts.set(id, count);
      }
      this.messages.delete(messageId);
    }
    const counts =
      conversationId === undefined ? undefined : this.conversations.get(conversationId);
    if (!counts || conversationId === undefined) return;
    const ids = parseEventIds(value);
    if (ids.size === 0) return;
    this.messages.set(messageId, { conversationId, ids });
    for (const id of ids) counts.set(id, (counts.get(id) ?? 0) + 1);
  }

  async get(conversationId: string): Promise<Set<string>> {
    if (this.resetCount !== this.collection.database._resetCount) {
      this.conversations.clear();
      this.messages.clear();
      this.pending.clear();
      this.resetCount = this.collection.database._resetCount;
    }
    if (!this.conversations.has(conversationId)) {
      let pending = this.pending.get(conversationId);
      if (!pending) {
        pending = this.collection.database.read(async () => {
          const rows = await fetchEventRows(this.collection, conversationId);
          this.conversations.set(conversationId, new Map());
          for (const row of rows)
            this.replace(String(row.id), conversationId, row.tool_call_events);
        });
        this.pending.set(conversationId, pending);
      }
      try {
        await pending;
      } finally {
        this.pending.delete(conversationId);
      }
    }
    return new Set(this.conversations.get(conversationId)!.keys());
  }
}

const indexes = new WeakMap<Collection<Message>, ToolCallEventIndex>();

export function getToolCallEventIds(
  collection: Collection<Message>,
  conversationId: string
): Promise<Set<string>> {
  let index = indexes.get(collection);
  if (!index) {
    index = new ToolCallEventIndex(collection);
    indexes.set(collection, index);
  }
  return index.get(conversationId);
}
