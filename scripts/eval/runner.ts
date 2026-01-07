/**
 * Evaluation runner - orchestrates test suites
 */

import { readFile, writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import type {
  Memory,
  QueryFixture,
  Fixtures,
  EvaluationSummary,
  Baseline,
  ComparisonResult,
  EvalOptions,
  LatencyMetrics,
} from "./types.js";
import { runRetrievalSuite, generateEmbeddings } from "./suites/retrieval.js";
import { calculatePercentiles } from "./metrics.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = join(__dirname, "../fixtures");
const BASELINES_DIR = join(__dirname, "../baselines");

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
    conversations: [],
  };
}

export async function saveEmbeddings(
  embeddings: Record<string, number[]>
): Promise<void> {
  const embeddingsPath = join(FIXTURES_DIR, "embeddings.json");
  await writeFile(embeddingsPath, JSON.stringify(embeddings, null, 2));
}

export async function runQuickEval(
  fixtures: Fixtures,
  options: Partial<EvalOptions> = {}
): Promise<EvaluationSummary> {
  if (Object.keys(fixtures.embeddings).length === 0) {
    throw new Error(
      "No cached embeddings found. Run with --full to generate embeddings first."
    );
  }

  return runEvaluation(fixtures, options);
}

export async function runFullEval(
  fixtures: Fixtures,
  options: Partial<EvalOptions> = {}
): Promise<EvaluationSummary> {
  const apiKey = process.env.REVERBIA_API_KEY;
  const baseUrl =
    process.env.REVERBIA_API_URL || "https://ai-portal-dev.zetachain.com";

  if (!apiKey) {
    throw new Error(
      "Reverbia API key required for full evaluation.\n\n" +
        "Set the REVERBIA_API_KEY environment variable:\n" +
        "  export REVERBIA_API_KEY=your-api-key\n\n" +
        "Or use --quick mode with cached embeddings."
    );
  }

  console.log("Generating embeddings via Reverbia API...");
  console.log(`Base URL: ${baseUrl}`);

  const embeddings = await generateEmbeddings(
    fixtures.memories,
    fixtures.queries,
    apiKey,
    baseUrl
  );

  // Save embeddings for future quick runs
  await saveEmbeddings(embeddings);
  console.log(`Saved ${Object.keys(embeddings).length} embeddings to cache`);

  fixtures.embeddings = embeddings;

  return runEvaluation(fixtures, options);
}

async function runEvaluation(
  fixtures: Fixtures,
  options: Partial<EvalOptions> = {}
): Promise<EvaluationSummary> {
  const suite = options.suite || "all";
  const verbose = options.verbose || false;

  let retrievalMetrics = null;
  let retrievalLatency: number[] = [];
  let retrievalResults = null;

  // Run retrieval suite
  if (suite === "all" || suite === "retrieval") {
    const result = await runRetrievalSuite(
      fixtures.memories,
      fixtures.embeddings,
      fixtures.queries,
      { verbose }
    );
    retrievalMetrics = result.metrics;
    retrievalLatency = result.latencyMs;
    retrievalResults = result.results;
  }

  // Calculate latency metrics
  const latency: LatencyMetrics = {
    embeddingGenerationMs: { p50: 0, p95: 0, p99: 0, mean: 0, min: 0, max: 0 },
    searchTimeMs: calculatePercentiles(retrievalLatency),
    extractionTimeMs: { p50: 0, p95: 0, p99: 0, mean: 0, min: 0, max: 0 },
  };

  // Aggregate by category and difficulty
  const byCategory: EvaluationSummary["byCategory"] = {};
  const byDifficulty: EvaluationSummary["byDifficulty"] = {};

  if (retrievalResults) {
    byCategory["retrieval"] = {
      total: retrievalResults.length,
      passed: retrievalResults.filter((r) => r.passed).length,
      metrics: retrievalMetrics!,
    };

    for (const query of fixtures.queries) {
      const result = retrievalResults.find((r) => r.instanceId === query.id);
      if (!result) continue;

      const diff = query.difficulty;
      if (!byDifficulty[diff]) {
        byDifficulty[diff] = { total: 0, passed: 0 };
      }
      byDifficulty[diff].total++;
      if (result.passed) byDifficulty[diff].passed++;
    }
  }

  const totalInstances = retrievalResults?.length || 0;
  const passedInstances = retrievalResults?.filter((r) => r.passed).length || 0;

  return {
    timestamp: new Date().toISOString(),
    mode: options.full ? "full" : "quick",
    totalInstances,
    passedInstances,
    failedInstances: totalInstances - passedInstances,
    retrieval: retrievalMetrics || {
      precisionAtK: {},
      recallAtK: {},
      mrr: 0,
      ndcgAtK: {},
      avgSimilarity: 0,
      similarityStdDev: 0,
      belowThresholdCount: 0,
    },
    latency,
    byCategory,
    byDifficulty,
  };
}

export async function loadBaseline(): Promise<Baseline | null> {
  const files = await getBaselineFiles();
  if (files.length === 0) return null;

  // Get most recent baseline
  const latestFile = files[files.length - 1];
  const data = await readFile(join(BASELINES_DIR, latestFile), "utf-8");
  return JSON.parse(data);
}

export async function saveBaseline(summary: EvaluationSummary): Promise<void> {
  if (!existsSync(BASELINES_DIR)) {
    await mkdir(BASELINES_DIR, { recursive: true });
  }

  const date = new Date().toISOString().split("T")[0];
  const filename = `baseline-${date}.json`;

  const baseline: Baseline = {
    version: "1.0.0",
    createdAt: new Date().toISOString(),
    summary,
  };

  await writeFile(
    join(BASELINES_DIR, filename),
    JSON.stringify(baseline, null, 2)
  );
  console.log(`Saved baseline to ${filename}`);
}

async function getBaselineFiles(): Promise<string[]> {
  if (!existsSync(BASELINES_DIR)) return [];

  const { readdir } = await import("fs/promises");
  const files = await readdir(BASELINES_DIR);
  return files
    .filter((f) => f.startsWith("baseline-") && f.endsWith(".json"))
    .sort();
}

export function compareResults(
  current: EvaluationSummary,
  baseline: Baseline
): ComparisonResult[] {
  const comparisons: ComparisonResult[] = [];
  const baselineSummary = baseline.summary;

  // Compare retrieval metrics
  const metricsToCompare = [
    {
      name: "Precision@1",
      current: current.retrieval.precisionAtK[1],
      baseline: baselineSummary.retrieval.precisionAtK[1],
    },
    {
      name: "Precision@5",
      current: current.retrieval.precisionAtK[5],
      baseline: baselineSummary.retrieval.precisionAtK[5],
    },
    {
      name: "Recall@5",
      current: current.retrieval.recallAtK[5],
      baseline: baselineSummary.retrieval.recallAtK[5],
    },
    {
      name: "MRR",
      current: current.retrieval.mrr,
      baseline: baselineSummary.retrieval.mrr,
    },
    {
      name: "NDCG@5",
      current: current.retrieval.ndcgAtK[5],
      baseline: baselineSummary.retrieval.ndcgAtK[5],
    },
  ];

  for (const { name, current: curr, baseline: base } of metricsToCompare) {
    if (curr === undefined || base === undefined) continue;

    const delta = curr - base;
    const deltaPercent = base !== 0 ? (delta / base) * 100 : 0;

    let status: "improved" | "degraded" | "unchanged";
    if (Math.abs(deltaPercent) < 1) {
      status = "unchanged";
    } else if (delta > 0) {
      status = "improved";
    } else {
      status = "degraded";
    }

    comparisons.push({
      metric: name,
      baseline: base,
      current: curr,
      delta,
      deltaPercent,
      status,
    });
  }

  return comparisons;
}
