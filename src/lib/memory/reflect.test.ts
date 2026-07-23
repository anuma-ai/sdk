import { beforeEach, describe, expect, it, vi } from "vitest";

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
  beforeEach(() => {
    vi.clearAllMocks();
  });

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

  const oneMemory = () =>
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

  const sentBody = (fetchFn: typeof fetch) => {
    const call = (fetchFn as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    return JSON.parse((call[1] as { body: string }).body) as Record<string, unknown>;
  };

  it("does NOT send response_format on the default (Anthropic) model and adds a JSON instruction", async () => {
    oneMemory();
    const fetchFn = mockFetch(completionResponse(JSON.stringify({ name: "Peter" })));
    const schema = { type: "object", properties: { name: { type: "string" } } };
    const result = await reflect("q", ctx, { apiKey: "k", fetchFn, responseSchema: schema });

    const body = sentBody(fetchFn);
    expect(body.model).toBe("anthropic/claude-sonnet-4-6");
    expect(body.response_format).toBeUndefined();
    const system = (body.messages as Array<{ role: string; content: string }>)[0];
    expect(system.role).toBe("system");
    expect(system.content).toContain("JSON Schema");
    // The prompt-fallback path still yields parsed structured output.
    expect(result.structuredOutput).toEqual({ name: "Peter" });
  });

  it("sends response_format json_schema for an OpenAI model", async () => {
    oneMemory();
    const fetchFn = mockFetch(completionResponse(JSON.stringify({ ok: true })));
    const schema = { type: "object" };
    await reflect("q", ctx, {
      apiKey: "k",
      fetchFn,
      llmModel: "openai/gpt-4o",
      responseSchema: schema,
    });

    const body = sentBody(fetchFn);
    expect(body.response_format).toEqual({
      type: "json_schema",
      json_schema: { name: "reflect_output", schema },
    });
    // No JSON-instruction appended when the flag is honored natively.
    const system = (body.messages as Array<{ role: string; content: string }>)[0];
    expect(system.content).not.toContain("JSON Schema");
  });

  it("does NOT send response_format to a json_object-only model (deepseek) and falls back to the prompt", async () => {
    oneMemory();
    const fetchFn = mockFetch(completionResponse(JSON.stringify({ ok: true })));
    await reflect("q", ctx, {
      apiKey: "k",
      fetchFn,
      llmModel: "deepseek/deepseek-v4", // accepts json_object but NOT json_schema
      responseSchema: { type: "object" },
    });

    const body = sentBody(fetchFn);
    expect(body.response_format).toBeUndefined();
    const system = (body.messages as Array<{ role: string; content: string }>)[0];
    expect(system.content).toContain("JSON Schema");
  });

  it("does NOT forward reflect's maxTokens into recall()'s budget slot", async () => {
    mockRecall.mockResolvedValueOnce({
      memories: [],
      usedBudget: "low",
      reranked: false,
      candidateCount: 0,
    });
    const fetchFn = vi.fn() as unknown as typeof fetch;
    await reflect("q", ctx, { apiKey: "k", fetchFn, maxTokens: 512, limit: 5 });

    const recallOpts = mockRecall.mock.lastCall![2] as Record<string, unknown>;
    expect("maxTokens" in recallOpts).toBe(false);
    expect(recallOpts.limit).toBe(5); // other RecallOptions still forwarded
  });

  it("parses prose/fence-wrapped JSON from the prompt-fallback path", async () => {
    oneMemory();
    const wrapped = 'Here is the answer:\n```json\n{"name":"Peter"}\n```';
    const fetchFn = mockFetch(completionResponse(wrapped));
    const result = await reflect("q", ctx, {
      apiKey: "k",
      fetchFn,
      responseSchema: { type: "object" },
    });
    expect(result.structuredOutput).toEqual({ name: "Peter" });
  });

  it("forwards `now` and ranking knobs to recall()", async () => {
    mockRecall.mockResolvedValueOnce({
      memories: [],
      usedBudget: "low",
      reranked: false,
      candidateCount: 0,
    });
    const fetchFn = vi.fn() as unknown as typeof fetch;
    await reflect("q", ctx, {
      apiKey: "k",
      fetchFn,
      now: 1_600_000_000_000,
      recencyAlpha: 2,
      rrfK: 42,
      mmr: true,
    });
    expect(mockRecall).toHaveBeenCalledWith(
      "q",
      ctx,
      expect.objectContaining({ now: 1_600_000_000_000, recencyAlpha: 2, rrfK: 42, mmr: true })
    );
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

  it("skips recall when memories override is provided", async () => {
    const fetchFn = mockFetch(completionResponse("Grounded on the provided set."));
    const result = await reflect("q", ctx, {
      apiKey: "k",
      fetchFn,
      memories: [
        {
          id: "reviewed-1",
          kind: "fact",
          content: "Vegetarian.",
          score: 0.95,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    });
    expect(mockRecall).not.toHaveBeenCalled();
    expect(result.basedOn.memoryIds).toEqual(["reviewed-1"]);
    expect(result.text).toBe("Grounded on the provided set.");
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it("returns empty without calling the LLM when memories override is empty", async () => {
    const fetchFn = vi.fn() as unknown as typeof fetch;
    const result = await reflect("q", ctx, { apiKey: "k", fetchFn, memories: [] });
    expect(mockRecall).not.toHaveBeenCalled();
    expect(fetchFn).not.toHaveBeenCalled();
    expect(result.basedOn.memoryIds).toEqual([]);
    expect(result.text).toBe("");
  });
});
