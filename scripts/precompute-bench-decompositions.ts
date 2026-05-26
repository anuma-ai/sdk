/**
 * One-off: classify + decompose every benchmark query via gpt-5-mini and
 * cache the result to JSON. The bench loads this when --decompose=llm.
 *
 * Run:  PORTAL_API_KEY=... npx tsx scripts/precompute-bench-decompositions.ts
 *
 * Idempotent — if a query already has a cached entry, skip.
 */
import "dotenv/config";
import { readFile, writeFile } from "node:fs/promises";

import { decomposeQuery, type DecomposedQuery } from "../src/lib/memoryVault/decomposeQuery.js";
import { BENCHMARK_QUERIES } from "../test/memory/src/vault/dataset.js";

const CACHE_PATH = "test/memory/src/vault/decompositions.json";
const CONCURRENCY = 4;

async function main() {
  const apiKey = process.env.PORTAL_API_KEY;
  if (!apiKey) throw new Error("PORTAL_API_KEY required");
  const baseUrl = process.env.ANUMA_API_URL || "https://portal.anuma-dev.ai";

  let cache: Record<string, DecomposedQuery> = {};
  try {
    cache = JSON.parse(await readFile(CACHE_PATH, "utf-8")) as Record<string, DecomposedQuery>;
    console.log(`loaded ${Object.keys(cache).length} cached entries from ${CACHE_PATH}`);
  } catch {
    /* fresh */
  }

  const queries = BENCHMARK_QUERIES.map((q) => q.query);
  const missing = queries.filter((q) => !(q in cache));
  console.log(`${queries.length} queries; ${missing.length} need decomposition`);

  if (missing.length === 0) {
    console.log("nothing to do");
    return;
  }

  const t0 = Date.now();
  let done = 0;
  let nextIdx = 0;
  async function worker() {
    while (nextIdx < missing.length) {
      const myIdx = nextIdx++;
      const q = missing[myIdx]!;
      try {
        cache[q] = await decomposeQuery(q, { apiKey, baseUrl });
        done++;
        if (done % 10 === 0) {
          console.log(
            `  ${done}/${missing.length} done (${((Date.now() - t0) / 1000).toFixed(1)}s)`
          );
        }
      } catch (err) {
        console.error(`  failed for "${q}":`, err);
        cache[q] = { mode: "specific", subQueries: [q] };
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

  const sorted: Record<string, DecomposedQuery> = {};
  for (const k of Object.keys(cache).sort()) sorted[k] = cache[k]!;

  await writeFile(CACHE_PATH, JSON.stringify(sorted, null, 2) + "\n");

  const composite = Object.values(sorted).filter((d) => d.mode === "composite").length;
  console.log(
    `\nsaved ${Object.keys(sorted).length} entries (${composite} composite) to ${CACHE_PATH}`
  );
  console.log(`elapsed: ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
