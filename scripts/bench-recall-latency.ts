#!/usr/bin/env tsx
import "dotenv/config";
import { parseArgs } from "node:util";
import { generateEmbeddings } from "../src/lib/memoryEngine/embeddings.js";
import type { EmbeddingOptions } from "../src/lib/memoryEngine/types.js";
import { rankFusedVaultMemoriesAsync } from "../src/lib/memoryVault/searchTool.js";
import { preloadReranker } from "../src/lib/memory/reranker.js";
import { VAULT_MEMORIES, BENCHMARK_QUERIES } from "../test/memory/src/vault/dataset.js";

const { values: args } = parseArgs({
  options: {
    memories: { type: "string", default: "1000" },
    queries: { type: "string", default: "100" },
    budget: { type: "string", default: "high" },
    warmup: { type: "string", default: "5" },
  },
});

const TARGET_MEMORIES = parseInt(args.memories ?? "1000", 10);
const TARGET_QUERIES = parseInt(args.queries ?? "100", 10);
const BUDGET = (args.budget ?? "high").toLowerCase();
const WARMUP_QUERIES = parseInt(args.warmup ?? "5", 10);

const API_KEY = process.env.PORTAL_API_KEY;
if (!API_KEY) {
  console.error("PORTAL_API_KEY required");
  process.exit(1);
}

const embeddingOptions: EmbeddingOptions = {
  apiKey: API_KEY,
  baseUrl: process.env.ANUMA_API_URL || "https://portal.anuma-dev.ai",
  cache: new Map<string, Float32Array>(),
};

function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

async function main() {
  const reps = Math.ceil(TARGET_MEMORIES / VAULT_MEMORIES.length);
  const memories: { id: string; content: string; createdAt: string }[] = [];
  for (let r = 0; r < reps; r++) {
    for (const m of VAULT_MEMORIES) {
      if (memories.length >= TARGET_MEMORIES) break;
      memories.push({
        id: r === 0 ? m.id : `${m.id}_${r}`,
        content: r === 0 ? m.content : `[user-${r}] ${m.content}`,
        createdAt: m.createdAt,
      });
    }
  }
  console.log(`Embedding ${memories.length} memories (${reps}x ${VAULT_MEMORIES.length})...`);

  const t0 = Date.now();
  const embeddings = await generateEmbeddings(
    memories.map((m) => m.content),
    embeddingOptions
  );
  console.log(`  done in ${((Date.now() - t0) / 1000).toFixed(1)}s`);

  const embeddedItems = memories.map((m, i) => ({
    id: m.id,
    content: m.content,
    embedding: embeddings[i],
    updatedAt: new Date(m.createdAt),
  }));

  const queries = BENCHMARK_QUERIES.slice(0, TARGET_QUERIES);
  console.log(`Embedding ${queries.length} queries...`);
  const queryEmbeddings = await generateEmbeddings(
    queries.map((q) => q.query),
    embeddingOptions
  );

  if (BUDGET === "high") {
    console.log("Pre-loading cross-encoder...");
    await preloadReranker();
  }

  const useRerank = BUDGET === "high" || BUDGET === "mid";

  console.log(`Warmup × ${WARMUP_QUERIES}...`);
  for (let i = 0; i < Math.min(WARMUP_QUERIES, queries.length); i++) {
    await rankFusedVaultMemoriesAsync(queries[i].query, queryEmbeddings[i], embeddedItems, {
      limit: 10,
      minSimilarity: 0,
      rerank: useRerank,
    });
  }

  console.log(`Measuring ${queries.length} queries (budget=${BUDGET})...\n`);
  const latenciesMs: number[] = [];
  for (let i = 0; i < queries.length; i++) {
    const t = Date.now();
    await rankFusedVaultMemoriesAsync(queries[i].query, queryEmbeddings[i], embeddedItems, {
      limit: 10,
      minSimilarity: 0,
      rerank: useRerank,
    });
    latenciesMs.push(Date.now() - t);
  }

  const sorted = [...latenciesMs].sort((a, b) => a - b);
  const mean = latenciesMs.reduce((s, x) => s + x, 0) / latenciesMs.length;

  console.log("Results");
  console.log("─".repeat(40));
  console.log(`Memories:  ${memories.length}`);
  console.log(`Queries:   ${queries.length}`);
  console.log(`Budget:    ${BUDGET} ${useRerank ? "(CE rerank on)" : "(no rerank)"}`);
  console.log();
  console.log(`P50:  ${Math.round(quantile(sorted, 0.5))}ms`);
  console.log(`P95:  ${Math.round(quantile(sorted, 0.95))}ms`);
  console.log(`P99:  ${Math.round(quantile(sorted, 0.99))}ms`);
  console.log(`Mean: ${Math.round(mean)}ms`);
  console.log(`Min:  ${sorted[0]}ms`);
  console.log(`Max:  ${sorted[sorted.length - 1]}ms`);
  console.log();
  const ac5Pass = quantile(sorted, 0.5) <= 300;
  console.log(`AC5 (P50 ≤300ms): ${ac5Pass ? "✅ PASS" : "❌ FAIL"}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
