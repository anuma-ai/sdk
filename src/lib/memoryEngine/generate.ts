/**
 * Embedding generation — dependency-free core.
 *
 * The raw "text → embedding" calls, split out of `embeddings.ts` so they can be
 * imported by node/React-Native-safe modules (the server-tool + client-tool
 * selection engine in `../tools`) WITHOUT pulling in the WatermelonDB-backed
 * `db/chat/operations` that `embeddings.ts` needs for its message-persistence
 * helpers (`embedMessage`, `embedAllMessages`, `chunkAndEmbed*`).
 *
 * Nothing here touches the database; the only I/O is the HTTP embeddings
 * endpoint. `embeddings.ts` re-exports these so existing importers of
 * `../memoryEngine/embeddings` (and the `../memoryEngine` barrel) keep working.
 */

import { postApiV1Embeddings } from "../../client";
import { BASE_URL } from "../../clientConfig";
import { DEFAULT_API_EMBEDDING_MODEL } from "./constants";
import type { EmbeddingOptions } from "./types";

/** Bounded retry for the embeddings endpoint. Transient 429/5xx blips
 * under sustained load were observed killing entire eval questions (and
 * production saves/lazy backfills) on the first error — mirror the
 * extraction path's retry discipline: exponential backoff with jitter,
 * a few attempts, then surface the final error. */
const EMBED_MAX_ATTEMPTS = 4;

async function withEmbeddingRetry<T extends { error?: unknown; response?: Response }>(
  call: () => Promise<T>
): Promise<T> {
  let last: T | undefined;
  let lastThrown: unknown;
  let threw = false;
  for (let attempt = 1; attempt <= EMBED_MAX_ATTEMPTS; attempt++) {
    try {
      threw = false;
      last = await call();
      if (!last.error) return last;
      // Resolved with an HTTP-level error ({ error } set). Only transient
      // statuses are worth retrying — a non-429 4xx (bad auth / bad request)
      // fails identically every attempt, so surface it immediately.
      const status = last.response?.status;
      const retryable = status === undefined || status === 429 || status >= 500;
      if (!retryable) return last;
    } catch (err) {
      // fetch itself rejected — ECONNRESET, DNS failure, connection timeout.
      // These never come back as a `{ error }` object, so without this catch
      // a real network fault would skip the retry entirely and hard-fail on
      // the first attempt. Always transient: retry, then re-throw if we
      // exhaust attempts (preserving the throw contract for callers).
      threw = true;
      lastThrown = err;
    }
    if (attempt < EMBED_MAX_ATTEMPTS) {
      const base = 250 * 2 ** (attempt - 1);
      await new Promise((r) => setTimeout(r, base + Math.random() * 0.4 * base));
    }
  }
  if (threw) throw lastThrown;
  // openapi-ts >=0.97 wraps fetch rejections in `{ error }` (often with no
  // Response) instead of letting them propagate. After retries are exhausted,
  // rethrow the underlying Error so callers keep the historical throw
  // contract (and a useful message like ECONNRESET) rather than a generic
  // "API embedding failed" wrapper.
  if (last?.error instanceof Error && (last.response == null || last.response.status == null)) {
    throw last.error;
  }
  return last as T;
}

/**
 * HTTP-level failure from the embeddings endpoint, carrying the status code so
 * callers can distinguish a permanent client error (401/402/403) from a
 * transient one. The generated client exposes the status on `response.response`
 * but the previous bare `Error` discarded it, forcing bulk callers to treat a
 * standing 402 the same as a one-off 5xx.
 */
export class EmbeddingHttpError extends Error {
  readonly status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = "EmbeddingHttpError";
    this.status = status;
  }
}

/**
 * A non-retryable client error that fails identically for every message in a
 * bulk pass — auth (401), payment / out-of-credits (402), forbidden (403).
 * A corpus walk must abort the whole pass on these instead of re-firing one
 * request per message: a 402 persists nothing, so the walk would otherwise
 * repeat the full storm every session/import (the prod embeddings-402 flood).
 */
export function isFatalEmbeddingError(err: unknown): boolean {
  return (
    err instanceof EmbeddingHttpError &&
    (err.status === 401 || err.status === 402 || err.status === 403)
  );
}

/**
 * Build an EmbeddingHttpError from a failed postApiV1Embeddings response,
 * preserving the server's error message and the HTTP status.
 */
function embeddingErrorFrom(response: {
  error?: unknown;
  response?: Response;
}): EmbeddingHttpError {
  const message =
    typeof response.error === "object" && response.error && "error" in response.error
      ? (response.error as { error: string }).error
      : "API embedding failed";
  return new EmbeddingHttpError(message, response.response?.status);
}

/**
 * Generate an embedding for text using the API
 *
 * Supports two auth methods:
 * - `apiKey`: Uses X-API-Key header (for server-side/CLI usage)
 * - `getToken`: Uses Authorization: Bearer header (for Privy identity tokens)
 */
export async function generateEmbedding(
  text: string,
  options: EmbeddingOptions
): Promise<number[]> {
  const { baseUrl = BASE_URL, getToken, apiKey, model, cache } = options;

  // Check cache first. The cache holds Float32Array (native embedding
  // precision, half the resident RAM of a float64 number[]); the public
  // contract still returns number[], so re-materialize a plain array at this
  // boundary. This is not the RAM-critical resident structure (the Map stays
  // f32) and the array handed back equals what a cache miss would return.
  if (cache) {
    const cached = cache.get(text);
    if (cached) return Array.from(cached);
  }

  // Build auth headers - prefer apiKey if provided
  let headers: Record<string, string>;
  if (apiKey) {
    headers = { "X-API-Key": apiKey };
  } else if (getToken) {
    const token = await getToken();
    if (!token) {
      throw new Error("No token available for embedding generation");
    }
    headers = { Authorization: `Bearer ${token}` };
  } else {
    throw new Error("Either apiKey or getToken must be provided");
  }

  const response = await withEmbeddingRetry(() =>
    postApiV1Embeddings({
      baseUrl,
      body: {
        // Mask PII from the request body only — the cache above still keys on
        // the original `text`, so callers keep their original values.
        input: options.maskInput ? options.maskInput(text) : text,
        model: model ?? DEFAULT_API_EMBEDDING_MODEL,
      },
      headers,
    })
  );

  if (response.error) {
    throw embeddingErrorFrom(response);
  }

  if (!response.data?.data?.[0]?.embedding) {
    throw new Error("No embedding returned from API");
  }

  const embedding = response.data.data[0].embedding;

  // Report usage if callback provided
  if (options.onUsage && response.data.usage) {
    options.onUsage({
      promptTokens: response.data.usage.prompt_tokens ?? 0,
      totalTokens: response.data.usage.total_tokens ?? 0,
    });
  }

  // Convert to f32 precision before returning so cache miss and hit return
  // identical values (cache hits materialize from Float32Array).
  const f32Embedding = Float32Array.from(embedding);
  if (cache) {
    cache.set(text, f32Embedding);
  }

  return Array.from(f32Embedding);
}

const DEFAULT_EMBEDDING_BATCH_SIZE = 100;
const DEFAULT_EMBEDDING_BATCH_CONCURRENCY = 3;

/**
 * Make a single batch embedding API call.
 */
async function generateEmbeddingsBatch(
  texts: string[],
  headers: Record<string, string>,
  baseUrl: string,
  model: string,
  onUsage?: EmbeddingOptions["onUsage"],
  maskInput?: EmbeddingOptions["maskInput"]
): Promise<number[][]> {
  const response = await withEmbeddingRetry(() =>
    postApiV1Embeddings({
      baseUrl,
      // Mask PII from the request body only; cache/order still key on originals.
      body: { input: maskInput ? texts.map(maskInput) : texts, model },
      headers,
    })
  );

  if (response.error) {
    throw embeddingErrorFrom(response);
  }

  if (!response.data?.data) {
    throw new Error("No embeddings returned from API");
  }

  if (onUsage && response.data.usage) {
    onUsage({
      promptTokens: response.data.usage.prompt_tokens ?? 0,
      totalTokens: response.data.usage.total_tokens ?? 0,
    });
  }

  return response.data.data.map((item) => item.embedding ?? []);
}

/**
 * Generate embeddings for multiple texts, automatically chunking large inputs.
 *
 * More efficient than calling generateEmbedding multiple times.
 * Supports the same auth methods as generateEmbedding.
 * For inputs larger than batchSize (default 100), splits into chunks
 * processed with bounded concurrency (3 concurrent batches).
 *
 * @param texts - Array of texts to embed
 * @param options - Embedding options
 * @returns Array of embeddings in the same order as input texts
 */
export async function generateEmbeddings(
  texts: string[],
  options: EmbeddingOptions
): Promise<number[][]> {
  if (texts.length === 0) return [];

  const { baseUrl = BASE_URL, getToken, apiKey, model, batchSize, cache } = options;
  const chunkSize = batchSize ?? DEFAULT_EMBEDDING_BATCH_SIZE;

  // Separate cached and uncached texts
  const results: (number[] | null)[] = new Array<number[] | null>(texts.length).fill(null);
  const uncachedIndices: number[] = [];
  const uncachedTexts: string[] = [];

  for (let i = 0; i < texts.length; i++) {
    if (cache) {
      const cached = cache.get(texts[i]);
      if (cached) {
        // Cache holds Float32Array; the batch contract returns number[][], so
        // re-materialize at this boundary (the resident f32 Map is untouched).
        results[i] = Array.from(cached);
        continue;
      }
    }
    uncachedIndices.push(i);
    uncachedTexts.push(texts[i]);
  }

  // If everything was cached, return immediately
  if (uncachedTexts.length === 0) {
    return results as number[][];
  }

  // Build auth headers - prefer apiKey if provided
  let headers: Record<string, string>;
  if (apiKey) {
    headers = { "X-API-Key": apiKey };
  } else if (getToken) {
    const token = await getToken();
    if (!token) {
      throw new Error("No token available for embedding generation");
    }
    headers = { Authorization: `Bearer ${token}` };
  } else {
    throw new Error("Either apiKey or getToken must be provided");
  }

  const embeddingModel = model ?? DEFAULT_API_EMBEDDING_MODEL;

  let newEmbeddings: number[][];

  // Small inputs: single API call (preserves existing behavior)
  if (uncachedTexts.length <= chunkSize) {
    newEmbeddings = await generateEmbeddingsBatch(
      uncachedTexts,
      headers,
      baseUrl,
      embeddingModel,
      options.onUsage,
      options.maskInput
    );
  } else {
    // Large inputs: chunk and process with bounded concurrency
    const chunks: string[][] = [];
    for (let i = 0; i < uncachedTexts.length; i += chunkSize) {
      chunks.push(uncachedTexts.slice(i, i + chunkSize));
    }

    const allEmbeddings: number[][][] = new Array<number[][]>(chunks.length);
    let nextIndex = 0;

    const worker = async () => {
      while (nextIndex < chunks.length) {
        const idx = nextIndex++;
        allEmbeddings[idx] = await generateEmbeddingsBatch(
          chunks[idx],
          headers,
          baseUrl,
          embeddingModel,
          options.onUsage,
          options.maskInput
        );
      }
    };

    const workers = Array.from(
      { length: Math.min(DEFAULT_EMBEDDING_BATCH_CONCURRENCY, chunks.length) },
      () => worker()
    );
    await Promise.all(workers);

    newEmbeddings = allEmbeddings.flat();
  }

  // Merge new embeddings into results and populate cache. Convert to f32
  // precision so cache miss and hit return identical values (hits materialize
  // from Float32Array).
  for (let i = 0; i < uncachedIndices.length; i++) {
    const f32Embedding = Float32Array.from(newEmbeddings[i]);
    results[uncachedIndices[i]] = Array.from(f32Embedding);
    if (cache) {
      cache.set(uncachedTexts[i], f32Embedding);
    }
  }

  return results as number[][];
}
