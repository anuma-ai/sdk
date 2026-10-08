import { postApiV1Embeddings } from "../../client";
import { BASE_URL } from "../../clientConfig";
import { DEFAULT_API_EMBEDDING_MODEL } from "./constants";
import type { EmbeddingOptions } from "./types";

const EMBED_MAX_ATTEMPTS = 4;

const DEFAULT_EMBEDDING_REQUEST_TIMEOUT_MS = 15_000;

const DEFAULT_EMBEDDING_TOKEN_TIMEOUT_MS = 10_000;

async function withDeadline<T>(
  run: (signal: AbortSignal | undefined) => T | Promise<T>,
  ms: number,
  what: string,
  parent?: AbortSignal
): Promise<T> {
  if (!(ms > 0) || !Number.isFinite(ms)) return Promise.resolve().then(() => run(parent));
  const controller = new AbortController();
  const onParentAbort = () => controller.abort(parent?.reason);
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    if (parent?.aborted) onParentAbort();
    else parent?.addEventListener("abort", onParentAbort, { once: true });
    const work = Promise.resolve().then(() => run(controller.signal));
    work.catch(() => {});
    const deadline = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        const err = new Error(`${what} timed out after ${ms}ms`);
        err.name = "TimeoutError";
        controller.abort(err);
        reject(err);
      }, ms);
    });
    return await Promise.race([work, deadline]);
  } finally {
    clearTimeout(timer);
    parent?.removeEventListener("abort", onParentAbort);
  }
}

async function resolveAuthHeaders(
  options: EmbeddingOptions,
  parent?: AbortSignal
): Promise<Record<string, string>> {
  const { getToken, apiKey } = options;
  if (apiKey) return { "X-API-Key": apiKey };
  if (!getToken) throw new Error("Either apiKey or getToken must be provided");
  const token = await withDeadline(
    () => getToken(),
    options.tokenTimeoutMs ?? DEFAULT_EMBEDDING_TOKEN_TIMEOUT_MS,
    "embedding auth token read",
    parent
  );
  if (!token) {
    throw new Error("No token available for embedding generation");
  }
  return { Authorization: `Bearer ${token}` };
}

async function withEmbeddingRetry<T extends { error?: unknown; response?: Response }>(
  call: () => Promise<T>,
  stop?: AbortSignal
): Promise<T> {
  let last: T | undefined;
  let lastThrown: unknown;
  let threw = false;
  for (let attempt = 1; attempt <= EMBED_MAX_ATTEMPTS; attempt++) {
    if (stop?.aborted) throw stop.reason;
    try {
      threw = false;
      last = await call();
      if (!last.error) return last;
      const status = last.response?.status;
      const retryable = status === undefined || status === 429 || status >= 500;
      if (!retryable) return last;
    } catch (err) {
      threw = true;
      lastThrown = err;
    }
    if (attempt < EMBED_MAX_ATTEMPTS) {
      const base = 250 * 2 ** (attempt - 1);
      await new Promise((r) => setTimeout(r, base + Math.random() * 0.4 * base));
    }
  }
  if (threw) throw lastThrown;
  if (last?.error instanceof Error && last.response?.status === undefined) {
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
  const total = options.totalTimeoutMs;
  if (total === undefined) return embedOne(text, options, undefined);
  return withDeadline((signal) => embedOne(text, options, signal), total, "embedding");
}

async function embedOne(
  text: string,
  options: EmbeddingOptions,
  outer: AbortSignal | undefined
): Promise<number[]> {
  const { baseUrl = BASE_URL, model, cache } = options;
  const timeoutMs = options.timeoutMs ?? DEFAULT_EMBEDDING_REQUEST_TIMEOUT_MS;

  if (cache) {
    const cached = cache.get(text);
    if (cached) return Array.from(cached);
  }

  const headers = await resolveAuthHeaders(options, outer);

  const response = await withEmbeddingRetry(
    () =>
      withDeadline(
        (signal) =>
          postApiV1Embeddings({
            baseUrl,
            body: {
              input: options.maskInput ? options.maskInput(text) : text,
              model: model ?? DEFAULT_API_EMBEDDING_MODEL,
            },
            headers,
            ...(signal && { signal }),
          }),
        timeoutMs,
        "embedding request",
        outer
      ),
    outer
  );

  if (response.error) {
    throw embeddingErrorFrom(response);
  }

  if (!response.data?.data?.[0]?.embedding) {
    throw new Error("No embedding returned from API");
  }

  const embedding = response.data.data[0].embedding;

  if (options.onUsage && response.data.usage) {
    options.onUsage({
      promptTokens: response.data.usage.prompt_tokens ?? 0,
      totalTokens: response.data.usage.total_tokens ?? 0,
    });
  }

  const f32Embedding = Float32Array.from(embedding);
  if (cache) {
    cache.set(text, f32Embedding);
  }

  return Array.from(f32Embedding);
}

const DEFAULT_EMBEDDING_BATCH_SIZE = 100;
const DEFAULT_EMBEDDING_BATCH_CONCURRENCY = 3;

async function generateEmbeddingsBatch(
  texts: string[],
  headers: Record<string, string>,
  baseUrl: string,
  model: string,
  onUsage: EmbeddingOptions["onUsage"],
  maskInput: EmbeddingOptions["maskInput"],
  timeoutMs: number,
  outer?: AbortSignal
): Promise<number[][]> {
  const response = await withEmbeddingRetry(
    () =>
      withDeadline(
        (signal) =>
          postApiV1Embeddings({
            baseUrl,
            body: { input: maskInput ? texts.map(maskInput) : texts, model },
            headers,
            ...(signal && { signal }),
          }),
        timeoutMs,
        "embedding batch request",
        outer
      ),
    outer
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
  const total = options.totalTimeoutMs;
  if (total === undefined) return embedMany(texts, options, undefined);
  return withDeadline((signal) => embedMany(texts, options, signal), total, "embedding batch");
}

async function embedMany(
  texts: string[],
  options: EmbeddingOptions,
  outer: AbortSignal | undefined
): Promise<number[][]> {
  const { baseUrl = BASE_URL, model, batchSize, cache } = options;
  const timeoutMs = options.timeoutMs ?? DEFAULT_EMBEDDING_REQUEST_TIMEOUT_MS;
  const chunkSize = batchSize ?? DEFAULT_EMBEDDING_BATCH_SIZE;

  const results: (number[] | null)[] = new Array<number[] | null>(texts.length).fill(null);
  const uncachedIndices: number[] = [];
  const uncachedTexts: string[] = [];

  for (let i = 0; i < texts.length; i++) {
    if (cache) {
      const cached = cache.get(texts[i]);
      if (cached) {
        results[i] = Array.from(cached);
        continue;
      }
    }
    uncachedIndices.push(i);
    uncachedTexts.push(texts[i]);
  }

  if (uncachedTexts.length === 0) {
    return results as number[][];
  }

  const headers = await resolveAuthHeaders(options, outer);
  if (outer?.aborted) throw outer.reason;

  const embeddingModel = model ?? DEFAULT_API_EMBEDDING_MODEL;

  let newEmbeddings: number[][];

  if (uncachedTexts.length <= chunkSize) {
    newEmbeddings = await generateEmbeddingsBatch(
      uncachedTexts,
      headers,
      baseUrl,
      embeddingModel,
      options.onUsage,
      options.maskInput,
      timeoutMs,
      outer
    );
  } else {
    const chunks: string[][] = [];
    for (let i = 0; i < uncachedTexts.length; i += chunkSize) {
      chunks.push(uncachedTexts.slice(i, i + chunkSize));
    }

    const allEmbeddings: number[][][] = new Array<number[][]>(chunks.length);
    let nextIndex = 0;

    const worker = async () => {
      while (nextIndex < chunks.length) {
        if (outer?.aborted) throw outer.reason;
        const idx = nextIndex++;
        allEmbeddings[idx] = await generateEmbeddingsBatch(
          chunks[idx],
          headers,
          baseUrl,
          embeddingModel,
          options.onUsage,
          options.maskInput,
          timeoutMs,
          outer
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

  if (outer?.aborted) throw outer.reason;

  for (let i = 0; i < uncachedIndices.length; i++) {
    const f32Embedding = Float32Array.from(newEmbeddings[i]);
    results[uncachedIndices[i]] = Array.from(f32Embedding);
    if (cache) {
      cache.set(uncachedTexts[i], f32Embedding);
    }
  }

  return results as number[][];
}
