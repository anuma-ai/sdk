/**
 * LongMemEval Dataset Loader with Caching
 *
 * Downloads the dataset once and caches it in ~/.cache/longmemeval/
 */

import { createWriteStream } from "fs";
import { homedir } from "os";
import { join } from "path";
import { mkdir, readFile, stat } from "fs/promises";
import { Readable } from "stream";
import { pipeline } from "stream/promises";
import type { LongMemEvalDataset } from "./types.js";

const CACHE_DIR = join(homedir(), ".cache", "longmemeval");

export type DatasetVariant = "s" | "m" | "oracle";

const DATASET_URLS: Record<DatasetVariant, string> = {
  s: "https://huggingface.co/datasets/xiaowu0162/longmemeval-cleaned/resolve/main/longmemeval_s_cleaned.json",
  m: "https://huggingface.co/datasets/xiaowu0162/longmemeval-cleaned/resolve/main/longmemeval_m_cleaned.json",
  oracle:
    "https://huggingface.co/datasets/xiaowu0162/longmemeval-cleaned/resolve/main/longmemeval_oracle.json",
};

const DATASET_FILENAMES: Record<DatasetVariant, string> = {
  s: "longmemeval_s_cleaned.json",
  m: "longmemeval_m_cleaned.json",
  oracle: "longmemeval_oracle.json",
};

async function exists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function ensureCacheDir(): Promise<void> {
  if (!(await exists(CACHE_DIR))) {
    await mkdir(CACHE_DIR, { recursive: true });
  }
}

function getCachePath(variant: DatasetVariant): string {
  return join(CACHE_DIR, DATASET_FILENAMES[variant]);
}

/**
 * Download a dataset file from Hugging Face, streaming directly to disk
 * to avoid V8's ~512MB string size limit.
 */
async function downloadDatasetToFile(variant: DatasetVariant, destPath: string): Promise<void> {
  const url = DATASET_URLS[variant];

  console.log(`Downloading LongMemEval dataset (${variant})...`);
  console.log(`  URL: ${url}`);

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to download dataset: ${response.status} ${response.statusText}`);
  }

  if (!response.body) {
    throw new Error("Response body is null");
  }

  await pipeline(Readable.fromWeb(response.body as never), createWriteStream(destPath));

  const fileInfo = await stat(destPath);
  const sizeMB = (fileInfo.size / 1024 / 1024).toFixed(1);
  console.log(`  Downloaded: ${sizeMB} MB`);
  console.log(`  Cached to: ${destPath}`);
}

/**
 * Load the LongMemEval dataset, downloading and caching if necessary
 *
 * @param variant - Dataset variant:
 *   - "s": Small dataset (~50 sessions per question, ~115k tokens)
 *   - "m": Medium dataset (~500 sessions per question)
 *   - "oracle": Oracle dataset (only evidence sessions included)
 */
export async function loadLongMemEvalDataset(
  variant: DatasetVariant = "s"
): Promise<LongMemEvalDataset> {
  await ensureCacheDir();

  const cachePath = getCachePath(variant);

  if (!(await exists(cachePath))) {
    await downloadDatasetToFile(variant, cachePath);
  } else {
    console.log(`Loading cached dataset from ${cachePath}`);
  }

  const data = await readFile(cachePath, "utf-8");
  return JSON.parse(data) as LongMemEvalDataset;
}

/**
 * Get the cache directory path (for CI caching)
 */
export function getCacheDirectory(): string {
  return CACHE_DIR;
}

/**
 * Check if a dataset is already cached
 */
export async function isDatasetCached(variant: DatasetVariant): Promise<boolean> {
  return exists(getCachePath(variant));
}

/**
 * Pre-download all dataset variants (useful for CI setup)
 */
export async function preloadAllDatasets(): Promise<void> {
  console.log("Preloading all LongMemEval datasets...\n");
  await ensureCacheDir();

  for (const variant of ["s", "m", "oracle"] as const) {
    console.log(`\n[${variant}]`);
    const cachePath = getCachePath(variant);
    if (await exists(cachePath)) {
      console.log(`  Already cached at ${cachePath}`);
    } else {
      await downloadDatasetToFile(variant, cachePath);
    }
  }

  console.log("\nAll datasets preloaded.");
}

/**
 * Get dataset statistics
 */
export function getDatasetStats(dataset: LongMemEvalDataset): {
  totalEntries: number;
  questionTypes: Record<string, number>;
  avgSessionsPerEntry: number;
  avgMessagesPerSession: number;
} {
  const questionTypes: Record<string, number> = {};
  let totalSessions = 0;
  let totalMessages = 0;

  for (const entry of dataset) {
    questionTypes[entry.question_type] = (questionTypes[entry.question_type] || 0) + 1;
    totalSessions += entry.haystack_sessions.length;

    for (const session of entry.haystack_sessions) {
      totalMessages += session.length;
    }
  }

  return {
    totalEntries: dataset.length,
    questionTypes,
    avgSessionsPerEntry: dataset.length > 0 ? totalSessions / dataset.length : 0,
    avgMessagesPerSession: totalSessions > 0 ? totalMessages / totalSessions : 0,
  };
}
