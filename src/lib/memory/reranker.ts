/**
 * Cross-encoder reranker — local inference via @huggingface/transformers.
 *
 * Mirrors Hindsight's default reranker (`cross-encoder/ms-marco-MiniLM-L-6-v2`)
 * for parity with their reference pipeline. Runs fully on-device — no API
 * key, no network call, works offline. Model file ~25MB; lazy-loaded and
 * cached for the lifetime of the process.
 *
 * Implementation note: transformers.js v3 doesn't expose a "text-ranking"
 * pipeline, so we drive the cross-encoder directly via the tokenizer +
 * sequence-classification model. The model outputs a single relevance
 * logit per (query, doc) pair; we sigmoid it into [0, 1].
 */

// We type-cast around the upstream package because its declaration entry
// doesn't re-export these classes even though the runtime entry does.
// Using a dynamic import keeps the SDK's main bundle from pulling in the
// transformers runtime when no caller hits the reranker.
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
  constructor(reason: unknown) {
    super("cross-encoder reranker unavailable (@huggingface/transformers not installed)");
    this.name = "RerankerUnavailableError";
    this.reason = reason;
  }
}

// Tri-state reranker availability: undefined = not yet attempted, true =
// loaded successfully, false = permanently unavailable (optional dep missing).
// Consumers read this to report an honest `reranked` diagnostic instead of
// assuming a requested rerank actually ran (RN silently lacks the package).
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

/** Does this error mean the transformers package isn't installed (vs. a
 * transient load failure like a network hiccup fetching the model)? Walks the
 * `cause` chain because bundlers/loaders (Metro, webpack, vitest) wrap the
 * underlying module-not-found error. */
function isModuleMissing(err: unknown): boolean {
  let e: unknown = err;
  for (let depth = 0; depth < 5 && e !== null && e !== undefined; depth++) {
    const code = (e as { code?: string }).code;
    if (code === "ERR_MODULE_NOT_FOUND" || code === "MODULE_NOT_FOUND") return true;
    // Node: "Cannot find module/package". Metro/Expo (React Native):
    // "Unable to resolve module", "Requiring unknown module". Bundlers:
    // "failed to resolve".
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
  // Short-circuit once we know the package is absent: no repeated import
  // attempts and no per-recall warn spam on React Native.
  if (available === false) throw new RerankerUnavailableError(undefined);
  if (!modelPromise) {
    // Clear the cache on rejection so a transient first-load failure
    // doesn't brick the reranker for the process lifetime.
    const load = (async () => {
      let transformers: {
        AutoTokenizer: AnyClass;
        AutoModelForSequenceClassification: AnyClass;
      };
      try {
        transformers =
          (await import("@huggingface/transformers")) as unknown as typeof transformers;
      } catch (err) {
        // Missing optional dep is a permanent environment fact, not transient.
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

interface RerankerItem {
  id: string;
  content: string;
  /**
   * Optional Unix-ms date used for C4 date-prefixed CE pairs. When set,
   * the doc side is sent as `[Date: YYYY-MM-DD] <content>` so the
   * cross-encoder can prefer temporally-aligned evidence. Does not
   * mutate the returned `content` (callers still see the original text).
   */
  dateMs?: number | null;
}

interface RerankedItem {
  id: string;
  content: string;
  /** Cross-encoder score in [0, 1] (sigmoid of the model's logit). */
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
export async function rerankPairs(query: string, items: RerankerItem[]): Promise<RerankedItem[]> {
  if (items.length === 0 || !query) return [];

  const { tokenizer, model } = await getModel();

  // Tokenize each (query, doc) pair. transformers.js expects the pair
  // arm to come in via the `text_pair` option, not as a positional arg.
  const queries = items.map(() => query);
  const docs = items.map((i) => formatRerankDoc(i.content, i.dateMs));
  const tokenize = tokenizer as (
    text: string[],
    options: { text_pair: string[]; padding: boolean; truncation: boolean }
  ) => Record<string, unknown>;
  const inputs = tokenize(queries, { text_pair: docs, padding: true, truncation: true });

  // Forward pass. The classification head emits a single logit per pair.
  const forward = model as (
    i: Record<string, unknown>
  ) => Promise<{ logits: { data: Float32Array | number[]; dims: number[] } }>;
  const output = await forward(inputs);
  const logits = output.logits;
  const data = Array.from(logits.data as Iterable<number>);

  // logits is row-major [batch, numLabels]. For a 2-class CE, column 1
  // is the relevance logit (column 0 is "not relevant" and picking it
  // would invert the ranking).
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
