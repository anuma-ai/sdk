import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

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

  const wrapped: Record<string, unknown> = {
    ...actual,
    scoreBM25: (query: string, items: Item[]) => {
      c.bm25Passes++;
      c.bm25Prepares++;
      c.bm25DocsTokenized += items.length;
      return (actual.scoreBM25 as Score)(query, items);
    },
  };

  if (typeof actual.prepareBM25Corpus === "function") {
    wrapped.prepareBM25Corpus = (items: Item[]) => {
      c.bm25Prepares++;
      c.bm25DocsTokenized += items.length;
      return (actual.prepareBM25Corpus as Prepare)(items);
    };
  }
  if (typeof actual.scoreBM25Prepared === "function") {
    wrapped.scoreBM25Prepared = (query: string, corpus: unknown) => {
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

let failuresBeforeSave = 0;

afterEach((ctx) => {
  if (ctx.task.result?.state === "fail") failuresBeforeSave++;
});

const FACT_QUERY_A = "which tooling is used for provisioning";
const FACT_QUERY_B = "what does the espresso routine look like";
const COMPOSITE_QUERY = "what tooling and drinks come up around provisioning work";
const CHUNK_QUERY = "we reviewed the rollout and agreed to revisit onboarding";

const SUB_QUERIES = [
  "which tooling is used for provisioning",
  "which drinks are preferred",
  "what happens on provisioning days",
];

type ScenarioNumbers = PerfCounters & {
  vaultCacheAdds: number;
  chunkCacheAdds: number;
};

interface ScenarioTiming {
  wallMs: number;
  phases?: RecallDiagnostics["timings"];
}

const results = new Map<string, ScenarioNumbers>();
const timings = new Map<string, ScenarioTiming>();

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

const freshVaultCache = (): VaultEmbeddingCache => new Map();

let readWorld: PerfWorld;
let facts: ReturnType<typeof buildFacts>;

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

    expect(coldNumbers.vaultFullLoads).toBe(1);
    expect(coldNumbers.vaultFullRows).toBe(activeVaultSize());
    expect(coldNumbers.vaultDecrypts).toBe(activeVaultSize());
    expect(coldNumbers.vaultCacheAdds).toBe(activeVaultSize());
    expect(coldNumbers.vaultVectorWrites).toBe(0);
    expect(coldNumbers.embedTexts).toBe(1);

    expect(warmNumbers.vaultCacheAdds).toBe(0);
    expect(warmNumbers.vaultFullRows).toBe(activeVaultSize());
    expect(warmNumbers.vaultDecrypts).toBe(activeVaultSize());

    const coldDiag = cold.read();
    expect(coldDiag?.decryptLast).toBe(false);
    expect(coldDiag?.vaultRowsDecrypted).toBe(coldNumbers.vaultDecrypts);
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

    expect(coldNumbers.vaultFullLoads).toBe(0);
    expect(coldNumbers.vaultKeyRows).toBe(activeVaultSize());
    expect(coldNumbers.vaultVectorRows).toBe(activeVaultSize());
    expect(warmNumbers.vaultVectorRows).toBe(0);
    expect(coldNumbers.vaultDecrypts).toBeLessThan(activeVaultSize() / 10);
    expect(warmNumbers.vaultDecrypts).toBe(coldNumbers.vaultDecrypts);

    expect(coldNumbers.vaultRowRows).toBeGreaterThan(0);
    expect(coldNumbers.vaultDecrypts).toBeGreaterThan(0);
    expect(warmNumbers.vaultRowRows).toBeGreaterThan(0);

    const coldDiag = cold.read();
    expect(coldDiag?.decryptLast).toBe(true);
    expect(coldDiag?.vaultRowsDecrypted).toBe(coldNumbers.vaultDecrypts);
    expect(coldDiag?.vaultRowsDecrypted).toBeLessThan(coldDiag?.vaultSize ?? 0);
  });

  it("composite recall re-tokenizes the corpus once per facet", async () => {
    const vaultCache = freshVaultCache();
    const ctx = { vaultCtx: readWorld.vaultCtx, embeddingOptions: { apiKey: "x" }, vaultCache };
    const run = withDiagnostics({
      types: ["fact"],
      budget: "high",
      limit: 8,
      now: NOW,
      subQueries: SUB_QUERIES,
    });
    const numbers = await scenario("compositeHigh", { vaultCache }, async () => {
      await recall(COMPOSITE_QUERY, ctx, run.options);
      return run.read();
    });

    expect(numbers.bm25Passes).toBe(1 + SUB_QUERIES.length);

    expect(numbers.bm25DocsTokenized).toBeGreaterThanOrEqual(activeVaultSize());
    expect(numbers.bm25DocsTokenized).toBeLessThanOrEqual(numbers.bm25Passes * activeVaultSize());
    expect(numbers.bm25DocsTokenized).toBe(numbers.bm25Prepares * activeVaultSize());
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

    expect(createNumbers.vaultFullLoads).toBe(1);
    expect(createNumbers.vaultFullRows).toBe(activeVaultSize());
    expect(createNumbers.vaultCreates).toBe(1);
    expect(mergeNumbers.vaultUpdates).toBe(1);
    expect(mergeNumbers.vaultCreates).toBe(0);
    expect(tombstoneNumbers.vaultFullLoads).toBe(2);
    expect(tombstoneNumbers.vaultCreates).toBe(0);
    expect(batchNumbers.vaultFullLoads).toBe(10);
    expect(batchNumbers.vaultFullRows).toBeGreaterThanOrEqual(10 * activeVaultSize());
  });
});

describe("regression gate", () => {
  it("can see an order-of-magnitude change in read cost", () => {
    const legacy = required("factLegacyCold");
    const projected = required("factProjectedCold");
    const legacyWarm = required("factLegacyWarm");
    const projectedWarm = required("factProjectedWarm");

    expect(projected.vaultDecrypts).toBeGreaterThan(0);
    expect(projectedWarm.vaultDecrypts).toBeGreaterThan(0);
    expect(projected.bm25DocsTokenized).toBeGreaterThan(0);

    expect(legacy.vaultDecrypts / projected.vaultDecrypts).toBeGreaterThan(10);
    expect(legacyWarm.vaultDecrypts / projectedWarm.vaultDecrypts).toBeGreaterThan(10);
    expect(legacy.bm25DocsTokenized / projected.bm25DocsTokenized).toBeGreaterThan(10);
    expect(legacy.vaultCacheAdds).toBe(projected.vaultVectorRows);
    expect(legacyWarm.vaultCacheAdds + projectedWarm.vaultVectorRows).toBe(0);
  });

  it("is deterministic: a second run of the legacy fact lane produces identical counters", async () => {
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
      expect(
        failuresBeforeSave === 0
          ? null
          : `${failuresBeforeSave} earlier test(s) failed, so the counters this run measured ` +
              `cannot be trusted as a baseline. Fix the failures, then re-run ` +
              `PERF_SAVE_BASELINE=1 pnpm perf:memory. Nothing was written.`
      ).toBeNull();

      const baseline = buildGateBaseline([run], GATE_METRICS, gateConfig());
      writeFileSync(BASELINE_PATH, JSON.stringify(baseline, null, 2) + "\n");
      console.error(`\n  Baseline written to ${BASELINE_PATH}.\n`);
      return;
    }

    const parsed: unknown = JSON.parse(readFileSync(BASELINE_PATH, "utf-8"));
    expect(
      isValidGateBaseline(parsed, GATE_METRICS)
        ? null
        : `${BASELINE_PATH} is not a valid baseline for the current gate shape ` +
            `(test/memory/src/gate.ts). If the shared gate changed, regenerate with ` +
            `PERF_SAVE_BASELINE=1 pnpm perf:memory`
    ).toBeNull();
    const baseline = parsed as GateBaseline;

    const mismatch = describeConfigMismatch(baseline, gateConfig());
    expect(
      mismatch === null
        ? null
        : `${mismatch}. Regenerate with PERF_SAVE_BASELINE=1 pnpm perf:memory`
    ).toBeNull();

    const regressions = compareToGateBaseline([run], baseline, GATE_METRICS);

    const stale = GATE_METRICS.flatMap((spec) => {
      const band = baseline.metrics[spec.key];
      const current = run[spec.key];
      if (band === undefined || current === undefined) return [];
      return current < band.mean - spec.minTolerance
        ? [`${spec.label ?? spec.key}: ${band.mean} → ${current}`]
        : [];
    });

    if (regressions.length > 0) {
      console.error("\n  MORE WORK THAN THE BASELINE");
      console.error(formatGateRegressions(regressions));
      console.error("");
    }
    if (stale.length > 0) {
      console.error("\n  LESS WORK THAN THE BASELINE — the committed baseline is stale");
      console.error(stale.map((line) => `    ${line}`).join("\n"));
      console.error("");
    }

    expect(regressions.map((r) => r.label)).toEqual([]);
    expect(
      stale.length === 0
        ? null
        : `${stale.length} metric(s) now do less work than the committed baseline, ` +
            `which leaves headroom a later regression could hide in. Regenerate with ` +
            `PERF_SAVE_BASELINE=1 pnpm perf:memory and commit the result.`
    ).toBeNull();
  });
});

function activeVaultSize(): number {
  return PERF_CONFIG.vaultFacts - PERF_CONFIG.deletedFacts;
}

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
      "embedQueries",
      "embedBatches",
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
      "embedQueries",
      "embedBatches",
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
      "embedQueries",
      "embedBatches",
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
      "embedQueries",
      "embedBatches",
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
      "embedQueries",
      "embedBatches",
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
      "embedQueries",
      "embedBatches",
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
      "embedQueries",
      "embedBatches",
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
      "embedQueries",
      "embedBatches",
      "embedTexts",
    ],
  ],
  [
    "retainCreate",
    [
      "vaultFullLoads",
      "vaultFullRows",
      "vaultDecrypts",
      "embedQueries",
      "embedBatches",
      "embedTexts",
      "vaultCreates",
    ],
  ],
  [
    "retainMerge",
    [
      "vaultFullLoads",
      "vaultFullRows",
      "vaultDecrypts",
      "embedQueries",
      "embedBatches",
      "embedTexts",
      "vaultUpdates",
    ],
  ],
  [
    "retainTombstone",
    [
      "vaultFullLoads",
      "vaultFullRows",
      "vaultDecrypts",
      "embedQueries",
      "embedBatches",
      "embedTexts",
    ],
  ],
  [
    "retainBatch10",
    [
      "vaultFullLoads",
      "vaultFullRows",
      "vaultDecrypts",
      "embedQueries",
      "embedBatches",
      "embedTexts",
      "vaultCreates",
    ],
  ],
];

const GATE_METRICS: GateMetricSpec[] = GATED.flatMap(([name, keys]) =>
  keys.map((key) => ({
    key: `${name}.${key}`,
    direction: "lower-better" as const,
    minTolerance: 0,
    format: "count" as const,
    label: `${name}.${key}`,
  }))
);

function gateConfig() {
  return { ...PERF_CONFIG };
}

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
    const interesting = (Object.entries(numbers) as Array<[string, number]>)
      .filter(([, v]) => v !== 0)
      .map(([k, v]) => `${k}=${v}`)
      .join(" ");
    console.error(`  ${name.padEnd(width)}  ${interesting}`);
    const t = timings.get(name);
    if (!t) continue;
    const phases = t.phases
      ? `  (prep ${t.phases.prep.toFixed(0)} / fact ${t.phases.factLane.toFixed(0)}` +
        `(ce ${t.phases.rerank.toFixed(0)}, embed ${t.phases.queryEmbed.toFixed(0)}) / ` +
        `chunk ${t.phases.chunkLane.toFixed(0)} / fuse ${t.phases.fuse.toFixed(0)})`
      : "";
    console.error(`  ${" ".repeat(width)}  ~${t.wallMs.toFixed(0)}ms wall, ungated${phases}`);
  }
  console.error(`\n  gated metrics: ${Object.keys(run).length}\n`);
}
