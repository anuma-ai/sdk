import { webcrypto } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { conformance, createChatStoreHarness } from "../../../test/chat/vaultHarness";
import { createRemoteChatStore } from "./remote";
import { createVaultChatBackend } from "./vaultBackend";

beforeAll(() => {
  vi.stubGlobal("crypto", webcrypto);
});
afterAll(() => vi.unstubAllGlobals());

describe.runIf(conformance)("keyword search against a real vault", () => {
  it("finds every message holding the words, and backfills what an older client wrote", async () => {
    const harness = await createChatStoreHarness();
    const backend = createVaultChatBackend({
      store: harness.store,
      pollIntervalMs: 0,
      activity: { isActive: () => true, subscribe: () => () => {} },
    });
    try {
      expect(harness.store.searchTerms).toBeDefined();
      await backend.createConversation({ conversationId: "trip" });
      await backend.createConversation({ conversationId: "work" });
      await backend.createMessage({
        conversationId: "trip",
        role: "user",
        content: "Where can I get Coffee in Kyoto?",
        uniqueId: "m_kyoto",
      });
      await backend.createMessage({
        conversationId: "work",
        role: "assistant",
        content: "The coffee budget is approved.",
        uniqueId: "m_budget",
      });
      await backend.createMessage({
        conversationId: "trip",
        role: "user",
        content: "東京で珈琲を飲みたい",
        uniqueId: "m_tokyo",
      });
      await backend.flush();

      const ids = async (query: string, options?: Parameters<typeof backend.searchKeywords>[1]) =>
        (await backend.searchKeywords(query, options)).map((m) => m.uniqueId).sort();
      expect(await ids("COFFEE")).toEqual(["m_budget", "m_kyoto"]);
      expect(await ids("kyoto coffee")).toEqual(["m_kyoto"]);
      expect(await ids("coffee", { excludeConversationId: "work" })).toEqual(["m_kyoto"]);
      expect(await ids("珈琲")).toEqual(["m_tokyo"]);
      expect(await ids("tea")).toEqual([]);

      await backend.upsertMessage({
        conversationId: "trip",
        role: "user",
        content: "Where can I get tea in Kyoto?",
        uniqueId: "m_kyoto",
      });
      await backend.deleteMessage("m_budget");
      await backend.flush();
      expect(await ids("coffee")).toEqual([]);
      expect(await ids("tea")).toEqual(["m_kyoto"]);

      const older = await createRemoteChatStore({
        ...harness.vault!.options,
        hashTopic: undefined,
      });
      await older.putMany([
        {
          record: {
            kind: "message",
            id: "m_old",
            conversationId: "work",
            sortKey: 99,
            createdAt: 5,
            updatedAt: 5,
            isDeleted: false,
            data: { role: "user", content: "Coffee from an old phone" },
          },
          expectedVersion: 0,
        },
      ]);
      expect(await ids("phone")).toEqual([]);
      let cursor: string | undefined;
      let indexed = 0;
      do {
        const page = await harness.store.indexTermsPage!(cursor);
        indexed += page.indexed;
        cursor = page.nextCursor;
      } while (cursor);
      expect(indexed).toBe(1);
      expect(await ids("phone coffee")).toEqual(["m_old"]);
    } finally {
      backend.close();
    }
  });
});
