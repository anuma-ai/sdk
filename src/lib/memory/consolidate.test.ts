import { describe, expect, it, vi } from "vitest";

import { consolidateMemory } from "./consolidate";

function mockFetch(body: unknown, ok = true): typeof fetch {
  return vi.fn().mockResolvedValue({
    ok,
    json: async () => body,
  }) as unknown as typeof fetch;
}

const choices = (jsonContent: unknown) => ({
  choices: [{ message: { content: JSON.stringify(jsonContent) } }],
});

describe("consolidateMemory", () => {
  const candidates = [
    { id: "m1", content: "User has a dog named Mochi.", similarity: 0.78 },
    { id: "m2", content: "User exchanged boots at Zara on 2026-02-05.", similarity: 0.72 },
  ];

  it("returns create when LLM says create", async () => {
    const fetchFn = mockFetch(
      choices({ action: "create", content: "User likes raspberry sorbet." })
    );
    const result = await consolidateMemory("User likes raspberry sorbet.", candidates, {
      apiKey: "k",
      fetchFn,
    });
    expect(result).toEqual({ action: "create", content: "User likes raspberry sorbet." });
  });

  it("returns update with consolidated content when LLM says update", async () => {
    const fetchFn = mockFetch(
      choices({
        action: "update",
        targetId: "m2",
        content: "User exchanged boots at Zara on 2026-02-05 and is awaiting the replacement pair.",
      })
    );
    const result = await consolidateMemory(
      "User has a pair of boots at Zara that they swapped earlier.",
      candidates,
      { apiKey: "k", fetchFn }
    );
    expect(result.action).toBe("update");
    expect(result.targetId).toBe("m2");
    expect(result.content).toContain("Zara");
  });

  it("returns noop with targetId when LLM says noop", async () => {
    const fetchFn = mockFetch(choices({ action: "noop", targetId: "m1" }));
    const result = await consolidateMemory("User has a dog Mochi.", candidates, {
      apiKey: "k",
      fetchFn,
    });
    expect(result).toEqual({ action: "noop", targetId: "m1" });
  });

  it("falls back to create when targetId references a memory not in candidates", async () => {
    const fetchFn = mockFetch(choices({ action: "update", targetId: "m99", content: "x" }));
    const result = await consolidateMemory("new fact", candidates, { apiKey: "k", fetchFn });
    expect(result).toEqual({ action: "create", content: "new fact" });
  });

  it("falls back to create when no candidates", async () => {
    const fetchFn = vi.fn() as unknown as typeof fetch;
    const result = await consolidateMemory("new fact", [], { apiKey: "k", fetchFn });
    expect(result).toEqual({ action: "create", content: "new fact" });
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("falls back on network error", async () => {
    const fetchFn = vi.fn().mockRejectedValue(new Error("boom")) as unknown as typeof fetch;
    const result = await consolidateMemory("new fact", candidates, { apiKey: "k", fetchFn });
    expect(result).toEqual({ action: "create", content: "new fact" });
  });

  it("falls back on non-OK response", async () => {
    const result = await consolidateMemory("new fact", candidates, {
      apiKey: "k",
      fetchFn: mockFetch({}, false),
    });
    expect(result).toEqual({ action: "create", content: "new fact" });
  });

  it("falls back on malformed JSON", async () => {
    const fetchFn = mockFetch({
      choices: [{ message: { content: "{not json" } }],
    });
    const result = await consolidateMemory("new fact", candidates, { apiKey: "k", fetchFn });
    expect(result).toEqual({ action: "create", content: "new fact" });
  });

  it("falls back on invalid action enum", async () => {
    const fetchFn = mockFetch(choices({ action: "delete", targetId: "m1" }));
    const result = await consolidateMemory("new fact", candidates, { apiKey: "k", fetchFn });
    expect(result).toEqual({ action: "create", content: "new fact" });
  });

  it("falls back on update without content", async () => {
    const fetchFn = mockFetch(choices({ action: "update", targetId: "m1" }));
    const result = await consolidateMemory("new fact", candidates, { apiKey: "k", fetchFn });
    expect(result).toEqual({ action: "create", content: "new fact" });
  });

  it("uses LLM-empty content fallback for create", async () => {
    const fetchFn = mockFetch(choices({ action: "create", content: "" }));
    const result = await consolidateMemory("new fact", candidates, { apiKey: "k", fetchFn });
    expect(result).toEqual({ action: "create", content: "new fact" });
  });
});
