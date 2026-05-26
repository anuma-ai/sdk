import { describe, expect, it, vi } from "vitest";

import { reflect } from "./reflect.js";
import type { RecallContext } from "./types.js";

vi.mock("./recall.js", () => ({
  recall: vi.fn(),
}));

import { recall } from "./recall.js";

const mockRecall = vi.mocked(recall);

const ctx: RecallContext = {
  embeddingOptions: { apiKey: "k" },
};

function mockFetch(body: unknown, ok = true): typeof fetch {
  return vi.fn().mockResolvedValue({
    ok,
    json: async () => body,
  }) as unknown as typeof fetch;
}

const completionResponse = (
  text: string,
  usage = { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 }
) => ({
  choices: [{ message: { content: text } }],
  usage,
});

describe("reflect", () => {
  it("returns empty result for blank query", async () => {
    const fetchFn = vi.fn() as unknown as typeof fetch;
    const result = await reflect("   ", ctx, { apiKey: "k", fetchFn });
    expect(result.text).toBe("");
    expect(result.basedOn.memoryIds).toEqual([]);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("returns empty answer when recall finds nothing (avoids hallucination)", async () => {
    mockRecall.mockResolvedValueOnce({
      memories: [],
      usedBudget: "low",
      reranked: false,
      candidateCount: 0,
    });
    const fetchFn = vi.fn() as unknown as typeof fetch;
    const result = await reflect("anything", ctx, { apiKey: "k", fetchFn });
    expect(result.text).toBe("");
    expect(result.basedOn.memoryIds).toEqual([]);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("calls the LLM with retrieved memories and returns the synthesized text", async () => {
    mockRecall.mockResolvedValueOnce({
      memories: [
        {
          id: "m1",
          kind: "fact",
          content: "User has a dog named Mochi.",
          score: 0.9,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "m2",
          kind: "fact",
          content: "Mochi is a 3-year-old corgi.",
          score: 0.85,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      usedBudget: "low",
      reranked: false,
      candidateCount: 2,
    });
    const fetchFn = mockFetch(completionResponse("Your dog is Mochi, a 3-year-old corgi."));
    const result = await reflect("What's my dog's name?", ctx, { apiKey: "k", fetchFn });
    expect(result.text).toBe("Your dog is Mochi, a 3-year-old corgi.");
    expect(result.basedOn.memoryIds).toEqual(["m1", "m2"]);
    expect(result.usage).toEqual({ promptTokens: 100, completionTokens: 50, totalTokens: 150 });
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it("forwards budget + decompose options to recall()", async () => {
    mockRecall.mockResolvedValueOnce({
      memories: [],
      usedBudget: "high",
      reranked: true,
      candidateCount: 0,
    });
    const fetchFn = vi.fn() as unknown as typeof fetch;
    await reflect("q", ctx, {
      apiKey: "k",
      fetchFn,
      budget: "high",
      decomposeOptions: { apiKey: "k", baseUrl: "https://example.test" },
    });
    expect(mockRecall).toHaveBeenCalledWith(
      "q",
      ctx,
      expect.objectContaining({
        budget: "high",
        decomposeOptions: { apiKey: "k", baseUrl: "https://example.test" },
      })
    );
  });

  it("returns recalled memory ids even when LLM call fails (network error)", async () => {
    mockRecall.mockResolvedValueOnce({
      memories: [
        {
          id: "m1",
          kind: "fact",
          content: "Some fact.",
          score: 0.9,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      usedBudget: "low",
      reranked: false,
      candidateCount: 1,
    });
    const fetchFn = vi.fn().mockRejectedValue(new Error("boom")) as unknown as typeof fetch;
    const result = await reflect("q", ctx, { apiKey: "k", fetchFn });
    expect(result.text).toBe("");
    expect(result.basedOn.memoryIds).toEqual(["m1"]);
  });

  it("returns recalled memory ids when LLM returns non-OK", async () => {
    mockRecall.mockResolvedValueOnce({
      memories: [
        {
          id: "m1",
          kind: "fact",
          content: "Fact.",
          score: 0.9,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      usedBudget: "low",
      reranked: false,
      candidateCount: 1,
    });
    const fetchFn = mockFetch({}, false);
    const result = await reflect("q", ctx, { apiKey: "k", fetchFn });
    expect(result.text).toBe("");
    expect(result.basedOn.memoryIds).toEqual(["m1"]);
  });

  it("parses structured output when responseSchema is provided", async () => {
    mockRecall.mockResolvedValueOnce({
      memories: [
        {
          id: "m1",
          kind: "fact",
          content: "User name is Peter.",
          score: 0.9,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      usedBudget: "low",
      reranked: false,
      candidateCount: 1,
    });
    const json = JSON.stringify({ name: "Peter" });
    const fetchFn = mockFetch(completionResponse(json));
    const result = await reflect("What's my name?", ctx, {
      apiKey: "k",
      fetchFn,
      responseSchema: { type: "object", properties: { name: { type: "string" } } },
    });
    expect(result.structuredOutput).toEqual({ name: "Peter" });
  });

  it("leaves structuredOutput undefined when JSON is malformed even with schema", async () => {
    mockRecall.mockResolvedValueOnce({
      memories: [
        {
          id: "m1",
          kind: "fact",
          content: "Fact.",
          score: 0.9,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      usedBudget: "low",
      reranked: false,
      candidateCount: 1,
    });
    const fetchFn = mockFetch(completionResponse("not json"));
    const result = await reflect("q", ctx, {
      apiKey: "k",
      fetchFn,
      responseSchema: { type: "object" },
    });
    expect(result.structuredOutput).toBeUndefined();
    expect(result.text).toBe("not json");
  });
});
