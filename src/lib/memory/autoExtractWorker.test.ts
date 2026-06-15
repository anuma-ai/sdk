import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./autoExtract", () => ({
  extractAndRetain: vi.fn(),
}));

import { extractAndRetain, type AutoExtractMessage } from "./autoExtract";

import { createAutoExtractor } from "./autoExtractWorker";

const messages: AutoExtractMessage[] = [
  { id: "m1", role: "user", content: "hi" },
  { id: "m2", role: "assistant", content: "hello" },
];

const baseOptions = {
  retainCtx: {
    vaultCtx: {} as never,
    embeddingOptions: { apiKey: "k" },
    vaultCache: new Map<string, number[]>(),
  },
  extract: { apiKey: "k" },
};

beforeEach(() => vi.clearAllMocks());

describe("createAutoExtractor", () => {
  it("schedules extraction async — returns true immediately", () => {
    vi.mocked(extractAndRetain).mockResolvedValue({ candidates: [], results: [], failedCount: 0 });
    const extractor = createAutoExtractor(baseOptions);
    const scheduled = extractor.processTurn(messages, "conv1");
    expect(scheduled).toBe(true);
  });

  it("skips empty message array", () => {
    const onSkipped = vi.fn();
    const extractor = createAutoExtractor({ ...baseOptions, onSkipped });
    expect(extractor.processTurn([])).toBe(false);
    expect(onSkipped).toHaveBeenCalledWith({ reason: "no-messages", conversationId: undefined });
  });

  it("skips when a previous turn is still in-flight", async () => {
    let resolve!: (v: { candidates: never[]; results: never[]; failedCount: number }) => void;
    vi.mocked(extractAndRetain).mockImplementation(
      () =>
        new Promise((r) => {
          resolve = r;
        })
    );
    const onSkipped = vi.fn();
    const extractor = createAutoExtractor({ ...baseOptions, onSkipped });

    expect(extractor.processTurn(messages, "c1")).toBe(true);
    expect(extractor.processTurn(messages, "c2")).toBe(false);
    expect(onSkipped).toHaveBeenCalledWith({ reason: "in-flight", conversationId: "c2" });

    resolve({ candidates: [], results: [], failedCount: 0 });
  });

  it("fires onMemoryExtracted once per retained fact", async () => {
    vi.mocked(extractAndRetain).mockResolvedValue({
      candidates: [
        {
          content: "fact 1",
          type: "other",
          confidence: 0.9,
          sourceMessageIds: ["m1"],
          entities: [],
        },
        {
          content: "fact 2",
          type: "other",
          confidence: 0.85,
          sourceMessageIds: ["m1"],
          entities: [],
        },
      ],
      results: [
        { action: "create", memoryId: "id1", proofCount: 1 },
        { action: "merge", memoryId: "id2", targetId: "id2", proofCount: 3 },
      ],
      failedCount: 0,
    });
    const onMemoryExtracted = vi.fn();
    const onTurnComplete = vi.fn();
    const extractor = createAutoExtractor({
      ...baseOptions,
      onMemoryExtracted,
      onTurnComplete,
    });

    extractor.processTurn(messages, "c1");
    // Wait for the microtask queue to drain
    await new Promise((r) => setTimeout(r, 0));

    expect(onMemoryExtracted).toHaveBeenCalledTimes(2);
    expect(onMemoryExtracted).toHaveBeenNthCalledWith(1, {
      candidate: expect.objectContaining({ content: "fact 1" }),
      result: expect.objectContaining({ action: "create", memoryId: "id1" }),
      conversationId: "c1",
    });
    expect(onTurnComplete).toHaveBeenCalledOnce();
    expect(onTurnComplete.mock.calls[0][0]).toMatchObject({
      candidates: expect.arrayContaining([expect.objectContaining({ content: "fact 1" })]),
      results: expect.any(Array),
      conversationId: "c1",
    });
  });

  it("invokes onError when extractAndRetain throws", async () => {
    vi.mocked(extractAndRetain).mockRejectedValue(new Error("boom"));
    const onError = vi.fn();
    const extractor = createAutoExtractor({ ...baseOptions, onError });
    extractor.processTurn(messages, "c1");
    await new Promise((r) => setTimeout(r, 0));
    expect(onError).toHaveBeenCalledWith(expect.any(Error), "c1");
  });

  it("isProcessing reflects in-flight state", async () => {
    let resolve!: () => void;
    vi.mocked(extractAndRetain).mockImplementation(
      () =>
        new Promise((r) => {
          resolve = () => r({ candidates: [], results: [], failedCount: 0 });
        })
    );
    const extractor = createAutoExtractor(baseOptions);
    expect(extractor.isProcessing()).toBe(false);
    extractor.processTurn(messages);
    expect(extractor.isProcessing()).toBe(true);
    resolve();
    await new Promise((r) => setTimeout(r, 0));
    expect(extractor.isProcessing()).toBe(false);
  });

  it("respects windowSize — only sends the last N messages", async () => {
    vi.mocked(extractAndRetain).mockResolvedValue({ candidates: [], results: [], failedCount: 0 });
    const longHistory: AutoExtractMessage[] = Array.from({ length: 20 }, (_, i) => ({
      id: `m${i}`,
      role: i % 2 === 0 ? "user" : "assistant",
      content: `msg ${i}`,
    }));
    const extractor = createAutoExtractor({ ...baseOptions, windowSize: 4 });
    extractor.processTurn(longHistory);
    await new Promise((r) => setTimeout(r, 0));

    const callArg = vi.mocked(extractAndRetain).mock.calls[0][0];
    expect(callArg).toHaveLength(4);
    expect(callArg[0].id).toBe("m16");
    expect(callArg[3].id).toBe("m19");
  });

  it("dispose stops accepting new turns", () => {
    const extractor = createAutoExtractor(baseOptions);
    extractor.dispose();
    expect(extractor.processTurn(messages)).toBe(false);
  });

  it("wires consolidateOptions (reusing the extract auth) when consolidate is set", async () => {
    vi.mocked(extractAndRetain).mockResolvedValue({ candidates: [], results: [], failedCount: 0 });
    const onFallback = vi.fn();
    const extractor = createAutoExtractor({
      ...baseOptions,
      extract: { apiKey: "k", baseUrl: "https://portal.example" },
      consolidate: { model: "openai/gpt-5-mini", onFallback },
    });
    extractor.processTurn(messages, "c1");
    await new Promise((r) => setTimeout(r, 0));

    const callOptions = vi.mocked(extractAndRetain).mock.calls[0][2];
    expect(callOptions.consolidateOptions).toEqual({
      apiKey: "k",
      baseUrl: "https://portal.example",
      model: "openai/gpt-5-mini",
      onFallback,
    });
  });

  it("reuses getToken auth and lets consolidate.baseUrl override the extract baseUrl", async () => {
    vi.mocked(extractAndRetain).mockResolvedValue({ candidates: [], results: [], failedCount: 0 });
    const getToken = vi.fn().mockResolvedValue("tok");
    const extractor = createAutoExtractor({
      ...baseOptions,
      extract: { getToken, baseUrl: "https://extract.example" },
      consolidate: { baseUrl: "https://consolidate.example" },
    });
    extractor.processTurn(messages, "c1");
    await new Promise((r) => setTimeout(r, 0));

    const callOptions = vi.mocked(extractAndRetain).mock.calls[0][2];
    expect(callOptions.consolidateOptions).toEqual({
      getToken,
      baseUrl: "https://consolidate.example",
    });
    expect(callOptions.consolidateOptions).not.toHaveProperty("apiKey");
  });

  it("calls extractAndRetain WITHOUT consolidateOptions when consolidate is omitted", async () => {
    vi.mocked(extractAndRetain).mockResolvedValue({ candidates: [], results: [], failedCount: 0 });
    const extractor = createAutoExtractor(baseOptions);
    extractor.processTurn(messages, "c1");
    await new Promise((r) => setTimeout(r, 0));

    const callOptions = vi.mocked(extractAndRetain).mock.calls[0][2];
    expect(callOptions).not.toHaveProperty("consolidateOptions");
  });
});
