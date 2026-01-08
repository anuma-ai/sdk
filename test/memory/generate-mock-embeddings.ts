#!/usr/bin/env node
/**
 * Generate mock embeddings for testing without API calls
 *
 * This creates synthetic embeddings that simulate realistic retrieval behavior
 * by making related items have similar embeddings.
 */

import { readFile, writeFile } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = join(__dirname, "fixtures");
const EMBEDDING_DIM = 256; // Smaller than real embeddings for testing

interface Memory {
  id: string;
  type: string;
  namespace: string;
  key: string;
  value: string;
  rawEvidence?: string;
}

interface Query {
  id: string;
  query: string;
  relevantMemoryIds: string[];
}

// Seed for reproducible randomness
let seed = 12345;
function seededRandom(): number {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return seed / 0x7fffffff;
}

function randomVector(dim: number): number[] {
  const vec = Array.from({ length: dim }, () => seededRandom() * 2 - 1);
  // Normalize
  const norm = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0));
  return vec.map((v) => v / norm);
}

function mixVectors(
  base: number[],
  noise: number[],
  similarity: number
): number[] {
  const mixed = base.map((v, i) => v * similarity + noise[i] * (1 - similarity));
  // Normalize
  const norm = Math.sqrt(mixed.reduce((sum, v) => sum + v * v, 0));
  return mixed.map((v) => v / norm);
}

async function main() {
  // Load memories and queries
  const memoriesData = JSON.parse(
    await readFile(join(FIXTURES_DIR, "memories.json"), "utf-8")
  );
  const queriesData = JSON.parse(
    await readFile(join(FIXTURES_DIR, "queries.json"), "utf-8")
  );

  const memories: Memory[] = memoriesData.memories;
  const queries: Query[] = queriesData.queries;

  const embeddings: Record<string, number[]> = {};

  // Create base vectors for each namespace/type combination
  const conceptVectors: Record<string, number[]> = {};

  for (const memory of memories) {
    const conceptKey = `${memory.type}:${memory.namespace}`;
    if (!conceptVectors[conceptKey]) {
      conceptVectors[conceptKey] = randomVector(EMBEDDING_DIM);
    }
  }

  // Generate memory embeddings based on concept similarity
  for (const memory of memories) {
    const conceptKey = `${memory.type}:${memory.namespace}`;
    const baseVector = conceptVectors[conceptKey];
    const noise = randomVector(EMBEDDING_DIM);

    // Mix base concept with random noise (80% concept, 20% noise)
    embeddings[memory.id] = mixVectors(baseVector, noise, 0.8);
  }

  // Generate query embeddings that are similar to relevant memories
  for (const query of queries) {
    if (query.relevantMemoryIds.length === 0) {
      // Random embedding for queries with no relevant memories
      embeddings[query.id] = randomVector(EMBEDDING_DIM);
      continue;
    }

    // Average the embeddings of relevant memories
    const relevantEmbeddings = query.relevantMemoryIds
      .map((id) => embeddings[id])
      .filter(Boolean);

    if (relevantEmbeddings.length === 0) {
      embeddings[query.id] = randomVector(EMBEDDING_DIM);
      continue;
    }

    // Compute centroid of relevant embeddings
    const centroid = Array.from({ length: EMBEDDING_DIM }, (_, i) => {
      return (
        relevantEmbeddings.reduce((sum, emb) => sum + emb[i], 0) /
        relevantEmbeddings.length
      );
    });

    // Add small noise to make it slightly different
    const noise = randomVector(EMBEDDING_DIM);
    embeddings[query.id] = mixVectors(centroid, noise, 0.9);
  }

  // Save embeddings
  await writeFile(
    join(FIXTURES_DIR, "embeddings.json"),
    JSON.stringify(embeddings, null, 2)
  );

  console.log(
    `Generated ${Object.keys(embeddings).length} mock embeddings (${EMBEDDING_DIM} dimensions)`
  );
  console.log(`  - ${memories.length} memory embeddings`);
  console.log(`  - ${queries.length} query embeddings`);
  console.log(`\nSaved to fixtures/embeddings.json`);
}

main().catch(console.error);
