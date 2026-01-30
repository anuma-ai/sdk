/**
 * Test runner - orchestrates evaluation
 */

import { readFile, writeFile } from "fs/promises";
import { existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import type { Memory, QueryFixture, Fixtures, EvaluationSummary, EvalOptions, LatencyMetrics } from "./types.js";
import { runSuite } from "./suite.js";
import { calculatePercentiles } from "./metrics.js";
import { DEFAULT_API_EMBEDDING_MODEL } from "../../../src/lib/memory/constants.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = join(__dirname, "../fixtures");

export async function generateEmbeddings(
  memories: Memory[],
  queries: QueryFixture[],
  apiKey: string,
  baseUrl: string
): Promise<Record<string, number[]>> {
  const embeddings: Record<string, number[]> = {};
  const textsToEmbed: Array<{ id: string; text: string }> = [];

  for (const memory of memories) {
    textsToEmbed.push({ id: memory.id, text: memory.rawEvidence || memory.value });
  }

  for (const query of queries) {
    textsToEmbed.push({ id: query.id, text: query.query });
  }

  console.log(`Generating embeddings for ${textsToEmbed.length} texts...`);

  for (let i = 0; i < textsToEmbed.length; i++) {
    const { id, text } = textsToEmbed[i];

    try {
      const response = await fetch(`${baseUrl}/api/v1/embeddings`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-API-Key": apiKey },
        body: JSON.stringify({ model: DEFAULT_API_EMBEDDING_MODEL, input: text }),
      });

      if (!response.ok) {
        throw new Error(`API error ${response.status}: ${await response.text()}`);
      }

      const data = (await response.json()) as { data: Array<{ embedding: number[] }> };
      embeddings[id] = data.data[0].embedding;

      if ((i + 1) % 10 === 0 || i === textsToEmbed.length - 1) {
        console.log(`  Progress: ${i + 1}/${textsToEmbed.length}`);
      }
    } catch (error) {
      console.error(`Failed to generate embedding for ${id}:`, error);
      throw error;
    }
  }

  return embeddings;
}

export async function loadFixtures(): Promise<Fixtures> {
  const memoriesPath = join(FIXTURES_DIR, "memories.json");
  const queriesPath = join(FIXTURES_DIR, "queries.json");
  const embeddingsPath = join(FIXTURES_DIR, "embeddings.json");

  const memoriesData = JSON.parse(await readFile(memoriesPath, "utf-8"));
  const queriesData = JSON.parse(await readFile(queriesPath, "utf-8"));

  let embeddings: Record<string, number[]> = {};
  if (existsSync(embeddingsPath)) {
    embeddings = JSON.parse(await readFile(embeddingsPath, "utf-8"));
  }

  return {
    memories: memoriesData.memories as Memory[],
    embeddings,
    queries: queriesData.queries as QueryFixture[],
  };
}

export async function saveEmbeddings(embeddings: Record<string, number[]>): Promise<void> {
  const embeddingsPath = join(FIXTURES_DIR, "embeddings.json");
  await writeFile(embeddingsPath, JSON.stringify(embeddings, null, 2));
}

export async function runQuickEval(fixtures: Fixtures, options: Partial<EvalOptions> = {}): Promise<EvaluationSummary> {
  if (Object.keys(fixtures.embeddings).length === 0) {
    throw new Error("No cached embeddings found. Run with --full to generate embeddings first.");
  }

  return runEvaluation(fixtures, { ...options, mode: "quick" });
}

export async function runFullEval(fixtures: Fixtures, options: Partial<EvalOptions> = {}): Promise<EvaluationSummary> {
  const apiKey = process.env.PORTAL_API_KEY;
  const baseUrl = process.env.REVERBIA_API_URL || "https://portal.anuma-dev.ai";

  if (!apiKey) {
    throw new Error(
      "Portal API key required for full evaluation.\n\n" +
        "Add PORTAL_API_KEY to your .env file:\n" +
        "  PORTAL_API_KEY=your-api-key\n\n" +
        "Or use default mode with cached embeddings."
    );
  }

  console.log("Generating embeddings via Portal API...");
  console.log(`Base URL: ${baseUrl}`);

  const embeddings = await generateEmbeddings(fixtures.memories, fixtures.queries, apiKey, baseUrl);

  await saveEmbeddings(embeddings);
  console.log(`Saved ${Object.keys(embeddings).length} embeddings to cache`);

  fixtures.embeddings = embeddings;

  return runEvaluation(fixtures, { ...options, mode: "full" });
}

async function runEvaluation(
  fixtures: Fixtures,
  options: Partial<EvalOptions> & { mode?: "quick" | "full" } = {}
): Promise<EvaluationSummary> {
  const verbose = options.verbose || false;
  const mode = options.mode || "quick";

  const result = await runSuite(fixtures.memories, fixtures.embeddings, fixtures.queries, { verbose });

  const latency: LatencyMetrics = {
    embeddingGenerationMs: { p50: 0, p95: 0, p99: 0, mean: 0, min: 0, max: 0 },
    searchTimeMs: calculatePercentiles(result.latencyMs),
    extractionTimeMs: { p50: 0, p95: 0, p99: 0, mean: 0, min: 0, max: 0 },
  };

  const byCategory: EvaluationSummary["byCategory"] = {
    retrieval: {
      total: result.results.length,
      passed: result.results.filter((r) => r.passed).length,
      metrics: result.metrics,
    },
  };

  const byDifficulty: EvaluationSummary["byDifficulty"] = {};
  for (const query of fixtures.queries) {
    const res = result.results.find((r) => r.instanceId === query.id);
    if (!res) continue;

    const diff = query.difficulty;
    if (!byDifficulty[diff]) {
      byDifficulty[diff] = { total: 0, passed: 0 };
    }
    byDifficulty[diff].total++;
    if (res.passed) byDifficulty[diff].passed++;
  }

  return {
    timestamp: new Date().toISOString(),
    mode,
    totalInstances: result.results.length,
    passedInstances: result.results.filter((r) => r.passed).length,
    failedInstances: result.results.filter((r) => !r.passed).length,
    retrieval: result.metrics,
    latency,
    byCategory,
    byDifficulty,
  };
}
