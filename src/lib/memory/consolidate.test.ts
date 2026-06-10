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
    expect(result).toEqual({
      action: "create",
      content: "new fact",
      fallbackReason: "invalid_response",
    });
  });

  it("falls back to create when no candidates — a short-circuit, not a degraded fallback", async () => {
    const fetchFn = vi.fn() as unknown as typeof fetch;
    const onFallback = vi.fn();
    const result = await consolidateMemory("new fact", [], { apiKey: "k", fetchFn, onFallback });
    expect(result).toEqual({ action: "create", content: "new fact" });
    expect(fetchFn).not.toHaveBeenCalled();
    expect(onFallback).not.toHaveBeenCalled();
  });

  it("falls back to create on empty content — a short-circuit, not a degraded fallback", async () => {
    const fetchFn = vi.fn() as unknown as typeof fetch;
    const onFallback = vi.fn();
    const result = await consolidateMemory("   ", candidates, { apiKey: "k", fetchFn, onFallback });
    expect(result).toEqual({ action: "create", content: "   " });
    expect(fetchFn).not.toHaveBeenCalled();
    expect(onFallback).not.toHaveBeenCalled();
  });

  it("falls back on network error", async () => {
    const fetchFn = vi.fn().mockRejectedValue(new Error("boom")) as unknown as typeof fetch;
    const result = await consolidateMemory("new fact", candidates, { apiKey: "k", fetchFn });
    expect(result).toEqual({ action: "create", content: "new fact", fallbackReason: "llm_error" });
  });

  it("falls back on non-OK response", async () => {
    const result = await consolidateMemory("new fact", candidates, {
      apiKey: "k",
      fetchFn: mockFetch({}, false),
    });
    expect(result).toEqual({ action: "create", content: "new fact", fallbackReason: "llm_error" });
  });

  it("falls back on malformed JSON", async () => {
    const fetchFn = mockFetch({
      choices: [{ message: { content: "{not json" } }],
    });
    const result = await consolidateMemory("new fact", candidates, { apiKey: "k", fetchFn });
    expect(result).toEqual({ action: "create", content: "new fact", fallbackReason: "llm_error" });
  });

  it("falls back on invalid action enum", async () => {
    const fetchFn = mockFetch(choices({ action: "delete", targetId: "m1" }));
    const result = await consolidateMemory("new fact", candidates, { apiKey: "k", fetchFn });
    expect(result).toEqual({
      action: "create",
      content: "new fact",
      fallbackReason: "invalid_response",
    });
  });

  it("falls back on update without content", async () => {
    const fetchFn = mockFetch(choices({ action: "update", targetId: "m1" }));
    const result = await consolidateMemory("new fact", candidates, { apiKey: "k", fetchFn });
    expect(result).toEqual({
      action: "create",
      content: "new fact",
      fallbackReason: "invalid_response",
    });
  });

  it("notifies onFallback with llm_error on LLM failure", async () => {
    const fetchFn = vi.fn().mockRejectedValue(new Error("boom")) as unknown as typeof fetch;
    const onFallback = vi.fn();
    await consolidateMemory("new fact", candidates, { apiKey: "k", fetchFn, onFallback });
    expect(onFallback).toHaveBeenCalledTimes(1);
    expect(onFallback).toHaveBeenCalledWith("llm_error");
  });

  it("notifies onFallback with invalid_response on schema violation", async () => {
    const fetchFn = mockFetch(choices({ action: "delete" }));
    const onFallback = vi.fn();
    await consolidateMemory("new fact", candidates, { apiKey: "k", fetchFn, onFallback });
    expect(onFallback).toHaveBeenCalledTimes(1);
    expect(onFallback).toHaveBeenCalledWith("invalid_response");
  });

  it("does not notify onFallback for a real LLM decision", async () => {
    const fetchFn = mockFetch(choices({ action: "noop", targetId: "m1" }));
    const onFallback = vi.fn();
    const result = await consolidateMemory("dup fact", candidates, {
      apiKey: "k",
      fetchFn,
      onFallback,
    });
    expect(result).toEqual({ action: "noop", targetId: "m1" });
    expect(onFallback).not.toHaveBeenCalled();
  });

  it("uses LLM-empty content fallback for create", async () => {
    const fetchFn = mockFetch(choices({ action: "create", content: "" }));
    const result = await consolidateMemory("new fact", candidates, { apiKey: "k", fetchFn });
    expect(result).toEqual({ action: "create", content: "new fact" });
  });
});
