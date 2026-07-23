/**
 * Unit tests for the cross-encoder reranker.
 *
 * The transformers runtime is module-mocked: `AutoTokenizer` /
 * `AutoModelForSequenceClassification` return callable fakes whose logits
 * are controlled per test. Because the reranker caches its model promise
 * in module state, each test re-imports a fresh copy via
 * `vi.resetModules()` + dynamic import.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  tokenizerLoads: 0,
  modelLoads: 0,
  failTokenizerLoads: 0,
  /** Flat row-major logits + dims the fake model returns. */
  logitsData: [] as number[],
  logitsDims: [] as number[],
  /** Captured tokenizer inputs for assertion. */
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
    // A transient load failure (dep present, download hiccup) must NOT mark
    // the reranker permanently unavailable — availability stays unknown so
    // the next call retries.
    expect(isRerankerAvailable()).toBeUndefined();

    // Second call must re-attempt the load (not return the rejected
    // cached promise) and succeed.
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
    h.logitsData = [0, 2, 1]; // a→σ(0), b→σ(2), c→σ(1)

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
    // Content is carried through unchanged.
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
    // Local midnight — matches eventTime write/query basis (not UTC).
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
    // item0: not-relevant=5, relevant=-5 → low score
    // item1: not-relevant=-5, relevant=5 → high score
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
    // Simulate React Native, where @huggingface/transformers isn't installed:
    // the dynamic import rejects with a module-not-found error.
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

      // A second call short-circuits: it still rejects with the same error and
      // never re-attempts the import (no per-recall retry / warn spam on RN).
      await expect(rerankPairs("q", [{ id: "b", content: "doc" }])).rejects.toBeInstanceOf(
        RerankerUnavailableError
      );
    } finally {
      vi.doUnmock("@huggingface/transformers");
    }
  });
});
