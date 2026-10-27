import { describe, expect, it, vi } from "vitest";

import { MAX_PER_CONVERSATION } from "../db/conversationMemory/operations";
import type { ChatBackend } from "./ChatBackend";

function unit(hot: number, dims = 8): number[] {
  const v = new Array<number>(dims).fill(0);
  v[hot] = 1;
  return v;
}

export function runChatBackendContract(
  name: string,
  makeBackend: () => Promise<ChatBackend>
): void {
  describe(`${name} satisfies the chat backend contract`, () => {
    it("creates, reads, renames, pins and deletes a conversation", async () => {
      const b = await makeBackend();
      const created = await b.createConversation({ conversationId: "conv_a", title: "Trip" });
      expect(created).toMatchObject({ conversationId: "conv_a", title: "Trip", isDeleted: false });
      expect((await b.getConversation("conv_a"))?.title).toBe("Trip");

      expect(await b.updateConversationTitle("conv_a", "Trip to Lisbon")).toBe(true);
      expect((await b.getConversation("conv_a"))?.title).toBe("Trip to Lisbon");

      expect(await b.updateConversationPinned("conv_a", true)).toBe(true);
      expect((await b.getConversation("conv_a"))?.pinnedAt).toBeInstanceOf(Date);
      expect(await b.updateConversationPinned("conv_a", false)).toBe(true);
      expect((await b.getConversation("conv_a"))?.pinnedAt ?? null).toBeNull();

      expect((await b.getConversations()).map((c) => c.conversationId)).toContain("conv_a");
      expect(await b.deleteConversation("conv_a")).toBe(true);
      expect(await b.getConversation("conv_a")).toBeNull();
      expect((await b.getConversations()).map((c) => c.conversationId)).not.toContain("conv_a");
    });

    it("uses the caller's default title only when none is given", async () => {
      const b = await makeBackend();
      expect((await b.createConversation({ conversationId: "conv_t" }, "Untitled")).title).toBe(
        "Untitled"
      );
      expect(
        (await b.createConversation({ conversationId: "conv_u", title: "Named" }, "Untitled")).title
      ).toBe("Named");
    });

    it("numbers messages in order and pages newest first in ascending order", async () => {
      const b = await makeBackend();
      await b.createConversation({ conversationId: "conv_m", title: "M" });
      const ids: number[] = [];
      for (let i = 0; i < 5; i++) {
        const m = await b.createMessage({
          conversationId: "conv_m",
          role: i % 2 ? "assistant" : "user",
          content: `message ${i}`,
          uniqueId: `msg_${i}`,
          ...(i > 0 && { parentMessageId: `msg_${i - 1}` }),
        });
        ids.push(m.messageId);
      }
      expect([...ids].sort((x, y) => x - y)).toEqual(ids);
      expect(new Set(ids).size).toBe(5);

      expect((await b.getMessages("conv_m")).map((m) => m.content)).toEqual([
        "message 0",
        "message 1",
        "message 2",
        "message 3",
        "message 4",
      ]);
      const newest = await b.getMessagesPage("conv_m", { limit: 2 });
      expect(newest.map((m) => m.content)).toEqual(["message 3", "message 4"]);
      const older = await b.getMessagesPage("conv_m", {
        limit: 2,
        beforeMessageId: newest[0].messageId,
      });
      expect(older.map((m) => m.content)).toEqual(["message 1", "message 2"]);
      expect(await b.getMessageCount("conv_m")).toBe(5);

      const skeletons = await b.getMessageSkeletons("conv_m");
      expect(skeletons.map((s) => [s.uniqueId, s.role, s.parentMessageId])).toEqual([
        ["msg_0", "user", undefined],
        ["msg_1", "assistant", "msg_0"],
        ["msg_2", "user", "msg_1"],
        ["msg_3", "assistant", "msg_2"],
        ["msg_4", "user", "msg_3"],
      ]);
    });

    it("returns the existing message for a repeated uniqueId", async () => {
      const b = await makeBackend();
      await b.createConversation({ conversationId: "conv_i", title: "I" });
      const first = await b.createMessage({
        conversationId: "conv_i",
        role: "user",
        content: "once",
        uniqueId: "msg_once",
      });
      const again = await b.createMessage({
        conversationId: "conv_i",
        role: "user",
        content: "twice",
        uniqueId: "msg_once",
      });
      expect(again.messageId).toBe(first.messageId);
      expect(again.content).toBe("once");
      expect(await b.getMessageCount("conv_i")).toBe(1);
    });

    it("upserts a message in place and creates it when missing", async () => {
      const b = await makeBackend();
      await b.createConversation({ conversationId: "conv_up", title: "U" });
      const created = await b.upsertMessage({
        conversationId: "conv_up",
        role: "assistant",
        content: "partial",
        uniqueId: "msg_up",
        wasStopped: true,
      });
      const updated = await b.upsertMessage({
        conversationId: "conv_up",
        role: "assistant",
        content: "partial and the rest",
        uniqueId: "msg_up",
        wasStopped: false,
      });
      expect(updated.messageId).toBe(created.messageId);
      expect(updated.content).toBe("partial and the rest");
      expect(updated.wasStopped).toBe(false);
      expect(await b.getMessageCount("conv_up")).toBe(1);
    });

    it("records errors, feedback, file ids and tool call ids on messages", async () => {
      const b = await makeBackend();
      await b.createConversation({ conversationId: "conv_f", title: "F" });
      await b.createMessage({
        conversationId: "conv_f",
        role: "assistant",
        content: "answer",
        uniqueId: "msg_f",
        toolCallEvents: [
          { id: "call_1", name: "search" },
          { id: "call_2", name: "map" },
        ],
      });
      expect((await b.updateMessageError("msg_f", "boom"))?.error).toBe("boom");
      expect((await b.updateMessageFeedback("msg_f", "like"))?.feedback).toBe("like");
      if (b.updateMessageFileIds) {
        expect((await b.updateMessageFileIds("msg_f", ["media_1"]))?.fileIds).toEqual(["media_1"]);
      }
      const [stored] = await b.getMessages("conv_f");
      expect(stored).toMatchObject({ error: "boom", feedback: "like" });
      if (b.updateMessageFileIds) expect(stored?.fileIds).toEqual(["media_1"]);
      expect([...(await b.getToolCallEventIds("conv_f"))].sort()).toEqual(["call_1", "call_2"]);
    });

    it("finds embedded messages by chunk search and honours the conversation filters", async () => {
      const b = await makeBackend();
      await b.createConversation({ conversationId: "conv_s1", title: "S1" });
      await b.createConversation({ conversationId: "conv_s2", title: "S2" });
      await b.createMessage({
        conversationId: "conv_s1",
        role: "user",
        content: "lisbon trip",
        uniqueId: "msg_s1",
      });
      await b.createMessage({
        conversationId: "conv_s2",
        role: "user",
        content: "porto trip",
        uniqueId: "msg_s2",
      });
      await b.updateMessageEmbedding("msg_s1", unit(1), "test-model");
      await b.updateMessageEmbedding("msg_s2", unit(1), "test-model");

      const hits = await b.searchChunks(unit(1), {
        minSimilarity: 0.5,
        embeddingModel: "test-model",
      });
      expect(hits.map((h) => h.message.uniqueId).sort()).toEqual(["msg_s1", "msg_s2"]);
      expect(hits[0].similarity).toBeCloseTo(1);

      const excluded = await b.searchChunks(unit(1), {
        minSimilarity: 0.5,
        embeddingModel: "test-model",
        excludeConversationId: "conv_s1",
      });
      expect(excluded.map((h) => h.message.uniqueId)).toEqual(["msg_s2"]);
      const only = await b.searchChunks(unit(1), {
        minSimilarity: 0.5,
        embeddingModel: "test-model",
        conversationId: "conv_s1",
      });
      expect(only.map((h) => h.message.uniqueId)).toEqual(["msg_s1"]);
      expect(
        await b.searchChunks(unit(2), { minSimilarity: 0.5, embeddingModel: "test-model" })
      ).toEqual([]);
    });

    it("stores, replaces and deletes a conversation summary", async () => {
      const b = await makeBackend();
      expect(await b.getSummary("conv_sum")).toBeNull();
      await b.upsertSummary("conv_sum", "first", "msg_1", 10);
      await b.upsertSummary("conv_sum", "second", "msg_3", 20);
      expect(await b.getSummary("conv_sum")).toMatchObject({
        conversationId: "conv_sum",
        summary: "second",
        summarizedUpTo: "msg_3",
        tokenCount: 20,
      });
      await b.deleteSummary("conv_sum");
      expect(await b.getSummary("conv_sum")).toBeNull();
    });

    it("deletes one message and leaves the rest", async () => {
      const b = await makeBackend();
      await b.createConversation({ conversationId: "conv_d", title: "D" });
      for (const id of ["msg_keep", "msg_drop"])
        await b.createMessage({
          conversationId: "conv_d",
          role: "user",
          content: id,
          uniqueId: id,
        });
      expect(await b.deleteMessage("msg_drop")).toBe("msg_drop");
      expect(await b.deleteMessage("msg_missing")).toBeNull();
      expect((await b.getMessages("conv_d")).map((m) => m.uniqueId)).toEqual(["msg_keep"]);
    });

    it("reads messages by id in the order asked and skips unknown ids", async () => {
      const b = await makeBackend();
      await b.createConversation({ conversationId: "conv_r1", title: "R1" });
      await b.createConversation({ conversationId: "conv_r2", title: "R2" });
      for (const [conversationId, uniqueId] of [
        ["conv_r1", "msg_r1"],
        ["conv_r2", "msg_r2"],
      ])
        await b.createMessage({ conversationId, role: "user", content: uniqueId, uniqueId });

      const found = await b.getMessagesByIds(["msg_r2", "msg_none", "msg_r1", "msg_r2"]);
      expect(found.map((m) => [m.uniqueId, m.conversationId, m.content])).toEqual([
        ["msg_r2", "conv_r2", "msg_r2"],
        ["msg_r1", "conv_r1", "msg_r1"],
      ]);
      expect(await b.getMessagesByIds([])).toEqual([]);
    });

    it("links memories once each, moves a relinked memory to the latest turn, and clears them", async () => {
      const base = Date.now() - 10_000;
      vi.useFakeTimers({ toFake: ["Date"], now: base });
      try {
        const b = await makeBackend();
        await b.createConversation({ conversationId: "conv_l", title: "L" });
        vi.setSystemTime(base);
        await b.addMemoryLinks("conv_l", [
          { memoryId: "mem_a", score: 0.9 },
          { memoryId: "mem_b", score: 0.4 },
        ]);
        vi.setSystemTime(base + 1_000);
        await b.addMemoryLinks("conv_l", [
          { memoryId: "mem_c", score: 0.7 },
          { memoryId: "mem_a", score: 0.1 },
          { memoryId: "mem_c", score: 0.2 },
        ]);
        const links = (await b.getMemoryLinks("conv_l")).sort(
          (x, y) => x.createdAt.getTime() - y.createdAt.getTime()
        );
        expect(links.map((l) => [l.memoryId, l.score, l.createdAt.getTime()])).toEqual([
          ["mem_b", 0.4, base + 1],
          ["mem_c", 0.7, base + 1_000],
          ["mem_a", 0.1, base + 1_001],
        ]);
        expect(links.every((l) => l.conversationId === "conv_l")).toBe(true);
        await b.clearMemoryLinks("conv_l");
        expect(await b.getMemoryLinks("conv_l")).toEqual([]);
      } finally {
        vi.useRealTimers();
      }
    });

    it("keeps a conversation's newest memory links within the cap", async () => {
      const base = Date.now() - 10_000;
      vi.useFakeTimers({ toFake: ["Date"], now: base });
      try {
        const b = await makeBackend();
        await b.createConversation({ conversationId: "conv_cap", title: "Cap" });
        const ids = Array.from({ length: MAX_PER_CONVERSATION }, (_, i) => `mem_${i}`);
        vi.setSystemTime(base);
        await b.addMemoryLinks(
          "conv_cap",
          ids.map((memoryId) => ({ memoryId, score: 0.5 }))
        );
        vi.setSystemTime(base + 1_000);
        await b.addMemoryLinks("conv_cap", [
          { memoryId: "mem_new", score: 0.5 },
          { memoryId: "mem_0", score: 0.6 },
        ]);
        const kept = new Set((await b.getMemoryLinks("conv_cap")).map((l) => l.memoryId));
        expect(kept.size).toBe(MAX_PER_CONVERSATION);
        expect(kept.has("mem_0") && kept.has("mem_new")).toBe(true);
        expect(kept.has("mem_1")).toBe(false);
        expect(kept.has("mem_2")).toBe(true);

        const flood = Array.from({ length: MAX_PER_CONVERSATION }, (_, i) => `mem_f${i}`);
        vi.setSystemTime(base + 2_000);
        await b.addMemoryLinks(
          "conv_cap",
          ["mem_0", ...flood].map((memoryId) => ({ memoryId, score: 0.5 }))
        );
        expect((await b.getMemoryLinks("conv_cap")).map((l) => l.memoryId).sort()).toEqual(
          [...flood].sort()
        );
      } finally {
        vi.useRealTimers();
      }
    });

    it("clears a conversation's messages", async () => {
      const b = await makeBackend();
      await b.createConversation({ conversationId: "conv_c", title: "C" });
      await b.createMessage({
        conversationId: "conv_c",
        role: "user",
        content: "x",
        uniqueId: "msg_c",
      });
      await b.clearMessages("conv_c");
      expect(await b.getMessages("conv_c")).toEqual([]);
      expect(await b.getMessageCount("conv_c")).toBe(0);
    });
  });
}
