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

function mockFetch(body: unknown, ok = true, status = ok ? 200 : 500): typeof fetch {
  return vi.fn().mockResolvedValue({
    ok,
    status,
    statusText: "",
    json: async () => body,
  }) as unknown as typeof fetch;
}

/**
 * Scripts one response per attempt. A call BEYOND the script gets a distinct
 * sentinel status rather than a replay of the last entry, so an over-eager
 * retry shows up as a wrong call count instead of silently passing.
 */
function mockFetchSequence(
  steps: Array<{ body?: unknown; ok?: boolean; status?: number }>
): typeof fetch {
  const fn = vi.fn();
  for (const step of steps) {
    const ok = step.ok ?? true;
    fn.mockResolvedValueOnce({
      ok,
      status: step.status ?? (ok ? 200 : 400),
      statusText: "",
      json: async () => step.body ?? {},
    });
  }
  fn.mockResolvedValue({
    ok: false,
    status: 599,
    statusText: "unscripted",
    json: async () => ({}),
  });
  return fn as unknown as typeof fetch;
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

  // reflect answers the USER's own question here, which is chat, not an internal
  // flow. `taskType` is optional for exactly that reason — a name declared
  // unconditionally would tag real conversation as a Class-B internal task and
  // hand the portal a fixed prompt for it. Only a background caller with one
  // fixed purpose (profile-facet synthesis) passes one, so the default must send
  // no header at all.
  it("declares no task type by default, so user-facing answers stay unlabelled", async () => {
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
      ],
      usedBudget: "low",
      reranked: false,
      candidateCount: 1,
    });
    const fetchFn = mockFetch(completionResponse("Mochi."));
    await reflect("What's my dog's name?", ctx, { apiKey: "k", fetchFn });
    const headers = (fetchFn as unknown as ReturnType<typeof vi.fn>).mock.calls[0][1]
      .headers as Record<string, string>;
    expect(headers).not.toHaveProperty("X-Anuma-Task-Type");
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
    const fetchFn = mockFetch({}, false, 400);
    const result = await reflect("q", ctx, { apiKey: "k", fetchFn });
    expect(result.text).toBe("");
    expect(result.basedOn.memoryIds).toEqual(["m1"]);
    // The default (Anthropic) model never sends response_format, so there is
    // nothing to fall back FROM — this pins the retry to `sendResponseFormat`.
    expect(fetchFn).toHaveBeenCalledTimes(1);
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

  const sentBody = (fetchFn: typeof fetch, index = 0) => {
    const calls = (fetchFn as unknown as ReturnType<typeof vi.fn>).mock.calls;
    expect(calls.length, `expected at least ${index + 1} fetch call(s)`).toBeGreaterThan(index);
    return JSON.parse((calls[index][1] as { body: string }).body) as Record<string, unknown>;
  };

  const systemOf = (body: Record<string, unknown>) =>
    (body.messages as Array<{ content: string }>)[0].content;

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

  describe("responses transport", () => {
    const SCHEMA = { type: "object", properties: { name: { type: "string" } } };
    const urlOf = (fetchFn: typeof fetch, index = 0) =>
      (fetchFn as unknown as ReturnType<typeof vi.fn>).mock.calls[index][0] as string;

    it("posts a Responses-API body to /api/v1/responses for a gpt-5.6 model", async () => {
      oneMemory();
      const fetchFn = mockFetchSequence([{ body: { output_text: '{"name":"Peter"}' } }]);

      const result = await reflect("q", ctx, {
        apiKey: "k",
        fetchFn,
        llmModel: "openai/gpt-5.6-luna",
        responseSchema: SCHEMA,
      });

      expect(fetchFn).toHaveBeenCalledTimes(1);
      expect(urlOf(fetchFn)).toContain("/api/v1/responses");
      const body = sentBody(fetchFn, 0);
      // Responses spelling only — the chat names are silently ignored there.
      expect(body.input).toBeDefined();
      expect(body.messages).toBeUndefined();
      expect(body.max_completion_tokens).toBeUndefined();
      expect(body.max_output_tokens).toBeDefined();
      // The Responses API spells structured output differently, so the schema
      // must ride in the prompt instead.
      expect(body.response_format).toBeUndefined();
      expect((body.input as Array<{ content: string }>)[0].content).toContain("JSON Schema");
      expect(result.structuredOutput).toEqual({ name: "Peter" });
    });

    it("floors the output cap so reasoning tokens cannot eat the whole budget", async () => {
      oneMemory();
      const fetchFn = mockFetchSequence([{ body: { output_text: "{}" } }]);

      await reflect("q", ctx, {
        apiKey: "k",
        fetchFn,
        llmModel: "openai/gpt-5.6-luna",
        maxTokens: 512,
        responseSchema: SCHEMA,
      });

      expect(sentBody(fetchFn, 0).max_output_tokens).toBe(2048);
    });

    it("keeps a caller cap that already clears the floor", async () => {
      oneMemory();
      const fetchFn = mockFetchSequence([{ body: { output_text: "{}" } }]);

      await reflect("q", ctx, {
        apiKey: "k",
        fetchFn,
        llmModel: "openai/gpt-5.6-luna",
        maxTokens: 8192,
      });

      expect(sentBody(fetchFn, 0).max_output_tokens).toBe(8192);
    });

    it("reads the answer out of output[] past the reasoning items", async () => {
      oneMemory();
      const fetchFn = mockFetchSequence([
        {
          body: {
            output: [
              { type: "reasoning", summary: [] },
              { type: "message", content: [{ type: "output_text", text: "Mochi." }] },
            ],
            usage: { input_tokens: 11, output_tokens: 3 },
          },
        },
      ]);

      const result = await reflect("q", ctx, {
        apiKey: "k",
        fetchFn,
        llmModel: "openai/gpt-5.6-luna",
      });

      expect(result.text).toBe("Mochi.");
      // Responses spells usage input/output — reading only the chat names would
      // report zeros for every call on this transport.
      expect(result.usage.promptTokens).toBe(11);
      expect(result.usage.completionTokens).toBe(3);
      // Responses does not always send a total — deriving it keeps a real cost
      // from being reported as zero spend.
      expect(result.usage.totalTokens).toBe(14);
    });

    it("still uses chat/completions for a non-reasoning model", async () => {
      oneMemory();
      const fetchFn = mockFetchSequence([{ body: completionResponse("hi") }]);

      await reflect("q", ctx, { apiKey: "k", fetchFn, llmModel: "openai/gpt-4o" });

      expect(urlOf(fetchFn)).toContain("/api/v1/chat/completions");
      expect(sentBody(fetchFn, 0).messages).toBeDefined();
    });
  });

  describe("json_schema rejection fallback", () => {
    const SCHEMA = { type: "object", properties: { name: { type: "string" } } };
    // An allowlisted provider whose model is NOT on the json_schema denylist,
    // so attempt 1 really does carry `response_format`.
    const SCHEMA_MODEL = "openai/gpt-4o";

    it("retries without response_format when the json_schema request is rejected", async () => {
      oneMemory();
      const fetchFn = mockFetchSequence([
        { ok: false, status: 400 },
        { body: completionResponse(JSON.stringify({ name: "Peter" })) },
      ]);

      const result = await reflect("q", ctx, {
        apiKey: "k",
        fetchFn,
        llmModel: SCHEMA_MODEL,
        responseSchema: SCHEMA,
      });

      expect(fetchFn).toHaveBeenCalledTimes(2);
      const first = sentBody(fetchFn, 0);
      const second = sentBody(fetchFn, 1);
      expect(first.response_format).toEqual({
        type: "json_schema",
        json_schema: { name: "reflect_output", schema: SCHEMA },
      });
      expect(second.response_format).toBeUndefined();
      expect(systemOf(first)).not.toContain("JSON Schema");
      expect(systemOf(second)).toContain("JSON Schema");
      // Only ONE axis varies between the attempts — the user turn (question +
      // evidence) must be byte-identical, and recall must not run twice.
      expect((second.messages as unknown[])[1]).toEqual((first.messages as unknown[])[1]);
      expect(mockRecall).toHaveBeenCalledTimes(1);
      expect(result.structuredOutput).toEqual({ name: "Peter" });
    });

    it("keeps the caller's system prompt as a prefix on the fallback attempt", async () => {
      oneMemory();
      const fetchFn = mockFetchSequence([
        { ok: false, status: 400 },
        { body: completionResponse("{}") },
      ]);

      await reflect("q", ctx, {
        apiKey: "k",
        fetchFn,
        llmModel: SCHEMA_MODEL,
        responseSchema: SCHEMA,
        systemPrompt: "SENTINEL PROMPT",
      });

      // The portal detects internal task types with a substring match against
      // the system message, so the schema must be appended as a TAIL.
      expect(systemOf(sentBody(fetchFn, 1)).startsWith("SENTINEL PROMPT")).toBe(true);
    });

    it("does NOT retry when response_format was never sent", async () => {
      oneMemory();
      const fetchFn = mockFetchSequence([{ ok: false, status: 400 }]);

      await reflect("q", ctx, {
        apiKey: "k",
        fetchFn,
        llmModel: "deepseek/deepseek-v4",
        responseSchema: SCHEMA,
      });

      expect(fetchFn).toHaveBeenCalledTimes(1);
    });

    it("does NOT retry when no responseSchema was requested", async () => {
      oneMemory();
      const fetchFn = mockFetchSequence([{ ok: false, status: 400 }]);

      await reflect("q", ctx, { apiKey: "k", fetchFn, llmModel: SCHEMA_MODEL });

      expect(fetchFn).toHaveBeenCalledTimes(1);
    });

    it("retries at most once — a second rejection returns the degraded result", async () => {
      oneMemory();
      const fetchFn = mockFetchSequence([
        { ok: false, status: 400 },
        { ok: false, status: 400 },
      ]);

      const result = await reflect("q", ctx, {
        apiKey: "k",
        fetchFn,
        llmModel: SCHEMA_MODEL,
        responseSchema: SCHEMA,
      });

      expect(fetchFn).toHaveBeenCalledTimes(2);
      expect(result.text).toBe("");
      expect(result.basedOn.memoryIds).toEqual(["m1"]);
    });

    it.each([401, 403, 404, 408, 409, 413, 425, 429])(
      "does NOT retry on %i — dropping response_format cannot be the fix",
      async (status) => {
        oneMemory();
        const fetchFn = mockFetchSequence([{ ok: false, status }]);

        await reflect("q", ctx, {
          apiKey: "k",
          fetchFn,
          llmModel: SCHEMA_MODEL,
          responseSchema: SCHEMA,
        });

        expect(fetchFn).toHaveBeenCalledTimes(1);
      }
    );

    it("retries on a 502 — the portal masks the provider's real status", async () => {
      oneMemory();
      const fetchFn = mockFetchSequence([
        { ok: false, status: 502 },
        { body: completionResponse("{}") },
      ]);

      await reflect("q", ctx, {
        apiKey: "k",
        fetchFn,
        llmModel: SCHEMA_MODEL,
        responseSchema: SCHEMA,
      });

      expect(fetchFn).toHaveBeenCalledTimes(2);
    });

    it("does NOT retry a network error — a throw is no evidence about the body", async () => {
      oneMemory();
      const fetchFn = vi.fn().mockRejectedValue(new Error("boom")) as unknown as typeof fetch;

      const result = await reflect("q", ctx, {
        apiKey: "k",
        fetchFn,
        llmModel: SCHEMA_MODEL,
        responseSchema: SCHEMA,
      });

      expect(fetchFn).toHaveBeenCalledTimes(1);
      expect(result.text).toBe("");
    });

    it("skips the fallback when the shared deadline is already spent", async () => {
      vi.useFakeTimers();
      try {
        oneMemory();
        const fetchFn = vi
          .fn()
          .mockImplementationOnce(async () => {
            // Burn the shared 60s budget inside attempt 1.
            vi.advanceTimersByTime(59_500);
            return { ok: false, status: 400, statusText: "", json: async () => ({}) };
          })
          .mockResolvedValue({ ok: true, status: 200, statusText: "", json: async () => ({}) });

        const result = await reflect("q", ctx, {
          apiKey: "k",
          fetchFn: fetchFn as unknown as typeof fetch,
          llmModel: SCHEMA_MODEL,
          responseSchema: SCHEMA,
        });

        expect(fetchFn).toHaveBeenCalledTimes(1);
        expect(result.text).toBe("");
      } finally {
        vi.useRealTimers();
      }
    });
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

  // Regression guard: the portal reads only `max_completion_tokens`; the
  // deprecated `max_tokens` is silently ignored and truncates the answer at the
  // default cap. The answer request must carry the modern field, never the legacy one.
  it("sends max_completion_tokens (never the deprecated max_tokens)", async () => {
    oneMemory();
    const fetchFn = mockFetch(completionResponse("answer"));
    await reflect("q", ctx, { apiKey: "k", fetchFn, maxTokens: 512 });
    const body = sentBody(fetchFn);
    expect(body.max_completion_tokens).toBe(512);
    expect(body).not.toHaveProperty("max_tokens");
  });
});
