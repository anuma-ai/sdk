import { beforeEach, describe, expect, it, vi } from "vitest";

import * as embeddingsModule from "../memoryEngine/embeddings";
import type { PreProcessorArtifact, PromptPreProcessor } from "./preProcessor";
import { runPreProcessors } from "./runPreProcessors";

vi.mock("../memoryEngine/embeddings", async (importOriginal) => {
  const orig = await importOriginal<typeof embeddingsModule>();
  return { ...orig, generateEmbedding: vi.fn() };
});

const mockGenerateEmbedding = vi.mocked(embeddingsModule.generateEmbedding);

const artifact = (type: string): PreProcessorArtifact => ({ type, payload: { type } });

describe("runPreProcessors", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGenerateEmbedding.mockResolvedValue([0.1, 0.2, 0.3]);
  });

  it("returns empty result when preProcessors is empty (no embedding fetched)", async () => {
    const result = await runPreProcessors({ prompt: "q", preProcessors: [] });
    expect(result).toEqual({ messages: [], artifacts: [] });
    expect(mockGenerateEmbedding).not.toHaveBeenCalled();
  });

  it("returns empty result for empty prompt (no embedding fetched)", async () => {
    const p = vi.fn<PromptPreProcessor>();
    const result = await runPreProcessors({ prompt: "  ", preProcessors: [p] });
    expect(result).toEqual({ messages: [], artifacts: [] });
    expect(p).not.toHaveBeenCalled();
    expect(mockGenerateEmbedding).not.toHaveBeenCalled();
  });

  it("reuses caller-provided embedding (no fetch)", async () => {
    const p: PromptPreProcessor = ({ embedding }) => {
      expect(embedding).toEqual([0.5, 0.6]);
      return undefined;
    };
    await runPreProcessors({
      prompt: "q",
      preProcessors: [p],
      embedding: [0.5, 0.6],
    });
    expect(mockGenerateEmbedding).not.toHaveBeenCalled();
  });

  it("collects artifacts from EnrichedPreProcessorResult, fires callback once per artifact", async () => {
    const a = artifact("weather");
    const b = artifact("crypto_chart");
    const onPreProcessorArtifact = vi.fn();

    const p1: PromptPreProcessor = () => ({
      messages: [{ role: "user", content: [{ type: "text", text: "weather data" }] }],
      artifacts: [a],
    });
    const p2: PromptPreProcessor = () => ({
      messages: [{ role: "user", content: [{ type: "text", text: "crypto data" }] }],
      artifacts: [b],
    });

    const result = await runPreProcessors({
      prompt: "q",
      preProcessors: [p1, p2],
      onPreProcessorArtifact,
    });

    expect(result.artifacts).toEqual(expect.arrayContaining([a, b]));
    expect(onPreProcessorArtifact).toHaveBeenCalledTimes(2);
    expect(result.messages).toHaveLength(2);
    expect(JSON.stringify(result.messages[0])).toContain("weather data");
    expect(JSON.stringify(result.messages[1])).toContain("crypto data");
  });

  it("collects multiple artifacts from a single pre-processor", async () => {
    const a = artifact("search_citations");
    const b = { ...artifact("search_citations"), key: "alt" };
    const onPreProcessorArtifact = vi.fn();
    const p: PromptPreProcessor = () => ({ messages: [], artifacts: [a, b] });

    const result = await runPreProcessors({
      prompt: "q",
      preProcessors: [p],
      onPreProcessorArtifact,
    });

    expect(result.artifacts).toEqual([a, b]);
    expect(onPreProcessorArtifact).toHaveBeenCalledTimes(2);
  });

  it("flattens LlmapiMessage[] returns into messages without producing artifacts", async () => {
    const onPreProcessorArtifact = vi.fn();
    const p: PromptPreProcessor = () => [
      { role: "user", content: [{ type: "text", text: "ctx" }] },
    ];

    const result = await runPreProcessors({
      prompt: "q",
      preProcessors: [p],
      onPreProcessorArtifact,
    });

    expect(result.artifacts).toEqual([]);
    expect(onPreProcessorArtifact).not.toHaveBeenCalled();
    expect(result.messages).toHaveLength(1);
  });

  it("isolates failing pre-processors — others still resolve", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const bad: PromptPreProcessor = () => {
      throw new Error("boom");
    };
    const good: PromptPreProcessor = () => ({
      messages: [{ role: "user", content: [{ type: "text", text: "ok" }] }],
      artifacts: [artifact("weather")],
    });

    const result = await runPreProcessors({
      prompt: "q",
      preProcessors: [bad, good],
    });

    expect(result.artifacts).toHaveLength(1);
    expect(result.messages).toHaveLength(1);
    warn.mockRestore();
  });

  it("fires fast pre-processor's artifact BEFORE a slow pre-processor completes", async () => {
    // Regression guard: if artifact firing moves outside the Promise.all
    // wrapper, a slow pre-processor blocks card render for fast ones.
    const events: string[] = [];
    const onPreProcessorArtifact = vi.fn((a: PreProcessorArtifact) => {
      events.push(`artifact:${a.type}`);
    });

    let resolveSlow!: () => void;
    const slowDone = new Promise<void>((r) => {
      resolveSlow = r;
    });

    const fast: PromptPreProcessor = () => ({
      messages: [],
      artifacts: [artifact("weather")],
    });

    const slow: PromptPreProcessor = async () => {
      await slowDone;
      events.push("slow-resolved");
      return { messages: [], artifacts: [artifact("crypto_chart")] };
    };

    const runPromise = runPreProcessors({
      prompt: "q",
      preProcessors: [slow, fast],
      embedding: [0.1],
      onPreProcessorArtifact,
    });

    // Yield to the microtask queue so the fast pre-processor's
    // synchronous resolution has a chance to fire its callback.
    await new Promise<void>((r) => setTimeout(r, 10));

    expect(events).toEqual(["artifact:weather"]);

    resolveSlow();
    const result = await runPromise;

    expect(events).toEqual(["artifact:weather", "slow-resolved", "artifact:crypto_chart"]);
    expect(result.artifacts).toHaveLength(2);
  });

  it("aggregates messages in preProcessors array order regardless of completion order", async () => {
    // Determinism guard for the LLM context: even when the second
    // pre-processor finishes first, the injection order matches the
    // declared `preProcessors` array order.
    const first: PromptPreProcessor = async () => {
      await new Promise((r) => setTimeout(r, 10));
      return [{ role: "user", content: [{ type: "text", text: "FIRST" }] }];
    };
    const second: PromptPreProcessor = () => [
      { role: "user", content: [{ type: "text", text: "SECOND" }] },
    ];

    const result = await runPreProcessors({
      prompt: "q",
      preProcessors: [first, second],
      embedding: [0.1],
    });

    expect(JSON.stringify(result.messages[0])).toContain("FIRST");
    expect(JSON.stringify(result.messages[1])).toContain("SECOND");
  });

  it("warns when an artifact payload exceeds 10KB (does not drop)", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const big: PreProcessorArtifact = {
      type: "weather",
      payload: { blob: "x".repeat(11 * 1024) },
    };
    const p: PromptPreProcessor = () => ({ messages: [], artifacts: [big] });

    const result = await runPreProcessors({
      prompt: "q",
      preProcessors: [p],
      embedding: [0.1],
    });

    // Artifact still surfaces — warn-only, not drop.
    expect(result.artifacts).toEqual([big]);
    expect(warn).toHaveBeenCalled();
    const messages = warn.mock.calls.map((c) => String(c[0]));
    expect(messages.some((m) => m.includes("payload is") && m.includes("trim"))).toBe(true);
    warn.mockRestore();
  });

  it("does not warn for small payloads", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const small: PreProcessorArtifact = { type: "weather", payload: { ok: true } };
    const p: PromptPreProcessor = () => ({ messages: [], artifacts: [small] });

    await runPreProcessors({
      prompt: "q",
      preProcessors: [p],
      embedding: [0.1],
    });

    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it("swallows callback errors but still records the artifact", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const a = artifact("weather");
    const onPreProcessorArtifact = vi.fn(() => {
      throw new Error("ui boom");
    });
    const p: PromptPreProcessor = () => ({ messages: [], artifacts: [a] });

    const result = await runPreProcessors({
      prompt: "q",
      preProcessors: [p],
      onPreProcessorArtifact,
    });

    expect(result.artifacts).toEqual([a]);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
