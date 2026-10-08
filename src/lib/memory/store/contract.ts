import { describe, expect, it, vi } from "vitest";

import type { MemoryStore } from "./types";

export function runMemoryStoreContract(makeStore: () => MemoryStore | Promise<MemoryStore>): void {
  describe("MemoryStore contract", () => {
    it("creates, reads, updates and deletes", async () => {
      const store = await makeStore();
      const created = await store.create({ content: "Likes green tea", embedding: "[1,0]" });

      expect(created.content).toBe("Likes green tea");
      expect(await store.get(created.uniqueId)).toMatchObject({ content: "Likes green tea" });
      expect((await store.list()).map((m) => [m.uniqueId, m.embedding])).toEqual([
        [created.uniqueId, "[1,0]"],
      ]);

      const updated = await store.update(created.uniqueId, { content: "Likes oolong tea" });
      expect(updated?.content).toBe("Likes oolong tea");
      expect((await store.get(created.uniqueId))?.content).toBe("Likes oolong tea");

      expect(await store.delete(created.uniqueId)).toBe(true);
      expect(await store.get(created.uniqueId)).toBeNull();
      expect(await store.list()).toEqual([]);
      expect(await store.list({ includeDeleted: true })).toMatchObject([
        { uniqueId: created.uniqueId, isDeleted: true },
      ]);
    });

    it("never keeps a stale vector across a content edit", async () => {
      const store = await makeStore();
      const m = await store.create({ content: "Likes green tea", embedding: "[1,0]" });

      const edited = await store.update(m.uniqueId, { content: "Likes oolong tea" });
      expect(edited?.embedding).not.toBe("[1,0]");
      expect((await store.get(m.uniqueId))?.embedding).not.toBe("[1,0]");
      expect((await store.list()).map((r) => r.embedding)).not.toContain("[1,0]");

      const reembedded = await store.update(m.uniqueId, {
        content: "Likes black tea",
        embedding: "[0,1]",
        embeddingModel: "test-model",
      });
      expect(reembedded).toMatchObject({ embedding: "[0,1]", embeddingModel: "test-model" });
    });

    it("creates many in one call", async () => {
      const store = await makeStore();
      const created = await store.createMany([{ content: "Has a cat" }, { content: "Has a dog" }]);

      expect(created.map((m) => m.content)).toEqual(["Has a cat", "Has a dog"]);
      expect((await store.list()).map((m) => m.content).sort()).toEqual(["Has a cat", "Has a dog"]);
    });

    it("filters list by ids and scope", async () => {
      const store = await makeStore();
      const a = await store.create({ content: "Private fact" });
      await store.create({ content: "Shared fact", scope: "shared" });

      expect((await store.list({ memoryIds: [a.uniqueId] })).map((m) => m.content)).toEqual([
        "Private fact",
      ]);
      expect((await store.list({ scopes: ["shared"] })).map((m) => m.content)).toEqual([
        "Shared fact",
      ]);
    });

    it("resolves null/false for a missing memory instead of throwing", async () => {
      const store = await makeStore();

      expect(await store.get("missing")).toBeNull();
      expect(await store.update("missing", { content: "x" })).toBeNull();
      expect(await store.delete("missing")).toBe(false);
      expect(await store.archive("missing")).toBe(false);
      expect(await store.restore("missing")).toBe(false);
      expect(await store.setTopics("missing", ["x"])).toBeNull();
      expect(await store.setVisibility("missing", "public")).toBeNull();
    });

    it("archives out of the default list and restores back into it", async () => {
      const store = await makeStore();
      const m = await store.create({ content: "Training for a marathon" });

      expect(await store.archive(m.uniqueId)).toBe(true);
      expect(await store.list()).toEqual([]);
      const archived = await store.listArchived();
      expect(archived.map((r) => r.uniqueId)).toEqual([m.uniqueId]);
      expect(archived[0].archivedAt).not.toBeNull();

      expect(await store.restore(m.uniqueId)).toBe(true);
      expect((await store.list()).map((r) => r.uniqueId)).toEqual([m.uniqueId]);
      expect(await store.listArchived()).toEqual([]);
    });

    it("supersedes an old memory behind a new one", async () => {
      const store = await makeStore();
      const old = await store.create({ content: "Lives in Portland" });
      const next = await store.create({ content: "Lives in SF" });

      expect(await store.supersede(old.uniqueId, old.uniqueId)).toBe(false);
      expect(await store.supersede(old.uniqueId, next.uniqueId)).toBe(true);
      expect((await store.list()).map((m) => m.uniqueId)).toEqual([next.uniqueId]);
      const history = await store.list({ includeSuperseded: true, memoryIds: [old.uniqueId] });
      expect(history[0].supersededBy).toBe(next.uniqueId);
    });

    it("sets, adds and reads topics", async () => {
      const store = await makeStore();
      const a = await store.create({ content: "Hiked Mt Hood" });
      const b = await store.create({ content: "Camped at Mt Hood" });

      const curated = await store.setTopics(a.uniqueId, ["Hiking", "Mt Hood"]);
      expect(curated?.topicsUserManaged).toBe(true);
      expect((await store.get(a.uniqueId))?.topics?.map((t) => t.name).sort()).toEqual([
        "Hiking",
        "Mt Hood",
      ]);
      await store.addTopics(b.uniqueId, ["Mt Hood"]);
      expect((await store.get(b.uniqueId))?.topicsUserManaged).toBe(false);

      expect(await store.topicsByMemories([a.uniqueId, b.uniqueId])).toEqual(
        new Map([
          [a.uniqueId, new Set(["hiking", "mt hood"])],
          [b.uniqueId, new Set(["mt hood"])],
        ])
      );
      expect(await store.memoriesByTopics(["MT HOOD"])).toEqual(
        new Map([
          [a.uniqueId, new Set(["mt hood"])],
          [b.uniqueId, new Set(["mt hood"])],
        ])
      );

      await store.setTopics(a.uniqueId, []);
      expect((await store.topicsByMemories([a.uniqueId])).has(a.uniqueId)).toBe(false);
    });

    it("drops a deleted memory's topic links", async () => {
      const store = await makeStore();
      const m = await store.create({ content: "Plays chess" });
      await store.addTopics(m.uniqueId, ["Chess"]);

      await store.delete(m.uniqueId);
      expect(await store.memoriesByTopics(["chess"])).toEqual(new Map());
    });

    it("publishes and revokes visibility", async () => {
      const store = await makeStore();
      const m = await store.create({ content: "Loves jazz" });

      const published = await store.setVisibility(m.uniqueId, "public", { twinOptIn: true });
      expect(published).toMatchObject({ visibility: "public", twinOptIn: true });
      expect(published?.publishedAt).not.toBeNull();
      expect((await store.list({ visibility: ["public"] })).map((r) => r.uniqueId)).toEqual([
        m.uniqueId,
      ]);

      const revoked = await store.setVisibility(m.uniqueId, "private");
      expect(revoked).toMatchObject({ visibility: "private", publishedAt: null });
    });

    it("notifies subscribers of creates and in-place edits, and stops after unsubscribe", async () => {
      const store = await makeStore();
      const onChange = vi.fn();
      const unsubscribe = store.subscribe(onChange);

      const m = await store.create({ content: "Drinks coffee" });
      await vi.waitFor(() => expect(onChange).toHaveBeenCalled());

      onChange.mockClear();
      await store.archive(m.uniqueId);
      await vi.waitFor(() => expect(onChange).toHaveBeenCalled());

      unsubscribe();
      onChange.mockClear();
      await store.create({ content: "Drinks tea" });
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(onChange).not.toHaveBeenCalled();
    });

    it("notifies topic subscribers of link changes", async () => {
      const store = await makeStore();
      const m = await store.create({ content: "Reads sci-fi" });
      const onChange = vi.fn();
      const unsubscribe = store.subscribe(onChange, { topics: true });

      await store.addTopics(m.uniqueId, ["Science fiction"]);
      await vi.waitFor(() => expect(onChange).toHaveBeenCalled());
      unsubscribe();
    });

    it("notifies snapshot subscribers after a content edit", async () => {
      const store = await makeStore();
      const m = await store.create({ content: "Drinks coffee", embedding: "[1,0]" });
      const onChange = vi.fn();
      const unsubscribe = store.subscribe(onChange);
      try {
        await store.update(m.uniqueId, { content: "Drinks tea", embedding: "[0,1]" });
        await vi.waitFor(() => expect(onChange).toHaveBeenCalled());
        expect((await store.get(m.uniqueId))?.content).toBe("Drinks tea");
      } finally {
        unsubscribe();
      }
    });

    it("notifies when supersession removes a memory from the default list", async () => {
      const store = await makeStore();
      const old = await store.create({ content: "Lives in Portland" });
      const next = await store.create({ content: "Lives in SF" });
      const onChange = vi.fn();
      const unsubscribe = store.subscribe(onChange);
      try {
        expect(await store.supersede(old.uniqueId, next.uniqueId)).toBe(true);
        await vi.waitFor(() => expect(onChange).toHaveBeenCalled());
        expect((await store.list()).map((m) => m.uniqueId)).toEqual([next.uniqueId]);
      } finally {
        unsubscribe();
      }
    });

    it("retains with auto-merge and recalls the retained fact", async () => {
      const store = await makeStore();

      const first = await store.retain("Dog is named Mochi");
      expect(first.action).toBe("create");
      const again = await store.retain("Dog is named Mochi");
      expect(again).toMatchObject({ action: "merge", targetId: first.memoryId });
      await store.retain("Works at Anuma as an engineer");

      const result = await store.recall("what is my dog named");
      expect(result.memories[0]).toMatchObject({ id: first.memoryId, kind: "fact" });
    });
  });
}
