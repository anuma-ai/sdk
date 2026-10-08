import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { generateEmbeddings } from "../../../../src/lib/memoryEngine/embeddings.js";
import type { EmbeddingOptions } from "../../../../src/lib/memoryEngine/types.js";

export const DEFAULT_EMBEDDING_CACHE_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  "embeddings-cache.json"
);

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
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
      console.error(`  Embedding cache unreadable (${(err as Error).message}); rebuilding.`);
    }
    return new Map();
  }
}

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
