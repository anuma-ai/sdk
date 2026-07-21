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

const EMPTY_RESULT = {
  candidates: [],
  results: [],
  failedCount: 0,
  outcome: "no-facts" as const,
};

/** Build n messages with ids m0..m(n-1). Tests assert on `.id`, so role/content are filler. */
const mk = (n: number): AutoExtractMessage[] =>
  Array.from({ length: n }, (_, i) => ({
    id: `m${i}`,
    role: i % 2 === 0 ? "user" : "assistant",
    content: `msg ${i}`,
  }));

/** Drain the microtask + timer queue so fire-and-forget extraction settles. */
const flush = () => new Promise((r) => setTimeout(r, 0));

/**
 * Make the next extraction call hang until the returned resolver is invoked;
 * all later calls resolve immediately. Used to hold one turn "in-flight" while
 * exercising the coalescing queue.
 */
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

    // First turn dispatches; the second is queued (returns true, NOT dropped).
    expect(extractor.processTurn(messages, "c1")).toBe(true);
    expect(extractor.processTurn(messages, "c2")).toBe(true);
    expect(onSkipped).not.toHaveBeenCalled();
    expect(vi.mocked(extractAndRetain)).toHaveBeenCalledTimes(1);

    // Once the first finishes, the queued turn runs.
    finishFirst();
    await flush();
    expect(vi.mocked(extractAndRetain)).toHaveBeenCalledTimes(2);
  });

  it("supersedes an older pending turn for the SAME conversation, re-covering its content", async () => {
    const finishFirst = blockFirstCall();
    const onSkipped = vi.fn();
    const extractor = createAutoExtractor({ ...baseOptions, onSkipped });

    extractor.processTurn(mk(2), "inflight"); // dispatched (different conv, never resolves yet)
    extractor.processTurn(mk(4), "q"); // queued for "q"
    extractor.processTurn(mk(6), "q"); // supersedes the older "q" turn
    expect(onSkipped).toHaveBeenCalledWith({ reason: "superseded", conversationId: "q" });

    finishFirst();
    await flush();
    // inflight + the surviving "q" turn → two calls. The surviving window must
    // still include the superseded turn's messages (m0..m3), so no content lost.
    expect(vi.mocked(extractAndRetain)).toHaveBeenCalledTimes(2);
    const qIds = vi.mocked(extractAndRetain).mock.calls[1][0].map((m) => m.id);
    expect(qIds).toEqual(expect.arrayContaining(["m0", "m1", "m2", "m3"]));
  });

  it("supersession unions a non-superset (sliding-window) turn so nothing is lost", async () => {
    const finishFirst = blockFirstCall();
    const extractor = createAutoExtractor({ ...baseOptions });
    const slice = (ids: string[]): AutoExtractMessage[] =>
      ids.map((id) => ({ id, role: "user" as const, content: id }));

    extractor.processTurn(mk(2), "inflight"); // holds the worker in-flight
    extractor.processTurn(slice(["m0", "m1", "m2"]), "q"); // queued
    // Newer turn is a BOUNDED window that dropped m0,m1 — not a superset.
    extractor.processTurn(slice(["m2", "m3", "m4"]), "q");

    finishFirst();
    await flush();
    // Union keeps the pending-only m0,m1 ahead of the newer window: nothing lost,
    // order preserved, no duplicate m2.
    const qIds = vi.mocked(extractAndRetain).mock.calls[1][0].map((m) => m.id);
    expect(qIds).toEqual(["m0", "m1", "m2", "m3", "m4"]);
  });

  it("queues turns for DIFFERENT conversations without dropping any", async () => {
    const finishFirst = blockFirstCall();
    const onSkipped = vi.fn();
    const extractor = createAutoExtractor({ ...baseOptions, onSkipped });

    extractor.processTurn(messages, "x"); // dispatched
    extractor.processTurn(messages, "a"); // queued (own slot)
    extractor.processTurn(messages, "b"); // queued (own slot) — does NOT displace "a"
    expect(onSkipped).not.toHaveBeenCalled();

    finishFirst();
    await flush();
    // x, then a, then b — all three extracted, none dropped.
    expect(vi.mocked(extractAndRetain)).toHaveBeenCalledTimes(3);
  });

  it("skips a re-fire of an already-extracted turn (no-new-content dedup)", async () => {
    vi.mocked(extractAndRetain).mockResolvedValue(EMPTY_RESULT);
    const onSkipped = vi.fn();
    const extractor = createAutoExtractor({ ...baseOptions, onSkipped });

    expect(extractor.processTurn(messages, "c1")).toBe(true);
    await flush();
    // Same final state again → watermark is at the last message → nothing new.
    expect(extractor.processTurn(messages, "c1")).toBe(false);
    expect(onSkipped).toHaveBeenCalledWith({ reason: "no-new-content", conversationId: "c1" });
    expect(vi.mocked(extractAndRetain)).toHaveBeenCalledTimes(1);
  });

  it("widens the window to cover messages since the watermark (not just last N)", async () => {
    vi.mocked(extractAndRetain).mockResolvedValue(EMPTY_RESULT);
    const extractor = createAutoExtractor({ ...baseOptions, windowSize: 2 });
    // First turn: 4 messages, no watermark → trailing slice(-2) = m2,m3.
    extractor.processTurn(mk(4), "c1");
    await flush();
    expect(vi.mocked(extractAndRetain).mock.calls[0][0].map((m) => m.id)).toEqual(["m2", "m3"]);

    // Second turn: history grew to 8. Watermark is m3; with windowSize 2 a naive
    // slice would send only m6,m7 and lose m4,m5. Widening covers m4..m7
    // (+ CONTEXT_OVERLAP=2 of already-seen context).
    extractor.processTurn(mk(8), "c1");
    await flush();
    const ids = vi.mocked(extractAndRetain).mock.calls[1][0].map((m) => m.id);
    expect(ids).toEqual(["m2", "m3", "m4", "m5", "m6", "m7"]);
  });

  it("caps the widened window at maxWindowSize, oldest-first (rest re-covered next turn)", async () => {
    vi.mocked(extractAndRetain).mockResolvedValue(EMPTY_RESULT);
    const extractor = createAutoExtractor({ ...baseOptions, windowSize: 1, maxWindowSize: 3 });
    extractor.processTurn(mk(1), "c1"); // watermark → m0
    await flush();
    // Burst to 10 messages while capped at 3: take the OLDEST 3 so the watermark
    // advances to m2 and m3..m9 stay after it for the next turn (no skip).
    extractor.processTurn(mk(10), "c1");
    await flush();
    expect(vi.mocked(extractAndRetain).mock.calls[1][0].map((m) => m.id)).toEqual([
      "m0",
      "m1",
      "m2",
    ]);

    // Next turn drains the next oldest chunk (watermark m2 → start at m1 w/ overlap).
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

    extractor.processTurn(messages, "a"); // map {a}
    await flush();
    extractor.processTurn(messages, "b"); // map {a, b}
    await flush();
    extractor.processTurn(messages, "c"); // inserting "c" evicts oldest idle ("a") → {b, c}
    await flush();

    // "b" and "c" kept their watermarks → re-firing the same state is a no-op.
    expect(extractor.processTurn(messages, "c")).toBe(false);
    expect(extractor.processTurn(messages, "b")).toBe(false);
    // "a" was evicted → its watermark is gone, so it re-extracts (self-healing)
    // instead of skipping with no-new-content.
    expect(extractor.processTurn(messages, "a")).toBe(true);
    await flush();
  });

  it("never evicts a conversation with a queued (pending) turn", async () => {
    const finishFirst = blockFirstCall();
    const extractor = createAutoExtractor({ ...baseOptions, maxTrackedConversations: 1 });

    // "hold" goes in-flight (never resolves yet); "q" queues behind it.
    extractor.processTurn(mk(2), "hold");
    extractor.processTurn(mk(2), "q"); // pending for "q"
    // A third conversation would breach the cap of 1, but the only evictable
    // entries have pending turns, so nothing is dropped and "q" still runs.
    extractor.processTurn(mk(2), "z");

    finishFirst();
    await flush();
    // hold + q + z all extracted — the pending "q" was never evicted.
    expect(vi.mocked(extractAndRetain)).toHaveBeenCalledTimes(3);
  });

  it("does NOT advance the watermark when extraction throws (re-covers next turn)", async () => {
    vi.mocked(extractAndRetain)
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValue(EMPTY_RESULT);
    const extractor = createAutoExtractor({ ...baseOptions, onError: vi.fn() });

    extractor.processTurn(messages, "c1"); // throws → watermark NOT advanced
    await flush();
    extractor.processTurn(messages, "c1"); // same window re-sent, not skipped
    await flush();

    expect(vi.mocked(extractAndRetain)).toHaveBeenCalledTimes(2);
    expect(vi.mocked(extractAndRetain).mock.calls[1][0].map((m) => m.id)).toEqual(["m1", "m2"]);
  });

  it("dispose drops a queued pending turn", async () => {
    const finishFirst = blockFirstCall();
    const extractor = createAutoExtractor(baseOptions);
    extractor.processTurn(messages, "c1"); // in-flight
    extractor.processTurn(messages, "c2"); // queued
    extractor.dispose();
    finishFirst();
    await flush();
    // Only the first (in-flight) call ran; the pending turn was dropped on dispose.
    expect(vi.mocked(extractAndRetain)).toHaveBeenCalledTimes(1);
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
      outcome: "extracted",
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

  it("calls extractAndRetain WITHOUT consolidateOptions when consolidate is omitted", async () => {
    vi.mocked(extractAndRetain).mockResolvedValue(EMPTY_RESULT);
    const extractor = createAutoExtractor(baseOptions);
    extractor.processTurn(messages, "c1");
    await flush();

    const callOptions = vi.mocked(extractAndRetain).mock.calls[0][2];
    expect(callOptions).not.toHaveProperty("consolidateOptions");
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

  it("auto-wires embeddingOptions.maskInput when piiRedaction is on but maskInput is unset (M2)", async () => {
    vi.mocked(extractAndRetain).mockResolvedValue(EMPTY_RESULT);
    const extractor = createAutoExtractor({
      ...baseOptions,
      extract: { apiKey: "k", piiRedaction: true },
    });
    extractor.processTurn(messages, "c1");
    await flush();
    // The retainCtx handed to extractAndRetain now masks embedding input, so raw
    // PII never reaches the embeddings provider.
    const passedCtx = vi.mocked(extractAndRetain).mock.calls[0][1];
    expect(typeof passedCtx.embeddingOptions.maskInput).toBe("function");
    // Masking actually redacts (PiiRedactor.maskText), e.g. an email.
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
  /** In-memory ExtractionCursorStore with spies, mimicking a process-shared KV. */
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

    // Fresh conversation → trailing window of all 6 → watermark advances to m5.
    expect(set).toHaveBeenCalledWith("conv1", "m5");
  });

  it("hydrates the watermark from the cursor so only post-cursor messages are sent", async () => {
    vi.mocked(extractAndRetain).mockResolvedValue(EMPTY_RESULT);
    const { store, get } = makeCursorStore();
    get.mockReturnValue("m3"); // persisted from a prior session

    const extractor = createAutoExtractor({ ...baseOptions, cursorStore: store });
    extractor.processTurn(mk(6), "conv1");
    await flush();

    expect(get).toHaveBeenCalledWith("conv1");
    // watermark m3 → window starts at m3+1-CONTEXT_OVERLAP(2)=m2: [m2,m3,m4,m5].
    // Without hydration a fresh worker would send the full trailing slice.
    expect(windowIds(0)).toEqual(["m2", "m3", "m4", "m5"]);
  });

  it("resumes across a simulated restart via a shared store (no tail loss)", async () => {
    vi.mocked(extractAndRetain).mockResolvedValue(EMPTY_RESULT);
    const { store } = makeCursorStore();

    // Session A extracts mk(4) through m3, then dies.
    const a = createAutoExtractor({ ...baseOptions, cursorStore: store });
    a.processTurn(mk(4), "conv1");
    await flush();
    a.dispose();

    // Session B (fresh in-memory state, same durable store) sees a longer
    // history. It must resume after m3 — not re-slice a trailing window that
    // could skip m4 if history had grown past the window.
    const b = createAutoExtractor({ ...baseOptions, cursorStore: store });
    b.processTurn(mk(6), "conv1");
    await flush();

    expect(windowIds(1)).toEqual(["m2", "m3", "m4", "m5"]);
  });

  it("does not persist the ephemeral undefined-conversation bucket", async () => {
    vi.mocked(extractAndRetain).mockResolvedValue(EMPTY_RESULT);
    const { store, set, get } = makeCursorStore();
    const extractor = createAutoExtractor({ ...baseOptions, cursorStore: store });

    extractor.processTurn(mk(3)); // no conversationId
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

    // Extraction still ran despite the throwing store.
    expect(extractAndRetain).toHaveBeenCalledTimes(1);
  });

  it("does NOT advance the durable cursor on a trailing-slice guess (gap-clobber)", async () => {
    vi.mocked(extractAndRetain).mockResolvedValue(EMPTY_RESULT);
    const { store, set, get } = makeCursorStore();
    // Cursor points at a message NOT in the provided history (scrolled out),
    // and history is longer than the window → the fallback trailing slice skips
    // the un-extracted gap. Persisting its end would strand that gap durably.
    get.mockReturnValue("m-scrolled-out");

    const extractor = createAutoExtractor({ ...baseOptions, cursorStore: store });
    extractor.processTurn(mk(10), "conv1"); // windowSize 6 < 10 → trailing slice
    await flush();

    expect(set).not.toHaveBeenCalled(); // durable cursor left intact for a fuller-history session
  });

  it("does not regress the durable cursor when a concurrent writer is ahead", async () => {
    vi.mocked(extractAndRetain).mockResolvedValue(EMPTY_RESULT);
    const { store, set, get } = makeCursorStore();
    // Hydrate at m0; a concurrent session advanced the shared store to m5 by the
    // time we persist. Our window (truncated by maxWindowSize) ends earlier, so
    // the write must NOT move the cursor backwards.
    get.mockReturnValueOnce("m0").mockReturnValueOnce("m5");

    const extractor = createAutoExtractor({
      ...baseOptions,
      cursorStore: store,
      windowSize: 1,
      maxWindowSize: 2, // window truncates to [m0, m1] → advancedTo = m1 (index 1)
    });
    extractor.processTurn(mk(10), "conv1");
    await flush();

    // m5 (index 5) is ahead of m1 (index 1) within this turn's messages → skip.
    expect(set).not.toHaveBeenCalled();
  });
});
