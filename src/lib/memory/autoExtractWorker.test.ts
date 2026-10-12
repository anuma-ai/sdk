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
    vaultCache: new Map<string, Float32Array>(),
  },
  extract: { apiKey: "k" },
};

type ExtractAndRetainResult = Awaited<ReturnType<typeof extractAndRetain>>;

const TELEMETRY_FIXTURE = {
  funnel: {
    rawCandidateCount: 0,
    validCandidateCount: 0,
    afterRedactionCount: 0,
    aboveConfidenceCount: 0,
    quarantinedCount: 0,
    retainedCount: 0,
    failedCount: 0,
  },
  timings: { extractMs: 7, retainMs: 3 },
  model: "gpt-oss/gpt-oss-120b",
} satisfies Pick<ExtractAndRetainResult, "funnel" | "timings" | "model">;

const EMPTY_RESULT: ExtractAndRetainResult = {
  candidates: [],
  results: [],
  failedCount: 0,
  outcome: "no-facts",
  quarantined: [],
  ...TELEMETRY_FIXTURE,
};

const mk = (n: number): AutoExtractMessage[] =>
  Array.from({ length: n }, (_, i) => ({
    id: `m${i}`,
    role: i % 2 === 0 ? "user" : "assistant",
    content: `msg ${i}`,
  }));

const flush = () => new Promise((r) => setTimeout(r, 0));

const blockFirstCall = (): (() => void) => {
  let resolve!: (v: typeof EMPTY_RESULT) => void;
  vi.mocked(extractAndRetain)
    .mockImplementationOnce(() => new Promise((r) => (resolve = r)))
    .mockResolvedValue(EMPTY_RESULT);
  return () => resolve(EMPTY_RESULT);
};

beforeEach(() => vi.clearAllMocks());

describe("createAutoExtractor", () => {
  it("schedules extraction async — returns true immediately", () => {
    vi.mocked(extractAndRetain).mockResolvedValue(EMPTY_RESULT);
    const extractor = createAutoExtractor(baseOptions);
    const scheduled = extractor.processTurn(messages, "conv1");
    expect(scheduled).toBe(true);
  });

  it("defaults extract.totalTimeoutMs to bound the guarded path", async () => {
    vi.mocked(extractAndRetain).mockResolvedValue(EMPTY_RESULT);
    const extractor = createAutoExtractor(baseOptions);
    extractor.processTurn(messages, "conv1");
    await Promise.resolve();
    await Promise.resolve();
    const passed = vi.mocked(extractAndRetain).mock.calls[0][2];
    expect(passed.extract.totalTimeoutMs).toBe(60_000);
  });

  it("respects a caller-supplied extract.totalTimeoutMs", async () => {
    vi.mocked(extractAndRetain).mockResolvedValue(EMPTY_RESULT);
    const extractor = createAutoExtractor({
      ...baseOptions,
      extract: { apiKey: "k", totalTimeoutMs: 5_000 },
    });
    extractor.processTurn(messages, "conv1");
    await Promise.resolve();
    await Promise.resolve();
    const passed = vi.mocked(extractAndRetain).mock.calls[0][2];
    expect(passed.extract.totalTimeoutMs).toBe(5_000);
  });

  it("skips empty message array", () => {
    const onSkipped = vi.fn();
    const extractor = createAutoExtractor({ ...baseOptions, onSkipped });
    expect(extractor.processTurn([])).toBe(false);
    expect(onSkipped).toHaveBeenCalledWith({ reason: "no-messages", conversationId: undefined });
  });

  it("coalesces a turn that arrives while a previous one is in-flight (no drop)", async () => {
    const finishFirst = blockFirstCall();
    const onSkipped = vi.fn();
    const extractor = createAutoExtractor({ ...baseOptions, onSkipped });

    expect(extractor.processTurn(messages, "c1")).toBe(true);
    expect(extractor.processTurn(messages, "c2")).toBe(true);
    expect(onSkipped).not.toHaveBeenCalled();
    expect(vi.mocked(extractAndRetain)).toHaveBeenCalledTimes(1);

    finishFirst();
    await flush();
    expect(vi.mocked(extractAndRetain)).toHaveBeenCalledTimes(2);
  });

  it("supersedes an older pending turn for the SAME conversation, re-covering its content", async () => {
    const finishFirst = blockFirstCall();
    const onSkipped = vi.fn();
    const extractor = createAutoExtractor({ ...baseOptions, onSkipped });

    extractor.processTurn(mk(2), "inflight");
    extractor.processTurn(mk(4), "q");
    extractor.processTurn(mk(6), "q");
    expect(onSkipped).toHaveBeenCalledWith({ reason: "superseded", conversationId: "q" });

    finishFirst();
    await flush();
    expect(vi.mocked(extractAndRetain)).toHaveBeenCalledTimes(2);
    const qIds = vi.mocked(extractAndRetain).mock.calls[1][0].map((m) => m.id);
    expect(qIds).toEqual(expect.arrayContaining(["m0", "m1", "m2", "m3"]));
  });

  it("supersession unions a non-superset (sliding-window) turn so nothing is lost", async () => {
    const finishFirst = blockFirstCall();
    const extractor = createAutoExtractor({ ...baseOptions });
    const slice = (ids: string[]): AutoExtractMessage[] =>
      ids.map((id) => ({ id, role: "user" as const, content: id }));

    extractor.processTurn(mk(2), "inflight");
    extractor.processTurn(slice(["m0", "m1", "m2"]), "q");
    extractor.processTurn(slice(["m2", "m3", "m4"]), "q");

    finishFirst();
    await flush();
    const qIds = vi.mocked(extractAndRetain).mock.calls[1][0].map((m) => m.id);
    expect(qIds).toEqual(["m0", "m1", "m2", "m3", "m4"]);
  });

  it("queues turns for DIFFERENT conversations without dropping any", async () => {
    const finishFirst = blockFirstCall();
    const onSkipped = vi.fn();
    const extractor = createAutoExtractor({ ...baseOptions, onSkipped });

    extractor.processTurn(messages, "x");
    extractor.processTurn(messages, "a");
    extractor.processTurn(messages, "b");
    expect(onSkipped).not.toHaveBeenCalled();

    finishFirst();
    await flush();
    expect(vi.mocked(extractAndRetain)).toHaveBeenCalledTimes(3);
  });

  it("skips a re-fire of an already-extracted turn (no-new-content dedup)", async () => {
    vi.mocked(extractAndRetain).mockResolvedValue(EMPTY_RESULT);
    const onSkipped = vi.fn();
    const extractor = createAutoExtractor({ ...baseOptions, onSkipped });

    expect(extractor.processTurn(messages, "c1")).toBe(true);
    await flush();
    expect(extractor.processTurn(messages, "c1")).toBe(false);
    expect(onSkipped).toHaveBeenCalledWith({ reason: "no-new-content", conversationId: "c1" });
    expect(vi.mocked(extractAndRetain)).toHaveBeenCalledTimes(1);
  });

  it("widens the window to cover messages since the watermark (not just last N)", async () => {
    vi.mocked(extractAndRetain).mockResolvedValue(EMPTY_RESULT);
    const extractor = createAutoExtractor({ ...baseOptions, windowSize: 2 });
    extractor.processTurn(mk(4), "c1");
    await flush();
    expect(vi.mocked(extractAndRetain).mock.calls[0][0].map((m) => m.id)).toEqual(["m2", "m3"]);

    extractor.processTurn(mk(8), "c1");
    await flush();
    const ids = vi.mocked(extractAndRetain).mock.calls[1][0].map((m) => m.id);
    expect(ids).toEqual(["m2", "m3", "m4", "m5", "m6", "m7"]);
  });

  it("caps the widened window at maxWindowSize, oldest-first (rest re-covered next turn)", async () => {
    vi.mocked(extractAndRetain).mockResolvedValue(EMPTY_RESULT);
    const extractor = createAutoExtractor({ ...baseOptions, windowSize: 1, maxWindowSize: 3 });
    extractor.processTurn(mk(1), "c1");
    await flush();
    extractor.processTurn(mk(10), "c1");
    await flush();
    expect(vi.mocked(extractAndRetain).mock.calls[1][0].map((m) => m.id)).toEqual([
      "m0",
      "m1",
      "m2",
    ]);

    extractor.processTurn(mk(10), "c1");
    await flush();
    expect(vi.mocked(extractAndRetain).mock.calls[2][0].map((m) => m.id)).toEqual([
      "m1",
      "m2",
      "m3",
    ]);
  });

  it("evicts the oldest idle conversation past maxTrackedConversations; evicted one re-extracts", async () => {
    vi.mocked(extractAndRetain).mockResolvedValue(EMPTY_RESULT);
    const extractor = createAutoExtractor({ ...baseOptions, maxTrackedConversations: 2 });

    extractor.processTurn(messages, "a");
    await flush();
    extractor.processTurn(messages, "b");
    await flush();
    extractor.processTurn(messages, "c");
    await flush();

    expect(extractor.processTurn(messages, "c")).toBe(false);
    expect(extractor.processTurn(messages, "b")).toBe(false);
    expect(extractor.processTurn(messages, "a")).toBe(true);
    await flush();
  });

  it("never evicts a conversation with a queued (pending) turn", async () => {
    const finishFirst = blockFirstCall();
    const extractor = createAutoExtractor({ ...baseOptions, maxTrackedConversations: 1 });

    extractor.processTurn(mk(2), "hold");
    extractor.processTurn(mk(2), "q");
    extractor.processTurn(mk(2), "z");

    finishFirst();
    await flush();
    expect(vi.mocked(extractAndRetain)).toHaveBeenCalledTimes(3);
  });

  it("does NOT advance the watermark when extraction throws (re-covers next turn)", async () => {
    vi.mocked(extractAndRetain)
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValue(EMPTY_RESULT);
    const extractor = createAutoExtractor({ ...baseOptions, onError: vi.fn() });

    extractor.processTurn(messages, "c1");
    await flush();
    extractor.processTurn(messages, "c1");
    await flush();

    expect(vi.mocked(extractAndRetain)).toHaveBeenCalledTimes(2);
    expect(vi.mocked(extractAndRetain).mock.calls[1][0].map((m) => m.id)).toEqual(["m1", "m2"]);
  });

  it("does NOT advance the watermark on 'empty-after-retry' (re-covers next turn)", async () => {
    vi.mocked(extractAndRetain)
      .mockResolvedValueOnce({ ...EMPTY_RESULT, outcome: "empty-after-retry" })
      .mockResolvedValue(EMPTY_RESULT);
    const extractor = createAutoExtractor(baseOptions);

    extractor.processTurn(messages, "c1");
    await flush();
    extractor.processTurn(messages, "c1");
    await flush();

    expect(vi.mocked(extractAndRetain)).toHaveBeenCalledTimes(2);
    expect(vi.mocked(extractAndRetain).mock.calls[1][0].map((m) => m.id)).toEqual(["m1", "m2"]);
  });

  it("DOES advance the watermark on a legitimately quiet turn ('no-facts')", async () => {
    vi.mocked(extractAndRetain).mockResolvedValue(EMPTY_RESULT);
    const extractor = createAutoExtractor(baseOptions);

    extractor.processTurn(messages, "c1");
    await flush();
    extractor.processTurn(messages, "c1");
    await flush();

    expect(vi.mocked(extractAndRetain)).toHaveBeenCalledTimes(1);
  });

  it("dispose FLUSHES a queued pending turn instead of dropping it (G2)", async () => {
    const finishFirst = blockFirstCall();
    const extractor = createAutoExtractor(baseOptions);
    extractor.processTurn(messages, "c1");
    extractor.processTurn(messages, "c2");
    extractor.dispose();
    finishFirst();
    await flush();
    expect(vi.mocked(extractAndRetain)).toHaveBeenCalledTimes(2);
    const drainedIds = vi.mocked(extractAndRetain).mock.calls[1][0].map((m) => m.id);
    expect(drainedIds).toEqual(expect.arrayContaining(["m1", "m2"]));
  });

  it("dispose drains a MULTI-conversation queue to empty (G2)", async () => {
    const finishFirst = blockFirstCall();
    const extractor = createAutoExtractor(baseOptions);
    extractor.processTurn(messages, "c1");
    extractor.processTurn(messages, "c2");
    extractor.processTurn(messages, "c3");
    extractor.dispose();
    finishFirst();
    await flush();
    expect(vi.mocked(extractAndRetain)).toHaveBeenCalledTimes(3);
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
          eventTime: null,
        },
        {
          content: "fact 2",
          type: "other",
          confidence: 0.85,
          sourceMessageIds: ["m1"],
          entities: [],
          eventTime: null,
        },
      ],
      results: [
        { action: "create", memoryId: "id1", proofCount: 1 },
        { action: "merge", memoryId: "id2", targetId: "id2", proofCount: 3 },
      ],
      failedCount: 0,
      outcome: "extracted",
      quarantined: [],
      ...TELEMETRY_FIXTURE,
      funnel: { ...TELEMETRY_FIXTURE.funnel, rawCandidateCount: 3, validCandidateCount: 2 },
    });
    const onMemoryExtracted = vi.fn();
    const onTurnComplete = vi.fn();
    const extractor = createAutoExtractor({
      ...baseOptions,
      onMemoryExtracted,
      onTurnComplete,
    });

    extractor.processTurn(messages, "c1");
    await flush();

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
      funnel: expect.objectContaining({ rawCandidateCount: 3, validCandidateCount: 2 }),
      timings: { extractMs: 7, retainMs: 3 },
      model: "gpt-oss/gpt-oss-120b",
    });
  });

  it("invokes onError when extractAndRetain throws", async () => {
    vi.mocked(extractAndRetain).mockRejectedValue(new Error("boom"));
    const onError = vi.fn();
    const extractor = createAutoExtractor({ ...baseOptions, onError });
    extractor.processTurn(messages, "c1");
    await flush();
    expect(onError).toHaveBeenCalledWith(expect.any(Error), "c1");
  });

  it("isProcessing reflects in-flight state", async () => {
    let resolve!: () => void;
    vi.mocked(extractAndRetain).mockImplementation(
      () =>
        new Promise((r) => {
          resolve = () => r(EMPTY_RESULT);
        })
    );
    const extractor = createAutoExtractor(baseOptions);
    expect(extractor.isProcessing()).toBe(false);
    extractor.processTurn(messages);
    expect(extractor.isProcessing()).toBe(true);
    resolve();
    await flush();
    expect(extractor.isProcessing()).toBe(false);
  });

  it("respects windowSize — only sends the last N messages", async () => {
    vi.mocked(extractAndRetain).mockResolvedValue(EMPTY_RESULT);
    const longHistory: AutoExtractMessage[] = Array.from({ length: 20 }, (_, i) => ({
      id: `m${i}`,
      role: i % 2 === 0 ? "user" : "assistant",
      content: `msg ${i}`,
    }));
    const extractor = createAutoExtractor({ ...baseOptions, windowSize: 4 });
    extractor.processTurn(longHistory);
    await flush();

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
    vi.mocked(extractAndRetain).mockResolvedValue(EMPTY_RESULT);
    const onFallback = vi.fn();
    const extractor = createAutoExtractor({
      ...baseOptions,
      extract: { apiKey: "k", baseUrl: "https://portal.example" },
      consolidate: { model: "openai/gpt-5-mini", onFallback },
    });
    extractor.processTurn(messages, "c1");
    await flush();

    const callOptions = vi.mocked(extractAndRetain).mock.calls[0][2];
    expect(callOptions.consolidateOptions).toEqual({
      apiKey: "k",
      baseUrl: "https://portal.example",
      model: "openai/gpt-5-mini",
      onFallback,
    });
  });

  it("reuses getToken auth and lets consolidate.baseUrl override the extract baseUrl", async () => {
    vi.mocked(extractAndRetain).mockResolvedValue(EMPTY_RESULT);
    const getToken = vi.fn().mockResolvedValue("tok");
    const extractor = createAutoExtractor({
      ...baseOptions,
      extract: { getToken, baseUrl: "https://extract.example" },
      consolidate: { baseUrl: "https://consolidate.example" },
    });
    extractor.processTurn(messages, "c1");
    await flush();

    const callOptions = vi.mocked(extractAndRetain).mock.calls[0][2];
    expect(callOptions.consolidateOptions).toEqual({
      getToken,
      baseUrl: "https://consolidate.example",
    });
    expect(callOptions.consolidateOptions).not.toHaveProperty("apiKey");
  });

  it("calls extractAndRetain WITHOUT the optional sub-pass options when neither is set", async () => {
    vi.mocked(extractAndRetain).mockResolvedValue(EMPTY_RESULT);
    const extractor = createAutoExtractor(baseOptions);
    extractor.processTurn(messages, "c1");
    await flush();

    const callOptions = vi.mocked(extractAndRetain).mock.calls[0][2];
    expect(callOptions).not.toHaveProperty("consolidateOptions");
    expect(callOptions).not.toHaveProperty("injectionClassifier");
  });

  it("wires injectionClassifier (reusing the extract auth) when the option is set", async () => {
    vi.mocked(extractAndRetain).mockResolvedValue(EMPTY_RESULT);
    const extractor = createAutoExtractor({
      ...baseOptions,
      extract: { apiKey: "k", baseUrl: "https://portal.example" },
      injectionClassifier: {},
    });
    extractor.processTurn(messages, "c1");
    await flush();

    const callOptions = vi.mocked(extractAndRetain).mock.calls[0][2];
    expect(callOptions.injectionClassifier).toEqual({
      apiKey: "k",
      baseUrl: "https://portal.example",
    });
  });

  it("lets injectionClassifier fields override the inherited extract auth/baseUrl", async () => {
    vi.mocked(extractAndRetain).mockResolvedValue(EMPTY_RESULT);
    const getToken = vi.fn().mockResolvedValue("tok");
    const extractor = createAutoExtractor({
      ...baseOptions,
      extract: { getToken, baseUrl: "https://extract.example" },
      injectionClassifier: {
        baseUrl: "https://classifier.example",
        model: "m",
        maxCandidates: 5,
        totalTimeoutMs: 30_000,
      },
    });
    extractor.processTurn(messages, "c1");
    await flush();

    const callOptions = vi.mocked(extractAndRetain).mock.calls[0][2];
    expect(callOptions.injectionClassifier).toEqual({
      getToken,
      baseUrl: "https://classifier.example",
      model: "m",
      maxCandidates: 5,
      totalTimeoutMs: 30_000,
    });
    expect(callOptions.injectionClassifier).not.toHaveProperty("apiKey");
  });

  it("forwards the extractAndRetain outcome on onTurnComplete (H3)", async () => {
    vi.mocked(extractAndRetain).mockResolvedValue({
      ...EMPTY_RESULT,
      outcome: "empty-after-retry",
    });
    const onTurnComplete = vi.fn();
    const extractor = createAutoExtractor({ ...baseOptions, onTurnComplete });
    extractor.processTurn(messages, "c1");
    await flush();
    expect(onTurnComplete.mock.calls[0][0]).toMatchObject({ outcome: "empty-after-retry" });
  });

  it("forwards the failure reason alongside empty-after-retry (#888)", async () => {
    vi.mocked(extractAndRetain).mockResolvedValue({
      ...EMPTY_RESULT,
      outcome: "empty-after-retry",
      failure: { reason: "empty-content", attempts: 3 },
    });
    const onTurnComplete = vi.fn();
    const extractor = createAutoExtractor({ ...baseOptions, onTurnComplete });
    extractor.processTurn(messages, "c1");
    await flush();
    expect(onTurnComplete.mock.calls[0][0]).toMatchObject({
      outcome: "empty-after-retry",
      failure: { reason: "empty-content", attempts: 3 },
    });
  });

  it("omits the failure KEY entirely on a healthy turn", async () => {
    vi.mocked(extractAndRetain).mockResolvedValue({ ...EMPTY_RESULT, outcome: "no-facts" });
    const onTurnComplete = vi.fn();
    const extractor = createAutoExtractor({ ...baseOptions, onTurnComplete });
    extractor.processTurn(messages, "c1");
    await flush();
    expect(onTurnComplete.mock.calls[0][0]).not.toHaveProperty("failure");
  });

  it("auto-wires embeddingOptions.maskInput when piiRedaction is on but maskInput is unset (M2)", async () => {
    vi.mocked(extractAndRetain).mockResolvedValue(EMPTY_RESULT);
    const extractor = createAutoExtractor({
      ...baseOptions,
      extract: { apiKey: "k", piiRedaction: true },
    });
    extractor.processTurn(messages, "c1");
    await flush();
    const passedCtx = vi.mocked(extractAndRetain).mock.calls[0][1];
    expect(typeof passedCtx.embeddingOptions.maskInput).toBe("function");
    expect(passedCtx.embeddingOptions.maskInput?.("ping me at a@b.com")).not.toContain("a@b.com");
  });

  it("respects a caller-supplied maskInput and does not auto-wire over it (M2)", async () => {
    vi.mocked(extractAndRetain).mockResolvedValue(EMPTY_RESULT);
    const maskInput = (t: string) => `masked:${t}`;
    const extractor = createAutoExtractor({
      ...baseOptions,
      retainCtx: { ...baseOptions.retainCtx, embeddingOptions: { apiKey: "k", maskInput } },
      extract: { apiKey: "k", piiRedaction: true },
    });
    extractor.processTurn(messages, "c1");
    await flush();
    expect(vi.mocked(extractAndRetain).mock.calls[0][1].embeddingOptions.maskInput).toBe(maskInput);
  });

  it("leaves embeddingOptions untouched when piiRedaction is off (M2)", async () => {
    vi.mocked(extractAndRetain).mockResolvedValue(EMPTY_RESULT);
    const extractor = createAutoExtractor(baseOptions);
    extractor.processTurn(messages, "c1");
    await flush();
    expect(vi.mocked(extractAndRetain).mock.calls[0][1].embeddingOptions.maskInput).toBeUndefined();
  });
});

describe("createAutoExtractor — durable cursor store (A3)", () => {
  const makeCursorStore = () => {
    const backing = new Map<string, string>();
    const get = vi.fn((id: string) => backing.get(id));
    const set = vi.fn((id: string, msgId: string) => {
      backing.set(id, msgId);
    });
    return { store: { get, set }, get, set, backing };
  };

  const windowIds = (call: number): string[] =>
    vi.mocked(extractAndRetain).mock.calls[call][0].map((m) => m.id);

  it("persists the advanced watermark through the cursor store on success", async () => {
    vi.mocked(extractAndRetain).mockResolvedValue(EMPTY_RESULT);
    const { store, set } = makeCursorStore();
    const extractor = createAutoExtractor({ ...baseOptions, cursorStore: store });

    extractor.processTurn(mk(6), "conv1");
    await flush();

    expect(set).toHaveBeenCalledWith("conv1", "m5");
  });

  it("does NOT persist the cursor on 'empty-after-retry'", async () => {
    vi.mocked(extractAndRetain).mockResolvedValue({
      ...EMPTY_RESULT,
      outcome: "empty-after-retry",
    });
    const { store, set } = makeCursorStore();
    const extractor = createAutoExtractor({ ...baseOptions, cursorStore: store });

    extractor.processTurn(mk(6), "conv1");
    await flush();

    expect(set).not.toHaveBeenCalled();
  });

  it("hydrates the watermark from the cursor so only post-cursor messages are sent", async () => {
    vi.mocked(extractAndRetain).mockResolvedValue(EMPTY_RESULT);
    const { store, get } = makeCursorStore();
    get.mockReturnValue("m3");

    const extractor = createAutoExtractor({ ...baseOptions, cursorStore: store });
    extractor.processTurn(mk(6), "conv1");
    await flush();

    expect(get).toHaveBeenCalledWith("conv1");
    expect(windowIds(0)).toEqual(["m2", "m3", "m4", "m5"]);
  });

  it("resumes across a simulated restart via a shared store (no tail loss)", async () => {
    vi.mocked(extractAndRetain).mockResolvedValue(EMPTY_RESULT);
    const { store } = makeCursorStore();

    const a = createAutoExtractor({ ...baseOptions, cursorStore: store });
    a.processTurn(mk(4), "conv1");
    await flush();
    a.dispose();

    const b = createAutoExtractor({ ...baseOptions, cursorStore: store });
    b.processTurn(mk(6), "conv1");
    await flush();

    expect(windowIds(1)).toEqual(["m2", "m3", "m4", "m5"]);
  });

  it("does not persist the ephemeral undefined-conversation bucket", async () => {
    vi.mocked(extractAndRetain).mockResolvedValue(EMPTY_RESULT);
    const { store, set, get } = makeCursorStore();
    const extractor = createAutoExtractor({ ...baseOptions, cursorStore: store });

    extractor.processTurn(mk(3));
    await flush();

    expect(set).not.toHaveBeenCalled();
    expect(get).not.toHaveBeenCalled();
  });

  it("degrades to in-memory when the cursor store throws (best-effort)", async () => {
    vi.mocked(extractAndRetain).mockResolvedValue(EMPTY_RESULT);
    const store = {
      get: vi.fn(() => {
        throw new Error("kv boom");
      }),
      set: vi.fn(() => {
        throw new Error("kv boom");
      }),
    };
    const extractor = createAutoExtractor({ ...baseOptions, cursorStore: store });

    extractor.processTurn(mk(6), "conv1");
    await flush();

    expect(extractAndRetain).toHaveBeenCalledTimes(1);
  });

  it("does NOT advance the durable cursor on a trailing-slice guess (gap-clobber)", async () => {
    vi.mocked(extractAndRetain).mockResolvedValue(EMPTY_RESULT);
    const { store, set, get } = makeCursorStore();
    get.mockReturnValue("m-scrolled-out");

    const extractor = createAutoExtractor({ ...baseOptions, cursorStore: store });
    extractor.processTurn(mk(10), "conv1");
    await flush();

    expect(set).not.toHaveBeenCalled();
  });

  it("does not regress the durable cursor when a concurrent writer is ahead", async () => {
    vi.mocked(extractAndRetain).mockResolvedValue(EMPTY_RESULT);
    const { store, set, get } = makeCursorStore();
    get.mockReturnValueOnce("m0").mockReturnValueOnce("m5");

    const extractor = createAutoExtractor({
      ...baseOptions,
      cursorStore: store,
      windowSize: 1,
      maxWindowSize: 2,
    });
    extractor.processTurn(mk(10), "conv1");
    await flush();

    expect(set).not.toHaveBeenCalled();
  });
});

describe("partial retention failures", () => {
  it("does not acknowledge a window with failed facts", async () => {
    const cursorStore = { get: vi.fn(), set: vi.fn() };
    vi.mocked(extractAndRetain)
      .mockResolvedValueOnce({ ...EMPTY_RESULT, outcome: "extracted", failedCount: 1 })
      .mockResolvedValue(EMPTY_RESULT);
    const worker = createAutoExtractor({ ...baseOptions, cursorStore });
    worker.processTurn(messages, "conv1");
    await flush();
    expect(cursorStore.set).not.toHaveBeenCalled();
    worker.processTurn(messages, "conv1");
    await flush();
    expect(extractAndRetain).toHaveBeenCalledTimes(2);
    expect(cursorStore.set).toHaveBeenCalledWith("conv1", "m2");
  });
});
