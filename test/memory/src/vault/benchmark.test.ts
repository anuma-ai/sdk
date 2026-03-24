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
import { rankVaultMemories } from "../../../../src/lib/memoryVault/searchTool.js";
import {
  precisionAtK,
  recallAtK,
  reciprocalRank,
  ndcgAtK,
} from "../metrics.js";
import { VAULT_MEMORIES, BENCHMARK_QUERIES, type BenchmarkQuery } from "./dataset.js";

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
  },
});

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
  recall: number;
  precision: number;
  reciprocalRank: number;
  ndcg: number;
  rankingViolation: boolean;
  /** For temporal queries: similarity(correct) - similarity(superseded). Positive = correct order. */
  temporalMargin?: number;
}

type Category = BenchmarkQuery["category"];

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

/** Compute similarity margin between expected and superseded memories. */
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

function aggregateByCategory(results: QueryResult[]): CategoryMetrics[] {
  const categories: Category[] = [
    "direct",
    "paraphrase",
    "specificity",
    "temporal",
    "composite",
    "hard_negatives",
  ];
  return categories
    .map((category) => {
      const group = results.filter((r) => r.query.category === category);
      if (group.length === 0) return null;

      // Similarity of expected memories (target) and top-1 result
      const targetSims: number[] = [];
      const top1Sims: number[] = [];
      for (const r of group) {
        if (r.similarities.length > 0) top1Sims.push(r.similarities[0].similarity);
        for (const id of r.query.expectedIds) {
          const found = r.similarities.find((s) => s.id === id);
          if (found) targetSims.push(found.similarity);
        }
      }

      const temporalMargins = group
        .filter((r) => r.temporalMargin !== undefined)
        .map((r) => r.temporalMargin!);

      return {
        category,
        count: group.length,
        recallAtK: group.reduce((sum, r) => sum + r.recall, 0) / group.length,
        precisionAtK: group.reduce((sum, r) => sum + r.precision, 0) / group.length,
        mrr: group.reduce((sum, r) => sum + r.reciprocalRank, 0) / group.length,
        ndcg: group.reduce((sum, r) => sum + r.ndcg, 0) / group.length,
        rankingViolationRate: group.filter((r) => r.rankingViolation).length / group.length,
        avgTargetSim: targetSims.length > 0 ? targetSims.reduce((a, b) => a + b, 0) / targetSims.length : 0,
        avgTop1Sim: top1Sims.length > 0 ? top1Sims.reduce((a, b) => a + b, 0) / top1Sims.length : 0,
        ...(temporalMargins.length > 0 && {
          avgTemporalMargin: temporalMargins.reduce((a, b) => a + b, 0) / temporalMargins.length,
        }),
      };
    })
    .filter((cat) => cat !== null) as CategoryMetrics[];
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
  currentOverall: { recallAtK: number; precisionAtK: number; mrr: number; ndcg: number },
  baselineData: { overall: Record<string, number>; byCategory: CategoryMetrics[] },
  threshold: number = 0.01
): RegressionResult[] {
  const regressions: RegressionResult[] = [];

  for (const metric of ["recallAtK", "precisionAtK", "mrr", "ndcg"] as const) {
    const baseVal = baselineData.overall[metric] ?? 0;
    const curVal = currentOverall[metric];
    if (baseVal - curVal > threshold) {
      regressions.push({ metric, category: "OVERALL", baseline: baseVal, current: curVal, delta: curVal - baseVal });
    }
  }

  for (const baseCat of baselineData.byCategory) {
    const curCat = currentByCategory.find((c) => c.category === baseCat.category);
    if (!curCat) continue;
    for (const metric of ["recallAtK", "mrr", "ndcg"] as const) {
      const baseVal = baseCat[metric];
      const curVal = curCat[metric];
      if (baseVal - curVal > threshold) {
        regressions.push({ metric, category: baseCat.category, baseline: baseVal, current: curVal, delta: curVal - baseVal });
      }
    }
  }

  return regressions;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const startTime = Date.now();

  // Filter queries by category if requested
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

  // Embed all memories in batch
  const memoryTexts = VAULT_MEMORIES.map((m) => m.content);
  const memoryEmbeddings = await generateEmbeddings(memoryTexts, embeddingOptions);
  const embeddingMap = new Map<string, number[]>();
  for (let i = 0; i < VAULT_MEMORIES.length; i++) {
    embeddingMap.set(VAULT_MEMORIES[i].id, memoryEmbeddings[i]);
  }

  // Embed all queries in batch
  const queryTexts = queries.map((q) => q.query);
  console.log(`Embedding ${queryTexts.length} queries...`);
  const queryEmbeddingsList = await generateEmbeddings(queryTexts, embeddingOptions);
  const queryEmbeddingMap = new Map<string, number[]>();
  for (let i = 0; i < queries.length; i++) {
    queryEmbeddingMap.set(queries[i].query, queryEmbeddingsList[i]);
  }

  console.log(`Running ${queries.length} queries...\n`);

  // Build embedded items for rankVaultMemories (production ranking function)
  const embeddedItems = VAULT_MEMORIES.map((m) => ({
    id: m.id,
    content: m.content,
    embedding: embeddingMap.get(m.id)!,
  }));

  // Run each query using the production ranking pipeline
  const results: QueryResult[] = [];
  for (const query of queries) {
    const queryEmbedding = queryEmbeddingMap.get(query.query)!;

    // Get a wider window than k for temporal margin analysis
    const maxResults = Math.max(query.k, 20);
    const ranked = rankVaultMemories(query.query, queryEmbedding, embeddedItems, {
      limit: maxResults,
      minSimilarity: 0,
    });

    const allScored = ranked.map((r) => ({ id: r.uniqueId, similarity: r.similarity }));
    const topK = allScored.slice(0, query.k);
    const resultIds = topK.map((s) => s.id);
    const relevant = new Set(query.expectedIds);

    // Compute temporal margin for queries with mustNotRankAbove
    let temporalMargin: number | undefined;
    if (query.mustNotRankAbove && query.mustNotRankAbove.length > 0) {
      temporalMargin = computeTemporalMargin(allScored, query.expectedIds, query.mustNotRankAbove);
    }

    results.push({
      query,
      resultIds,
      similarities: topK,
      recall: recallAtK(resultIds, relevant, query.k),
      precision: precisionAtK(resultIds, relevant, query.k),
      reciprocalRank: reciprocalRank(resultIds, relevant),
      ndcg: ndcgAtK(resultIds, relevant, query.k),
      rankingViolation: checkRankingViolation(resultIds, query.expectedIds, query.mustNotRankAbove),
      temporalMargin,
    });
  }

  // Aggregate metrics
  const byCategory = aggregateByCategory(results);
  const overall = {
    count: results.length,
    recallAtK: results.reduce((sum, r) => sum + r.recall, 0) / results.length,
    precisionAtK: results.reduce((sum, r) => sum + r.precision, 0) / results.length,
    mrr: results.reduce((sum, r) => sum + r.reciprocalRank, 0) / results.length,
    ndcg: results.reduce((sum, r) => sum + r.ndcg, 0) / results.length,
    rankingViolationRate: results.filter((r) => r.rankingViolation).length / results.length,
  };

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

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
          const metric = r.metric.padEnd(14);
          const cat = r.category.padEnd(14);
          const base = (r.baseline * 100).toFixed(1).padStart(7) + "%";
          const cur = (r.current * 100).toFixed(1).padStart(7) + "%";
          const delta = (r.delta * 100).toFixed(1).padStart(5) + "%";
          console.error(`  ${metric}  ${cat}  ${base}  ${cur}  ${delta}`);
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
    const output = {
      timestamp: new Date().toISOString(),
      elapsedSeconds: parseFloat(elapsed),
      memories: VAULT_MEMORIES.length,
      queries: results.length,
      overall,
      byCategory,
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

    if (args["save-baseline"] || args.output) {
      const path = args.output || "test/memory/src/vault/baseline.json";
      await writeFile(path, jsonStr);
      console.log(`Results written to ${path}`);
    } else {
      console.log(jsonStr);
    }
    return;
  }

  // ---------------------------------------------------------------------------
  // Save baseline (non-JSON mode)
  // ---------------------------------------------------------------------------

  if (args["save-baseline"]) {
    const baselinePath = "test/memory/src/vault/baseline.json";
    const baselineData = {
      timestamp: new Date().toISOString(),
      elapsedSeconds: parseFloat(elapsed),
      memories: VAULT_MEMORIES.length,
      queries: results.length,
      overall,
      byCategory,
    };
    await writeFile(baselinePath, JSON.stringify(baselineData, null, 2));
    console.log(`Baseline saved to ${baselinePath}`);
  }

  // ---------------------------------------------------------------------------
  // Table output
  // ---------------------------------------------------------------------------

  const hdr = "║ Category       ║ Count ║ Recall@k ║  P@k  ║  MRR  ║  NDCG ║ Violations ║";
  const sep = "╠════════════════╬═══════╬══════════╬═══════╬═══════╬═══════╬════════════╣";
  const topBorder = "╔══════════════════════════════════════════════════════════════════════════╗";
  const botBorder = "╚════════════════╩═══════╩══════════╩═══════╩═══════╩═══════╩════════════╝";

  console.log(topBorder);
  console.log("║                    VAULT SEARCH BENCHMARK RESULTS                     ║");
  console.log(sep);
  console.log(hdr);
  console.log(sep);
  for (const cat of byCategory) {
    const name = cat.category.padEnd(14);
    const count = String(cat.count).padStart(5);
    const recall = (cat.recallAtK * 100).toFixed(1).padStart(7) + "%";
    const pk = (cat.precisionAtK * 100).toFixed(1).padStart(5) + "%";
    const mrr = (cat.mrr * 100).toFixed(1).padStart(5) + "%";
    const ndcg = (cat.ndcg * 100).toFixed(1).padStart(5) + "%";
    const violations = (cat.rankingViolationRate * 100).toFixed(1).padStart(9) + "%";
    console.log(`║ ${name} ║ ${count} ║ ${recall} ║ ${pk} ║ ${mrr} ║ ${ndcg} ║ ${violations} ║`);
  }
  console.log(sep);
  const ov = overall;
  const totalCount = String(ov.count).padStart(5);
  const totalRecall = (ov.recallAtK * 100).toFixed(1).padStart(7) + "%";
  const totalPk = (ov.precisionAtK * 100).toFixed(1).padStart(5) + "%";
  const totalMrr = (ov.mrr * 100).toFixed(1).padStart(5) + "%";
  const totalNdcg = (ov.ndcg * 100).toFixed(1).padStart(5) + "%";
  const totalViolations = (ov.rankingViolationRate * 100).toFixed(1).padStart(9) + "%";
  console.log(
    `║ OVERALL        ║ ${totalCount} ║ ${totalRecall} ║ ${totalPk} ║ ${totalMrr} ║ ${totalNdcg} ║ ${totalViolations} ║`
  );
  console.log(botBorder);
  console.log(`\nCompleted in ${elapsed}s`);

  // Similarity distribution (verbose)
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

  // Print failures
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
        const margin = f.temporalMargin !== undefined ? ` (margin: ${f.temporalMargin.toFixed(4)})` : "";
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
