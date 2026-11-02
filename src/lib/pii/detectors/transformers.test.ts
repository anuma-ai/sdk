import { beforeEach, describe, expect, it, vi } from "vitest";

const { pipeline, classify } = vi.hoisted(() => ({
  pipeline: vi.fn(),
  classify: vi.fn(),
}));
vi.mock("@huggingface/transformers", () => ({ pipeline }));

import { PiiRedactor } from "../redactor";
import { aggregateTokens, createTransformersNerDetector } from "./transformers";

const TAG_MAP: Record<string, string | undefined> = {
  PER: "PERSON",
  LOC: "LOCATION",
  ORG: "ORG",
  MISC: undefined,
};
const tok = (entity: string, word: string, start = 0, score = 0.99) => ({
  entity,
  word,
  score,
  index: 0,
  start,
  end: start < 0 ? -1 : start + word.replace(/^##/, "").length,
});

function mockTokenizer(words: string[]) {
  const vocabulary = [...new Set(words)];
  const tokenizer = Object.assign(
    vi.fn().mockReturnValue({ input_ids: words.map((word) => vocabulary.indexOf(word)) }),
    {
      decode: vi.fn(([id]: number[]) => vocabulary[id]),
    }
  );
  Object.assign(classify, { tokenizer });
  return tokenizer;
}

describe("aggregateTokens", () => {
  it("merges B-/I- tokens into a whole entity with token offsets", () => {
    const text = "Sarah Chen in Seattle";
    const spans = aggregateTokens(
      [tok("B-PER", "Sarah"), tok("I-PER", "Chen", 6), tok("B-LOC", "Seattle", 14)],
      text,
      TAG_MAP,
      0.5
    );
    expect(spans).toEqual([
      { start: 0, end: 10, category: "PERSON", score: 0.99 },
      { start: 14, end: 21, category: "LOCATION", score: 0.99 },
    ]);
    expect(text.slice(0, 10)).toBe("Sarah Chen");
    expect(text.slice(14, 21)).toBe("Seattle");
  });

  it("absorbs WordPiece continuations (##)", () => {
    const text = "Tomás";
    const spans = aggregateTokens(
      [tok("B-PER", "Tom"), tok("I-PER", "##ás", 3)],
      text,
      TAG_MAP,
      0.5
    );
    expect(spans).toEqual([{ start: 0, end: 5, category: "PERSON", score: 0.99 }]);
  });

  it("drops MISC (unmapped) entities", () => {
    const spans = aggregateTokens([tok("B-MISC", "Yankees")], "Go Yankees", TAG_MAP, 0.5);
    expect(spans).toEqual([]);
  });

  it("drops entities below the confidence threshold", () => {
    const spans = aggregateTokens([tok("B-PER", "Sarah", 0, 0.3)], "Sarah waved", TAG_MAP, 0.5);
    expect(spans).toEqual([]);
  });

  it("drops the whole entity when one of its tokens can't be located", () => {
    const spans = aggregateTokens(
      [tok("B-PER", "Sarah"), tok("I-PER", "Xyzzy", -1)],
      "Sarah waved",
      TAG_MAP,
      0.5
    );
    expect(spans).toEqual([]);
  });

  it("skips an unplaceable start token without corrupting a later entity", () => {
    const text = "visit Paris";
    const spans = aggregateTokens(
      [tok("B-PER", "Zzz", -1), tok("B-LOC", "Paris", 6)],
      text,
      TAG_MAP,
      0.5
    );
    expect(spans).toEqual([{ start: 6, end: 11, category: "LOCATION", score: 0.99 }]);
    expect(text.slice(6, 11)).toBe("Paris");
  });

  it("drops tokens without offsets instead of searching for their text", () => {
    const spans = aggregateTokens(
      [{ entity: "B-PER", word: "May", index: 9, score: 0.99 }],
      "May is a month. My name is May.",
      TAG_MAP,
      0.5
    );
    expect(spans).toEqual([]);
  });
});

describe("createTransformersNerDetector", () => {
  beforeEach(() => {
    pipeline.mockReset();
    classify.mockReset();
    pipeline.mockResolvedValue(classify);
  });

  it("lazily loads the pipeline once and aggregates its tokens", async () => {
    const tokenizer = mockTokenizer(["", "I", "went", "to", "Paris", ""]);
    classify.mockResolvedValueOnce([{ ...tok("B-LOC", "Paris"), index: 4 }]);
    const detector = createTransformersNerDetector({ model: "test/model", dtype: "q8" });

    expect(pipeline).not.toHaveBeenCalled();

    const a = await detector.detect("I went to Paris");
    mockTokenizer(["", "Paris", "again", ""]);
    classify.mockResolvedValueOnce([{ ...tok("B-LOC", "Paris"), index: 1 }]);
    const b = await detector.detect("Paris again");

    expect(pipeline).toHaveBeenCalledTimes(1);
    expect(pipeline).toHaveBeenCalledWith("token-classification", "test/model", { dtype: "q8" });
    expect(tokenizer).toHaveBeenCalledWith("I went to Paris", {
      return_tensor: false,
      truncation: true,
    });
    expect(a).toEqual([{ start: 10, end: 15, category: "LOCATION", score: 0.99 }]);
    expect(b).toEqual([{ start: 0, end: 5, category: "LOCATION", score: 0.99 }]);
  });

  it("returns [] for empty text without loading the model", async () => {
    const detector = createTransformersNerDetector();
    expect(await detector.detect("")).toEqual([]);
    expect(pipeline).not.toHaveBeenCalled();
  });

  it("locates the later occurrence with the classifier token index", async () => {
    const input = "May is a month. My name is May.";
    const words = ["", "May", "is", "a", "month", ".", "My", "name", "is", "May", ".", ""];
    mockTokenizer(words);
    classify.mockResolvedValue([{ ...tok("B-PER", "May"), index: 9 }]);
    const detector = createTransformersNerDetector();

    expect(await detector.detect(input)).toEqual([
      { start: 27, end: 30, category: "PERSON", score: 0.99 },
    ]);
  });

  it("redacts the later person occurrence and preserves the earlier ordinary text", async () => {
    const input = "May is a month. My name is May.";
    mockTokenizer(["", "May", "is", "a", "month", ".", "My", "name", "is", "May", ".", ""]);
    classify.mockResolvedValue([{ entity: "B-PER", word: "May", score: 0.99, index: 9 }]);
    const detector = createTransformersNerDetector();
    const redactor = new PiiRedactor({ nerDetector: detector });
    const result = await redactor.redactTextAsync(input);
    expect(result.text).toBe("May is a month. My name is [PERSON_1].");
    expect(redactor.deAnonymize(result.text)).toBe(input);
    expect(await redactor.maskTextAsync(input)).toBe("May is a month. My name is [PERSON].");
  });

  it("uses all token positions across punctuation and repeated WordPiece tokens", async () => {
    const input = "Tomás wrote: Tomás, visit Paris.";
    mockTokenizer(["", "Tom", "##ás", "wrote", ":", "Tom", "##ás", ",", "visit", "Paris", ".", ""]);
    classify.mockResolvedValue([
      { ...tok("B-PER", "Tom"), index: 5 },
      { ...tok("I-PER", "##ás"), index: 6 },
      { ...tok("B-LOC", "Paris"), index: 9 },
    ]);

    const detector = createTransformersNerDetector();
    expect(await detector.detect(input)).toEqual([
      { start: 13, end: 18, category: "PERSON", score: 0.99 },
      { start: 26, end: 31, category: "LOCATION", score: 0.99 },
    ]);
  });
});
