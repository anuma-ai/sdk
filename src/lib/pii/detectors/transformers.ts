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
  entity: string;
  score: number;
  index: number;
  word: string;
  start?: number;
  end?: number;
}

interface Tokenizer {
  (text: string, options: { return_tensor: false; truncation: true }): { input_ids: number[] };
  decode(ids: number[], options: { skip_special_tokens: true }): string;
}

type TokenClassifier = ((text: string) => Promise<RawToken[]>) & { tokenizer: Tokenizer };

const DEFAULT_MODEL = "Xenova/bert-base-NER";
const DEFAULT_TAG_MAP: Record<string, string | undefined> = {
  PER: "PERSON",
  LOC: "LOCATION",
  ORG: "ORG",
  MISC: undefined,
};

interface PlacedToken extends RawToken {
  start: number;
  end: number;
}
function placeTokens(tokens: RawToken[], text: string): PlacedToken[] {
  return tokens.map((token) => {
    const { start = -1, end = -1 } = token;
    return Number.isInteger(start) &&
      Number.isInteger(end) &&
      start >= 0 &&
      end > start &&
      end <= text.length
      ? { ...token, start, end }
      : { ...token, start: -1, end: -1 };
  });
}

function tokenOffsets(text: string, tokenizer: Tokenizer): { start: number; end: number }[] {
  const { input_ids } = tokenizer(text, { return_tensor: false, truncation: true });
  let cursor = 0;
  return input_ids.map((id) => {
    const word = tokenizer.decode([id], { skip_special_tokens: true });
    const surface = word.startsWith("##") ? word.slice(2) : word;
    if (!surface) return { start: -1, end: -1 };
    const start = text.indexOf(surface, cursor);
    if (start < 0) return { start: -1, end: -1 };
    const end = start + surface.length;
    cursor = end;
    return { start, end };
  });
}

/** Aggregate classified tokens with character offsets into whole-entity spans. */
export function aggregateTokens(
  tokens: RawToken[],
  text: string,
  tagMap: Record<string, string | undefined>,
  minScore: number
): PiiSpan[] {
  const placed = placeTokens(tokens, text);
  const spans: PiiSpan[] = [];
  let cur: { base: string; start: number; end: number; scores: number[]; valid: boolean } | null =
    null;

  const flush = () => {
    if (!cur) return;
    const category = cur.valid ? tagMap[cur.base] : undefined;
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
    const unplaceable = t.start < 0;
    const continues =
      cur !== null &&
      base === cur.base &&
      (prefix === "I" || isContinuation) &&
      (unplaceable || t.start - cur.end <= 1);
    if (continues) {
      if (unplaceable) cur!.valid = false;
      else {
        cur!.end = t.end;
        cur!.scores.push(t.score);
      }
    } else {
      flush();
      cur = unplaceable
        ? null
        : { base, start: t.start, end: t.end, scores: [t.score], valid: true };
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
      if (!tokens.length) return [];
      const offsets = tokenOffsets(text, classify.tokenizer);
      return aggregateTokens(
        tokens.map((token) => ({ ...token, ...offsets[token.index] })),
        text,
        tagMap,
        minScore
      );
    },
  };
}
