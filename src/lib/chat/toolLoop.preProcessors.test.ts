import { beforeEach, describe, expect, it, vi } from "vitest";

import * as sseModule from "../../client/core/serverSentEvents.gen";
import * as embeddingsModule from "../memoryEngine/embeddings";
import type { PreProcessorArtifact, PromptPreProcessor } from "./preProcessor";
import { runToolLoop } from "./toolLoop";

vi.mock("../../client/core/serverSentEvents.gen", async (importOriginal) => {
  const orig = await importOriginal<typeof sseModule>();
  return { ...orig, createSseClient: vi.fn() };
});

vi.mock("../memoryEngine/embeddings", async (importOriginal) => {
  const orig = await importOriginal<typeof embeddingsModule>();
  return { ...orig, generateEmbedding: vi.fn() };
});

const mockCreateSseClient = vi.mocked(sseModule.createSseClient);
const mockGenerateEmbedding = vi.mocked(embeddingsModule.generateEmbedding);

function makeTextStream(text: string) {
  return (async function* () {
    yield { type: "response.created", response: { id: "r", model: "m" } };
    yield { type: "response.output_text.delta", delta: { OfString: text } };
    yield {
      type: "response.completed",
      response: { usage: { input_tokens: 1, output_tokens: 1 } },
    };
  })();
}

function getRequestMessages(callIndex: number): { role?: string }[] {
  const opts = mockCreateSseClient.mock.calls[callIndex][0] as { serializedBody: string };
  const body = JSON.parse(opts.serializedBody);
  return body.input ?? body.messages ?? [];
}

describe("runToolLoop pre-processors", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGenerateEmbedding.mockResolvedValue([0.1, 0.2, 0.3]);
    mockCreateSseClient.mockReturnValue({ stream: makeTextStream("done") } as never);
  });

  it("calls each pre-processor with the shared embedding and prompt", async () => {
    const a = vi.fn<PromptPreProcessor>().mockResolvedValue(undefined);
    const b = vi.fn<PromptPreProcessor>().mockResolvedValue(undefined);

    await runToolLoop({
      messages: [{ role: "user", content: [{ type: "text", text: "hello world" }] }],
      model: "test-model",
      token: "token",
      preProcessors: [a, b],
    });

    expect(mockGenerateEmbedding).toHaveBeenCalledTimes(1);
    expect(mockGenerateEmbedding).toHaveBeenCalledWith("hello world", expect.any(Object));
    const expectedCtx = { prompt: "hello world", embedding: [0.1, 0.2, 0.3], signal: undefined };
    expect(a).toHaveBeenCalledWith(expectedCtx);
    expect(b).toHaveBeenCalledWith(expectedCtx);
  });

  it("appends returned messages in array order to the LLM request", async () => {
    const p1: PromptPreProcessor = () => [
      { role: "user", content: [{ type: "text", text: "context A" }] },
    ];
    const p2: PromptPreProcessor = () => [
      { role: "user", content: [{ type: "text", text: "context B" }] },
    ];

    await runToolLoop({
      messages: [{ role: "user", content: [{ type: "text", text: "q" }] }],
      model: "test-model",
      token: "token",
      preProcessors: [p1, p2],
    });

    const msgs = getRequestMessages(0);
    expect(msgs).toHaveLength(3);
    const texts = msgs.map((m) => JSON.stringify(m));
    expect(texts[1]).toContain("context A");
    expect(texts[2]).toContain("context B");
  });

  it("isolates per-processor failures — one throw does not prevent others", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const bad: PromptPreProcessor = () => {
      throw new Error("boom");
    };
    const good: PromptPreProcessor = () => [
      { role: "user", content: [{ type: "text", text: "still here" }] },
    ];

    await runToolLoop({
      messages: [{ role: "user", content: [{ type: "text", text: "q" }] }],
      model: "test-model",
      token: "token",
      preProcessors: [bad, good],
    });

    const msgs = getRequestMessages(0);
    expect(msgs).toHaveLength(2);
    expect(JSON.stringify(msgs[1])).toContain("still here");
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it("proceeds without enrichment when the embedding call fails", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    mockGenerateEmbedding.mockRejectedValueOnce(new Error("embedding down"));
    const p = vi.fn<PromptPreProcessor>();

    const result = await runToolLoop({
      messages: [{ role: "user", content: [{ type: "text", text: "q" }] }],
      model: "test-model",
      token: "token",
      preProcessors: [p],
    });

    expect(p).not.toHaveBeenCalled();
    expect(mockCreateSseClient).toHaveBeenCalledTimes(1);
    expect(result.error).toBeNull();
    warn.mockRestore();
  });

  it("skips the stage when no user text is present", async () => {
    const p = vi.fn<PromptPreProcessor>();

    await runToolLoop({
      messages: [{ role: "system", content: [{ type: "text", text: "system only" }] }],
      model: "test-model",
      token: "token",
      preProcessors: [p],
    });

    expect(mockGenerateEmbedding).not.toHaveBeenCalled();
    expect(p).not.toHaveBeenCalled();
  });

  describe("artifact emission", () => {
    const weatherArtifact: PreProcessorArtifact = {
      type: "weather",
      payload: { forecasts: [{ location: { name: "Lisbon" } }] },
      key: "lisbon",
    };

    it("extracts artifacts from EnrichedPreProcessorResult and surfaces them on the result", async () => {
      const p: PromptPreProcessor = () => ({
        messages: [{ role: "user", content: [{ type: "text", text: "Weather data:\nsunny" }] }],
        artifacts: [weatherArtifact],
      });

      const result = await runToolLoop({
        messages: [{ role: "user", content: [{ type: "text", text: "weather in lisbon" }] }],
        model: "test-model",
        token: "token",
        preProcessors: [p],
      });

      expect(result.error).toBeNull();
      expect(result.preProcessorArtifacts).toEqual([weatherArtifact]);
    });

    it("fires onPreProcessorArtifact once per artifact, before the LLM stream starts", async () => {
      const callOrder: string[] = [];
      mockCreateSseClient.mockImplementationOnce(((opts: unknown) => {
        callOrder.push("sse");
        void opts;
        return { stream: makeTextStream("done") };
      }) as never);
      const onPreProcessorArtifact = vi.fn((a: PreProcessorArtifact) => {
        callOrder.push(`artifact:${a.type}`);
      });
      const p: PromptPreProcessor = () => ({
        messages: [],
        artifacts: [weatherArtifact],
      });

      await runToolLoop({
        messages: [{ role: "user", content: [{ type: "text", text: "q" }] }],
        model: "test-model",
        token: "token",
        preProcessors: [p],
        onPreProcessorArtifact,
      });

      expect(onPreProcessorArtifact).toHaveBeenCalledTimes(1);
      expect(onPreProcessorArtifact).toHaveBeenCalledWith(weatherArtifact);
      expect(callOrder).toEqual(["artifact:weather", "sse"]);
    });

    it("aggregates artifacts across multiple pre-processors", async () => {
      const a: PreProcessorArtifact = { type: "weather", payload: { foo: 1 } };
      const b: PreProcessorArtifact = { type: "crypto_chart", payload: { foo: 2 } };
      const p1: PromptPreProcessor = () => ({ messages: [], artifacts: [a] });
      const p2: PromptPreProcessor = () => ({ messages: [], artifacts: [b] });
      const onPreProcessorArtifact = vi.fn();

      const result = await runToolLoop({
        messages: [{ role: "user", content: [{ type: "text", text: "q" }] }],
        model: "test-model",
        token: "token",
        preProcessors: [p1, p2],
        onPreProcessorArtifact,
      });

      expect(result.preProcessorArtifacts).toHaveLength(2);
      expect(result.preProcessorArtifacts).toEqual(expect.arrayContaining([a, b]));
      expect(onPreProcessorArtifact).toHaveBeenCalledTimes(2);
    });

    it("collects multiple artifacts from a single pre-processor", async () => {
      const a: PreProcessorArtifact = { type: "search_citations", payload: { i: 1 } };
      const b: PreProcessorArtifact = { type: "search_citations", payload: { i: 2 }, key: "alt" };
      const onPreProcessorArtifact = vi.fn();
      const p: PromptPreProcessor = () => ({ messages: [], artifacts: [a, b] });

      const result = await runToolLoop({
        messages: [{ role: "user", content: [{ type: "text", text: "q" }] }],
        model: "test-model",
        token: "token",
        preProcessors: [p],
        onPreProcessorArtifact,
      });

      expect(result.preProcessorArtifacts).toEqual([a, b]);
      expect(onPreProcessorArtifact).toHaveBeenCalledTimes(2);
    });

    it("inlines messages from EnrichedPreProcessorResult into the LLM request", async () => {
      const p: PromptPreProcessor = () => ({
        messages: [
          { role: "user", content: [{ type: "text", text: "Weather data:\nsunny" }] },
        ],
        artifacts: [weatherArtifact],
      });

      await runToolLoop({
        messages: [{ role: "user", content: [{ type: "text", text: "q" }] }],
        model: "test-model",
        token: "token",
        preProcessors: [p],
      });

      const msgs = getRequestMessages(0);
      expect(msgs).toHaveLength(2);
      expect(JSON.stringify(msgs[1])).toContain("Weather data:");
      expect(JSON.stringify(msgs[1])).toContain("sunny");
    });

    it("returns undefined preProcessorArtifacts when no artifacts were emitted (bare-string path)", async () => {
      const p: PromptPreProcessor = () => [
        { role: "user", content: [{ type: "text", text: "ctx" }] },
      ];
      const onPreProcessorArtifact = vi.fn();

      const result = await runToolLoop({
        messages: [{ role: "user", content: [{ type: "text", text: "q" }] }],
        model: "test-model",
        token: "token",
        preProcessors: [p],
        onPreProcessorArtifact,
      });

      expect(result.preProcessorArtifacts).toBeUndefined();
      expect(onPreProcessorArtifact).not.toHaveBeenCalled();
    });

    it("emits artifact even when messages array is empty", async () => {
      const p: PromptPreProcessor = () => ({ messages: [], artifacts: [weatherArtifact] });
      const onPreProcessorArtifact = vi.fn();

      const result = await runToolLoop({
        messages: [{ role: "user", content: [{ type: "text", text: "q" }] }],
        model: "test-model",
        token: "token",
        preProcessors: [p],
        onPreProcessorArtifact,
      });

      expect(result.preProcessorArtifacts).toEqual([weatherArtifact]);
      // Only original user message — no enrichment was injected.
      expect(getRequestMessages(0)).toHaveLength(1);
    });

    it("isolates a thrown pre-processor: other artifacts still surface", async () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      const bad: PromptPreProcessor = () => {
        throw new Error("bad fetch");
      };
      const good: PromptPreProcessor = () => ({
        messages: [],
        artifacts: [weatherArtifact],
      });

      const result = await runToolLoop({
        messages: [{ role: "user", content: [{ type: "text", text: "q" }] }],
        model: "test-model",
        token: "token",
        preProcessors: [bad, good],
      });

      expect(result.preProcessorArtifacts).toEqual([weatherArtifact]);
      warn.mockRestore();
    });

    it("swallows callback errors but still records the artifact on the result", async () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      const p: PromptPreProcessor = () => ({ messages: [], artifacts: [weatherArtifact] });
      const onPreProcessorArtifact = vi.fn(() => {
        throw new Error("ui handler boom");
      });

      const result = await runToolLoop({
        messages: [{ role: "user", content: [{ type: "text", text: "q" }] }],
        model: "test-model",
        token: "token",
        preProcessors: [p],
        onPreProcessorArtifact,
      });

      expect(result.error).toBeNull();
      expect(result.preProcessorArtifacts).toEqual([weatherArtifact]);
      expect(warn).toHaveBeenCalled();
      warn.mockRestore();
    });
  });
});
