/**
 * One-off: extract named entities from every memory + query in the vault
 * benchmark dataset, save to JSON, commit. The benchmark loads this cache
 * instead of the heuristic extractor when --entities=llm is passed.
 *
 * Run:  PORTAL_API_KEY=... npx tsx scripts/precompute-bench-entities.ts
 *
 * Re-run idempotent — if the cache already has an entry for a text, skip.
 */
import "dotenv/config";
import { readFile, writeFile } from "node:fs/promises";

import { VAULT_MEMORIES, BENCHMARK_QUERIES } from "../test/memory/src/vault/dataset.js";

const CACHE_PATH = "test/memory/src/vault/llm-entities.json";
const MODEL = "openai/gpt-5-mini";
const BATCH_SIZE = 25;
const CONCURRENCY = 4;

const SYSTEM_PROMPT = `You extract named entities (people, places, things, concepts) from short texts. For each input text return a JSON list of lowercase canonical entity names. Skip generic nouns ("user", "team", "company", "thing"). Skip stopwords. Skip articles. Strip plurals to canonical form when obvious.

Examples:
  "Lives in San Francisco" → ["san francisco"]
  "Allergic to shellfish"  → ["shellfish"]
  "Has a golden retriever named Biscuit" → ["biscuit", "golden retriever"]
  "What's a good restaurant?" → []
  "Tell me about the user as a person" → []

Output strict JSON: {"texts": [{"index": 0, "entities": [...]}, ...]}.`;

interface BatchResponse {
  texts?: Array<{ index?: unknown; entities?: unknown }>;
}

interface ChoicesResponse {
  choices?: Array<{ message?: { content?: string } }>;
}

async function extractBatch(texts: string[], apiKey: string, baseUrl: string): Promise<string[][]> {
  const userPrompt =
    "Extract entities for each text:\n" + texts.map((t, i) => `[${i}] ${t}`).join("\n");

  const res = await fetch(`${baseUrl}/api/v1/chat/completions`, {
    method: "POST",
    headers: { "x-api-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  const body = (await res.json()) as ChoicesResponse;
  const content = body.choices?.[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(content) as BatchResponse;

  const out: string[][] = texts.map(() => []);
  for (const row of parsed.texts ?? []) {
    if (typeof row.index !== "number") continue;
    if (!Array.isArray(row.entities)) continue;
    if (row.index < 0 || row.index >= texts.length) continue;
    out[row.index] = row.entities.filter((s): s is string => typeof s === "string");
  }
  return out;
}

async function main() {
  const apiKey = process.env.PORTAL_API_KEY;
  if (!apiKey) throw new Error("PORTAL_API_KEY required");
  const baseUrl = process.env.ANUMA_API_URL || "https://portal.anuma-dev.ai";

  let cache: Record<string, string[]> = {};
  try {
    cache = JSON.parse(await readFile(CACHE_PATH, "utf-8")) as Record<string, string[]>;
    console.log(`loaded ${Object.keys(cache).length} cached entries from ${CACHE_PATH}`);
  } catch {
    /* fresh */
  }

  const memoryTexts = VAULT_MEMORIES.map((m) => m.content);
  const queryTexts = BENCHMARK_QUERIES.map((q) => q.query);
  const allTexts = [...new Set([...memoryTexts, ...queryTexts])];
  const missing = allTexts.filter((t) => !(t in cache));
  console.log(
    `${memoryTexts.length} memories + ${queryTexts.length} queries; ` +
      `${allTexts.length} unique; ${missing.length} need extraction`
  );

  if (missing.length === 0) {
    console.log("nothing to do");
    return;
  }

  // Batch with bounded concurrency.
  const batches: string[][] = [];
  for (let i = 0; i < missing.length; i += BATCH_SIZE) {
    batches.push(missing.slice(i, i + BATCH_SIZE));
  }

  const t0 = Date.now();
  let done = 0;
  let nextBatch = 0;
  async function worker() {
    while (nextBatch < batches.length) {
      const myIdx = nextBatch++;
      const batch = batches[myIdx]!;
      try {
        const entitiesPerText = await extractBatch(batch, apiKey, baseUrl);
        for (let j = 0; j < batch.length; j++) {
          cache[batch[j]!] = entitiesPerText[j] ?? [];
        }
        done += batch.length;
        console.log(
          `  batch ${myIdx + 1}/${batches.length} (${done}/${missing.length} done, ` +
            `${((Date.now() - t0) / 1000).toFixed(1)}s)`
        );
      } catch (err) {
        console.error(`  batch ${myIdx + 1} failed:`, err);
        for (const t of batch) cache[t] = [];
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

  // Stable-sort the cache for clean diffs.
  const sorted: Record<string, string[]> = {};
  for (const k of Object.keys(cache).sort()) sorted[k] = cache[k]!.sort();

  await writeFile(CACHE_PATH, JSON.stringify(sorted, null, 2) + "\n");
  console.log(`\nsaved ${Object.keys(sorted).length} entries to ${CACHE_PATH}`);
  console.log(`elapsed: ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
