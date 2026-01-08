#!/usr/bin/env node
/**
 * Debug script to check embedding similarity scores
 */

import { readFile } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error("Vectors must have same length");
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (normA * normB);
}

async function main() {
  const embeddingsPath = join(__dirname, "fixtures/embeddings.json");
  const memoriesPath = join(__dirname, "fixtures/memories.json");
  const queriesPath = join(__dirname, "fixtures/queries.json");

  const embeddings = JSON.parse(await readFile(embeddingsPath, "utf-8"));
  const memoriesData = JSON.parse(await readFile(memoriesPath, "utf-8"));
  const queriesData = JSON.parse(await readFile(queriesPath, "utf-8"));

  const memories = memoriesData.memories;
  const queries = queriesData.queries;

  console.log("\nEmbedding Statistics:");
  console.log("═".repeat(70));

  // Check embedding dimensions
  const firstEmbedding = Object.values(embeddings)[0] as number[];
  console.log(`Embedding dimension: ${firstEmbedding.length}`);
  console.log(`Total embeddings: ${Object.keys(embeddings).length}`);

  // Check first few queries
  console.log("\nTop 5 Similarities for First 3 Queries:");
  console.log("═".repeat(70));

  for (let i = 0; i < Math.min(3, queries.length); i++) {
    const query = queries[i];
    const queryEmbedding = embeddings[query.id];

    if (!queryEmbedding) {
      console.log(`\nQuery ${i + 1} (${query.id}): No embedding found`);
      continue;
    }

    console.log(`\nQuery ${i + 1}: "${query.query}"`);
    console.log(`Expected relevant: ${query.relevantMemoryIds.join(", ")}`);

    // Calculate similarities for all memories
    const similarities: Array<{ memoryId: string; similarity: number; memory: any }> = [];
    for (const memory of memories) {
      const memoryEmbedding = embeddings[memory.id];
      if (!memoryEmbedding) continue;

      const similarity = cosineSimilarity(queryEmbedding, memoryEmbedding);
      similarities.push({ memoryId: memory.id, similarity, memory });
    }

    // Sort by similarity
    similarities.sort((a, b) => b.similarity - a.similarity);

    // Show top 5
    console.log("Top 5 similar memories:");
    for (let j = 0; j < Math.min(5, similarities.length); j++) {
      const s = similarities[j];
      const isRelevant = query.relevantMemoryIds.includes(s.memoryId);
      const marker = isRelevant ? "✓" : " ";
      console.log(
        `  ${marker} ${j + 1}. ${s.memoryId}: ${s.similarity.toFixed(4)} - ${s.memory.namespace}:${s.memory.key}`
      );
    }
  }

  // Check overall similarity distribution
  console.log("\nOverall Similarity Distribution:");
  console.log("═".repeat(70));

  const allSimilarities: number[] = [];
  for (const query of queries) {
    const queryEmbedding = embeddings[query.id];
    if (!queryEmbedding) continue;

    for (const memory of memories) {
      const memoryEmbedding = embeddings[memory.id];
      if (!memoryEmbedding) continue;

      const similarity = cosineSimilarity(queryEmbedding, memoryEmbedding);
      allSimilarities.push(similarity);
    }
  }

  allSimilarities.sort((a, b) => a - b);

  const p50 = allSimilarities[Math.floor(allSimilarities.length * 0.5)];
  const p75 = allSimilarities[Math.floor(allSimilarities.length * 0.75)];
  const p90 = allSimilarities[Math.floor(allSimilarities.length * 0.9)];
  const p95 = allSimilarities[Math.floor(allSimilarities.length * 0.95)];
  const max = allSimilarities[allSimilarities.length - 1];
  const min = allSimilarities[0];

  console.log(`Min similarity:  ${min.toFixed(4)}`);
  console.log(`p50 (median):    ${p50.toFixed(4)}`);
  console.log(`p75:             ${p75.toFixed(4)}`);
  console.log(`p90:             ${p90.toFixed(4)}`);
  console.log(`p95:             ${p95.toFixed(4)}`);
  console.log(`Max similarity:  ${max.toFixed(4)}`);

  const aboveThreshold = allSimilarities.filter((s) => s >= 0.6).length;
  const totalPairs = allSimilarities.length;
  console.log(`\nAbove 0.6 threshold: ${aboveThreshold}/${totalPairs} (${((aboveThreshold / totalPairs) * 100).toFixed(1)}%)`);
}

main().catch(console.error);
