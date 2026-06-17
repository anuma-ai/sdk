#!/usr/bin/env node
/**
 * Vault Search Benchmark
 *
 * Measures retrieval quality of the vault search system using real embeddings.
 * Runs against a curated dataset of ~80 memories and ~68 queries across six
 * challenge categories: direct recall, paraphrase, specificity, temporal,
 * composite, and hard negatives.
 *
 * Metrics:
 *   - Recall@k: fraction of expected memories that appear in top-k results
 *   - Precision@k: fraction of top-k results that are expected memories
 *   - MRR: mean reciprocal rank of the first expected memory
 *   - NDCG@k: normalized discounted cumulative gain (ranking quality)
 *   - rankingViolationRate: fraction of queries where a superseded/wrong memory
 *     outranked the correct one (lower is better)
 *
 * Run:
 *   pnpm eval:vault-search
 *   pnpm eval:vault-search --json
 *   pnpm eval:vault-search --verbose
 *   pnpm eval:vault-search --save-baseline
 *   pnpm eval:vault-search --baseline test/memory/src/vault/baseline.json
 */

import "dotenv/config";
import { parseArgs } from "node:util";
import { readFile, writeFile } from "node:fs/promises";
import { generateEmbeddings } from "../../../../src/lib/memoryEngine/embeddings.js";
import type { EmbeddingOptions } from "../../../../src/lib/memoryEngine/types.js";
import {
  rankVaultMemories,
  rankFusedVaultMemories,
  rankFusedVaultMemoriesAsync,
  rankComposite,
  rankByEntityOverlap,
} from "../../../../src/lib/memoryVault/searchTool.js";
import type { DecomposedQuery } from "../../../../src/lib/memoryVault/decomposeQuery.js";
import { preloadReranker } from "../../../../src/lib/memory/reranker.js";
import {
  precisionAtK,
  recallAtK,
  reciprocalRank,
  ndcgAtK,
  bootstrapMeanCI,
  pairedBootstrapDelta,
} from "../metrics.js";
import {
  VAULT_MEMORIES,
  BENCHMARK_QUERIES,
  CATEGORIES,
  type BenchmarkQuery,
  type Category,
} from "./dataset.js";

const DEFAULT_BASELINE_PATH = "test/memory/src/vault/baseline.json";
const REGRESSION_METRICS = ["recallAtK", "precisionAtK", "mrr", "ndcg"] as const;

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------

const { values: args } = parseArgs({
  options: {
    json: { type: "boolean", default: false },
    verbose: { type: "boolean", default: false },
    output: { type: "string", short: "o" },
    category: { type: "string", short: "c" },
    max: { type: "string", short: "m" },
    baseline: { type: "string", short: "b" },
    "save-baseline": { type: "boolean", default: false },
    compare: { type: "string" },
    ranker: { type: "string", default: "cosine" },
    "recency-alpha": { type: "string" },
    rerank: { type: "boolean", default: false },
    "ce-weight": { type: "string" },
    mmr: { type: "boolean", default: false },
    "mmr-lambda": { type: "string" },
    graph: { type: "boolean", default: false },
    entities: { type: "string", default: "heuristic" },
    decompose: { type: "string", default: "off" },
  },
});

const RANKER_NAME = (args.ranker ?? "cosine").toLowerCase();
if (RANKER_NAME !== "cosine" && RANKER_NAME !== "fused") {
  console.error(`Invalid --ranker "${RANKER_NAME}". Expected "cosine" or "fused".`);
  process.exit(1);
}

const RECENCY_ALPHA = args["recency-alpha"] ? parseFloat(args["recency-alpha"]) : undefined;
const RERANK = !!args.rerank;
const CE_WEIGHT = args["ce-weight"] ? parseFloat(args["ce-weight"]) : undefined;
const USE_MMR = !!args.mmr;
const MMR_LAMBDA = args["mmr-lambda"] ? parseFloat(args["mmr-lambda"]) : undefined;
const USE_GRAPH = !!args.graph;
const ENTITY_MODE = args.entities ?? "heuristic";
if (ENTITY_MODE !== "heuristic" && ENTITY_MODE !== "llm") {
  console.error(`Invalid --entities "${ENTITY_MODE}". Expected "heuristic" or "llm".`);
  process.exit(1);
}
const DECOMPOSE_MODE = (args.decompose ?? "off").toLowerCase();
if (DECOMPOSE_MODE !== "off" && DECOMPOSE_MODE !== "llm") {
  console.error(`Invalid --decompose "${DECOMPOSE_MODE}". Expected "off" or "llm".`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// W5 — heuristic entity extraction (bench only).
//
// In production, the auto-extraction worker (W2) populates the entity table
// at write time. Here we approximate by pulling capitalized phrases plus
// numbers — close enough to validate that the graph lane gives a real lift
// on composite/multi-fact queries without needing hand-annotated data.
// ---------------------------------------------------------------------------
const ENTITY_STOPWORDS = new Set([
  "I",
  "He",
  "She",
  "They",
  "We",
  "It",
  "The",
  "This",
  "That",
  "There",
  "How",
  "What",
  "When",
  "Where",
  "Why",
  "Who",
  "Which",
  "Tell",
  "Give",
  "Describe",
  "Summarize",
  "Does",
  "Has",
  "Have",
  "Had",
  "User",
  "Users",
]);

function heuristicEntities(text: string): Set<string> {
  const out = new Set<string>();
  const phraseRe = /\b[A-Z][a-zA-Z][a-zA-Z]*(?:\s+[A-Z][a-zA-Z]+)*\b/g;
  const matches = text.match(phraseRe) ?? [];
  for (const m of matches) {
    if (ENTITY_STOPWORDS.has(m)) continue;
    out.add(m.toLowerCase());
  }
  const techRe = /\b[a-z]+\d+\b|\b\d{4}\b/gi;
  const tech = text.match(techRe) ?? [];
  for (const t of tech) out.add(t.toLowerCase());
  return out;
}

let llmCache: Record<string, string[]> | null = null;
function loadLlmCache(): Record<string, string[]> {
  if (llmCache !== null) return llmCache;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    llmCache = require("./llm-entities.json") as Record<string, string[]>;
  } catch {
    console.error(
      "Missing test/memory/src/vault/llm-entities.json — " +
        "run: PORTAL_API_KEY=... npx tsx scripts/precompute-bench-entities.ts"
    );
    process.exit(1);
  }
  return llmCache!;
}

function extractEntities(text: string): Set<string> {
  if (ENTITY_MODE === "llm") {
    const cache = loadLlmCache();
    const entities = cache[text] ?? [];
    return new Set(entities.map((e) => e.toLowerCase().trim()).filter((e) => e.length > 0));
  }
  return heuristicEntities(text);
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const API_KEY = process.env.PORTAL_API_KEY;
const BASE_URL = process.env.ANUMA_API_URL || "https://portal.anuma-dev.ai";

if (!API_KEY) {
  console.error(
    "Error: PORTAL_API_KEY is required.\n\n" +
      "Add PORTAL_API_KEY to your .env file:\n" +
      "  PORTAL_API_KEY=your-api-key\n"
  );
  process.exit(1);
}

const embeddingOptions: EmbeddingOptions = {
  apiKey: API_KEY,
  baseUrl: BASE_URL,
  cache: new Map<string, number[]>(),
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface QueryResult {
  query: BenchmarkQuery;
  resultIds: string[];
  similarities: { id: string; similarity: number }[];
  /** Full similarity map for all memories (used for target similarity stats). */
  allSimilarityMap: Map<string, number>;
  recall: number;
  precision: number;
  reciprocalRank: number;
  ndcg: number;
  rankingViolation: boolean;
  /** similarity(correct) - similarity(superseded). Positive = correct order. */
  temporalMargin?: number;
}

interface CategoryMetrics {
  category: Category;
  count: number;
  recallAtK: number;
  precisionAtK: number;
  mrr: number;
  ndcg: number;
  rankingViolationRate: number;
  avgTargetSim: number;
  avgTop1Sim: number;
  avgTemporalMargin?: number;
}

interface OverallMetrics {
  count: number;
  recallAtK: number;
  precisionAtK: number;
  mrr: number;
  ndcg: number;
  rankingViolationRate: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mean(values: number[]): number {
  return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
}

function formatPct(value: number, width: number): string {
  return (value * 100).toFixed(1).padStart(width) + "%";
}

// ---------------------------------------------------------------------------
// Metric helpers (ranking violation is benchmark-specific, not in metrics.ts)
// ---------------------------------------------------------------------------

function checkRankingViolation(
  resultIds: string[],
  expectedIds: string[],
  mustNotRankAbove?: string[]
): boolean {
  if (!mustNotRankAbove || mustNotRankAbove.length === 0) return false;

  const bestExpectedRank = Math.min(
    ...expectedIds.map((id) => {
      const idx = resultIds.indexOf(id);
      return idx === -1 ? Infinity : idx;
    })
  );

  for (const badId of mustNotRankAbove) {
    const badRank = resultIds.indexOf(badId);
    if (badRank !== -1 && badRank < bestExpectedRank) {
      return true;
    }
  }
  return false;
}

function computeTemporalMargin(
  allScored: { id: string; similarity: number }[],
  expectedIds: string[],
  mustNotRankAbove: string[]
): number {
  const bestExpectedSim = Math.max(
    ...expectedIds.map((id) => allScored.find((s) => s.id === id)?.similarity ?? 0)
  );
  const worstViolatorSim = Math.max(
    ...mustNotRankAbove.map((id) => allScored.find((s) => s.id === id)?.similarity ?? 0)
  );
  return bestExpectedSim - worstViolatorSim;
}

function computeOverall(results: QueryResult[]): OverallMetrics {
  return {
    count: results.length,
    recallAtK: mean(results.map((r) => r.recall)),
    precisionAtK: mean(results.map((r) => r.precision)),
    mrr: mean(results.map((r) => r.reciprocalRank)),
    ndcg: mean(results.map((r) => r.ndcg)),
    rankingViolationRate: results.filter((r) => r.rankingViolation).length / results.length,
  };
}

function aggregateByCategory(results: QueryResult[]): CategoryMetrics[] {
  return CATEGORIES.map((category) => {
    const group = results.filter((r) => r.query.category === category);
    if (group.length === 0) return null;

    const targetSims: number[] = [];
    const top1Sims: number[] = [];
    for (const r of group) {
      if (r.similarities.length > 0) top1Sims.push(r.similarities[0].similarity);
      for (const id of r.query.expectedIds) {
        const sim = r.allSimilarityMap.get(id);
        if (sim !== undefined) targetSims.push(sim);
      }
    }

    const temporalMargins = group
      .filter((r) => r.temporalMargin !== undefined)
      .map((r) => r.temporalMargin!);

    return {
      category,
      count: group.length,
      recallAtK: mean(group.map((r) => r.recall)),
      precisionAtK: mean(group.map((r) => r.precision)),
      mrr: mean(group.map((r) => r.reciprocalRank)),
      ndcg: mean(group.map((r) => r.ndcg)),
      rankingViolationRate: group.filter((r) => r.rankingViolation).length / group.length,
      avgTargetSim: mean(targetSims),
      avgTop1Sim: mean(top1Sims),
      ...(temporalMargins.length > 0 && { avgTemporalMargin: mean(temporalMargins) }),
    };
  }).filter((cat) => cat !== null) as CategoryMetrics[];
}

// ---------------------------------------------------------------------------
// Baseline comparison
// ---------------------------------------------------------------------------

interface RegressionResult {
  metric: string;
  category: string;
  baseline: number;
  current: number;
  delta: number;
}

function compareWithBaseline(
  currentByCategory: CategoryMetrics[],
  currentOverall: OverallMetrics,
  baselineData: { overall: OverallMetrics; byCategory: CategoryMetrics[] },
  threshold: number = 0.01
): RegressionResult[] {
  const regressions: RegressionResult[] = [];

  for (const metric of REGRESSION_METRICS) {
    const baseVal = baselineData.overall[metric] ?? 0;
    const curVal = currentOverall[metric];
    if (baseVal - curVal > threshold) {
      regressions.push({
        metric,
        category: "OVERALL",
        baseline: baseVal,
        current: curVal,
        delta: curVal - baseVal,
      });
    }
  }

  for (const baseCat of baselineData.byCategory) {
    const curCat = currentByCategory.find((c) => c.category === baseCat.category);
    if (!curCat) continue;
    for (const metric of REGRESSION_METRICS) {
      const baseVal = baseCat[metric] ?? 0;
      const curVal = curCat[metric];
      if (baseVal - curVal > threshold) {
        regressions.push({
          metric,
          category: baseCat.category,
          baseline: baseVal,
          current: curVal,
          delta: curVal - baseVal,
        });
      }
    }
  }

  return regressions;
}

// ---------------------------------------------------------------------------
// Output helpers
// ---------------------------------------------------------------------------

function formatRow(
  label: string,
  m: {
    count?: number;
    recallAtK: number;
    precisionAtK: number;
    mrr: number;
    ndcg: number;
    rankingViolationRate: number;
  }
): string {
  const name = label.padEnd(14);
  const count = String(m.count ?? "").padStart(5);
  return `║ ${name} ║ ${count} ║ ${formatPct(m.recallAtK, 7)} ║ ${formatPct(m.precisionAtK, 5)} ║ ${formatPct(m.mrr, 5)} ║ ${formatPct(m.ndcg, 5)} ║ ${formatPct(m.rankingViolationRate, 9)} ║`;
}

function buildBaselinePayload(
  overall: OverallMetrics,
  byCategory: CategoryMetrics[],
  elapsed: string
) {
  return {
    timestamp: new Date().toISOString(),
    elapsedSeconds: parseFloat(elapsed),
    memories: VAULT_MEMORIES.length,
    queries: overall.count,
    overall,
    byCategory,
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const startTime = Date.now();

  let queries = BENCHMARK_QUERIES;
  if (args.category) {
    queries = queries.filter((q) => q.category === args.category);
    if (queries.length === 0) {
      console.error(`No queries found for category "${args.category}"`);
      process.exit(1);
    }
  }
  if (args.max) {
    const maxCount = parseInt(args.max, 10);
    if (isNaN(maxCount) || maxCount <= 0) {
      console.error(`Invalid value for --max: "${args.max}". Must be a positive integer.`);
      process.exit(1);
    }
    queries = queries.slice(0, maxCount);
  }

  console.log(`\nEmbedding ${VAULT_MEMORIES.length} vault memories...`);
  const memoryEmbeddings = await generateEmbeddings(
    VAULT_MEMORIES.map((m) => m.content),
    embeddingOptions
  );
  const embeddingMap = new Map<string, number[]>();
  for (let i = 0; i < VAULT_MEMORIES.length; i++) {
    embeddingMap.set(VAULT_MEMORIES[i].id, memoryEmbeddings[i]);
  }

  // Load decomposition cache when --decompose=llm. Sub-queries are embedded
  // alongside the originals so the per-query loop never blocks on network.
  let decompositions: Record<string, DecomposedQuery> = {};
  if (DECOMPOSE_MODE === "llm") {
    try {
      decompositions = JSON.parse(
        await readFile("test/memory/src/vault/decompositions.json", "utf-8")
      ) as Record<string, DecomposedQuery>;
      const composite = Object.values(decompositions).filter((d) => d.mode === "composite").length;
      console.log(
        `Loaded ${Object.keys(decompositions).length} decompositions (${composite} composite)`
      );
    } catch (err) {
      console.error(
        `Failed to load decompositions.json: ${err}\n` +
          "Run: PORTAL_API_KEY=... npx tsx scripts/precompute-bench-decompositions.ts"
      );
      process.exit(1);
    }
  }

  const allQueryTexts: string[] = queries.map((q) => q.query);
  const subQueriesSeen = new Set<string>();
  for (const q of queries) {
    const decomp = decompositions[q.query];
    if (!decomp || decomp.mode !== "composite") continue;
    for (const sq of decomp.subQueries) {
      if (sq === q.query) continue;
      if (subQueriesSeen.has(sq)) continue;
      subQueriesSeen.add(sq);
      allQueryTexts.push(sq);
    }
  }

  console.log(
    `Embedding ${queries.length} queries${
      subQueriesSeen.size > 0 ? ` + ${subQueriesSeen.size} sub-queries` : ""
    }...`
  );
  const allEmbeddings = await generateEmbeddings(allQueryTexts, embeddingOptions);
  const queryEmbeddingMap = new Map<string, number[]>();
  for (let i = 0; i < allQueryTexts.length; i++) {
    queryEmbeddingMap.set(allQueryTexts[i], allEmbeddings[i]);
  }

  console.log(`Running ${queries.length} queries...\n`);

  const embeddedItems = VAULT_MEMORIES.map((m) => ({
    id: m.id,
    content: m.content,
    embedding: embeddingMap.get(m.id)!,
    updatedAt: new Date(m.createdAt), // no explicit updatedAt in benchmark data; createdAt encodes recency for temporal tests
  }));

  if (RERANK) {
    console.log("Pre-loading reranker model...");
    await preloadReranker();
  }

  // Memory-side entities are query-independent; extract once.
  const memoryEntitiesById = USE_GRAPH
    ? new Map(VAULT_MEMORIES.map((m) => [m.id, extractEntities(m.content)]))
    : null;

  const results: QueryResult[] = [];
  for (const query of queries) {
    const queryEmbedding = queryEmbeddingMap.get(query.query)!;

    // Retrieve all memories (no limit) so temporal margin analysis can find any ID
    let ranked;
    const decomp = DECOMPOSE_MODE === "llm" ? decompositions[query.query] : undefined;

    // W5 — graph lane: pre-build the entity ranking once per query and
    // pass it into whichever ranker is in play (composite or V2+CE).
    let entityRanking: string[] | undefined;
    if (USE_GRAPH && memoryEntitiesById && RANKER_NAME === "fused") {
      const queryEnts = extractEntities(query.query);
      if (queryEnts.size > 0) {
        const overlapItems = embeddedItems.map((it) => ({
          id: it.id,
          content: it.content,
          entities: memoryEntitiesById.get(it.id) ?? new Set<string>(),
        }));
        entityRanking = rankByEntityOverlap(queryEnts, overlapItems).map((r) => r.uniqueId);
      }
    }

    if (decomp && decomp.mode === "composite" && RANKER_NAME === "fused") {
      const subQueriesWithEmbeddings = decomp.subQueries.map((sq) => ({
        query: sq,
        embedding: queryEmbeddingMap.get(sq) ?? queryEmbedding,
      }));
      if (args.verbose) {
        console.log(`[composite] "${query.query}" → ${decomp.subQueries.length} sub-queries`);
      }
      ranked = await rankComposite(
        query.query,
        queryEmbedding,
        subQueriesWithEmbeddings,
        embeddedItems,
        {
          limit: embeddedItems.length,
          minSimilarity: 0,
          rerank: RERANK,
          ...(RECENCY_ALPHA !== undefined && { recencyAlpha: RECENCY_ALPHA }),
          ...(CE_WEIGHT !== undefined && { ceWeight: CE_WEIGHT }),
          ...(entityRanking && { entityRanking }),
        }
      );
    } else if ((RERANK || USE_MMR || USE_GRAPH) && RANKER_NAME === "fused") {
      ranked = await rankFusedVaultMemoriesAsync(query.query, queryEmbedding, embeddedItems, {
        // Benchmark needs the full list so temporal-margin analysis can
        // locate any ID. The MMR path picks K internally and appends
        // the tail in relevance order; passing items.length surfaces
        // both picks and tail.
        limit: embeddedItems.length,
        minSimilarity: 0,
        rerank: RERANK,
        mmr: USE_MMR,
        ...(RECENCY_ALPHA !== undefined && { recencyAlpha: RECENCY_ALPHA }),
        ...(CE_WEIGHT !== undefined && { ceWeight: CE_WEIGHT }),
        ...(MMR_LAMBDA !== undefined && { mmrLambda: MMR_LAMBDA }),
        ...(entityRanking && { entityRanking }),
      });
    } else {
      const ranker = RANKER_NAME === "fused" ? rankFusedVaultMemories : rankVaultMemories;
      ranked = ranker(query.query, queryEmbedding, embeddedItems, {
        limit: embeddedItems.length,
        minSimilarity: 0,
        ...(RANKER_NAME === "fused" &&
          RECENCY_ALPHA !== undefined && { recencyAlpha: RECENCY_ALPHA }),
      });
    }

    const allScored = ranked.map((r) => ({ id: r.uniqueId, similarity: r.similarity }));
    const allSimilarityMap = new Map(allScored.map((s) => [s.id, s.similarity]));
    const topK = allScored.slice(0, query.k);
    const resultIds = topK.map((s) => s.id);
    const relevant = new Set(query.expectedIds);

    let temporalMargin: number | undefined;
    if (query.mustNotRankAbove && query.mustNotRankAbove.length > 0) {
      temporalMargin = computeTemporalMargin(allScored, query.expectedIds, query.mustNotRankAbove);
    }

    results.push({
      query,
      resultIds,
      similarities: topK,
      allSimilarityMap,
      recall: recallAtK(resultIds, relevant, query.k),
      precision: precisionAtK(resultIds, relevant, query.k),
      reciprocalRank: reciprocalRank(resultIds, relevant),
      ndcg: ndcgAtK(resultIds, relevant, query.k),
      rankingViolation: checkRankingViolation(resultIds, query.expectedIds, query.mustNotRankAbove),
      temporalMargin,
    });
  }

  const byCategory = aggregateByCategory(results);
  const overall = computeOverall(results);
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  // ---------------------------------------------------------------------------
  // Significance (bootstrap CIs + optional paired comparison)
  //
  // Printed to stderr so it never pollutes --json stdout. A single run's mean
  // is one draw from a noisy ~100-query sample; the CI shows how far it could
  // wobble, and --compare runs a paired bootstrap against a prior run's
  // per-query results to say whether a delta is real or noise.
  // ---------------------------------------------------------------------------
  const perQueryRecall = results.map((r) => r.recall);
  const perQueryNdcg = results.map((r) => r.ndcg);
  const recallCI = bootstrapMeanCI(perQueryRecall);
  const ndcgCI = bootstrapMeanCI(perQueryNdcg);
  const fmtCI = (c: { mean: number; lo: number; hi: number }) =>
    `${(c.mean * 100).toFixed(1)}% [95% CI ${(c.lo * 100).toFixed(1)}–${(c.hi * 100).toFixed(1)}]`;
  console.error(`\n  Significance (n=${results.length}, 95% bootstrap CI):`);
  console.error(`    recall@k  ${fmtCI(recallCI)}`);
  console.error(`    ndcg      ${fmtCI(ndcgCI)}`);

  if (args.compare) {
    try {
      const cmpRaw = await readFile(args.compare, "utf-8");
      const cmp = JSON.parse(cmpRaw);
      const cmpRows: Array<{ query: string; recall: number; ndcg: number }> =
        cmp.perQuery ?? cmp.details ?? [];
      if (cmpRows.length === 0) {
        console.error(
          `\n  --compare: "${args.compare}" has no per-query data ` +
            `(re-run the baseline with --json --output <file>). Skipping paired test.`
        );
      } else {
        // Pair by query text — the stable per-query key across runs.
        const cmpByQuery = new Map(cmpRows.map((r) => [r.query, r]));
        const curRecall: number[] = [];
        const baseRecall: number[] = [];
        const curNdcg: number[] = [];
        const baseNdcg: number[] = [];
        for (const r of results) {
          const b = cmpByQuery.get(r.query.query);
          if (!b) continue;
          curRecall.push(r.recall);
          baseRecall.push(b.recall);
          curNdcg.push(r.ndcg);
          baseNdcg.push(b.ndcg);
        }
        const dRecall = pairedBootstrapDelta(curRecall, baseRecall);
        const dNdcg = pairedBootstrapDelta(curNdcg, baseNdcg);
        const verdict = (d: { mean: number; lo: number; hi: number; significant: boolean }) =>
          `${d.mean >= 0 ? "+" : ""}${(d.mean * 100).toFixed(2)}pp ` +
          `[95% CI ${(d.lo * 100).toFixed(2)}, ${(d.hi * 100).toFixed(2)}] ` +
          `${d.significant ? "SIGNIFICANT" : "not significant (within noise)"}`;
        console.error(
          `\n  Paired comparison vs ${args.compare} (${curRecall.length} shared queries):`
        );
        console.error(`    Δ recall@k  ${verdict(dRecall)}`);
        console.error(`    Δ ndcg      ${verdict(dNdcg)}`);
      }
    } catch (err) {
      console.error(`\n  --compare failed to load "${args.compare}": ${err}`);
    }
  }

  // ---------------------------------------------------------------------------
  // Baseline comparison
  // ---------------------------------------------------------------------------

  if (args.baseline) {
    try {
      const baselineRaw = await readFile(args.baseline, "utf-8");
      const baselineData = JSON.parse(baselineRaw);
      const regressions = compareWithBaseline(byCategory, overall, baselineData);
      if (regressions.length > 0) {
        console.error("\n  REGRESSION DETECTED\n");
        console.error("  Metric          Category        Baseline  Current   Delta");
        console.error("  ──────────────  ──────────────  ────────  ────────  ──────");
        for (const r of regressions) {
          console.error(
            `  ${r.metric.padEnd(14)}  ${r.category.padEnd(14)}  ${formatPct(r.baseline, 7)}  ${formatPct(r.current, 7)}  ${formatPct(r.delta, 5)}`
          );
        }
        process.exit(1);
      }
      console.log("  Baseline comparison: no regressions detected.\n");
    } catch (err) {
      console.error(`Failed to load baseline from ${args.baseline}: ${err}`);
      process.exit(1);
    }
  }

  // ---------------------------------------------------------------------------
  // JSON output
  // ---------------------------------------------------------------------------

  if (args.json) {
    // Save baseline without verbose details to keep the file small
    if (args["save-baseline"]) {
      await writeFile(
        DEFAULT_BASELINE_PATH,
        JSON.stringify(buildBaselinePayload(overall, byCategory, elapsed), null, 2)
      );
      console.error(`Baseline saved to ${DEFAULT_BASELINE_PATH}`);
    }

    const output = {
      ...buildBaselinePayload(overall, byCategory, elapsed),
      // Compact per-query rows so this file can be a --compare target for a
      // paired bootstrap against a later run (keyed by query text).
      perQuery: results.map((r) => ({
        query: r.query.query,
        recall: r.recall,
        ndcg: r.ndcg,
        reciprocalRank: r.reciprocalRank,
      })),
      ...(args.verbose && {
        details: results.map((r) => ({
          query: r.query.query,
          category: r.query.category,
          expectedIds: r.query.expectedIds,
          resultIds: r.resultIds,
          recall: r.recall,
          precision: r.precision,
          reciprocalRank: r.reciprocalRank,
          ndcg: r.ndcg,
          rankingViolation: r.rankingViolation,
          temporalMargin: r.temporalMargin,
          similarities: r.similarities,
        })),
      }),
    };
    const jsonStr = JSON.stringify(output, null, 2);

    if (args.output) {
      await writeFile(args.output, jsonStr);
      console.error(`Results written to ${args.output}`);
    } else {
      console.log(jsonStr);
    }
    return;
  }

  // ---------------------------------------------------------------------------
  // Save baseline (non-JSON mode)
  // ---------------------------------------------------------------------------

  if (args["save-baseline"]) {
    await writeFile(
      DEFAULT_BASELINE_PATH,
      JSON.stringify(buildBaselinePayload(overall, byCategory, elapsed), null, 2)
    );
    console.log(`Baseline saved to ${DEFAULT_BASELINE_PATH}`);
  }

  // ---------------------------------------------------------------------------
  // Table output
  // ---------------------------------------------------------------------------

  const hdr = "║ Category       ║ Count ║ Recall@k ║  P@k  ║  MRR  ║  NDCG ║ Violations ║";
  const sep = "╠════════════════╬═══════╬══════════╬═══════╬═══════╬═══════╬════════════╣";

  console.log("╔══════════════════════════════════════════════════════════════════════════╗");
  console.log("║                    VAULT SEARCH BENCHMARK RESULTS                     ║");
  console.log(sep);
  console.log(hdr);
  console.log(sep);
  for (const cat of byCategory) {
    console.log(formatRow(cat.category, cat));
  }
  console.log(sep);
  console.log(formatRow("OVERALL", overall));
  console.log("╚════════════════╩═══════╩══════════╩═══════╩═══════╩═══════╩════════════╝");
  console.log(`\nCompleted in ${elapsed}s`);

  if (args.verbose) {
    console.log("\n── Similarity Distribution ──\n");
    for (const cat of byCategory) {
      let line = `  ${cat.category.padEnd(16)} target_avg=${cat.avgTargetSim.toFixed(3)}  top1_avg=${cat.avgTop1Sim.toFixed(3)}`;
      if (cat.avgTemporalMargin !== undefined) {
        const sign = cat.avgTemporalMargin >= 0 ? "+" : "";
        line += `  margin_avg=${sign}${cat.avgTemporalMargin.toFixed(4)}`;
      }
      console.log(line);
    }
  }

  const failures = results.filter((r) => r.recall < 1 || r.rankingViolation);
  if (failures.length > 0) {
    console.log(`\n── ${failures.length} queries with issues ──\n`);
    for (const f of failures) {
      const issues: string[] = [];
      if (f.recall < 1) {
        const missing = f.query.expectedIds.filter((id) => !f.resultIds.includes(id));
        issues.push(`missing: [${missing.join(", ")}]`);
      }
      if (f.rankingViolation) {
        const margin =
          f.temporalMargin !== undefined ? ` (margin: ${f.temporalMargin.toFixed(4)})` : "";
        issues.push(`ranking violation${margin}`);
      }
      console.log(
        `  [${f.query.category}] "${f.query.query}"\n` +
          `    got: [${f.resultIds.join(", ")}] — ${issues.join(", ")}`
      );
      if (args.verbose) {
        for (const s of f.similarities) {
          const marker = f.query.expectedIds.includes(s.id)
            ? " ✓"
            : f.query.mustNotRankAbove?.includes(s.id)
              ? " ✗"
              : "";
          console.log(`      ${s.id}: ${s.similarity.toFixed(4)}${marker}`);
        }
      }
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
