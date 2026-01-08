/**
 * SDK Integration Test Suite for Retrieval
 * Tests the actual SDK implementation (searchSimilarMemoriesOp, cosineSimilarity, etc.)
 */

import { Database } from "@nozbe/watermelondb";
import LokiJSAdapter from "@nozbe/watermelondb/adapters/lokijs";
import {
  sdkSchema,
  sdkMigrations,
  sdkModelClasses,
} from "../../../src/lib/db/schema.js";
import {
  searchSimilarMemoriesOp,
  saveMemoryOp,
  clearAllMemoriesOp,
} from "../../../src/lib/db/memory/operations.js";
import type {
  Memory,
  QueryFixture,
  RetrievalMetrics,
  EvaluationResult,
} from "../types.js";
import { aggregateRetrievalMetrics } from "../metrics.js";

export interface SDKRetrievalTestOptions {
  limit: number;
  minSimilarity: number;
  kValues: number[];
  verbose: boolean;
}

const DEFAULT_OPTIONS: SDKRetrievalTestOptions = {
  limit: 10,
  minSimilarity: 0.2,
  kValues: [1, 3, 5, 10],
  verbose: false,
};

// Type declaration for global crypto setup
declare const global: typeof globalThis;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const Buffer: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const require: any;

/**
 * Setup in-memory WatermelonDB for testing
 */
async function setupDatabase(): Promise<Database> {
  // Setup crypto for Node.js environment
  if (!global.crypto) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
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

/**
 * Mock sign message function for tests (encryption not tested here)
 */
async function mockSignMessage(message: string): Promise<string> {
  return `0x${Buffer.from(message).toString("hex").padStart(130, "0")}`;
}

/**
 * Run SDK retrieval evaluation using actual SDK functions
 */
export async function runSDKRetrievalSuite(
  memories: Memory[],
  embeddings: Record<string, number[]>,
  queries: QueryFixture[],
  options: Partial<SDKRetrievalTestOptions> = {}
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

  // Setup WatermelonDB
  const database = await setupDatabase();
  const memoriesCollection = database.collections.get("memories");

  // Don't use wallet address for encryption in tests
  const ctx = {
    database,
    memoriesCollection,
    walletAddress: undefined,
    signMessage: undefined,
    embeddedWalletSigner: undefined,
  } as any; // Type assertion needed for test environment

  try {
    // Clear any existing data
    await clearAllMemoriesOp(ctx);

    // Populate database with test memories and create ID mapping
    // Map from fixture memory ID to uniqueKey (namespace:key:value)
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
        embeddingModel: "openai/text-embedding-3-small",
      });
    }

    // Run queries using SDK's searchSimilarMemoriesOp
    for (const query of queries) {
      const startTime = performance.now();

      // Get query embedding
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

      // Use SDK's search function
      const searchResults = await searchSimilarMemoriesOp(
        ctx,
        queryEmbedding,
        opts.limit,
        opts.minSimilarity
      );

      const endTime = performance.now();
      const elapsed = endTime - startTime;
      latencyMs.push(elapsed);

      // Map retrieved uniqueKeys back to fixture IDs for comparison
      const retrieved = searchResults.map((r) => r.uniqueKey);
      const relevantUniqueKeys = new Set(
        query.relevantMemoryIds.map((id) => idToUniqueKey.get(id)).filter(Boolean) as string[]
      );
      const similarities = searchResults.map((r) => r.similarity);

      aggregationData.push({ retrieved, relevant: relevantUniqueKeys, similarities });

      // Check if at least one relevant memory was found
      const foundRelevant = retrieved.some((key) => relevantUniqueKeys.has(key));

      results.push({
        instanceId: query.id,
        category: "retrieval",
        passed: foundRelevant,
        metrics: {
          precisionAtK: Object.fromEntries(
            opts.kValues.map((k) => [
              k,
              precisionAtKSingle(retrieved, relevantUniqueKeys, k),
            ])
          ),
          recallAtK: Object.fromEntries(
            opts.kValues.map((k) => [k, recallAtKSingle(retrieved, relevantUniqueKeys, k)])
          ),
        },
        latencyMs: elapsed,
        details: opts.verbose
          ? {
              query: query.query,
              retrieved,
              relevant: Array.from(relevantUniqueKeys),
              similarities,
            }
          : undefined,
      });
    }

    const metrics = aggregateRetrievalMetrics(
      aggregationData,
      opts.kValues,
      opts.minSimilarity
    );

    return { metrics, results, latencyMs };
  } finally {
    // Cleanup database
    try {
      await clearAllMemoriesOp(ctx);
    } catch (error) {
      // Ignore cleanup errors
    }
  }
}

function precisionAtKSingle(
  retrieved: string[],
  relevant: Set<string>,
  k: number
): number {
  const topK = retrieved.slice(0, k);
  const relevantInTopK = topK.filter((id) => relevant.has(id)).length;
  return topK.length > 0 ? relevantInTopK / topK.length : 0;
}

function recallAtKSingle(
  retrieved: string[],
  relevant: Set<string>,
  k: number
): number {
  const topK = retrieved.slice(0, k);
  const relevantInTopK = topK.filter((id) => relevant.has(id)).length;
  return relevant.size > 0 ? relevantInTopK / relevant.size : 0;
}
