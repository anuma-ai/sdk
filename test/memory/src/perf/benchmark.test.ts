/**
 * Memory recall / retain work-cost regression harness.
 *
 * WHAT THIS MEASURES
 * Not "is recall fast", but "how much work does recall do". Every number the
 * gate compares is a count: rows loaded out of the vault, rows decrypted,
 * stored embedding vectors parsed, documents BM25 re-tokenized, (query, doc)
 * pairs handed to the cross-encoder, full-vault scans one `retain()` triggers.
 * Those are a pure function of the corpus and the code path, so the committed
 * baseline pins them exactly (tolerance 0) and any extra work a change
 * introduces shows up as an integer that moved. Wall-clock is printed next to
 * them for a human reading the log, and is never gated — a shared CI runner's
 * timings are noise, and a time-based threshold there either never fires or
 * fires every other week.
 *
 * WHY THE COUNTERS LIVE OUTSIDE THE MEASURED CODE
 * Nothing under `src/` is instrumented. Each counter is incremented by a vitest
 * module wrapper placed around a DEPENDENCY of the code under test — the vault
 * ops, the encryption helpers, the embedder, the BM25 scorer, the reranker, the
 * chunk search op — with `importActual` passing the real implementation through.
 * That keeps `searchTool.ts`, `bm25.ts` and `retain.ts` untouched (they are
 * owned by other in-flight work) and still counts the exact calls they make.
 *
 * HERMETIC BY CONSTRUCTION
 * No network, no API key, no model download. The embedder is a deterministic
 * bag-of-words hash, the query decomposer is driven by an injected `fetchFn`,
 * and the cross-encoder is replaced with a deterministic token-overlap scorer
 * (the real one lazy-downloads a ~25MB model). This runs on every PR.
 *
 * WHAT THE COUNTERS ARE PROXIES FOR
 * Two costs cannot be counted from outside without editing files this harness
 * deliberately does not touch, so each is measured through an exact structural
 * proxy:
 *   - `JSON.parse` of a stored embedding vector. On the projected read path
 *     this is exactly `vaultVectorRows`. On the legacy whole-vault path the
 *     parse is inline in `searchTool.ts`, so it is measured as the number of
 *     entries the vault embedding cache gained during the scenario
 *     (`vaultCacheAdds`) — one cache entry per successfully parsed vector.
 *   - BM25 tokenization. Counted as documents, not calls: `bm25DocsTokenized`
 *     is `Σ items.length` over every corpus preparation. Ranking and
 *     tokenization are tracked on separate axes — `bm25Passes` (how many times
 *     a query was scored against a corpus) and `bm25Prepares` (how many times a
 *     corpus was tokenized) — because a tokenize-once index moves the second
 *     and must not move the first. Collapsing them into "calls to scoreBM25"
 *     would make hoisting the tokenization out of the facet loop look like the
 *     pipeline lost ranking passes. The wrappers cover both the combined entry
 *     point and the split prepare/score pair, the latter only when the module
 *     exports it, so the harness reads the same on either side of that change.
 *   - `rerankPairs` counts what the pipeline HANDS the cross-encoder. The CE
 *     itself is a stand-in here, so that counter describes pipeline structure
 *     (how many pairs the rerank stage is plumbed to score), not CE inference
 *     cost.
 * Likewise the per-row decrypt is counted as INVOCATIONS: the fixture stores
 * plaintext, so each call returns immediately. The fan-out — one call per
 * materialised row — is the part that scales with vault size and the part the
 * decrypt-last path removes; the AES cost per call is constant and orthogonal.
 *
 * The printed wall-clock is a floor, not a forecast: the corpus is ~1000 facts
 * at 1024 dimensions, where a mature vault is larger and production embeds at
 * 4096. Read the counts for signal and the milliseconds for shape.
 *
 * ONE ADAPTER CAVEAT WORTH KNOWING
 * The backing store is in-memory LokiJS (the same adapter the rest of the memory
 * tests use). `Q.unsafeSqlQuery` throws there, so `getVaultCandidateKeysOp` and
 * `getVaultEmbeddingsByIdsOp` take their documented LokiJS fallback — a normal
 * query plus an in-memory projection — rather than the column-projected SELECT
 * they issue on OPFS-SQLite. The COUNTS are unaffected (same candidate set,
 * same row counts, and the decrypt fan-out the projected path exists to shrink
 * is measured exactly). What is understated is the projected path's I/O win: on
 * SQLite the key scan genuinely skips the content and embedding blobs on disk,
 * and here they are already resident. So the projected-vs-legacy wall-clock gap
 * below is a LOWER bound on the real one.
 *
 * REGENERATING THE BASELINE
 *   PERF_SAVE_BASELINE=1 pnpm perf:memory
 * writes `baseline.json` from the current run and passes. Do that when the
 * fixture changes, and — importantly — when a change makes the pipeline cheaper:
 * the gate only fires on MORE work, so an unregenerated baseline after a win
 * quietly leaves headroom for the next regression to hide in. Ratcheting the
 * baseline down is how the gate keeps its teeth.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { beforeAll, describe, expect, it, vi } from "vitest";

import {
  buildGateBaseline,
  compareToGateBaseline,
  describeConfigMismatch,
  formatGateRegressions,
  type GateBaseline,
  type GateMetricSpec,
  type GateRun,
  isValidGateBaseline,
} from "../gate";
import { type PerfCounters, resetCounters, snapshotCounters } from "./counters";

// ─── module wrappers ────────────────────────────────────────────────────────
// Hoisted above every import below, so they reach the shared counter object by
// importing `./counters` themselves. Each wrapper spreads the real module and
// replaces only the functions whose calls are being counted.

vi.mock("../../../../src/lib/memoryEngine/embeddings", async (importActual) => {
  const actual = await importActual<Record<string, unknown>>();
  const { counters: c } = await import("./counters");
  const { embedText } = await import("./fixtures");
  return {
    ...actual,
    generateEmbedding: async (text: string) => {
      c.embedQueries++;
      c.embedTexts++;
      return embedText(text);
    },
    generateEmbeddings: async (texts: string[]) => {
      c.embedBatches++;
      c.embedTexts += texts.length;
      return texts.map(embedText);
    },
  };
});

vi.mock("../../../../src/lib/db/memoryVault/operations", async (importActual) => {
  const actual = await importActual<Record<string, unknown>>();
  const { counters: c } = await import("./counters");
  type Fn = (...args: unknown[]) => Promise<unknown>;
  const wrap = <T>(fn: Fn, tally: (result: T) => void): Fn => {
    return async (...args: unknown[]) => {
      const result = (await fn(...args)) as T;
      tally(result);
      return result;
    };
  };
  return {
    ...actual,
    getAllVaultMemoriesOp: wrap<unknown[]>(actual.getAllVaultMemoriesOp as Fn, (rows) => {
      c.vaultFullLoads++;
      c.vaultFullRows += rows.length;
    }),
    getVaultCandidateKeysOp: wrap<unknown[]>(actual.getVaultCandidateKeysOp as Fn, (rows) => {
      c.vaultKeyScans++;
      c.vaultKeyRows += rows.length;
    }),
    getVaultEmbeddingsByIdsOp: wrap<unknown[]>(actual.getVaultEmbeddingsByIdsOp as Fn, (rows) => {
      c.vaultVectorLoads++;
      c.vaultVectorRows += rows.length;
    }),
    getVaultMemoriesByIdsOp: wrap<unknown[]>(actual.getVaultMemoriesByIdsOp as Fn, (rows) => {
      c.vaultRowLoads++;
      c.vaultRowRows += rows.length;
    }),
    getActiveVaultMemoryIdsOp: wrap<Set<string>>(actual.getActiveVaultMemoryIdsOp as Fn, () => {
      c.vaultActiveIdScans++;
    }),
    countActiveVaultMemoriesOp: wrap<number>(actual.countActiveVaultMemoriesOp as Fn, () => {
      c.vaultCounts++;
    }),
    getMemoriesByEventTimeOp: wrap<unknown[]>(actual.getMemoriesByEventTimeOp as Fn, (rows) => {
      c.temporalScans++;
      c.temporalRows += rows.length;
    }),
    createVaultMemoryOp: wrap<unknown>(actual.createVaultMemoryOp as Fn, () => {
      c.vaultCreates++;
    }),
    createSupersedingMemoryOp: wrap<unknown>(actual.createSupersedingMemoryOp as Fn, () => {
      c.vaultCreates++;
    }),
    updateVaultMemoryOp: wrap<unknown>(actual.updateVaultMemoryOp as Fn, () => {
      c.vaultUpdates++;
    }),
    updateVaultMemoryEmbeddingOp: wrap<unknown>(actual.updateVaultMemoryEmbeddingOp as Fn, () => {
      c.vaultVectorWrites++;
    }),
  };
});

vi.mock("../../../../src/lib/db/memoryVault/encryption", async (importActual) => {
  const actual = await importActual<Record<string, unknown>>();
  const { counters: c } = await import("./counters");
  type Decrypt = (...args: unknown[]) => Promise<unknown>;
  return {
    ...actual,
    decryptVaultMemoryFields: async (...args: unknown[]) => {
      c.vaultDecrypts++;
      return (actual.decryptVaultMemoryFields as Decrypt)(...args);
    },
  };
});

vi.mock("../../../../src/lib/memoryVault/bm25", async (importActual) => {
  const actual = await importActual<Record<string, unknown>>();
  const { counters: c } = await import("./counters");
  type Item = { id: string; content: string };
  type Score = (query: string, items: Item[]) => Map<string, number>;
  type Prepare = (items: Item[]) => unknown;
  type ScorePrepared = (query: string, corpus: unknown) => Map<string, number>;

  // Ranking and tokenization are counted as SEPARATE axes, because a
  // tokenize-once index moves one and not the other: N facet passes over one
  // corpus stay N passes while going from N tokenizations to 1. Counting them
  // together (as "calls to scoreBM25") would make that change look like the
  // pipeline lost ranking passes, which is not what happened.
  //
  // `scoreBM25` is both: it tokenizes its input and then scores it.
  const wrapped: Record<string, unknown> = {
    ...actual,
    scoreBM25: (query: string, items: Item[]) => {
      c.bm25Passes++;
      c.bm25Prepares++;
      c.bm25DocsTokenized += items.length;
      return (actual.scoreBM25 as Score)(query, items);
    },
  };

  // The split corpus/score entry points arrived with the tokenize-once work and
  // may not exist on every base this harness runs against, so they're wrapped
  // only when present — otherwise a spread would publish `undefined` exports and
  // break the module for callers that legitimately import nothing else.
  //
  // Note these wrappers see only calls made THROUGH the module boundary. When
  // `scoreBM25` is itself a shim over prepare+score, its internal calls resolve
  // to the module's own local bindings, not to these — so a single-shot
  // `scoreBM25` still counts as exactly one preparation and one pass.
  if (typeof actual.prepareBM25Corpus === "function") {
    wrapped.prepareBM25Corpus = (items: Item[]) => {
      c.bm25Prepares++;
      c.bm25DocsTokenized += items.length;
      return (actual.prepareBM25Corpus as Prepare)(items);
    };
  }
  if (typeof actual.scoreBM25Prepared === "function") {
    wrapped.scoreBM25Prepared = (query: string, corpus: unknown) => {
      // A pass with no tokenization — the entire point of a shared corpus.
      c.bm25Passes++;
      return (actual.scoreBM25Prepared as ScorePrepared)(query, corpus);
    };
  }
  return wrapped;
});

vi.mock("../../../../src/lib/db/chat/operations", async (importActual) => {
  const actual = await importActual<Record<string, unknown>>();
  const { counters: c } = await import("./counters");
  type Search = (...args: unknown[]) => Promise<unknown[]>;
  return {
    ...actual,
    searchChunksOp: async (...args: unknown[]) => {
      c.chunkSearches++;
      const results = await (actual.searchChunksOp as Search)(...args);
      c.chunkHits += results.length;
      return results;
    },
  };
});

vi.mock("../../../../src/lib/db/entities/operations", async (importActual) => {
  const actual = await importActual<Record<string, unknown>>();
  const { counters: c } = await import("./counters");
  type Lookup = (...args: unknown[]) => Promise<Map<string, Set<string>>>;
  return {
    ...actual,
    getMemoriesByEntityNamesOp: async (...args: unknown[]) => {
      c.entityLookups++;
      const result = await (actual.getMemoriesByEntityNamesOp as Lookup)(...args);
      c.entityMemories += result.size;
      return result;
    },
  };
});

vi.mock("../../../../src/lib/memory/reranker", async (importActual) => {
  const actual = await importActual<Record<string, unknown>>();
  const { counters: c } = await import("./counters");
  // Deterministic stand-in for the cross-encoder. The real one lazy-downloads a
  // ~25MB transformers.js model on first call, which no PR-time gate can pay
  // for. Token-overlap is enough: what is being measured is how many pairs the
  // pipeline routes through this stage, not what the model says about them.
  const tokens = (s: string) => new Set(s.toLowerCase().match(/[a-z0-9]+/g) ?? []);
  return {
    ...actual,
    preloadReranker: async () => {},
    rerankPairs: async (query: string, items: Array<{ id: string; content: string }>) => {
      c.rerankCalls++;
      c.rerankPairs += items.length;
      const q = tokens(query);
      return items
        .map((item) => {
          const d = tokens(item.content);
          let shared = 0;
          for (const t of q) if (d.has(t)) shared++;
          return { id: item.id, content: item.content, score: shared / (q.size || 1) };
        })
        .sort((a, b) => b.score - a.score);
    },
  };
});

import { createChunkVectorCache } from "../../../../src/lib/memory/chunkVectorCache";
import { recall } from "../../../../src/lib/memory/recall";
import { retain } from "../../../../src/lib/memory/retain";
import type { RecallDiagnostics, RecallOptions } from "../../../../src/lib/memory/types";
import type { VaultEmbeddingCache } from "../../../../src/lib/memoryVault/searchTool";
import {
  buildFacts,
  createWorld,
  NOW,
  PERF_CONFIG,
  type PerfWorld,
  RETAIN_BATCH_CONTENTS,
  RETAIN_NOVEL_CONTENT,
  seedChunks,
  seedTombstones,
  seedVault,
  TEMPORAL_QUERY,
  TOMBSTONE_CONTENT,
} from "./fixtures";

const BASELINE_PATH = join(dirname(fileURLToPath(import.meta.url)), "baseline.json");
const SAVE_BASELINE = process.env.PERF_SAVE_BASELINE === "1";

/**
 * Queries. All but the temporal one are lowercase and built from a single
 * template's vocabulary, so each hits the lane it is named for and scores far
 * from `minSimilarity` on everything else.
 *
 * They do NOT keep the graph lane out. `extractQueryEntities` gained a lowercase
 * fallback, so every query here yields seed names and every recall pays exactly
 * one `getMemoriesByEntityNamesOp` — visible as `entityLookups=1` on every row of
 * the report. On the lowercase queries it resolves nothing (the corpus links only
 * proper nouns), so the lookup is pure cost; that is precisely why it is gated in
 * every recall scenario rather than only in the graph one.
 */
const FACT_QUERY_A = "which tooling is used for provisioning";
const FACT_QUERY_B = "what does the espresso routine look like";
const COMPOSITE_QUERY = "what tooling and drinks come up around provisioning work";
const CHUNK_QUERY = "we reviewed the rollout and agreed to revisit onboarding";

/**
 * Canned `decomposeQuery` response. The decomposer takes an injectable `fetchFn`
 * (that is how the repo's other tests drive portal LLM calls), so the real
 * classify/validate code runs — only the round-trip is faked.
 */
function decomposeFetch(subQueries: string[]): typeof fetch {
  const content = JSON.stringify({ mode: "composite", subQueries });
  return (async () => ({
    ok: true,
    status: 200,
    json: async () => ({ choices: [{ message: { content } }] }),
  })) as unknown as typeof fetch;
}

const SUB_QUERIES = [
  "which tooling is used for provisioning",
  "which drinks are preferred",
  "what happens on provisioning days",
];

const DECOMPOSE_OPTIONS = {
  apiKey: "perf-harness-no-network",
  fetchFn: decomposeFetch(SUB_QUERIES),
};

/** One scenario's numbers: the counters plus the two cache-derived metrics. */
type ScenarioNumbers = PerfCounters & {
  /** Vault embedding-cache entries gained — the legacy path's stored-vector parses. */
  vaultCacheAdds: number;
  /** Chunk-vector cache entries gained — messages that paid a decrypt + parse. */
  chunkCacheAdds: number;
};

/**
 * Advisory timing for one scenario. `phases` is recall's own D2 breakdown when
 * the scenario ran a recall; the write-path scenarios only have a wall time.
 * None of this is gated — see the file header.
 */
interface ScenarioTiming {
  wallMs: number;
  phases?: RecallDiagnostics["timings"];
}

const results = new Map<string, ScenarioNumbers>();
const timings = new Map<string, ScenarioTiming>();

/**
 * Run one scenario with zeroed counters, recording the counter delta plus the
 * growth of whichever caches it was handed.
 */
async function scenario(
  name: string,
  caches: { vaultCache?: VaultEmbeddingCache; chunkCache?: Map<string, unknown> },
  body: () => Promise<RecallDiagnostics | undefined>
): Promise<ScenarioNumbers> {
  resetCounters();
  const vaultBefore = caches.vaultCache?.size ?? 0;
  const chunkBefore = caches.chunkCache?.size ?? 0;
  const startedAt = performance.now();
  const diagnostics = await body();
  const wallMs = performance.now() - startedAt;
  const numbers: ScenarioNumbers = {
    ...snapshotCounters(),
    vaultCacheAdds: (caches.vaultCache?.size ?? 0) - vaultBefore,
    chunkCacheAdds: (caches.chunkCache?.size ?? 0) - chunkBefore,
  };
  results.set(name, numbers);
  timings.set(name, { wallMs, ...(diagnostics && { phases: diagnostics.timings }) });
  return numbers;
}

/** Capture recall's own phase timings (D2) without changing its behavior. */
function withDiagnostics(options: RecallOptions): {
  options: RecallOptions;
  read: () => RecallDiagnostics | undefined;
} {
  let seen: RecallDiagnostics | undefined;
  return {
    options: { ...options, onDiagnostics: (d) => (seen = d) },
    read: () => seen,
  };
}

/** A fresh, unbounded vault cache. A plain Map (not the LRU) so `size` is an
 * exact count of resident vectors rather than an eviction artifact. */
const freshVaultCache = (): VaultEmbeddingCache => new Map();

let readWorld: PerfWorld;
let facts: ReturnType<typeof buildFacts>;

/** Seed a world for the write-path scenarios. `retain()` mutates the vault, so
 * each write scenario gets its own so their counters stay independent. */
async function freshWriteWorld(): Promise<PerfWorld> {
  const world = createWorld();
  const ids = await seedVault(world, facts);
  await seedTombstones(world, ids);
  return world;
}

beforeAll(async () => {
  facts = buildFacts();
  readWorld = createWorld();
  const ids = await seedVault(readWorld, facts);
  await seedTombstones(readWorld, ids);
  await seedChunks(readWorld);
}, 120_000);

describe("memory work-cost scenarios", () => {
  it("fact lane, legacy whole-vault read (cold then warm cache)", async () => {
    const vaultCache = freshVaultCache();
    const ctx = { vaultCtx: readWorld.vaultCtx, embeddingOptions: { apiKey: "x" }, vaultCache };

    const cold = withDiagnostics({ types: ["fact"], budget: "low", limit: 8, now: NOW });
    const coldNumbers = await scenario("factLegacyCold", { vaultCache }, async () => {
      await recall(FACT_QUERY_A, ctx, cold.options);
      return cold.read();
    });

    const warm = withDiagnostics({ types: ["fact"], budget: "low", limit: 8, now: NOW });
    const warmNumbers = await scenario("factLegacyWarm", { vaultCache }, async () => {
      await recall(FACT_QUERY_B, ctx, warm.options);
      return warm.read();
    });

    // The instrument is attached: a whole-vault load, one decrypt per row, and
    // one stored vector parsed per row on the cold pass.
    expect(coldNumbers.vaultFullLoads).toBe(1);
    expect(coldNumbers.vaultFullRows).toBe(activeVaultSize());
    expect(coldNumbers.vaultDecrypts).toBe(activeVaultSize());
    expect(coldNumbers.vaultCacheAdds).toBe(activeVaultSize());
    // A non-zero writeback means the fixture's stored vectors stopped being
    // usable and the harness is re-embedding the corpus instead of reading it.
    expect(coldNumbers.vaultVectorWrites).toBe(0);
    expect(coldNumbers.embedTexts).toBe(1);

    // The point of the pair: a warm cache saves the vector parses and NOTHING
    // else. The load and the per-row decrypt are paid again in full.
    expect(warmNumbers.vaultCacheAdds).toBe(0);
    expect(warmNumbers.vaultFullRows).toBe(activeVaultSize());
    expect(warmNumbers.vaultDecrypts).toBe(activeVaultSize());
  });

  it("fact lane, projected decrypt-last read (cold then warm cache)", async () => {
    const vaultCache = freshVaultCache();
    const ctx = { vaultCtx: readWorld.vaultCtx, embeddingOptions: { apiKey: "x" }, vaultCache };

    const cold = withDiagnostics({
      types: ["fact"],
      budget: "low",
      limit: 8,
      now: NOW,
      decryptLast: true,
    });
    const coldNumbers = await scenario("factProjectedCold", { vaultCache }, async () => {
      await recall(FACT_QUERY_A, ctx, cold.options);
      return cold.read();
    });

    const warm = withDiagnostics({
      types: ["fact"],
      budget: "low",
      limit: 8,
      now: NOW,
      decryptLast: true,
    });
    const warmNumbers = await scenario("factProjectedWarm", { vaultCache }, async () => {
      await recall(FACT_QUERY_B, ctx, warm.options);
      return warm.read();
    });

    // No whole-vault load at all; the key scan replaces it.
    expect(coldNumbers.vaultFullLoads).toBe(0);
    expect(coldNumbers.vaultKeyRows).toBe(activeVaultSize());
    // Vectors are parsed once, then never again.
    expect(coldNumbers.vaultVectorRows).toBe(activeVaultSize());
    expect(warmNumbers.vaultVectorRows).toBe(0);
    // Decrypt is bounded by the admission window, not the vault, on both passes.
    expect(coldNumbers.vaultDecrypts).toBeLessThan(activeVaultSize() / 10);
    expect(warmNumbers.vaultDecrypts).toBe(coldNumbers.vaultDecrypts);

    // Liveness. Everything above is an upper bound, and this gate only fires on
    // MORE work — so an admission window that broke and admitted nothing would
    // satisfy every assertion here and read as the best result the harness has
    // ever recorded. The other lanes pin their yield explicitly; the fact lane
    // needs the same floor.
    expect(coldNumbers.vaultRowRows).toBeGreaterThan(0);
    expect(coldNumbers.vaultDecrypts).toBeGreaterThan(0);
    expect(warmNumbers.vaultRowRows).toBeGreaterThan(0);
  });

  it("composite recall re-tokenizes the corpus once per facet", async () => {
    const vaultCache = freshVaultCache();
    const ctx = { vaultCtx: readWorld.vaultCtx, embeddingOptions: { apiKey: "x" }, vaultCache };
    const run = withDiagnostics({
      types: ["fact"],
      budget: "high",
      limit: 8,
      now: NOW,
      decomposeOptions: DECOMPOSE_OPTIONS,
    });
    const numbers = await scenario("compositeHigh", { vaultCache }, async () => {
      await recall(COMPOSITE_QUERY, ctx, run.options);
      return run.read();
    });

    // One ranking pass for the original query plus one per sub-query. This is a
    // property of the pipeline's SHAPE, so it holds whether each pass tokenizes
    // its own corpus or shares a prepared one — hoisting the tokenization out of
    // the loop must not change how many times the ranker ranks. If this number
    // drops, a facet stopped being ranked, which is a behavior change wearing a
    // performance change's clothes.
    expect(numbers.bm25Passes).toBe(1 + SUB_QUERIES.length);

    // Tokenization is the axis a tokenize-once index actually moves, so it is
    // bounded rather than pinned: at least one full pass over the candidate set
    // (zero would mean BM25 admission silently stopped running), at most one per
    // ranking pass (the naive every-pass-re-tokenizes ceiling). The committed
    // baseline pins the exact number inside that window, so a change that moves
    // it still has to be looked at — this only keeps the ceiling from being
    // mistaken for a requirement.
    expect(numbers.bm25DocsTokenized).toBeGreaterThanOrEqual(activeVaultSize());
    expect(numbers.bm25DocsTokenized).toBeLessThanOrEqual(numbers.bm25Passes * activeVaultSize());
    // Every preparation tokenizes the whole candidate set exactly once, so the
    // two counters must stay consistent; a mismatch means a corpus was prepared
    // from something other than the full admission set.
    expect(numbers.bm25DocsTokenized).toBe(numbers.bm25Prepares * activeVaultSize());
    // The cross-encoder stage is actually reached (otherwise `rerankPairs`
    // would sit at 0 and look like a free pipeline).
    expect(numbers.rerankCalls).toBeGreaterThan(0);
    expect(numbers.rerankPairs).toBeGreaterThan(0);
  });

  it("graph + temporal lanes on top of the fact lane", async () => {
    const vaultCache = freshVaultCache();
    const ctx = {
      vaultCtx: readWorld.vaultCtx,
      entityCtx: readWorld.entityCtx,
      embeddingOptions: { apiKey: "x" },
      vaultCache,
    };
    const run = withDiagnostics({ types: ["fact"], budget: "low", limit: 8, now: NOW });
    const numbers = await scenario("graphTemporal", { vaultCache }, async () => {
      await recall(TEMPORAL_QUERY, ctx, run.options);
      return run.read();
    });

    // Both auxiliary lanes must actually return something — a lane that
    // silently degraded to empty would show up as CHEAPER, which a
    // lower-is-better gate would happily accept.
    expect(numbers.entityLookups).toBe(1);
    expect(numbers.entityMemories).toBeGreaterThan(0);
    expect(numbers.temporalScans).toBe(1);
    expect(numbers.temporalRows).toBe(PERF_CONFIG.temporalFactsInWindow);
    expect(numbers.vaultActiveIdScans).toBe(1);
  });

  it("chunk lane, cold then warm chunk-vector cache", async () => {
    const vaultCache = freshVaultCache();
    const chunkCache = createChunkVectorCache();
    const ctx = {
      vaultCtx: readWorld.vaultCtx,
      storageCtx: readWorld.storageCtx,
      embeddingOptions: { apiKey: "x" },
      vaultCache,
      chunkCache,
    };

    const cold = withDiagnostics({ types: ["fact", "chunk"], budget: "low", limit: 8, now: NOW });
    const coldNumbers = await scenario("chunkLaneCold", { vaultCache, chunkCache }, async () => {
      await recall(CHUNK_QUERY, ctx, cold.options);
      return cold.read();
    });

    const warm = withDiagnostics({ types: ["fact", "chunk"], budget: "low", limit: 8, now: NOW });
    const warmNumbers = await scenario("chunkLaneWarm", { vaultCache, chunkCache }, async () => {
      await recall(CHUNK_QUERY, ctx, warm.options);
      return warm.read();
    });

    // Cold pass decrypts + parses every message's chunk vectors; warm pays none.
    expect(coldNumbers.chunkCacheAdds).toBe(PERF_CONFIG.chunkMessages);
    expect(warmNumbers.chunkCacheAdds).toBe(0);
    expect(coldNumbers.chunkHits).toBeGreaterThan(0);
    expect(warmNumbers.chunkHits).toBe(coldNumbers.chunkHits);
  });

  it("retain write-path amplification (create / merge / tombstone / batch)", async () => {
    const create = await freshWriteWorld();
    const createNumbers = await scenario("retainCreate", {}, async () => {
      await retain(RETAIN_NOVEL_CONTENT, {
        vaultCtx: create.vaultCtx,
        embeddingOptions: { apiKey: "x" },
        vaultCache: freshVaultCache(),
      });
      return undefined;
    });

    const merge = await freshWriteWorld();
    const mergeNumbers = await scenario("retainMerge", {}, async () => {
      // The first corpus fact verbatim: it is live (the soft-deleted slice is
      // the tail), so it scores 1.0 against itself and takes the auto-merge
      // path — which pays the same whole-vault read as a create.
      await retain(facts[0].content, {
        vaultCtx: merge.vaultCtx,
        embeddingOptions: { apiKey: "x" },
        vaultCache: freshVaultCache(),
      });
      return undefined;
    });

    const tombstone = await freshWriteWorld();
    const tombstoneNumbers = await scenario("retainTombstone", {}, async () => {
      await retain(
        TOMBSTONE_CONTENT,
        {
          vaultCtx: tombstone.vaultCtx,
          embeddingOptions: { apiKey: "x" },
          vaultCache: freshVaultCache(),
        },
        { respectTombstones: true }
      );
      return undefined;
    });

    const batch = await freshWriteWorld();
    const batchCache = freshVaultCache();
    const batchNumbers = await scenario("retainBatch10", {}, async () => {
      for (const content of RETAIN_BATCH_CONTENTS) {
        await retain(content, {
          vaultCtx: batch.vaultCtx,
          embeddingOptions: { apiKey: "x" },
          vaultCache: batchCache,
        });
      }
      return undefined;
    });

    // One novel fact costs a whole-vault load + a decrypt of every row.
    expect(createNumbers.vaultFullLoads).toBe(1);
    expect(createNumbers.vaultFullRows).toBe(activeVaultSize());
    expect(createNumbers.vaultCreates).toBe(1);
    // A re-observed fact merges instead of inserting — same read cost.
    expect(mergeNumbers.vaultUpdates).toBe(1);
    expect(mergeNumbers.vaultCreates).toBe(0);
    // `respectTombstones` buys a SECOND whole-vault load, this one including
    // the soft-deleted rows.
    expect(tombstoneNumbers.vaultFullLoads).toBe(2);
    expect(tombstoneNumbers.vaultCreates).toBe(0);
    // Ten facts, ten full scans — the write-path amplification this measures.
    expect(batchNumbers.vaultFullLoads).toBe(10);
    expect(batchNumbers.vaultFullRows).toBeGreaterThanOrEqual(10 * activeVaultSize());
  });
});

describe("regression gate", () => {
  it("can see an order-of-magnitude change in read cost", () => {
    // The instrument's own sensitivity proof. A harness that reports the same
    // numbers for the whole-vault read and the projected decrypt-last read
    // cannot adjudicate the perf work it exists to adjudicate — and a reviewer
    // has no way to tell that apart from "the change didn't help". Assert the
    // separation the two paths are SUPPOSED to have, so a future refactor that
    // quietly collapses them fails here rather than passing a flat gate.
    const legacy = required("factLegacyCold");
    const projected = required("factProjectedCold");
    const legacyWarm = required("factLegacyWarm");
    const projectedWarm = required("factProjectedWarm");

    // Guard the denominators first. Every ratio below divides by the projected
    // path's cost, and 0 would make the division Infinity — which sails past a
    // `toBeGreaterThan` and would report a totally broken lane as the widest win
    // the harness has ever measured.
    expect(projected.vaultDecrypts).toBeGreaterThan(0);
    expect(projectedWarm.vaultDecrypts).toBeGreaterThan(0);
    expect(projected.bm25DocsTokenized).toBeGreaterThan(0);

    // Decrypt fan-out: whole vault vs a bounded admission window.
    expect(legacy.vaultDecrypts / projected.vaultDecrypts).toBeGreaterThan(10);
    expect(legacyWarm.vaultDecrypts / projectedWarm.vaultDecrypts).toBeGreaterThan(10);
    // BM25 tokenization: whole vault vs the decrypted window.
    expect(legacy.bm25DocsTokenized / projected.bm25DocsTokenized).toBeGreaterThan(10);
    // Stored-vector parses: both pay them once, neither pays them twice.
    expect(legacy.vaultCacheAdds).toBe(projected.vaultVectorRows);
    expect(legacyWarm.vaultCacheAdds + projectedWarm.vaultVectorRows).toBe(0);
  });

  it("is deterministic: a second run of the legacy fact lane produces identical counters", async () => {
    // Also the harness's own smoke test. If a module wrapper silently failed to
    // attach, or a code path picked up wall-clock/`Math.random` somewhere, this
    // is where it shows.
    const world = createWorld();
    await seedVault(world, facts);
    const vaultCache = freshVaultCache();
    const ctx = { vaultCtx: world.vaultCtx, embeddingOptions: { apiKey: "x" }, vaultCache };
    resetCounters();
    await recall(FACT_QUERY_A, ctx, { types: ["fact"], budget: "low", limit: 8, now: NOW });
    const first = snapshotCounters();

    const world2 = createWorld();
    await seedVault(world2, facts);
    const cache2 = freshVaultCache();
    resetCounters();
    await recall(
      FACT_QUERY_A,
      { vaultCtx: world2.vaultCtx, embeddingOptions: { apiKey: "x" }, vaultCache: cache2 },
      { types: ["fact"], budget: "low", limit: 8, now: NOW }
    );
    expect(snapshotCounters()).toEqual(first);
  }, 120_000);

  it("matches the committed baseline", () => {
    const run = flattenResults();
    printReport(run);

    if (SAVE_BASELINE) {
      const baseline = buildGateBaseline([run], GATE_METRICS, gateConfig());
      writeFileSync(BASELINE_PATH, JSON.stringify(baseline, null, 2) + "\n");
      console.error(`\n  Baseline written to ${BASELINE_PATH}.\n`);
      return;
    }

    const parsed: unknown = JSON.parse(readFileSync(BASELINE_PATH, "utf-8"));
    // A wrong-shaped file must fail loudly: the gate SKIPS metrics a baseline
    // doesn't carry (so adding one doesn't invalidate every committed file),
    // which means a malformed baseline would otherwise pass vacuously.
    //
    // The message matters as much as the check. `gate.ts` is shared with the
    // other memory evals, and when its band shape changes this file becomes
    // invalid without anything in this directory being touched — a bare
    // "expected false to be true" sends whoever hits it looking for a bug in the
    // harness instead of at a baseline that just needs regenerating.
    expect(
      isValidGateBaseline(parsed, GATE_METRICS)
        ? null
        : `${BASELINE_PATH} is not a valid baseline for the current gate shape ` +
            `(test/memory/src/gate.ts). If the shared gate changed, regenerate with ` +
            `PERF_SAVE_BASELINE=1 pnpm perf:memory`
    ).toBeNull();
    const baseline = parsed as GateBaseline;

    // Counts only mean something against the corpus that produced them.
    const mismatch = describeConfigMismatch(baseline, gateConfig());
    expect(
      mismatch === null
        ? null
        : `${mismatch}. Regenerate with PERF_SAVE_BASELINE=1 pnpm perf:memory`
    ).toBeNull();

    const regressions = compareToGateBaseline([run], baseline, GATE_METRICS);
    if (regressions.length > 0) {
      // No trailing newline on the header: the workflow lifts this block out of
      // the log with `sed -n '/MORE WORK/,/^$/p'`, so a blank line here ends the
      // range before the table and the step summary shows a header with nothing
      // under it. The blank line belongs after the table, not before it.
      console.error("\n  MORE WORK THAN THE BASELINE");
      console.error(formatGateRegressions(regressions));
      console.error("");
    }
    expect(regressions.map((r) => r.label)).toEqual([]);

    // The other direction. A lower-better gate only fails upward, so an
    // optimization that lands without regenerating the baseline leaves the old,
    // higher number in place as the ceiling — and every subsequent increase back
    // up to it passes. Concretely: once #756 takes compositeHigh tokenization
    // from 3760 to 940, a later change could quadruple it back to 3760 and this
    // gate would stay green.
    //
    // So a material improvement is treated as "the baseline is stale", not as a
    // pass. It fails the PR that earned the win, which is the right place to pay
    // it — that author has the numbers in hand and the regeneration is one
    // command — and it keeps the ceiling ratcheting down on its own instead of
    // depending on someone remembering.
    const stale = GATE_METRICS.flatMap((spec) => {
      const band = baseline.metrics[spec.key];
      const current = run[spec.key];
      if (band === undefined || current === undefined) return [];
      return current < band.mean - spec.minTolerance
        ? [`${spec.label ?? spec.key}: ${band.mean} → ${current}`]
        : [];
    });
    if (stale.length > 0) {
      console.error("\n  LESS WORK THAN THE BASELINE — the committed baseline is stale");
      console.error(stale.map((line) => `    ${line}`).join("\n"));
      console.error("");
    }
    expect(
      stale.length === 0
        ? null
        : `${stale.length} metric(s) now do less work than the committed baseline, ` +
            `which leaves headroom a later regression could hide in. Regenerate with ` +
            `PERF_SAVE_BASELINE=1 pnpm perf:memory and commit the result.`
    ).toBeNull();
  });
});

// ─── gate wiring ────────────────────────────────────────────────────────────

/** Rows the vault holds after the tombstone slice is soft-deleted. */
function activeVaultSize(): number {
  return PERF_CONFIG.vaultFacts - PERF_CONFIG.deletedFacts;
}

/**
 * Which counters each scenario gates on. A curated list rather than the full
 * cross-product: a baseline nobody can read is a baseline nobody maintains.
 * Every entry is a cost — more of it is a regression — so all specs are
 * lower-better with a zero tolerance, which the counters' determinism earns.
 * Lane YIELD (`entityMemories`, `temporalRows`, `chunkHits`) is deliberately
 * NOT gated: a lane that broke and returned nothing would read as an
 * improvement here. The per-scenario assertions above pin that instead.
 *
 * Curation cuts both ways, though, and the rule that keeps it honest is: every
 * scenario gates every PER-RECALL SCAN it performs, even when that scan is
 * incidental to what the scenario is nominally about. A scan gated in only one
 * scenario is a scan that can be silently added to all the others.
 *
 * `entityLookups` is why that rule is written down. The graph lane looks like it
 * only concerns `graphTemporal`, but #763 gave `extractQueryEntities` a lowercase
 * fallback, and the effect is that EVERY recall in this suite now pays an entity
 * lookup — including the four fact-lane scenarios and both chunk-lane ones, where
 * it resolves nothing and is pure overhead. Gating it only where the graph lane is
 * the subject would have let that land without a single gated metric moving. Cost
 * that shows up in a lane the scenario isn't "about" is still cost that ships.
 *
 * The one counter applied unevenly on purpose is the stored-vector parse, which
 * has a different proxy per read path: on the legacy path it is `vaultCacheAdds`
 * (the parse is inline in `searchTool.ts`, so the cache's growth is the only
 * observable), and on the projected path it is `vaultVectorRows`, which is the
 * parse count directly. Gating both everywhere would pin the same number twice.
 */
const GATED: ReadonlyArray<readonly [string, readonly (keyof ScenarioNumbers)[]]> = [
  [
    "factLegacyCold",
    [
      "vaultFullLoads",
      "vaultFullRows",
      "vaultDecrypts",
      "vaultCacheAdds",
      "vaultVectorWrites",
      "entityLookups",
      "bm25Passes",
      "bm25Prepares",
      "bm25DocsTokenized",
      "embedTexts",
    ],
  ],
  [
    "factLegacyWarm",
    [
      "vaultFullLoads",
      "vaultFullRows",
      "vaultDecrypts",
      "vaultCacheAdds",
      "entityLookups",
      "bm25Passes",
      "bm25Prepares",
      "bm25DocsTokenized",
      "embedTexts",
    ],
  ],
  [
    "factProjectedCold",
    [
      "vaultFullLoads",
      "vaultKeyScans",
      "vaultKeyRows",
      "vaultVectorLoads",
      "vaultVectorRows",
      "vaultRowLoads",
      "vaultRowRows",
      "vaultDecrypts",
      "entityLookups",
      "bm25Passes",
      "bm25Prepares",
      "bm25DocsTokenized",
      "embedTexts",
    ],
  ],
  [
    "factProjectedWarm",
    [
      "vaultFullLoads",
      "vaultKeyScans",
      "vaultKeyRows",
      "vaultVectorRows",
      "vaultRowLoads",
      "vaultRowRows",
      "vaultDecrypts",
      "entityLookups",
      "bm25Passes",
      "bm25Prepares",
      "bm25DocsTokenized",
      "embedTexts",
    ],
  ],
  [
    "compositeHigh",
    [
      "vaultFullLoads",
      "vaultFullRows",
      "vaultCacheAdds",
      "bm25Passes",
      "bm25Prepares",
      "bm25DocsTokenized",
      "rerankCalls",
      "rerankPairs",
      "embedTexts",
      "vaultDecrypts",
      "vaultCounts",
      "entityLookups",
    ],
  ],
  [
    "graphTemporal",
    [
      "vaultFullLoads",
      "vaultFullRows",
      "vaultCacheAdds",
      "entityLookups",
      "temporalScans",
      "vaultActiveIdScans",
      "vaultDecrypts",
      "bm25Passes",
      "bm25Prepares",
      "bm25DocsTokenized",
      "embedTexts",
    ],
  ],
  [
    "chunkLaneCold",
    [
      "vaultFullLoads",
      "vaultFullRows",
      "vaultCacheAdds",
      "chunkSearches",
      "chunkCacheAdds",
      "embedTexts",
      "vaultDecrypts",
      "entityLookups",
      "bm25Passes",
      "bm25Prepares",
      "bm25DocsTokenized",
    ],
  ],
  [
    "chunkLaneWarm",
    [
      "vaultFullLoads",
      "vaultFullRows",
      "vaultCacheAdds",
      "chunkSearches",
      "chunkCacheAdds",
      "vaultDecrypts",
      "entityLookups",
      "bm25Passes",
      "bm25Prepares",
      "bm25DocsTokenized",
      "embedTexts",
    ],
  ],
  [
    "retainCreate",
    ["vaultFullLoads", "vaultFullRows", "vaultDecrypts", "embedTexts", "vaultCreates"],
  ],
  [
    "retainMerge",
    ["vaultFullLoads", "vaultFullRows", "vaultDecrypts", "embedTexts", "vaultUpdates"],
  ],
  ["retainTombstone", ["vaultFullLoads", "vaultFullRows", "vaultDecrypts", "embedTexts"]],
  [
    "retainBatch10",
    ["vaultFullLoads", "vaultFullRows", "vaultDecrypts", "embedTexts", "vaultCreates"],
  ],
];

const GATE_METRICS: GateMetricSpec[] = GATED.flatMap(([name, keys]) =>
  keys.map((key) => ({
    key: `${name}.${key}`,
    direction: "lower-better" as const,
    // Zero: these are integer counts of work, not samples of a noisy process.
    // One extra decrypt IS the regression.
    minTolerance: 0,
    format: "count" as const,
    label: `${name}.${key}`,
  }))
);

/** The corpus knobs the counts depend on. A mismatch refuses the comparison. */
function gateConfig() {
  return { ...PERF_CONFIG };
}

/** A scenario's recorded numbers, or a loud failure. Scenarios run in file
 * order, so a missing entry means an earlier `it` threw before recording. */
function required(name: string): ScenarioNumbers {
  const numbers = results.get(name);
  if (!numbers) throw new Error(`perf harness: scenario "${name}" never ran`);
  return numbers;
}

function flattenResults(): GateRun {
  const run: Record<string, number> = {};
  for (const [name, keys] of GATED) {
    const numbers = required(name);
    for (const key of keys) run[`${name}.${key}`] = numbers[key];
  }
  return run;
}

/**
 * Print the full counter table (not just the gated subset) plus recall's own
 * phase timings. Everything goes to stderr: this is for a human reading CI logs.
 */
function printReport(run: GateRun): void {
  const names = [...results.keys()];
  const width = Math.max(...names.map((n) => n.length));
  console.error("\n  Memory work-cost report");
  console.error(
    `  corpus: ${PERF_CONFIG.vaultFacts} facts (${PERF_CONFIG.deletedFacts} soft-deleted), ` +
      `${PERF_CONFIG.chunkMessages}×${PERF_CONFIG.chunksPerMessage} chunks, dim ${PERF_CONFIG.embedDim}\n`
  );
  for (const name of names) {
    const numbers = results.get(name)!;
    // Zero counters are omitted: a scenario touches maybe a third of the
    // registry, and printing the other two thirds as `=0` buries the signal.
    const interesting = (Object.entries(numbers) as Array<[string, number]>)
      .filter(([, v]) => v !== 0)
      .map(([k, v]) => `${k}=${v}`)
      .join(" ");
    console.error(`  ${name.padEnd(width)}  ${interesting}`);
    const t = timings.get(name);
    if (!t) continue;
    // Advisory only — see the file header for why wall-clock is never gated.
    const phases = t.phases
      ? `  (prep ${t.phases.prep.toFixed(0)} / fact ${t.phases.factLane.toFixed(0)} / ` +
        `chunk ${t.phases.chunkLane.toFixed(0)} / fuse ${t.phases.fuse.toFixed(0)})`
      : "";
    console.error(`  ${" ".repeat(width)}  ~${t.wallMs.toFixed(0)}ms wall, ungated${phases}`);
  }
  console.error(`\n  gated metrics: ${Object.keys(run).length}\n`);
}
