/**
 * Reference {@link NerDetector} backed by Transformers.js (`@huggingface/transformers`).
 *
 * Runs a quantized BERT NER model fully on-device (browser via the
 * onnxruntime-web/WASM backend, or Node) — no network call, so PII never leaves
 * the device. The model is loaded lazily on first `detect()` and cached, so
 * importing this module is cheap and apps that never enable NER pay nothing.
 *
 * `@huggingface/transformers` is an OPTIONAL peer dependency: it is `import()`-ed
 * dynamically (matching `lib/memory/reranker.ts`) so it is only required when a
 * caller actually constructs this detector. React Native cannot use this
 * detector (its WASM backend doesn't run under Hermes) — supply an
 * `onnxruntime-react-native`-based {@link NerDetector} there instead.
 */
import type { NerDetector, PiiSpan } from "../ner";

export interface TransformersNerDetectorOptions {
  /** Hugging Face model id. Default: `Xenova/bert-base-NER`. */
  model?: string;
  /** Weight precision passed to the pipeline. Default: `q8` (smallest). */
  dtype?: "fp32" | "fp16" | "q8" | "int8" | "uint8" | "q4" | (string & {});
  /** Drop entities below this confidence in [0,1]. Default: `0.5`. */
  minScore?: number;
  /**
   * Map raw NER tags (without the `B-`/`I-` prefix) to PII categories. A tag
   * mapped to `undefined` is dropped. Default maps PER→PERSON, LOC→LOCATION,
   * ORG→ORG and drops MISC (noisy and not reliably PII).
   */
  tagMap?: Record<string, string | undefined>;
}

/** Raw per-token output of a Transformers.js `token-classification` pipeline. */
interface RawToken {
  entity: string; // "B-PER", "I-LOC", …
  score: number;
  index: number;
  word: string; // WordPiece surface; subwords prefixed with "##"
}

type TokenClassifier = (text: string) => Promise<RawToken[]>;

const DEFAULT_MODEL = "Xenova/bert-base-NER";
const DEFAULT_TAG_MAP: Record<string, string | undefined> = {
  PER: "PERSON",
  LOC: "LOCATION",
  ORG: "ORG",
  MISC: undefined,
};

/**
 * Recover character offsets for tokens (the pipeline returns none) by walking
 * the text with a cursor and locating each token's surface form (minus the
 * WordPiece "##" prefix). Searching the actual text keeps offsets correct across
 * the original spacing, punctuation, and apostrophes.
 */
interface PlacedToken extends RawToken {
  start: number;
  end: number;
}
function placeTokens(tokens: RawToken[], text: string): PlacedToken[] {
  const placed: PlacedToken[] = [];
  let cursor = 0;
  for (const t of tokens) {
    const surface = t.word.startsWith("##") ? t.word.slice(2) : t.word;
    const start = text.indexOf(surface, cursor);
    if (start < 0) continue; // normalization mismatch (rare) — skip
    const end = start + surface.length;
    placed.push({ ...t, start, end });
    cursor = end;
  }
  return placed;
}

/**
 * Aggregate B-/I- subword tokens into whole-entity spans. A new entity starts
 * on a `B-` tag or a tag change; contiguous `I-` tokens (and WordPiece "##"
 * continuations) of the same base tag extend it. (The SDK additionally snaps
 * spans to word boundaries, so dropped trailing subwords are recovered there.)
 */
export function aggregateTokens(
  tokens: RawToken[],
  text: string,
  tagMap: Record<string, string | undefined>,
  minScore: number
): PiiSpan[] {
  const placed = placeTokens(tokens, text);
  const spans: PiiSpan[] = [];
  let cur: { base: string; start: number; end: number; scores: number[] } | null = null;

  const flush = () => {
    if (!cur) return;
    const category = tagMap[cur.base];
    if (category) {
      const score = cur.scores.reduce((a, b) => a + b, 0) / cur.scores.length;
      if (score >= minScore) spans.push({ start: cur.start, end: cur.end, category, score });
    }
    cur = null;
  };

  for (const t of placed) {
    const dash = t.entity.indexOf("-");
    const prefix = dash >= 0 ? t.entity.slice(0, dash) : t.entity;
    const base = dash >= 0 ? t.entity.slice(dash + 1) : t.entity;
    const isContinuation = t.word.startsWith("##");
    const sameEntity = cur !== null && base === cur.base && t.start - cur.end <= 1;
    if ((prefix === "I" || isContinuation) && sameEntity) {
      cur!.end = t.end;
      cur!.scores.push(t.score);
    } else {
      flush();
      cur = { base, start: t.start, end: t.end, scores: [t.score] };
    }
  }
  flush();
  return spans;
}

/**
 * Create a Transformers.js-backed {@link NerDetector}. The returned detector
 * loads the model lazily on first use and caches it for the process/page.
 */
export function createTransformersNerDetector(
  options: TransformersNerDetectorOptions = {}
): NerDetector {
  const model = options.model ?? DEFAULT_MODEL;
  const dtype = options.dtype ?? "q8";
  const minScore = options.minScore ?? 0.5;
  const tagMap = options.tagMap ?? DEFAULT_TAG_MAP;

  let pipePromise: Promise<TokenClassifier> | null = null;
  const load = (): Promise<TokenClassifier> => {
    if (!pipePromise) {
      // Clear the cache on rejection so a transient first-load failure (network
      // blip fetching the model) doesn't brick the detector for its lifetime —
      // mirrors lib/memory/reranker.ts.
      const loading = (async () => {
        const transformers = (await import("@huggingface/transformers")) as unknown as {
          pipeline: (
            task: "token-classification",
            model: string,
            options?: { dtype?: string }
          ) => Promise<TokenClassifier>;
        };
        return transformers.pipeline("token-classification", model, { dtype });
      })();
      pipePromise = loading;
      loading.catch(() => {
        if (pipePromise === loading) pipePromise = null;
      });
    }
    return pipePromise;
  };

  return {
    async detect(text: string): Promise<PiiSpan[]> {
      if (!text) return [];
      const classify = await load();
      const tokens = await classify(text);
      return aggregateTokens(tokens, text, tagMap, minScore);
    },
  };
}
