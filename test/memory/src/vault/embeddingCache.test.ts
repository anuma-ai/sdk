// Integration tests for the frozen-embedding cache glue. These cover the load/
// save round-trip, model-mismatch invalidation, missing/corrupt files, and the
// embedWithCache miss path — the behaviour rutwik2001 flagged as untested (and
// where the original cwd-relative-path bug lived). Embeddings are mocked, so no
// PORTAL_API_KEY or network is needed.
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../../src/lib/memoryEngine/embeddings.js", () => ({
  generateEmbeddings: vi.fn(),
}));

import { generateEmbeddings } from "../../../../src/lib/memoryEngine/embeddings.js";

import {
  DEFAULT_EMBEDDING_CACHE_PATH,
  embedWithCache,
  loadEmbeddingCache,
  saveEmbeddingCache,
} from "./embeddingCache";

let dir: string;
let cachePath: string;

beforeEach(async () => {
  vi.clearAllMocks();
  dir = await mkdtemp(join(tmpdir(), "emb-cache-"));
  cachePath = join(dir, "embeddings-cache.json");
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

const opts = { apiKey: "test-key" };

describe("embedding cache — default path", () => {
  it("resolves next to the module, not the cwd (the frozen-embedding guarantee)", () => {
    // The bug this replaced used a cwd-relative path. Pin that the default is
    // absolute and lands beside the source file regardless of where it runs.
    expect(DEFAULT_EMBEDDING_CACHE_PATH).toMatch(/[/\\]vault[/\\]embeddings-cache\.json$/);
    expect(
      DEFAULT_EMBEDDING_CACHE_PATH.startsWith("/") ||
        /^[A-Za-z]:/.test(DEFAULT_EMBEDDING_CACHE_PATH)
    ).toBe(true);
  });
});

describe("loadEmbeddingCache / saveEmbeddingCache", () => {
  it("round-trips vectors for the same model", async () => {
    const saved = new Map([
      ["alpha", [0.1, 0.2, 0.3]],
      ["beta", [0.4, 0.5, 0.6]],
    ]);
    await saveEmbeddingCache(saved, "model-x", cachePath);

    const loaded = await loadEmbeddingCache("model-x", false, cachePath);
    expect(loaded.get("alpha")).toEqual([0.1, 0.2, 0.3]);
    expect(loaded.get("beta")).toEqual([0.4, 0.5, 0.6]);
    expect(loaded.size).toBe(2);
  });

  it("invalidates (returns empty) when the stored model differs", async () => {
    await saveEmbeddingCache(new Map([["alpha", [1, 2, 3]]]), "old-model", cachePath);
    const loaded = await loadEmbeddingCache("new-model", false, cachePath);
    expect(loaded.size).toBe(0);
  });

  it("returns empty for a missing cache file (expected first run)", async () => {
    const loaded = await loadEmbeddingCache("model-x", false, join(dir, "does-not-exist.json"));
    expect(loaded.size).toBe(0);
  });

  it("returns empty (and does not throw) on corrupt JSON", async () => {
    await writeFile(cachePath, "{ not valid json");
    const loaded = await loadEmbeddingCache("model-x", false, cachePath);
    expect(loaded.size).toBe(0);
  });

  it("ignores the cache when refresh is requested", async () => {
    await saveEmbeddingCache(new Map([["alpha", [1, 2, 3]]]), "model-x", cachePath);
    const loaded = await loadEmbeddingCache("model-x", true, cachePath);
    expect(loaded.size).toBe(0);
  });

  it("persists the model tag so a later load can validate it", async () => {
    await saveEmbeddingCache(new Map([["alpha", [1]]]), "model-x", cachePath);
    const raw = JSON.parse(await readFile(cachePath, "utf-8"));
    expect(raw.model).toBe("model-x");
    expect(raw.vectors.alpha).toEqual([1]);
  });
});

describe("embedWithCache", () => {
  it("only calls the API for cache misses and reuses hits", async () => {
    vi.mocked(generateEmbeddings).mockResolvedValue([
      [9, 9],
      [8, 8],
    ]);
    const cache = new Map<string, number[]>([["cached", [1, 1]]]);

    const { vectors, misses } = await embedWithCache(["cached", "new-a", "new-b"], opts, cache);

    // One API call, only for the two misses (deduped), in order.
    expect(generateEmbeddings).toHaveBeenCalledTimes(1);
    expect(vi.mocked(generateEmbeddings).mock.calls[0][0]).toEqual(["new-a", "new-b"]);
    expect(misses).toBe(2);
    // Vectors are aligned to the input order, hits preserved.
    expect(vectors).toEqual([
      [1, 1],
      [9, 9],
      [8, 8],
    ]);
    // The cache gained the fresh vectors.
    expect(cache.get("new-a")).toEqual([9, 9]);
    expect(cache.get("new-b")).toEqual([8, 8]);
  });

  it("makes no API call when every text is cached", async () => {
    const cache = new Map<string, number[]>([
      ["a", [1]],
      ["b", [2]],
    ]);
    const { vectors, misses } = await embedWithCache(["a", "b", "a"], opts, cache);

    expect(generateEmbeddings).not.toHaveBeenCalled();
    expect(misses).toBe(0);
    expect(vectors).toEqual([[1], [2], [1]]);
  });

  it("dedupes repeated misses into a single API entry", async () => {
    vi.mocked(generateEmbeddings).mockResolvedValue([[7, 7]]);
    const cache = new Map<string, number[]>();

    const { vectors, misses } = await embedWithCache(["dup", "dup"], opts, cache);

    expect(vi.mocked(generateEmbeddings).mock.calls[0][0]).toEqual(["dup"]);
    expect(misses).toBe(1);
    expect(vectors).toEqual([
      [7, 7],
      [7, 7],
    ]);
  });
});
