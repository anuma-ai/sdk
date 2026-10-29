import { webcrypto } from "node:crypto";

import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { createChatStoreHarness } from "../../../test/chat/vaultHarness";
import type { StoredMessage } from "../db/chat/types";
import {
  ANUMA_CONVERSATION_ID,
  anumaLastReadSortKey,
  anumaTurnContent,
  countUnreadAnumaTurns,
  ensureAnumaConversation,
  markAnumaRead,
  readAnumaTurn,
} from "./anuma";
import { type ChatStore, ChatStoreError } from "./types";
import { createVaultChatBackend, type VaultChatBackend } from "./vaultBackend";

beforeAll(() => {
  vi.stubGlobal("crypto", webcrypto);
});
afterAll(() => vi.unstubAllGlobals());

const open: VaultChatBackend[] = [];
afterEach(() => {
  open.splice(0).forEach((b) => b.close());
});

function backend(store: ChatStore) {
  const b = createVaultChatBackend({
    store,
    pollIntervalMs: 0,
    activity: { isActive: () => true, subscribe: () => () => {} },
  });
  open.push(b);
  return b;
}

function raceOnce(store: ChatStore, otherDevice: () => Promise<unknown>): ChatStore {
  let raced = false;
  return {
    ...store,
    async get(kind, id, signal) {
      if (!raced && kind === "conversation" && id === ANUMA_CONVERSATION_ID) {
        raced = true;
        const before = await store.get(kind, id, signal);
        await otherDevice();
        return before;
      }
      return store.get(kind, id, signal);
    },
  };
}

describe("Anuma conversation", () => {
  it("creates the conversation once and later calls read the same record", async () => {
    const { store } = await createChatStoreHarness();
    const first = await ensureAnumaConversation(store, { now: () => 1_000 });
    expect(first.version).toBe(1);
    expect(first.record).toMatchObject({
      kind: "conversation",
      id: ANUMA_CONVERSATION_ID,
      conversationId: "",
      isDeleted: false,
      data: { anuma: { lastReadSortKey: 0 } },
    });
    const again = await ensureAnumaConversation(store, { now: () => 2_000 });
    expect(again.version).toBe(1);
    expect(again.record.createdAt).toBe(first.record.createdAt);
    expect(anumaLastReadSortKey(again)).toBe(0);
  });

  it("reads the other device's record when it loses the creation race", async () => {
    const h = await createChatStoreHarness();
    let winner: Awaited<ReturnType<typeof ensureAnumaConversation>> | undefined;
    const raced = raceOnce(h.store, async () => {
      winner = await ensureAnumaConversation(h.store, { now: () => 1_000 });
    });
    const result = await ensureAnumaConversation(raced, { now: () => 9_999 });
    expect(h.calls.filter((c) => c === "putMany")).toHaveLength(2);
    expect(result.version).toBe(1);
    expect(result.record).toEqual(winner?.record);
    expect(result.record.createdAt).toBe(1_000);
  });

  it("propagates errors other than a version conflict", async () => {
    const h = await createChatStoreHarness();
    const boom = new ChatStoreError("down", 503);
    h.fail({ op: "putMany", error: boom });
    await expect(ensureAnumaConversation(h.store)).rejects.toBe(boom);
  });

  it("refuses to revive a deleted Anuma conversation", async () => {
    const h = await createChatStoreHarness();
    const created = await ensureAnumaConversation(h.store);
    await h.write([
      {
        record: {
          ...created.record,
          isDeleted: true,
          data: {},
          updatedAt: created.record.updatedAt + 1,
        },
        expectedVersion: created.version,
      },
    ]);
    await expect(ensureAnumaConversation(h.store)).rejects.toMatchObject({
      code: "conversation_deleted",
    });
  });

  it("moves the read marker up only and re-applies after a concurrent write", async () => {
    const h = await createChatStoreHarness();
    await ensureAnumaConversation(h.store);
    expect(anumaLastReadSortKey(await markAnumaRead(h.store, 50))).toBe(50);
    expect(anumaLastReadSortKey(await markAnumaRead(h.store, 20))).toBe(50);

    let interfered = false;
    const racing: ChatStore = {
      ...h.store,
      async putMany(writes, signal) {
        if (!interfered) {
          interfered = true;
          await markAnumaRead(h.store, 60);
        }
        return h.store.putMany(writes, signal);
      },
    };
    const result = await markAnumaRead(racing, 80);
    expect(anumaLastReadSortKey(result)).toBe(80);
    const row = await h.row("conversation", ANUMA_CONVERSATION_ID);
    expect(anumaLastReadSortKey(row ?? null)).toBe(80);
    expect(row?.record.data.title).toBe("Anuma");
    await expect(markAnumaRead(h.store, -1)).rejects.toMatchObject({ code: "invalid_record" });
  });

  it("keeps the marker and the turn fields through the vault chat backend", async () => {
    const h = await createChatStoreHarness();
    await ensureAnumaConversation(h.store);
    const b = backend(h.store);
    await b.createMessage({
      conversationId: ANUMA_CONVERSATION_ID,
      uniqueId: "intro-42",
      role: "assistant",
      content: anumaTurnContent(["meet ava", "an aries who digs coffee"]),
      anuma: {
        turnId: "intro-42",
        bubbles: ["meet ava", "an aries who digs coffee"],
        origin: "intro",
      },
    });
    await b.createMessage({
      conversationId: ANUMA_CONVERSATION_ID,
      uniqueId: "reply-1",
      role: "assistant",
      content: "",
      anuma: { turnId: "turn-1", origin: "reply" },
    });
    await b.upsertMessage({
      conversationId: ANUMA_CONVERSATION_ID,
      uniqueId: "reply-1",
      role: "assistant",
      content: "hey\n\nwhat's up",
      anuma: { turnId: "turn-1", origin: "reply", bubbles: ["hey", "what's up"] },
    });
    await b.flush();
    await markAnumaRead(h.store, 5);

    const other = backend(h.store);
    const messages = await other.getMessages(ANUMA_CONVERSATION_ID);
    expect(messages.map((m) => m.anuma)).toEqual([
      { turnId: "intro-42", bubbles: ["meet ava", "an aries who digs coffee"], origin: "intro" },
      { turnId: "turn-1", origin: "reply", bubbles: ["hey", "what's up"] },
    ]);
    expect(messages[0].content).toBe("meet ava\n\nan aries who digs coffee");
    const row = await h.row("conversation", ANUMA_CONVERSATION_ID);
    expect(anumaLastReadSortKey(row ?? null)).toBe(5);
    expect(typeof row?.record.data.lastActivityAt).toBe("number");
  });

  it("rejects an invalid turn instead of storing it", async () => {
    const h = await createChatStoreHarness();
    const b = backend(h.store);
    await expect(
      b.createMessage({
        conversationId: ANUMA_CONVERSATION_ID,
        role: "assistant",
        content: "x",
        anuma: { turnId: "t", bubbles: ["1", "2", "3", "4"] },
      })
    ).rejects.toMatchObject({ code: "invalid_record" });
  });
});

describe("readAnumaTurn", () => {
  it("accepts 1-3 ordered bubbles and the known origins", () => {
    expect(readAnumaTurn({ turnId: "t", bubbles: ["a", "b", "c"], origin: "reply" })).toEqual({
      turnId: "t",
      bubbles: ["a", "b", "c"],
      origin: "reply",
    });
    expect(readAnumaTurn({ turnId: "t", extra: 1 })).toEqual({ turnId: "t" });
  });

  it("rejects malformed turns", () => {
    for (const bad of [
      undefined,
      null,
      "t",
      { turnId: "" },
      { turnId: "x".repeat(129) },
      { turnId: "t", bubbles: [] },
      { turnId: "t", bubbles: ["a", "b", "c", "d"] },
      { turnId: "t", bubbles: ["a", 1] },
      { turnId: "t", origin: "system" },
    ])
      expect(readAnumaTurn(bad)).toBeUndefined();
  });
});

describe("countUnreadAnumaTurns", () => {
  const msg = (
    uniqueId: string,
    messageId: number,
    role: StoredMessage["role"],
    turnId?: string
  ): Pick<StoredMessage, "uniqueId" | "messageId" | "role" | "anuma"> => ({
    uniqueId,
    messageId,
    role,
    ...(turnId ? { anuma: { turnId } } : {}),
  });

  it("counts assistant turns above the marker, once per turn", () => {
    const messages = [
      msg("a", 10, "assistant", "t1"),
      msg("b", 20, "assistant", "t2"),
      msg("c", 21, "assistant", "t2"),
      msg("d", 30, "assistant"),
    ];
    expect(countUnreadAnumaTurns(messages, 0)).toBe(3);
    expect(countUnreadAnumaTurns(messages, 10)).toBe(2);
    expect(countUnreadAnumaTurns(messages, 30)).toBe(0);
    expect(countUnreadAnumaTurns([], 0)).toBe(0);
  });

  it("treats the user's own latest message as having read everything before it", () => {
    const messages = [
      msg("a", 10, "assistant", "t1"),
      msg("u", 15, "user"),
      msg("b", 20, "assistant", "t2"),
    ];
    expect(countUnreadAnumaTurns(messages, 0)).toBe(1);
  });
});
