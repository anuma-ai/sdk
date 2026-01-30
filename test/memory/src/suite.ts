/**
 * SDK Integration Test Suite
 */

import { Database } from "@nozbe/watermelondb";
import LokiJSAdapter from "@nozbe/watermelondb/adapters/lokijs";
import { sdkSchema, sdkMigrations, sdkModelClasses } from "../../../src/lib/db/schema.js";
import { searchSimilarMemoriesOp, saveMemoryOp, clearAllMemoriesOp } from "../../../src/lib/db/memory/operations.js";
import { DEFAULT_API_EMBEDDING_MODEL } from "../../../src/lib/memory/constants.js";
import type { Memory, QueryFixture, RetrievalMetrics, EvaluationResult } from "./types.js";
import { aggregateRetrievalMetrics } from "./metrics.js";

interface TestOptions {
  limit: number;
  minSimilarity: number;
  kValues: number[];
  verbose: boolean;
}

const DEFAULT_OPTIONS: TestOptions = {
  limit: 10,
  minSimilarity: 0.2,
  kValues: [1, 3, 5, 10],
  verbose: false,
};

declare const global: typeof globalThis;
declare const Buffer: any;
declare const require: any;

async function setupDatabase(): Promise<Database> {
  if (!global.crypto) {
    const { webcrypto } = require("node:crypto");
    Object.defineProperty(global, "crypto", {
      value: webcrypto as Crypto,
      writable: true,
      configurable: true,
    });
  }

  const adapter = new LokiJSAdapter({
    schema: sdkSchema,
    migrations: sdkMigrations,
    dbName: "eval-test-db",
    useWebWorker: false,
    useIncrementalIndexedDB: false,
  });

  return new Database({
    adapter,
    modelClasses: sdkModelClasses,
  });
}

export async function runSuite(
  memories: Memory[],
  embeddings: Record<string, number[]>,
  queries: QueryFixture[],
  options: Partial<TestOptions> = {}
): Promise<{
  metrics: RetrievalMetrics;
  results: EvaluationResult[];
  latencyMs: number[];
}> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const results: EvaluationResult[] = [];
  const latencyMs: number[] = [];
  const aggregationData: Array<{
    retrieved: string[];
    relevant: Set<string>;
    similarities: number[];
  }> = [];

  const database = await setupDatabase();

  const ctx = {
    database,
    memoriesCollection: database.collections.get("memories"),
    walletAddress: undefined,
    signMessage: undefined,
    embeddedWalletSigner: undefined,
  } as any;

  try {
    await clearAllMemoriesOp(ctx);

    const idToUniqueKey = new Map<string, string>();

    for (const memory of memories) {
      const embedding = memory.embedding || embeddings[memory.id];
      if (!embedding) continue;

      const uniqueKey = `${memory.namespace}:${memory.key}:${memory.value}`;
      idToUniqueKey.set(memory.id, uniqueKey);

      await saveMemoryOp(ctx, {
        type: memory.type,
        namespace: memory.namespace,
        key: memory.key,
        value: memory.value,
        rawEvidence: memory.rawEvidence || "",
        confidence: memory.confidence,
        pii: memory.pii || false,
        embedding,
        embeddingModel: DEFAULT_API_EMBEDDING_MODEL,
      });
    }

    for (const query of queries) {
      const startTime = performance.now();

      const queryEmbedding = query.queryEmbedding || embeddings[query.id];
      if (!queryEmbedding) {
        results.push({
          instanceId: query.id,
          category: "retrieval",
          passed: false,
          metrics: {},
          latencyMs: 0,
          details: { error: "Missing query embedding" },
        });
        continue;
      }

      const searchResults = await searchSimilarMemoriesOp(ctx, queryEmbedding, opts.limit, opts.minSimilarity);

      const elapsed = performance.now() - startTime;
      latencyMs.push(elapsed);

      const retrieved = searchResults.map((r) => r.uniqueKey);
      const relevantUniqueKeys = new Set(
        query.relevantMemoryIds.map((id) => idToUniqueKey.get(id)).filter(Boolean) as string[]
      );
      const similarities = searchResults.map((r) => r.similarity);

      aggregationData.push({ retrieved, relevant: relevantUniqueKeys, similarities });

      const foundRelevant = retrieved.some((key) => relevantUniqueKeys.has(key));

      results.push({
        instanceId: query.id,
        category: "retrieval",
        passed: foundRelevant,
        metrics: {
          precisionAtK: Object.fromEntries(opts.kValues.map((k) => [k, precisionAtK(retrieved, relevantUniqueKeys, k)])),
          recallAtK: Object.fromEntries(opts.kValues.map((k) => [k, recallAtK(retrieved, relevantUniqueKeys, k)])),
        },
        latencyMs: elapsed,
        details: opts.verbose ? { query: query.query, retrieved, relevant: Array.from(relevantUniqueKeys), similarities } : undefined,
      });
    }

    const metrics = aggregateRetrievalMetrics(aggregationData, opts.kValues, opts.minSimilarity);

    return { metrics, results, latencyMs };
  } finally {
    try {
      await clearAllMemoriesOp(ctx);
    } catch {
      // Ignore cleanup errors
    }
  }
}

function precisionAtK(retrieved: string[], relevant: Set<string>, k: number): number {
  const topK = retrieved.slice(0, k);
  const relevantInTopK = topK.filter((id) => relevant.has(id)).length;
  return topK.length > 0 ? relevantInTopK / topK.length : 0;
}

function recallAtK(retrieved: string[], relevant: Set<string>, k: number): number {
  const topK = retrieved.slice(0, k);
  const relevantInTopK = topK.filter((id) => relevant.has(id)).length;
  return relevant.size > 0 ? relevantInTopK / relevant.size : 0;
}
