import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  tokenizerLoads: 0,
  modelLoads: 0,
  failTokenizerLoads: 0,
  modelLoadGate: null as null | Promise<void>,
  logitsData: [] as number[],
  logitsDims: [] as number[],
  lastTokenizeArgs: null as null | { texts: string[]; pairs: string[] },
}));

vi.mock("@huggingface/transformers", () => {
  const tokenizer = (
    texts: string[],
    options: { text_pair: string[]; padding: boolean; truncation: boolean }
  ) => {
    h.lastTokenizeArgs = { texts, pairs: options.text_pair };
    return { batch: texts.length };
  };
  const model = async (_inputs: Record<string, unknown>) => ({
    logits: { data: Float32Array.from(h.logitsData), dims: h.logitsDims },
  });
  return {
    AutoTokenizer: {
      from_pretrained: async () => {
        h.tokenizerLoads++;
        if (h.failTokenizerLoads > 0) {
          h.failTokenizerLoads--;
          throw new Error("model download failed");
        }
        return tokenizer;
      },
    },
    AutoModelForSequenceClassification: {
      from_pretrained: async () => {
        h.modelLoads++;
        if (h.modelLoadGate) await h.modelLoadGate;
        return model;
      },
    },
  };
});

async function freshReranker() {
  vi.resetModules();
  return import("./reranker");
}

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

beforeEach(() => {
  h.tokenizerLoads = 0;
  h.modelLoads = 0;
  h.failTokenizerLoads = 0;
  h.modelLoadGate = null;
  h.logitsData = [];
  h.logitsDims = [];
  h.lastTokenizeArgs = null;
});

describe("rerankPairs", () => {
  it("returns [] for empty pairs and empty query without loading the model", async () => {
    const { rerankPairs } = await freshReranker();
    expect(await rerankPairs("query", [])).toEqual([]);
    expect(await rerankPairs("", [{ id: "a", content: "doc" }])).toEqual([]);
    expect(h.tokenizerLoads).toBe(0);
    expect(h.modelLoads).toBe(0);
  });

  it("lazy-loads the model exactly once across multiple calls", async () => {
    const { rerankPairs } = await freshReranker();
    h.logitsDims = [1, 1];
    h.logitsData = [0];

    await rerankPairs("q", [{ id: "a", content: "doc a" }]);
    await rerankPairs("q", [{ id: "a", content: "doc a" }]);
    await rerankPairs("q2", [{ id: "b", content: "doc b" }]);

    expect(h.tokenizerLoads).toBe(1);
    expect(h.modelLoads).toBe(1);
  });

  it("clears the cached promise on load failure so a retry re-attempts the load", async () => {
    const { rerankPairs, isRerankerAvailable } = await freshReranker();
    h.failTokenizerLoads = 1;
    h.logitsDims = [1, 1];
    h.logitsData = [2];

    await expect(rerankPairs("q", [{ id: "a", content: "doc" }])).rejects.toThrow(
      "model download failed"
    );
    expect(isRerankerAvailable()).toBeUndefined();

    const result = await rerankPairs("q", [{ id: "a", content: "doc" }]);
    expect(result).toHaveLength(1);
    expect(result[0].score).toBeCloseTo(sigmoid(2), 6);
    expect(h.tokenizerLoads).toBe(2);
    expect(isRerankerAvailable()).toBe(true);
  });

  it("maps logits through sigmoid into [0, 1] even for extreme values", async () => {
    const { rerankPairs } = await freshReranker();
    h.logitsDims = [2, 1];
    h.logitsData = [100, -100];

    const result = await rerankPairs("q", [
      { id: "hot", content: "very relevant" },
      { id: "cold", content: "irrelevant" },
    ]);

    const byId = new Map(result.map((r) => [r.id, r.score]));
    expect(byId.get("hot")).toBeGreaterThan(0.999);
    expect(byId.get("hot")).toBeLessThanOrEqual(1);
    expect(byId.get("cold")).toBeLessThan(0.001);
    expect(byId.get("cold")).toBeGreaterThanOrEqual(0);
  });

  it("assigns score i from logit i (input order) and returns items sorted by score desc", async () => {
    const { rerankPairs } = await freshReranker();
    h.logitsDims = [3, 1];
    h.logitsData = [0, 2, 1];

    const result = await rerankPairs("q", [
      { id: "a", content: "doc a" },
      { id: "b", content: "doc b" },
      { id: "c", content: "doc c" },
    ]);

    expect(result.map((r) => r.id)).toEqual(["b", "c", "a"]);
    const byId = new Map(result.map((r) => [r.id, r.score]));
    expect(byId.get("a")).toBeCloseTo(sigmoid(0), 6);
    expect(byId.get("b")).toBeCloseTo(sigmoid(2), 6);
    expect(byId.get("c")).toBeCloseTo(sigmoid(1), 6);
    expect(result.find((r) => r.id === "b")?.content).toBe("doc b");
  });

  it("tokenizes (query, doc) pairs via text_pair with the query replicated per doc", async () => {
    const { rerankPairs } = await freshReranker();
    h.logitsDims = [2, 1];
    h.logitsData = [0, 0];

    await rerankPairs("where do I live", [
      { id: "a", content: "doc a" },
      { id: "b", content: "doc b" },
    ]);

    expect(h.lastTokenizeArgs?.texts).toEqual(["where do I live", "where do I live"]);
    expect(h.lastTokenizeArgs?.pairs).toEqual(["doc a", "doc b"]);
  });

  it("C4: date-prefixes CE docs when dateMs is set, without mutating returned content", async () => {
    const { rerankPairs, formatRerankDoc } = await freshReranker();
    const localMs = new Date(2026, 0, 15).getTime();
    expect(formatRerankDoc("Lives in SF", localMs)).toBe("[Date: 2026-01-15] Lives in SF");
    expect(formatRerankDoc("no date")).toBe("no date");
    expect(formatRerankDoc("no date", null)).toBe("no date");

    h.logitsDims = [1, 1];
    h.logitsData = [1];
    const result = await rerankPairs("where", [
      { id: "a", content: "Lives in SF", dateMs: localMs },
    ]);
    expect(h.lastTokenizeArgs?.pairs).toEqual(["[Date: 2026-01-15] Lives in SF"]);
    expect(result[0].content).toBe("Lives in SF");
  });

  it("uses column 1 as the relevance logit for a 2-label head", async () => {
    const { rerankPairs } = await freshReranker();
    h.logitsDims = [2, 2];
    h.logitsData = [5, -5, -5, 5];

    const result = await rerankPairs("q", [
      { id: "a", content: "doc a" },
      { id: "b", content: "doc b" },
    ]);

    expect(result[0].id).toBe("b");
    expect(result[0].score).toBeCloseTo(sigmoid(5), 6);
    expect(result[1].id).toBe("a");
    expect(result[1].score).toBeCloseTo(sigmoid(-5), 6);
  });

  it("throws on a batch-dim mismatch or unsupported label count", async () => {
    const { rerankPairs } = await freshReranker();
    h.logitsDims = [1, 1];
    h.logitsData = [0];
    await expect(
      rerankPairs("q", [
        { id: "a", content: "x" },
        { id: "b", content: "y" },
      ])
    ).rejects.toThrow(/batch dim/);

    h.logitsDims = [1, 3];
    h.logitsData = [0, 0, 0];
    await expect(rerankPairs("q", [{ id: "a", content: "x" }])).rejects.toThrow(
      /unsupported numLabels/
    );
  });

  it("scores non-finite logits as 0", async () => {
    const { rerankPairs } = await freshReranker();
    h.logitsDims = [1, 1];
    h.logitsData = [Number.NaN];
    const result = await rerankPairs("q", [{ id: "a", content: "x" }]);
    expect(result[0].score).toBe(0);
  });
});

describe("reranker first-load deadline", () => {
  it("degrades a stalled first load to RerankerUnavailableError and keeps the load for later calls", async () => {
    let release!: () => void;
    h.modelLoadGate = new Promise<void>((r) => (release = r));
    h.logitsData = [2];
    h.logitsDims = [1, 1];
    vi.useFakeTimers();
    try {
      const { rerankPairs, isRerankerAvailable, RerankerUnavailableError } = await freshReranker();

      let error: unknown;
      const first = rerankPairs("q", [{ id: "a", content: "doc" }], {
        loadTimeoutMs: 1000,
      }).catch((err: unknown) => (error = err));
      await vi.advanceTimersByTimeAsync(1000);
      await first;

      expect(error).toBeInstanceOf(RerankerUnavailableError);
      expect(isRerankerAvailable()).toBeUndefined();

      release();
      await vi.advanceTimersByTimeAsync(0);
      const scored = await rerankPairs("q", [{ id: "a", content: "doc" }], { loadTimeoutMs: 1000 });
      expect(scored.map((r) => r.id)).toEqual(["a"]);
      expect(h.modelLoads).toBe(1);
      expect(isRerankerAvailable()).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("preloadReranker", () => {
  it("warms the model so the first rerank call does not load again", async () => {
    const { preloadReranker, rerankPairs } = await freshReranker();
    await preloadReranker();
    expect(h.tokenizerLoads).toBe(1);

    h.logitsDims = [1, 1];
    h.logitsData = [0];
    await rerankPairs("q", [{ id: "a", content: "x" }]);
    expect(h.tokenizerLoads).toBe(1);
    expect(h.modelLoads).toBe(1);
  });
});

describe("reranker availability", () => {
  it("is undefined before any attempt and true after a successful load", async () => {
    const { rerankPairs, isRerankerAvailable } = await freshReranker();
    expect(isRerankerAvailable()).toBeUndefined();

    h.logitsDims = [1, 1];
    h.logitsData = [0];
    await rerankPairs("q", [{ id: "a", content: "x" }]);
    expect(isRerankerAvailable()).toBe(true);
  });

  it("marks the reranker permanently unavailable when the transformers dep is missing", async () => {
    vi.resetModules();
    vi.doMock("@huggingface/transformers", () => {
      throw new Error("Cannot find module '@huggingface/transformers'");
    });
    try {
      const { rerankPairs, isRerankerAvailable, RerankerUnavailableError } =
        await import("./reranker");
      expect(isRerankerAvailable()).toBeUndefined();

      await expect(rerankPairs("q", [{ id: "a", content: "doc" }])).rejects.toBeInstanceOf(
        RerankerUnavailableError
      );
      expect(isRerankerAvailable()).toBe(false);

      await expect(rerankPairs("q", [{ id: "b", content: "doc" }])).rejects.toBeInstanceOf(
        RerankerUnavailableError
      );
    } finally {
      vi.doUnmock("@huggingface/transformers");
    }
  });
});
