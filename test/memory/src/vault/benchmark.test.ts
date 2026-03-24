#!/usr/bin/env node
/**
 * Vault Search Benchmark
 *
 * Measures retrieval quality of the vault search system using real embeddings.
 * Runs against a curated dataset of ~80 memories and ~60 queries across five
 * challenge categories: direct recall, paraphrase, specificity, temporal, and
 * composite.
 *
 * Metrics:
 *   - Recall@k: fraction of expected memories that appear in top-k results
 *   - MRR: mean reciwprocal rank of the first expected memory
 *   - rankingViolationRate: fraction of queries where a superseded/wrong memory
 *     outranked the correct one (lower is better)
 *
 * Run:
 *   pnpm eval:vault-search
 *   pnpm eval:vault-search --json
 *   pnpm eval:vault-search --verbose
 */

import "dotenv/config";
import { parseArgs } from "node:util";
import { writeFile } from "node:fs/promises";
import { generateEmbeddings } from "../../../../src/lib/memoryEngine/embeddings.js";
import type { EmbeddingOptions } from "../../../../src/lib/memoryEngine/types.js";
import { rankVaultMemories } from "../../../../src/lib/memoryVault/searchTool.js";
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
  reciprocalRank: number;
  rankingViolation: boolean;
}

type Category = BenchmarkQuery["category"];

interface CategoryMetrics {
  category: Category;
  count: number;
  recallAtK: number;
  mrr: number;
  rankingViolationRate: number;
}

// ---------------------------------------------------------------------------
// Metric helpers
// ---------------------------------------------------------------------------

function computeRecall(resultIds: string[], expectedIds: string[]): number {
  const found = expectedIds.filter((id) => resultIds.includes(id));
  return found.length / expectedIds.length;
}

function computeReciprocalRank(resultIds: string[], expectedIds: string[]): number {
  for (let i = 0; i < resultIds.length; i++) {
    if (expectedIds.includes(resultIds[i])) {
      return 1 / (i + 1);
    }
  }
  return 0;
}

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

function aggregateByCategory(results: QueryResult[]): CategoryMetrics[] {
  const categories: Category[] = ["direct", "paraphrase", "specificity", "temporal", "composite"];
  return categories.map((category) => {
    const group = results.filter((r) => r.query.category === category);
    if (group.length === 0) {
      return { category, count: 0, recallAtK: 0, mrr: 0, rankingViolationRate: 0 };
    }
    return {
      category,
      count: group.length,
      recallAtK: group.reduce((sum, r) => sum + r.recall, 0) / group.length,
      mrr: group.reduce((sum, r) => sum + r.reciprocalRank, 0) / group.length,
      rankingViolationRate: group.filter((r) => r.rankingViolation).length / group.length,
    };
  });
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

  // Embed all memories
  const memoryTexts = VAULT_MEMORIES.map((m) => m.content);
  const memoryEmbeddings = await generateEmbeddings(memoryTexts, embeddingOptions);
  const embeddingMap = new Map<string, number[]>();
  for (let i = 0; i < VAULT_MEMORIES.length; i++) {
    embeddingMap.set(VAULT_MEMORIES[i].id, memoryEmbeddings[i]);
  }

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

    const ranked = rankVaultMemories(query.query, queryEmbedding, embeddedItems, {
      limit: query.k,
    });

    const resultIds = ranked.map((r) => r.uniqueId);
    const similarities = ranked.map((r) => ({ id: r.uniqueId, similarity: r.similarity }));

    results.push({
      query,
      resultIds,
      similarities,
      recall: computeRecall(resultIds, query.expectedIds),
      reciprocalRank: computeReciprocalRank(resultIds, query.expectedIds),
      rankingViolation: checkRankingViolation(resultIds, query.expectedIds, query.mustNotRankAbove),
    });
  }

  // Aggregate metrics
  const byCategory = aggregateByCategory(results);
  const overall = {
    count: results.length,
    recallAtK: results.reduce((sum, r) => sum + r.recall, 0) / results.length,
    mrr: results.reduce((sum, r) => sum + r.reciprocalRank, 0) / results.length,
    rankingViolationRate: results.filter((r) => r.rankingViolation).length / results.length,
  };

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  // JSON output
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
          reciprocalRank: r.reciprocalRank,
          rankingViolation: r.rankingViolation,
        })),
      }),
    };
    const jsonStr = JSON.stringify(output, null, 2);
    if (args.output) {
      await writeFile(args.output, jsonStr);
      console.log(`Results written to ${args.output}`);
    } else {
      console.log(jsonStr);
    }
    return;
  }

  // Table output
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║              VAULT SEARCH BENCHMARK RESULTS                ║");
  console.log("╠══════════════╦═══════╦══════════╦═══════╦═════════════════╣");
  console.log("║ Category     ║ Count ║ Recall@k ║  MRR  ║ Rank Violations ║");
  console.log("╠══════════════╬═══════╬══════════╬═══════╬═════════════════╣");
  for (const cat of byCategory) {
    const name = cat.category.padEnd(12);
    const count = String(cat.count).padStart(5);
    const recall = (cat.recallAtK * 100).toFixed(1).padStart(7) + "%";
    const mrr = (cat.mrr * 100).toFixed(1).padStart(5) + "%";
    const violations = (cat.rankingViolationRate * 100).toFixed(1).padStart(14) + "%";
    console.log(`║ ${name} ║ ${count} ║ ${recall} ║ ${mrr} ║ ${violations} ║`);
  }
  console.log("╠══════════════╬═══════╬══════════╬═══════╬═════════════════╣");
  const totalCount = String(overall.count).padStart(5);
  const totalRecall = (overall.recallAtK * 100).toFixed(1).padStart(7) + "%";
  const totalMrr = (overall.mrr * 100).toFixed(1).padStart(5) + "%";
  const totalViolations = (overall.rankingViolationRate * 100).toFixed(1).padStart(14) + "%";
  console.log(
    `║ OVERALL      ║ ${totalCount} ║ ${totalRecall} ║ ${totalMrr} ║ ${totalViolations} ║`
  );
  console.log("╚══════════════╩═══════╩══════════╩═══════╩═════════════════╝");
  console.log(`\nCompleted in ${elapsed}s`);

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
        issues.push("ranking violation");
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
