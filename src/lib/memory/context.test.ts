import { describe, expect, it, vi } from "vitest";
import type { StoredVaultMemory } from "../db/memoryVault/types";
import type { RankedMemory, RecallResult } from "./types";
import { assembleMemoryContext, shouldRecallMemory } from "./context";

const result = (memories: RankedMemory[] = []): RecallResult => ({
  memories,
  candidateCount: memories.length,
  usedBudget: "low",
  reranked: false,
});
const fact = (id: string, content = id): StoredVaultMemory =>
  ({
    uniqueId: id,
    content,
    factType: "identity",
    scope: "private",
    createdAt: new Date(),
    updatedAt: new Date(),
  }) as StoredVaultMemory;
const rankedFact = (id: string): RankedMemory => ({
  id,
  content: id,
  kind: "fact",
  score: 0.8,
  createdAt: new Date(),
  updatedAt: new Date(),
});

describe("shared context assembly", () => {
  it.each(["My allergies?", "我之前提到过对什么食物过敏？", "私の好きな食べ物は？", "Boston?"])(
    "recalls short or unsegmented query %s",
    (query) => expect(shouldRecallMemory(query)).toBe(true)
  );
  it.each(["", "thanks!", "你好", "ok"])("skips trivial query %s", (query) =>
    expect(shouldRecallMemory(query)).toBe(false)
  );
  it("keeps profile and prior-turn context when retrieval fails", async () => {
    const loadFacts = vi.fn(async (opts) =>
      opts.memoryIds
        ? [fact("session")]
        : opts.factTypes.includes("identity")
          ? [fact("profile")]
          : []
    );
    const context = await assembleMemoryContext({
      query: "My allergies?",
      recall: vi.fn().mockRejectedValue(new Error("offline")),
      loadFacts,
      loadSessionRefs: async () => [{ memoryId: "session", score: 0.7 }],
    });
    expect(context.items.map((m) => m.id)).toEqual(["profile", "session"]);
    expect(context.degraded).toEqual(expect.arrayContaining(["fact", "episode"]));
    expect(loadFacts).toHaveBeenCalledWith({ memoryIds: ["session"] });
  });
  it("passes topic membership before ranking and never searches unrestricted episodes", async () => {
    const recall = vi
      .fn()
      .mockResolvedValue(result([rankedFact("allowed"), rankedFact("outside")]));
    const context = await assembleMemoryContext({
      query: "older detail",
      recall,
      memoryIds: ["allowed"],
    });
    expect(recall).toHaveBeenCalledTimes(1);
    expect(recall).toHaveBeenCalledWith(
      "older detail",
      expect.objectContaining({ memoryIds: ["allowed"], types: ["fact"] })
    );
    expect(context.items.map((m) => m.id)).toEqual(["allowed"]);
  });
  it("empty scope stays closed across profile, session and retrieval", async () => {
    const context = await assembleMemoryContext({
      query: "My allergies?",
      memoryIds: [],
      recall: async () => result([rankedFact("outside")]),
      loadFacts: async () => [fact("outside")],
      loadSessionRefs: async () => [{ memoryId: "outside", score: 1 }],
    });
    expect(context.items).toEqual([]);
  });
  it("deduplicates all lanes and obeys a total content budget without cutting facts", async () => {
    const context = await assembleMemoryContext({
      query: "some detail",
      maxChars: 8,
      recall: async () => result([rankedFact("same"), rankedFact("other")]),
      loadFacts: async () => [fact("same")],
    });
    expect(context.items.map((m) => m.id)).toEqual(["same"]);
    expect(context.truncated).toBe(true);
  });
  it("preserves ranked evidence on a deduplicated profile without marking unrelated profile facts", async () => {
    const context = await assembleMemoryContext({
      query: "My allergies?",
      includeEpisodes: false,
      recall: async () => result([{ ...rankedFact("allergy"), score: 0.73 }]),
      loadFacts: async (options) =>
        options?.factTypes?.includes("identity") ? [fact("allergy"), fact("name")] : [],
    });
    expect(context.items).toHaveLength(2);
    expect(context.items.find((item) => item.id === "allergy")).toMatchObject({
      lane: "profile",
      recalled: true,
      score: 0.73,
    });
    expect(context.items.find((item) => item.id === "name")).not.toHaveProperty("recalled");
    expect(context.rankedCount).toBe(1);
  });
  it("preserves the highest recalled score when different IDs share trimmed profile content", async () => {
    const context = await assembleMemoryContext({
      query: "My allergies?",
      includeEpisodes: false,
      recall: async () =>
        result([
          { ...rankedFact("first-duplicate"), content: "Peanut allergy", score: 0.6 },
          { ...rankedFact("duplicate"), content: "  Peanut allergy  ", score: 0.9 },
          { ...rankedFact("another"), content: "Peanut allergy", score: 0.7 },
        ]),
      loadFacts: async (options) =>
        options?.factTypes?.includes("identity")
          ? [fact("profile", "Peanut allergy"), fact("unrelated", "Name is Alice")]
          : [],
    });
    expect(context.items).toHaveLength(2);
    expect(context.items[0]).toMatchObject({
      id: "profile",
      lane: "profile",
      content: "Peanut allergy",
      recalled: true,
      score: 0.9,
    });
    expect(context.items[1]).not.toHaveProperty("recalled");
  });
  it("does not bulk-load unrelated memories after a legitimate empty search", async () => {
    const loadFacts = vi.fn(async () => []);
    const context = await assembleMemoryContext({
      query: "some detail",
      recall: async () => result(),
      loadFacts,
    });
    expect(context.items).toEqual([]);
    expect(loadFacts.mock.calls).toHaveLength(2);
    expect(loadFacts).toHaveBeenCalledWith(
      expect.objectContaining({ factTypes: expect.any(Array), limit: 8 })
    );
  });
  it("honors nested recall membership across all lanes", async () => {
    const recall = vi.fn(async () => result([rankedFact("outside")]));
    const loadFacts = vi.fn(async () => [fact("outside")]);
    const context = await assembleMemoryContext({
      query: "My allergies?",
      recall,
      loadFacts,
      recallOptions: { memoryIds: [] },
      loadSessionRefs: async () => [{ memoryId: "outside", score: 1 }],
    });
    expect(context.items).toEqual([]);
    expect(recall).toHaveBeenCalledTimes(1);
    expect(recall).toHaveBeenCalledWith(
      "My allergies?",
      expect.objectContaining({ memoryIds: [] })
    );
    expect(loadFacts).toHaveBeenCalledWith(expect.objectContaining({ memoryIds: [] }));
  });
  it("threads folder and scope filters to profile/session and disables unrestricted episodes", async () => {
    const recall = vi.fn(async () => result());
    const loadFacts = vi.fn(async (_options: unknown) => []);
    await assembleMemoryContext({
      query: "My allergies?",
      recall,
      loadFacts,
      recallOptions: { scopes: ["private"], folderId: "folder" },
      loadSessionRefs: async () => [{ memoryId: "m1", score: 1 }],
    });
    expect(recall).toHaveBeenCalledTimes(1);
    expect(loadFacts).toHaveBeenCalledTimes(3);
    for (const call of loadFacts.mock.calls) {
      expect(call[0]).toEqual(expect.objectContaining({ scopes: ["private"], folderId: "folder" }));
    }
  });
});
