// ---------------------------------------------------------------------------
// Frozen embedding cache for the vault-search benchmark.
//
// A/B ranker comparisons must score against IDENTICAL embeddings, otherwise
// run-to-run embedding drift shows up as a fake ranker delta. This caches the
// query + memory vectors on disk, keyed by the embedding model so a model
// change auto-invalidates. Extracted from benchmark.test.ts so the load/save/
// invalidation behaviour can be unit-tested (it couldn't be while it was a
// module-private helper inside the CLI script).
// ---------------------------------------------------------------------------
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { generateEmbeddings } from "../../../../src/lib/memoryEngine/embeddings.js";
import type { EmbeddingOptions } from "../../../../src/lib/memoryEngine/types.js";

// Resolve relative to THIS module, not process.cwd(). A cwd-relative path only
// works when the benchmark is launched from the repo root; from anywhere else
// the read fails, the catch swallows ENOENT, and the run silently re-embeds
// with fresh (non-deterministic) vectors — defeating the frozen-embedding
// guarantee. The cache sits next to this file.
export const DEFAULT_EMBEDDING_CACHE_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  "embeddings-cache.json"
);

/**
 * Load the frozen vectors for `model`. Returns an empty Map (rebuild from
 * scratch) when `refresh` is set, the cache is missing, the stored model
 * differs, or the file is unreadable / corrupt — in the last case the error is
 * logged (not thrown), so the caller always gets a Map and re-embeds from
 * scratch rather than crashing the run.
 *
 * `path` is injectable for tests; defaults to {@link DEFAULT_EMBEDDING_CACHE_PATH}.
 */
export async function loadEmbeddingCache(
  model: string,
  refresh: boolean,
  path: string = DEFAULT_EMBEDDING_CACHE_PATH
): Promise<Map<string, number[]>> {
  if (refresh) return new Map();
  try {
    const raw = JSON.parse(await readFile(path, "utf-8"));
    if (raw.model !== model) {
      console.error(
        `  Embedding cache model changed (${raw.model} → ${model}); rebuilding from scratch.`
      );
      return new Map();
    }
    return new Map(Object.entries(raw.vectors as Record<string, number[]>));
  } catch (err) {
    // A missing cache on first run is expected and silent; anything else
    // (corrupt JSON, permissions) is logged so it's visible, then we still fall
    // back to an empty Map (rebuild) rather than throwing and failing the run.
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
      console.error(`  Embedding cache unreadable (${(err as Error).message}); rebuilding.`);
    }
    return new Map();
  }
}

/** Persist `cache` tagged with `model` so a later run can validate + reuse it. */
export async function saveEmbeddingCache(
  cache: Map<string, number[]>,
  model: string,
  path: string = DEFAULT_EMBEDDING_CACHE_PATH
): Promise<void> {
  await writeFile(
    path,
    JSON.stringify({ model, count: cache.size, vectors: Object.fromEntries(cache) })
  );
}

/**
 * Embed `texts`, reusing cached vectors and only calling the API for misses.
 * Mutates `cache` with any freshly-embedded vectors. Returns vectors aligned to
 * `texts` and how many misses hit the API.
 */
export async function embedWithCache(
  texts: string[],
  options: EmbeddingOptions,
  cache: Map<string, number[]>
): Promise<{ vectors: number[][]; misses: number }> {
  const missing = [...new Set(texts.filter((t) => !cache.has(t)))];
  if (missing.length > 0) {
    const fresh = await generateEmbeddings(missing, options);
    missing.forEach((t, i) => cache.set(t, fresh[i]));
  }
  return { vectors: texts.map((t) => cache.get(t)!), misses: missing.length };
}
