import { describe, expect, it } from "vitest";

import {
  chunkText,
  DEFAULT_CHUNK_OVERLAP,
  DEFAULT_CHUNK_SIZE,
  DEFAULT_MIN_CHUNK_SIZE,
  shouldChunkMessage,
  type TextChunk,
} from "./chunking";

const sentence = (n: number, ch = "a"): string => ch.repeat(n - 1) + ".";

const join = (...parts: string[]): string => parts.join(" ");

function coverage(chunks: TextChunk[], len: number): boolean[] {
  const covered: boolean[] = new Array(len).fill(false);
  for (const c of chunks) {
    for (let k = c.startOffset; k < c.endOffset && k < len; k++) covered[k] = true;
  }
  return covered;
}

describe("chunking constants", () => {
  it("exposes the documented defaults (400 / 50 / 50)", () => {
    expect(DEFAULT_CHUNK_SIZE).toBe(400);
    expect(DEFAULT_CHUNK_OVERLAP).toBe(50);
    expect(DEFAULT_MIN_CHUNK_SIZE).toBe(50);
  });
});

describe("shouldChunkMessage", () => {
  it("chunks only when content is strictly longer than the size threshold", () => {
    expect(shouldChunkMessage("a".repeat(DEFAULT_CHUNK_SIZE))).toBe(false);
    expect(shouldChunkMessage("a".repeat(DEFAULT_CHUNK_SIZE + 1))).toBe(true);
  });

  it("respects a custom chunkSize threshold", () => {
    expect(shouldChunkMessage("abcde", 5)).toBe(false);
    expect(shouldChunkMessage("abcdef", 5)).toBe(true);
  });
});

describe("chunkText — short and degenerate inputs", () => {
  it("returns the whole text as a single chunk when it fits within chunkSize", () => {
    const chunks = chunkText("hello world");
    expect(chunks).toEqual([{ text: "hello world", startOffset: 0, endOffset: 11 }]);
  });

  it("treats input of exactly chunkSize as the single-chunk boundary", () => {
    const text = "a".repeat(10);
    expect(chunkText(text, { chunkSize: 10, chunkOverlap: 3, minChunkSize: 2 })).toEqual([
      { text, startOffset: 0, endOffset: 10 },
    ]);
  });

  it("returns one empty chunk for empty input (not an empty array)", () => {
    expect(chunkText("")).toEqual([{ text: "", startOffset: 0, endOffset: 0 }]);
  });

  it("trims the chunk text but keeps offsets indexed into the ORIGINAL string", () => {
    const chunks = chunkText("  hi there  ");
    expect(chunks).toEqual([{ text: "hi there", startOffset: 0, endOffset: 12 }]);
  });
});

describe("chunkText — sentence accumulation and overlap", () => {
  const OPTS = { chunkSize: 40, chunkOverlap: 12, minChunkSize: 5 };
  const text = join(
    sentence(15, "a"),
    sentence(15, "b"),
    sentence(15, "c"),
    sentence(15, "d"),
    sentence(15, "e")
  );

  it("accumulates sentences into multiple chunks that each slice back exactly from the source", () => {
    const chunks = chunkText(text, OPTS);
    expect(chunks.length).toBeGreaterThan(1);
    for (const c of chunks) {
      expect(c.text).toBe(text.slice(c.startOffset, c.endOffset));
    }
  });

  it("emits chunks in strictly ascending start offset with no coverage hole", () => {
    const chunks = chunkText(text, OPTS);
    for (let i = 1; i < chunks.length; i++) {
      expect(chunks[i].startOffset).toBeGreaterThan(chunks[i - 1].startOffset);
    }
    expect(coverage(chunks, text.length).every(Boolean)).toBe(true);
  });

  it("overlaps successive chunks: each starts before its predecessor ended and repeats the tail sentence", () => {
    const chunks = chunkText(text, OPTS);
    for (let i = 1; i < chunks.length; i++) {
      expect(chunks[i].startOffset).toBeLessThan(chunks[i - 1].endOffset);
    }
    expect(chunks[1].text.startsWith(sentence(15, "b"))).toBe(true);
    expect(chunks[2].text.startsWith(sentence(15, "c"))).toBe(true);
    expect(chunks[3].text.startsWith(sentence(15, "d"))).toBe(true);
  });

  it("can emit an overlap-seeded chunk LARGER than chunkSize", () => {
    const big = join(sentence(60, "a"), sentence(60, "b"), sentence(60, "c"));
    const chunks = chunkText(big, { chunkSize: 100, chunkOverlap: 50, minChunkSize: 5 });
    expect(chunks[1].text.length).toBe(121);
    expect(chunks[1].text.length).toBeGreaterThan(100);
  });
});

describe("chunkText — long-sentence character splitting", () => {
  it("splits a single over-long token on a fixed (chunkSize - chunkOverlap) stride", () => {
    const text = "a".repeat(100);
    const chunks = chunkText(text, { chunkSize: 40, chunkOverlap: 10, minChunkSize: 5 });
    expect(chunks.map((c) => c.startOffset)).toEqual([0, 30, 60, 90]);
    for (const c of chunks) {
      expect(c.text).toBe(text.slice(c.startOffset, c.endOffset));
    }
    for (let i = 1; i < chunks.length; i++) {
      expect(chunks[i - 1].endOffset - chunks[i].startOffset).toBe(10);
    }
  });

  it("silently drops the final stride piece when it is shorter than minChunkSize", () => {
    const text = "a".repeat(80);
    const chunks = chunkText(text, { chunkSize: 40, chunkOverlap: 10, minChunkSize: 25 });
    const maxEnd = Math.max(...chunks.map((c) => c.endOffset));
    expect(maxEnd).toBe(70);
    const covered = coverage(chunks, text.length);
    expect(covered[text.length - 1]).toBe(false);
    expect(covered.slice(70).some(Boolean)).toBe(false);
  });

  it("flushes accumulated sentences before splitting a long sentence, and emits the trailing sentence after", () => {
    const text = join(sentence(10, "x"), sentence(90, "a"), sentence(10, "z"));
    const chunks = chunkText(text, { chunkSize: 40, chunkOverlap: 10, minChunkSize: 5 });
    expect(chunks[0].text).toBe(sentence(10, "x"));
    expect(chunks.some((c) => c.text.length === 40 && /^a+$/.test(c.text))).toBe(true);
    expect(chunks[chunks.length - 1].text).toBe(sentence(10, "z"));
  });
});

describe("chunkText — guards and fallbacks", () => {
  it("terminates (does not hang) when chunkOverlap >= chunkSize", () => {
    const text = join(
      ...Array.from({ length: 13 }, (_, i) => sentence(15, String.fromCharCode(97 + i)))
    );
    const chunks = chunkText(text, { chunkSize: 10, chunkOverlap: 50, minChunkSize: 2 });
    expect(chunks.length).toBeGreaterThan(1);
  });

  it("drops a trailing accumulated group that is shorter than minChunkSize at the final flush", () => {
    const text = join(sentence(39, "a"), sentence(39, "b"), sentence(3, "z"));
    const chunks = chunkText(text, { chunkSize: 40, chunkOverlap: 0, minChunkSize: 10 });
    expect(chunks.length).toBe(2);
    expect(chunks[chunks.length - 1].text).not.toContain("z");
    expect(Math.max(...chunks.map((c) => c.endOffset))).toBeLessThan(text.length);
  });

  it("falls back to a single trimmed chunk when the text exceeds chunkSize but has only sub-min content", () => {
    const text = "hi" + " ".repeat(30);
    const chunks = chunkText(text, { chunkSize: 10, chunkOverlap: 3, minChunkSize: 5 });
    expect(chunks).toEqual([{ text: "hi", startOffset: 0, endOffset: 32 }]);
  });
});
