type AnyClass = { from_pretrained(id: string): Promise<unknown> };

const MODEL_ID = "Xenova/ms-marco-MiniLM-L-6-v2";

interface ModelHandle {
  tokenizer: unknown;
  model: unknown;
}

/**
 * Thrown when the cross-encoder cannot run because its optional peer
 * dependency (`@huggingface/transformers`) isn't installed — the expected
 * state on React Native, where the package isn't part of the bundle. Callers
 * treat this as "reranker unavailable, degrade to the fused ranking" rather
 * than a transient error worth warning about on every recall.
 *
 * @public
 */
export class RerankerUnavailableError extends Error {
  /** The underlying import failure, kept for debugging. */
  readonly reason: unknown;
  constructor(
    reason: unknown,
    message = "cross-encoder reranker unavailable (@huggingface/transformers not installed)"
  ) {
    super(message);
    this.name = "RerankerUnavailableError";
    this.reason = reason;
  }
}

let available: boolean | undefined = undefined;
let modelPromise: Promise<ModelHandle> | null = null;

/**
 * Whether the cross-encoder reranker can run in this environment.
 *
 * - `true` — the model loaded successfully at least once.
 * - `false` — the optional `@huggingface/transformers` dependency is missing
 *   (e.g. React Native); reranking is permanently degraded to the fused
 *   ranking and no further load attempts are made.
 * - `undefined` — no rerank has been attempted yet, so availability is unknown.
 *
 * @public
 */
export function isRerankerAvailable(): boolean | undefined {
  return available;
}

function isModuleMissing(err: unknown): boolean {
  let e: unknown = err;
  for (let depth = 0; depth < 5 && e !== null && e !== undefined; depth++) {
    const code = (e as { code?: string }).code;
    if (code === "ERR_MODULE_NOT_FOUND" || code === "MODULE_NOT_FOUND") return true;
    if (
      e instanceof Error &&
      /cannot find (module|package)|failed to resolve|unable to resolve module|requiring unknown module/i.test(
        e.message
      )
    ) {
      return true;
    }
    e = (e as { cause?: unknown }).cause;
  }
  return false;
}

async function getModel(): Promise<ModelHandle> {
  if (available === false) throw new RerankerUnavailableError(undefined);
  if (!modelPromise) {
    const load = (async () => {
      let transformers: {
        AutoTokenizer: AnyClass;
        AutoModelForSequenceClassification: AnyClass;
      };
      try {
        transformers =
          (await import("@huggingface/transformers")) as unknown as typeof transformers;
      } catch (err) {
        if (isModuleMissing(err)) {
          available = false;
          throw new RerankerUnavailableError(err);
        }
        throw err;
      }
      const [tokenizer, model] = await Promise.all([
        transformers.AutoTokenizer.from_pretrained(MODEL_ID),
        transformers.AutoModelForSequenceClassification.from_pretrained(MODEL_ID),
      ]);
      available = true;
      return { tokenizer, model };
    })();
    modelPromise = load;
    load.catch(() => {
      if (modelPromise === load) modelPromise = null;
    });
  }
  return modelPromise;
}

const DEFAULT_RERANKER_LOAD_TIMEOUT_MS = 10_000;

interface RerankOptions {
  loadTimeoutMs?: number;
}

async function getModelWithin(loadTimeoutMs: number): Promise<ModelHandle> {
  const load = getModel();
  if (available === true || !(loadTimeoutMs > 0) || !Number.isFinite(loadTimeoutMs)) return load;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () =>
        reject(
          new RerankerUnavailableError(
            undefined,
            `cross-encoder reranker unavailable (model load exceeded ${loadTimeoutMs}ms)`
          )
        ),
      loadTimeoutMs
    );
  });
  try {
    return await Promise.race([load, deadline]);
  } finally {
    clearTimeout(timer);
  }
}

interface RerankerItem {
  id: string;
  content: string;
  dateMs?: number | null;
}

interface RerankedItem {
  id: string;
  content: string;
  score: number;
}

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

/**
 * C4 — Prefix a doc with `[Date: YYYY-MM-DD]` for temporal-aware
 * cross-encoding. Returns `content` unchanged when `dateMs` is missing
 * or non-finite.
 *
 * Uses **local** calendar getters so the prefix matches how `eventTimeStart`
 * is stored/queried elsewhere in the memory stack (local midnight), avoiding
 * UTC off-by-one east of UTC.
 *
 * @internal Exported for unit tests + call-site reuse.
 */
export function formatRerankDoc(content: string, dateMs?: number | null): string {
  if (dateMs === null || dateMs === undefined || !Number.isFinite(dateMs)) return content;
  const d = new Date(dateMs);
  if (!Number.isFinite(d.getTime())) return content;
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `[Date: ${yyyy}-${mm}-${dd}] ${content}`;
}

/**
 * Rerank a candidate set against a query using a cross-encoder.
 *
 * Returns items sorted by score descending. The first call lazy-loads the
 * model (~25MB download on first run, then cached by transformers.js).
 *
 * For empty inputs: returns []. For a single candidate: returns it scored.
 *
 * When an item carries {@link RerankerItem.dateMs}, the CE sees a
 * date-prefixed doc (C4) while the returned `content` stays unprefixed.
 */
export async function rerankPairs(
  query: string,
  items: RerankerItem[],
  options?: RerankOptions
): Promise<RerankedItem[]> {
  if (items.length === 0 || !query) return [];

  const { tokenizer, model } = await getModelWithin(
    options?.loadTimeoutMs ?? DEFAULT_RERANKER_LOAD_TIMEOUT_MS
  );

  const queries = items.map(() => query);
  const docs = items.map((i) => formatRerankDoc(i.content, i.dateMs));
  const tokenize = tokenizer as (
    text: string[],
    options: { text_pair: string[]; padding: boolean; truncation: boolean }
  ) => Record<string, unknown>;
  const inputs = tokenize(queries, { text_pair: docs, padding: true, truncation: true });

  const forward = model as (
    i: Record<string, unknown>
  ) => Promise<{ logits: { data: Float32Array | number[]; dims: number[] } }>;
  const output = await forward(inputs);
  const logits = output.logits;
  const data = Array.from(logits.data as Iterable<number>);

  const batchDim = logits.dims[0] ?? 0;
  const numLabels = logits.dims[1] ?? 1;
  if (batchDim !== items.length) {
    throw new Error(`reranker: model returned batch dim ${batchDim} for ${items.length} pairs`);
  }
  if (numLabels !== 1 && numLabels !== 2) {
    throw new Error(
      `reranker: unsupported numLabels=${numLabels}; expected 1 (single relevance logit) or 2 (binary classification head)`
    );
  }
  const relevanceCol = numLabels === 2 ? 1 : 0;
  const scores: number[] = Array.from({ length: items.length }, () => 0);
  for (let i = 0; i < items.length; i++) {
    const logit = data[i * numLabels + relevanceCol];
    scores[i] = Number.isFinite(logit) ? sigmoid(logit) : 0;
  }

  return items
    .map((item, i) => ({ id: item.id, content: item.content, score: scores[i] }))
    .sort((a, b) => b.score - a.score);
}

/**
 * Pre-warm the reranker model. Call this at startup to avoid the cold-start
 * delay on the first user-facing rerank call. Safe to call multiple times.
 *
 * @public
 */
export async function preloadReranker(): Promise<void> {
  await getModel();
}
