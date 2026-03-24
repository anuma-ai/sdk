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
import { VAULT_MEMORIES, BENCHMARK_QUERIES, CATEGORIES, type BenchmarkQuery, type Category } from "./dataset.js";

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
  return CATEGORIES
    .map((category) => {
      const group = results.filter((r) => r.query.category === category);
      if (group.length === 0) return null;

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
        recallAtK: mean(group.map((r) => r.recall)),
        precisionAtK: mean(group.map((r) => r.precision)),
        mrr: mean(group.map((r) => r.reciprocalRank)),
        ndcg: mean(group.map((r) => r.ndcg)),
        rankingViolationRate: group.filter((r) => r.rankingViolation).length / group.length,
        avgTargetSim: mean(targetSims),
        avgTop1Sim: mean(top1Sims),
        ...(temporalMargins.length > 0 && { avgTemporalMargin: mean(temporalMargins) }),
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
  currentOverall: OverallMetrics,
  baselineData: { overall: OverallMetrics; byCategory: CategoryMetrics[] },
  threshold: number = 0.01
): RegressionResult[] {
  const regressions: RegressionResult[] = [];

  for (const metric of REGRESSION_METRICS) {
    const baseVal = baselineData.overall[metric] ?? 0;
    const curVal = currentOverall[metric];
    if (baseVal - curVal > threshold) {
      regressions.push({ metric, category: "OVERALL", baseline: baseVal, current: curVal, delta: curVal - baseVal });
    }
  }

  for (const baseCat of baselineData.byCategory) {
    const curCat = currentByCategory.find((c) => c.category === baseCat.category);
    if (!curCat) continue;
    for (const metric of REGRESSION_METRICS) {
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
// Output helpers
// ---------------------------------------------------------------------------

function formatRow(label: string, m: { count?: number; recallAtK: number; precisionAtK: number; mrr: number; ndcg: number; rankingViolationRate: number }): string {
  const name = label.padEnd(14);
  const count = String(m.count ?? "").padStart(5);
  return `║ ${name} ║ ${count} ║ ${formatPct(m.recallAtK, 7)} ║ ${formatPct(m.precisionAtK, 5)} ║ ${formatPct(m.mrr, 5)} ║ ${formatPct(m.ndcg, 5)} ║ ${formatPct(m.rankingViolationRate, 9)} ║`;
}

function buildBaselinePayload(overall: OverallMetrics, byCategory: CategoryMetrics[], elapsed: string) {
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
  const memoryEmbeddings = await generateEmbeddings(VAULT_MEMORIES.map((m) => m.content), embeddingOptions);
  const embeddingMap = new Map<string, number[]>();
  for (let i = 0; i < VAULT_MEMORIES.length; i++) {
    embeddingMap.set(VAULT_MEMORIES[i].id, memoryEmbeddings[i]);
  }

  console.log(`Embedding ${queries.length} queries...`);
  const queryEmbeddingsList = await generateEmbeddings(queries.map((q) => q.query), embeddingOptions);
  const queryEmbeddingMap = new Map<string, number[]>();
  for (let i = 0; i < queries.length; i++) {
    queryEmbeddingMap.set(queries[i].query, queryEmbeddingsList[i]);
  }

  console.log(`Running ${queries.length} queries...\n`);

  const embeddedItems = VAULT_MEMORIES.map((m) => ({
    id: m.id,
    content: m.content,
    embedding: embeddingMap.get(m.id)!,
  }));

  const results: QueryResult[] = [];
  for (const query of queries) {
    const queryEmbedding = queryEmbeddingMap.get(query.query)!;

    // Retrieve all memories (no limit) so temporal margin analysis can find any ID
    const ranked = rankVaultMemories(query.query, queryEmbedding, embeddedItems, {
      limit: embeddedItems.length,
      minSimilarity: 0,
    });

    const allScored = ranked.map((r) => ({ id: r.uniqueId, similarity: r.similarity }));
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
          console.error(`  ${r.metric.padEnd(14)}  ${r.category.padEnd(14)}  ${formatPct(r.baseline, 7)}  ${formatPct(r.current, 7)}  ${formatPct(r.delta, 5)}`);
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
      ...buildBaselinePayload(overall, byCategory, elapsed),
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
      const path = args.output || DEFAULT_BASELINE_PATH;
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
    await writeFile(DEFAULT_BASELINE_PATH, JSON.stringify(buildBaselinePayload(overall, byCategory, elapsed), null, 2));
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
