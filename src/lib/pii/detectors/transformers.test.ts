import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the optional peer dependency so this test never loads a real model.
const { pipeline, classify } = vi.hoisted(() => ({
  pipeline: vi.fn(),
  classify: vi.fn(),
}));
vi.mock("@huggingface/transformers", () => ({ pipeline }));

import { aggregateTokens, createTransformersNerDetector } from "./transformers";

const TAG_MAP: Record<string, string | undefined> = {
  PER: "PERSON",
  LOC: "LOCATION",
  ORG: "ORG",
  MISC: undefined,
};
const tok = (entity: string, word: string, score = 0.99) => ({ entity, word, score, index: 0 });

describe("aggregateTokens", () => {
  it("merges B-/I- tokens into a whole entity and recovers offsets", () => {
    const text = "Sarah Chen in Seattle";
    const spans = aggregateTokens(
      [tok("B-PER", "Sarah"), tok("I-PER", "Chen"), tok("B-LOC", "Seattle")],
      text,
      TAG_MAP,
      0.5
    );
    expect(spans).toEqual([
      { start: 0, end: 10, category: "PERSON", score: expect.any(Number) },
      { start: 14, end: 21, category: "LOCATION", score: expect.any(Number) },
    ]);
    expect(text.slice(0, 10)).toBe("Sarah Chen");
    expect(text.slice(14, 21)).toBe("Seattle");
  });

  it("absorbs WordPiece continuations (##)", () => {
    const text = "Tomás";
    const spans = aggregateTokens([tok("B-PER", "Tom"), tok("I-PER", "##ás")], text, TAG_MAP, 0.5);
    expect(spans).toEqual([{ start: 0, end: 5, category: "PERSON", score: expect.any(Number) }]);
  });

  it("drops MISC (unmapped) entities", () => {
    const spans = aggregateTokens([tok("B-MISC", "Yankees")], "Go Yankees", TAG_MAP, 0.5);
    expect(spans).toEqual([]);
  });

  it("drops entities below the confidence threshold", () => {
    const spans = aggregateTokens([tok("B-PER", "Sarah", 0.3)], "Sarah waved", TAG_MAP, 0.5);
    expect(spans).toEqual([]);
  });

  it("drops the whole entity when one of its tokens can't be located", () => {
    // The I-PER surface doesn't exist in the text (tokenizer normalization
    // mismatch). Rather than emit a mis-anchored partial span, the entire PERSON
    // entity is dropped.
    const spans = aggregateTokens(
      [tok("B-PER", "Sarah"), tok("I-PER", "Xyzzy")],
      "Sarah waved",
      TAG_MAP,
      0.5
    );
    expect(spans).toEqual([]);
  });

  it("skips an unplaceable start token without corrupting a later entity", () => {
    // The first token can't be located; it's dropped and the cursor doesn't
    // stall onto the following entity, which is still detected at its real offset.
    const text = "visit Paris";
    const spans = aggregateTokens([tok("B-PER", "Zzz"), tok("B-LOC", "Paris")], text, TAG_MAP, 0.5);
    expect(spans).toEqual([{ start: 6, end: 11, category: "LOCATION", score: expect.any(Number) }]);
    expect(text.slice(6, 11)).toBe("Paris");
  });
});

describe("createTransformersNerDetector", () => {
  beforeEach(() => {
    pipeline.mockReset();
    classify.mockReset();
    pipeline.mockResolvedValue(classify);
  });

  it("lazily loads the pipeline once and aggregates its tokens", async () => {
    classify.mockResolvedValue([tok("B-LOC", "Paris")]);
    const detector = createTransformersNerDetector({ model: "test/model", dtype: "q8" });

    // Importing/constructing must NOT load the model yet.
    expect(pipeline).not.toHaveBeenCalled();

    const a = await detector.detect("I went to Paris");
    const b = await detector.detect("Paris again");

    expect(pipeline).toHaveBeenCalledTimes(1); // cached across calls
    expect(pipeline).toHaveBeenCalledWith("token-classification", "test/model", { dtype: "q8" });
    expect(a).toEqual([{ start: 10, end: 15, category: "LOCATION", score: expect.any(Number) }]);
    expect(b).toEqual([{ start: 0, end: 5, category: "LOCATION", score: expect.any(Number) }]);
  });

  it("returns [] for empty text without loading the model", async () => {
    const detector = createTransformersNerDetector();
    expect(await detector.detect("")).toEqual([]);
    expect(pipeline).not.toHaveBeenCalled();
  });
});
