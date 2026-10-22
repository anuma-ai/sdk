import { describe, expect, it, vi } from "vitest";

import { primaryTopic, topicWeight } from "../../db/entities/types";
import { generateEmbedding, generateEmbeddings } from "../../memoryEngine/embeddings";
import type { EmbeddingOptions } from "../../memoryEngine/types";
import type { MemoryStore } from "./types";

interface MemoryStoreContractFixtures {
  vectors: readonly [string, string];
}

export function fakeTopicLlm(
  entitiesFor: Record<string, { name: string; kind?: string; salience?: string }[]>
) {
  return vi.fn((_url: unknown, init?: RequestInit) => {
    const body = JSON.parse(init?.body as string) as {
      messages?: { role: string; content: string }[];
      input?: { role: string; content: string }[];
    };
    const user = (body.messages ?? body.input ?? []).find((m) => m.role === "user")?.content ?? "";
    const listing = user.split("Memories:\n")[1]?.split("\n\n")[0] ?? "";
    const memories = listing.split("\n").map((line) => {
      const [id, ...text] = line.split(": ");
      return { id, entities: entitiesFor[text.join(": ")] ?? [] };
    });
    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({ choices: [{ message: { content: JSON.stringify({ memories }) } }] }),
    });
  }) as unknown as typeof fetch;
}

export function runMemoryStoreContract(
  makeStore: (
    embeddingOptions?: Pick<EmbeddingOptions, "maskInput">
  ) => MemoryStore | Promise<MemoryStore>,
  fixtures: MemoryStoreContractFixtures = { vectors: ["[1,0]", "[0,1]"] }
): void {
  const [vectorA, vectorB] = fixtures.vectors;
  describe("MemoryStore contract", () => {
    it("counts list membership after archive, restore, supersession and deletion", async () => {
      const store = await makeStore();
      const [a, b, c] = await store.createMany([
        { content: "a" },
        { content: "b" },
        { content: "c" },
      ]);
      expect(await store.counts!()).toEqual({ live: 3, archived: 0, quarantined: 0 });
      await store.archive(a.uniqueId);
      expect(await store.counts!()).toEqual({ live: 2, archived: 1, quarantined: 0 });
      await store.restore(a.uniqueId);
      await store.supersede(b.uniqueId, c.uniqueId);
      await store.delete(a.uniqueId);
      expect(await store.counts!()).toEqual({ live: 1, archived: 0, quarantined: 0 });
    });

    it("creates, reads, updates and deletes", async () => {
      const store = await makeStore();
      const created = await store.create({ content: "Likes green tea", embedding: vectorA });

      expect(created.content).toBe("Likes green tea");
      expect(await store.get(created.uniqueId)).toMatchObject({ content: "Likes green tea" });
      expect((await store.list()).map((m) => [m.uniqueId, m.embedding])).toEqual([
        [created.uniqueId, vectorA],
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
      const m = await store.create({ content: "Likes green tea", embedding: vectorA });

      const edited = await store.update(m.uniqueId, { content: "Likes oolong tea" });
      expect(edited?.embedding).not.toBe(vectorA);
      expect((await store.get(m.uniqueId))?.embedding).not.toBe(vectorA);
      expect((await store.list()).map((r) => r.embedding)).not.toContain(vectorA);

      const reembedded = await store.update(m.uniqueId, {
        content: "Likes black tea",
        embedding: vectorB,
        embeddingModel: "test-model",
      });
      expect(reembedded).toMatchObject({ embedding: vectorB, embeddingModel: "test-model" });
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

    it("decays an archived memory past its window and keeps a manual one", async () => {
      const store = await makeStore();
      const old = await store.create({ content: "Planned a trip to Porto" });
      const kept = await store.create({ content: "Likes green tea" });
      expect(await store.archive(old.uniqueId)).toBe(true);

      const result = await store
        .decay!.createDecaySweeper({ now: Date.now() + 31 * 24 * 60 * 60 * 1000 })
        .runSweep();

      expect(result).toMatchObject({ archived: 0, deleted: 1, scanned: 2 });
      expect(await store.get(old.uniqueId)).toBeNull();
      expect(await store.get(kept.uniqueId)).toMatchObject({ content: "Likes green tea" });
      expect(await store.listArchived()).toEqual([]);
    });

    it("decays by rule only", async () => {
      const store = await makeStore();
      expect(() =>
        store.decay!.createDecaySweeper({
          classifier: { classify: () => "keep" },
        } as Parameters<NonNullable<MemoryStore["decay"]>["createDecaySweeper"]>[0])
      ).toThrow(/rule only/);
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
      expect(await store.update(old.uniqueId, { content: "Lives in Austin" })).toBeNull();
      const [retired] = await store.list({ includeSuperseded: true, memoryIds: [old.uniqueId] });
      expect(retired.content).toBe("Lives in Portland");
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

    it("lists topics with their kind and linked-memory count", async () => {
      const store = await makeStore();
      const a = await store.create({ content: "Hiked Mt Hood" });
      const b = await store.create({ content: "Camped at Mt Hood" });
      await store.setTopics(a.uniqueId, ["Hiking", { name: "Mt Hood", kind: "place" }]);
      await store.addTopics(b.uniqueId, ["Mt Hood"]);
      const linked = async () => (await store.listTopics()).filter((t) => t.memoryCount > 0);

      expect(await linked()).toEqual([
        { name: "hiking", kind: null, memoryCount: 1 },
        { name: "mt hood", kind: "place", memoryCount: 2 },
      ]);
      await store.delete(b.uniqueId);
      expect(await linked()).toEqual([
        { name: "hiking", kind: null, memoryCount: 1 },
        { name: "mt hood", kind: "place", memoryCount: 1 },
      ]);
    });

    it("keeps a topic's kind after the memory that set it is deleted", async () => {
      const store = await makeStore();
      const a = await store.create({ content: "Hiked Mt Hood" });
      const b = await store.create({ content: "Camped at Mt Hood" });
      await store.setTopics(a.uniqueId, [{ name: "Mt Hood", kind: "place" }]);
      await store.addTopics(b.uniqueId, ["Mt Hood"]);
      await store.delete(a.uniqueId);

      expect((await store.listTopics()).filter((t) => t.memoryCount > 0)).toEqual([
        { name: "mt hood", kind: "place", memoryCount: 1 },
      ]);
    });

    it("lists content-free projections in list order", async () => {
      const store = await makeStore();
      const first = await store.create({ content: "Older", embedding: vectorA });
      await new Promise((resolve) => setTimeout(resolve, 2));
      const second = await store.create({ content: "Newer", embedding: vectorB });
      await store.setTopics(first.uniqueId, ["Tea"]);

      const projections = await store.listProjections();
      expect(projections.map((p) => p.uniqueId)).toEqual(
        (await store.list()).map((m) => m.uniqueId)
      );
      const byId = new Map(projections.map((p) => [p.uniqueId, p]));
      expect(byId.get(first.uniqueId)?.topicsUserManaged).toBe(true);
      expect(byId.get(second.uniqueId)?.topicsUserManaged).toBe(false);
      expect(byId.get(second.uniqueId)?.embedding).not.toBeNull();
      expect(projections.every((p) => !("content" in p))).toBe(true);
      expect(await store.listProjections({ memoryIds: [second.uniqueId] })).toHaveLength(1);
    });

    it("creates and edits profile memories with kind and level", async () => {
      const store = await makeStore();
      const profile = await store.create({
        content: "Works as a nurse",
        kind: "occupation",
        kindValue: '"nurse"',
        level: "profile",
      });
      expect(profile).toMatchObject({ kind: "occupation", kindValue: '"nurse"', level: "profile" });
      expect(profile.scope).toBe("shared");
      await expect(store.create({ content: "No kind", level: "profile" })).rejects.toThrow();

      await expect(
        store.update(profile.uniqueId, { content: "Works", kind: null })
      ).rejects.toThrow();
      const lowered = await store.update(profile.uniqueId, {
        content: "Works as a nurse",
        level: "private",
      });
      expect(lowered).toMatchObject({ kind: "occupation", level: "private", scope: "private" });
      const freeForm = await store.update(profile.uniqueId, {
        content: "Used to be a nurse",
        kind: null,
        kindValue: null,
      });
      expect(freeForm).toMatchObject({ kind: null, kindValue: null });
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
      expect(published).toMatchObject({
        visibility: "public",
        scope: "shared",
        level: "matching",
        twinOptIn: true,
        updatedAt: m.updatedAt,
      });
      expect(published?.publishedAt).not.toBeNull();
      expect((await store.list({ scopes: ["shared", "public"] })).map((r) => r.uniqueId)).toEqual([
        m.uniqueId,
      ]);
      expect((await store.list({ visibility: ["public"] })).map((r) => r.uniqueId)).toEqual([
        m.uniqueId,
      ]);

      const revoked = await store.setVisibility(m.uniqueId, "private");
      expect(revoked).toMatchObject({
        visibility: "private",
        scope: "private",
        level: "private",
        publishedAt: null,
        twinOptIn: true,
        updatedAt: m.updatedAt,
      });
      expect(await store.list({ scopes: ["shared", "public"] })).toEqual([]);
      expect(await store.list({ visibility: ["public"] })).toEqual([]);
    });

    it.each(["matching", "profile"] as const)(
      "revokes a %s memory from publication queries",
      async (level) => {
        const store = await makeStore();
        const m = await store.create({
          content: "Loves jazz",
          kind: "bio",
          kindValue: '"Loves jazz"',
          level,
          embedding: vectorA,
        });
        const published = await store.setVisibility(m.uniqueId, "public", { twinOptIn: true });
        expect(published).toMatchObject({ scope: "shared", level, visibility: "public" });
        const repeated = await store.setVisibility(m.uniqueId, "public");
        expect(repeated).toMatchObject({ level, publishedAt: published?.publishedAt });
        expect(await store.list({ scopes: ["shared", "public"] })).toHaveLength(1);

        const revoked = await store.setVisibility(m.uniqueId, "private", { twinOptIn: false });
        const expected = {
          scope: "private",
          level: "private",
          visibility: "private",
          publishedAt: null,
          twinOptIn: false,
          updatedAt: m.updatedAt,
        };
        expect(revoked).toMatchObject(expected);
        expect(await store.get(m.uniqueId)).toMatchObject(expected);
        expect(await store.list({ scopes: ["shared", "public"] })).toEqual([]);
        expect(await store.list({ visibility: ["public"] })).toEqual([]);
      }
    );

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
      const m = await store.create({ content: "Drinks coffee", embedding: vectorA });
      const onChange = vi.fn();
      const unsubscribe = store.subscribe(onChange);
      try {
        await store.update(m.uniqueId, { content: "Drinks tea", embedding: vectorB });
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
      const facts = await store.factSource.search("what is my dog named", { limit: 3 });
      expect(facts.results[0]?.uniqueId).toBe(first.memoryId);
    });

    it("extracts topics for the backlog and stamps what it answered", async () => {
      const store = await makeStore();
      const hike = await store.create({ content: "Hikes Mt Hood", embedding: vectorA });
      const tea = await store.create({ content: "Drinks tea", embedding: vectorB });
      const curated = await store.create({ content: "Plays chess", embedding: vectorA });
      await store.setTopics(curated.uniqueId, ["Chess"]);
      const jobs = store.topicMaintenance;
      const backlog = async () =>
        (await jobs.getTopicBacklog()).pending.map((p) => p.uniqueId).sort();

      expect(await backlog()).toEqual([hike.uniqueId, tea.uniqueId].sort());

      const result = await jobs.extractTopics([hike.uniqueId, tea.uniqueId, curated.uniqueId], {
        apiKey: "k",
        fetchFn: fakeTopicLlm({ "Hikes Mt Hood": [{ name: "Mt Hood", kind: "place" }] }),
      });
      expect([...result.stampedIds].sort()).toEqual([hike.uniqueId, tea.uniqueId].sort());
      expect(result.skippedReasons.get(curated.uniqueId)).toBe("excluded");
      expect(await store.topicsByMemories([hike.uniqueId, tea.uniqueId])).toEqual(
        new Map([[hike.uniqueId, new Set(["mt hood"])]])
      );
      expect(await backlog()).toEqual([]);

      await new Promise((resolve) => setTimeout(resolve, 5));
      await store.update(hike.uniqueId, { content: "Hikes Mt Rainier", embedding: vectorA });
      expect(await backlog()).toEqual([hike.uniqueId]);

      await jobs.extractTopics([hike.uniqueId], {
        apiKey: "k",
        fetchFn: fakeTopicLlm({ "Hikes Mt Rainier": [{ name: "Mt Rainier", kind: "place" }] }),
      });
      expect(await store.topicsByMemories([hike.uniqueId])).toEqual(
        new Map([[hike.uniqueId, new Set(["mt rainier"])]])
      );
      expect(await backlog()).toEqual([]);
    });

    it("weights extracted topics by salience and keeps the highest weight on add", async () => {
      const store = await makeStore();
      const run = await store.create({ content: "Ran the Chicago Marathon with Ana" });
      const jobs = store.topicMaintenance;
      const weights = async () =>
        Object.fromEntries(
          ((await store.get(run.uniqueId))?.topics ?? []).map((t) => [t.name, topicWeight(t)])
        );

      await jobs.extractTopics([run.uniqueId], {
        apiKey: "k",
        fetchFn: fakeTopicLlm({
          "Ran the Chicago Marathon with Ana": [
            { name: "Ana", kind: "person", salience: "secondary" },
            { name: "Chicago Marathon", kind: "event", salience: "primary" },
          ],
        }),
      });
      expect(await weights()).toEqual({ Ana: 0.6, "Chicago Marathon": 1 });
      expect(primaryTopic((await store.get(run.uniqueId))?.topics)?.name).toBe("Chicago Marathon");

      await store.addTopics(run.uniqueId, [
        { name: "Chicago Marathon", weight: 0.3 },
        "Ana",
        { name: "Nike", weight: 0.3 },
      ]);
      expect(await weights()).toEqual({ Ana: 0.6, "Chicago Marathon": 1, Nike: 0.3 });
      await store.addTopics(run.uniqueId, [{ name: "Ana", weight: 1 }]);
      expect(await weights()).toEqual({ Ana: 1, "Chicago Marathon": 1, Nike: 0.3 });

      await new Promise((resolve) => setTimeout(resolve, 5));
      await store.update(run.uniqueId, { content: "Ana ran the Chicago Marathon" });
      await jobs.extractTopics([run.uniqueId], {
        apiKey: "k",
        fetchFn: fakeTopicLlm({
          "Ana ran the Chicago Marathon": [
            { name: "Ana", kind: "person", salience: "primary" },
            { name: "Chicago Marathon", kind: "event", salience: "mention" },
          ],
        }),
      });
      expect(await weights()).toEqual({ Ana: 1, "Chicago Marathon": 0.3 });

      await store.setTopics(run.uniqueId, [{ name: "Chicago Marathon", weight: 0.3 }]);
      expect((await store.get(run.uniqueId))?.topics?.map((t) => t.weight)).toEqual([undefined]);
    });

    it("leaves a memory pending when the model does not answer for it", async () => {
      const store = await makeStore();
      const m = await store.create({ content: "Hikes Mt Hood", embedding: vectorA });
      const fetchFn = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ choices: [{ message: { content: '{"memories":[]}' } }] }),
        })
      ) as unknown as typeof fetch;

      const result = await store.topicMaintenance.extractTopics([m.uniqueId], {
        apiKey: "k",
        fetchFn,
      });
      expect(result.stampedIds).toEqual([]);
      expect(result.skippedReasons.get(m.uniqueId)).toBe("llm-unanswered");
      expect(
        (await store.topicMaintenance.getTopicBacklog()).pending.map((p) => p.uniqueId)
      ).toEqual([m.uniqueId]);
    });

    it("stamps without an LLM call and skips curated memories", async () => {
      const store = await makeStore();
      const m = await store.create({ content: "Drinks tea", embedding: vectorA });
      await store.addTopics(m.uniqueId, ["Tea"]);
      const curated = await store.create({ content: "Plays chess", embedding: vectorB });
      await store.setTopics(curated.uniqueId, ["Chess"]);
      const unstamped = async () => {
        const backlog = await store.topicMaintenance.getTopicBacklog();
        return [...backlog.pending.map((p) => p.uniqueId), ...backlog.linkedUnstamped];
      };
      expect(await unstamped()).toEqual([m.uniqueId]);

      expect(
        await store.topicMaintenance.stampTopicsExtracted(
          [m.uniqueId, curated.uniqueId],
          Date.now()
        )
      ).toEqual([m.uniqueId]);
      expect(await unstamped()).toEqual([]);
    });

    it("embeds through the store's maskInput on every write and search", async () => {
      expect((await makeStore()).masksEmbeddingInput).toBe(false);
      const maskInput = (text: string) => text.replace(/\S+@\S+/g, "[EMAIL]");
      const store = await makeStore({ maskInput });
      expect(store.masksEmbeddingInput).toBe(true);
      const single = vi.mocked(generateEmbedding);
      const batch = vi.mocked(generateEmbeddings);
      single.mockClear();
      batch.mockClear();

      await store.retain("My backup is cat@example.com");
      await store.factSource.search("what is cat@example.com", { limit: 3 });
      const created = await store.create({ content: "Email me at ann@example.com" });
      await store.createMany([{ content: "Work mail bob@example.com" }]);
      await store.update(created.uniqueId, { content: "Email me at ann@work.example" });
      await vi.waitFor(() =>
        expect(single.mock.calls.length + batch.mock.calls.length).toBeGreaterThanOrEqual(5)
      );

      const options = [...single.mock.calls, ...batch.mock.calls].map(([, opts]) => opts);
      expect(options.every((opts) => opts?.maskInput === maskInput)).toBe(true);
    });
  });
}
