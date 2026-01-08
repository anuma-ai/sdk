#!/usr/bin/env node
/**
 * Debug script to test SDK search functionality
 */

import { Database } from "@nozbe/watermelondb";
import LokiJSAdapter from "@nozbe/watermelondb/adapters/lokijs";
import { readFile } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import {
  sdkSchema,
  sdkMigrations,
  sdkModelClasses,
} from "../src/lib/db/schema.js";
import {
  searchSimilarMemoriesOp,
  saveMemoryOp,
  getAllMemoriesOp,
} from "../src/lib/db/memory/operations.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Setup crypto
declare const global: typeof globalThis;
declare const require: any;

if (!global.crypto) {
  const { webcrypto } = require("node:crypto");
  Object.defineProperty(global, "crypto", {
    value: webcrypto as Crypto,
    writable: true,
    configurable: true,
  });
}

async function main() {
  console.log("Setting up database...");

  const adapter = new LokiJSAdapter({
    schema: sdkSchema,
    migrations: sdkMigrations,
    dbName: "debug-test-db",
    useWebWorker: false,
    useIncrementalIndexedDB: false,
  });

  const database = new Database({
    adapter,
    modelClasses: sdkModelClasses,
  });

  const memoriesCollection = database.collections.get("memories");

  const ctx = {
    database,
    memoriesCollection,
    walletAddress: undefined,
    signMessage: undefined,
    embeddedWalletSigner: undefined,
  } as any;

  // Load embeddings
  const embeddingsPath = join(__dirname, "fixtures/embeddings.json");
  const memoriesPath = join(__dirname, "fixtures/memories.json");
  const queriesPath = join(__dirname, "fixtures/queries.json");

  const embeddings = JSON.parse(await readFile(embeddingsPath, "utf-8"));
  const memoriesData = JSON.parse(await readFile(memoriesPath, "utf-8"));
  const queriesData = JSON.parse(await readFile(queriesPath, "utf-8"));

  const memories = memoriesData.memories;
  const queries = queriesData.queries;

  console.log(`\nLoaded ${memories.length} memories and ${queries.length} queries`);
  console.log(`Embeddings: ${Object.keys(embeddings).length}`);

  // Save first memory
  const memory = memories[0];
  const embedding = embeddings[memory.id];

  console.log(`\nSaving memory: ${memory.id}`);
  console.log(`  Type: ${memory.type}`);
  console.log(`  Namespace: ${memory.namespace}`);
  console.log(`  Key: ${memory.key}`);
  console.log(`  Value: ${memory.value}`);
  console.log(`  Embedding length: ${embedding?.length}`);

  const saved = await saveMemoryOp(ctx, {
    type: memory.type,
    namespace: memory.namespace,
    key: memory.key,
    value: memory.value,
    rawEvidence: memory.rawEvidence || "",
    confidence: memory.confidence,
    pii: false,
    embedding,
    embeddingModel: "openai/text-embedding-3-small",
  });

  console.log(`\nSaved memory with uniqueKey: ${saved.uniqueKey}`);
  console.log(`  Has embedding: ${!!saved.embedding}`);
  console.log(`  Embedding length: ${saved.embedding?.length}`);

  // Get all memories
  const allMemories = await getAllMemoriesOp(ctx);
  console.log(`\nTotal memories in DB: ${allMemories.length}`);

  if (allMemories.length > 0) {
    const m = allMemories[0];
    console.log(`  First memory:`);
    console.log(`    uniqueKey: ${m.uniqueKey}`);
    console.log(`    Has embedding: ${!!m.embedding}`);
    console.log(`    Embedding length: ${m.embedding?.length}`);
  }

  // Test search
  const query = queries[0];
  const queryEmbedding = embeddings[query.id];

  console.log(`\nSearching with query: "${query.query}"`);
  console.log(`  Query embedding length: ${queryEmbedding?.length}`);
  console.log(`  Expected relevant: ${query.relevantMemoryIds.join(", ")}`);
  console.log(`  Threshold: 0.2`);

  const searchResults = await searchSimilarMemoriesOp(
    ctx,
    queryEmbedding,
    10,
    0.2
  );

  console.log(`\nSearch results: ${searchResults.length}`);
  searchResults.forEach((r, i) => {
    console.log(`  ${i + 1}. uniqueKey: ${r.uniqueKey}`);
    console.log(`     similarity: ${r.similarity.toFixed(4)}`);
    console.log(`     namespace: ${r.namespace}`);
    console.log(`     key: ${r.key}`);
    console.log(`     value: ${r.value}`);
  });
}

main().catch(console.error);
