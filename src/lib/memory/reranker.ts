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

let modelPromise: Promise<ModelHandle> | null = null;

async function getModel(): Promise<ModelHandle> {
  if (!modelPromise) {
    // Clear the cache on rejection so a transient first-load failure
    // doesn't brick the reranker for the process lifetime.
    const load = (async () => {
      const transformers = (await import("@huggingface/transformers")) as unknown as {
        AutoTokenizer: AnyClass;
        AutoModelForSequenceClassification: AnyClass;
      };
      const [tokenizer, model] = await Promise.all([
        transformers.AutoTokenizer.from_pretrained(MODEL_ID),
        transformers.AutoModelForSequenceClassification.from_pretrained(MODEL_ID),
      ]);
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
 * Rerank a candidate set against a query using a cross-encoder.
 *
 * Returns items sorted by score descending. The first call lazy-loads the
 * model (~25MB download on first run, then cached by transformers.js).
 *
 * For empty inputs: returns []. For a single candidate: returns it scored.
 */
export async function rerankPairs(query: string, items: RerankerItem[]): Promise<RerankedItem[]> {
  if (items.length === 0 || !query) return [];

  const { tokenizer, model } = await getModel();

  // Tokenize each (query, doc) pair. transformers.js expects the pair
  // arm to come in via the `text_pair` option, not as a positional arg.
  const queries = items.map(() => query);
  const docs = items.map((i) => i.content);
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
