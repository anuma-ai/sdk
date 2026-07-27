/**
 * Unit tests for the text-chunking layer.
 *
 * These are pure-function tests with no mocks: chunkText / shouldChunkMessage
 * take a string in and return chunks out. Until now this module only ran
 * incidentally — embeddings.test.ts drives `chunkAndEmbedAllMessages`, which
 * calls into here, but those tests mock the chunk DB ops and assert on
 * embedding behavior, never on chunk boundaries, overlap, or the min-size
 * rules. So the boundary/overlap/degenerate semantics were entirely unpinned
 * (issue #630). This file pins them.
 *
 * Fixture discipline: every multi-sentence fixture is built from `sentence()`
 * (an n-char sentence ending in ".") joined by exactly ONE space via `join()`.
 * That single-space invariant is what makes `chunk.text === text.slice(start,
 * end)` hold exactly — the chunker joins accumulated sentences with a single
 * space and indexes offsets into the original string, so any multi-space or
 * newline fixture would break slice-equality. Sizes are deliberately small
 * (chunkSize 40 rather than the 400 default) so the arithmetic is legible.
 *
 * Several cases assert behavior that is arguably a bug (tail-drop,
 * overlap-overshoot). Those are pinned as CURRENT behavior with a
 * `NOTE(#630):` comment stating what correct behavior would be — this is a
 * test-only PR, so the fix belongs in a separate change, and the comment tells
 * a future fixer to flip the assertion deliberately.
 */
import { describe, expect, it } from "vitest";

import {
  chunkText,
  DEFAULT_CHUNK_OVERLAP,
  DEFAULT_CHUNK_SIZE,
  DEFAULT_MIN_CHUNK_SIZE,
  shouldChunkMessage,
  type TextChunk,
} from "./chunking";

/** An n-char "sentence": (n-1) repeats of `ch` terminated by a period, so it
 * survives splitIntoSentences as a single unit and its length is exactly n. */
const sentence = (n: number, ch = "a"): string => ch.repeat(n - 1) + ".";

/** Join sentences with EXACTLY one space — the separator the chunker assumes
 * when it re-joins accumulated sentences, so offsets stay slice-accurate. */
const join = (...parts: string[]): string => parts.join(" ");

/** Boolean coverage map: index k is true when some chunk's half-open
 * [startOffset, endOffset) range contains k. Used to prove (or, for the
 * tail-drop bug, disprove) that every character is searchable. */
function coverage(chunks: TextChunk[], len: number): boolean[] {
  const covered: boolean[] = new Array(len).fill(false);
  for (const c of chunks) {
    for (let k = c.startOffset; k < c.endOffset && k < len; k++) covered[k] = true;
  }
  return covered;
}

describe("chunking constants", () => {
  it("exposes the documented defaults (400 / 50 / 50)", () => {
    // Pinned so a silent change to any default fails loudly here — the tool and
    // embedding layers depend on these exact values for search consistency.
    expect(DEFAULT_CHUNK_SIZE).toBe(400);
    expect(DEFAULT_CHUNK_OVERLAP).toBe(50);
    expect(DEFAULT_MIN_CHUNK_SIZE).toBe(50);
  });
});

describe("shouldChunkMessage", () => {
  it("chunks only when content is strictly longer than the size threshold", () => {
    // Boundary is strict: exactly DEFAULT_CHUNK_SIZE is NOT chunked; one more is.
    expect(shouldChunkMessage("a".repeat(DEFAULT_CHUNK_SIZE))).toBe(false);
    expect(shouldChunkMessage("a".repeat(DEFAULT_CHUNK_SIZE + 1))).toBe(true);
  });

  it("respects a custom chunkSize threshold", () => {
    expect(shouldChunkMessage("abcde", 5)).toBe(false); // 5 is not > 5
    expect(shouldChunkMessage("abcdef", 5)).toBe(true); // 6 > 5
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
    // Pinned deliberately: callers receive a single zero-width chunk, so any
    // code mapping over chunkText("") sees one element, not zero.
    expect(chunkText("")).toEqual([{ text: "", startOffset: 0, endOffset: 0 }]);
  });

  it("trims the chunk text but keeps offsets indexed into the ORIGINAL string", () => {
    // NOTE(#630): the returned text is trimmed ("hi there") while startOffset /
    // endOffset span the raw, untrimmed input (0..12). The offsets therefore do
    // NOT line up with the trimmed text's own length — they address the source.
    // Asserting both halves so nobody "fixes" one side (trim the offsets, or
    // stop trimming the text) without noticing it desyncs the other.
    const chunks = chunkText("  hi there  ");
    expect(chunks).toEqual([{ text: "hi there", startOffset: 0, endOffset: 12 }]);
  });
});

describe("chunkText — sentence accumulation and overlap", () => {
  // Five 15-char sentences, single-space joined (total 79 chars) under a small
  // 40/12/5 config: forces multiple chunks with legible boundaries.
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
    // Because every fixture sentence is single-space joined, each chunk's text
    // is exactly the substring its offsets address.
    for (const c of chunks) {
      expect(c.text).toBe(text.slice(c.startOffset, c.endOffset));
    }
  });

  it("emits chunks in strictly ascending start offset with no coverage hole", () => {
    const chunks = chunkText(text, OPTS);
    for (let i = 1; i < chunks.length; i++) {
      expect(chunks[i].startOffset).toBeGreaterThan(chunks[i - 1].startOffset);
    }
    // Every character of the input lands in at least one chunk — no sentence is
    // silently dropped in this well-behaved case.
    expect(coverage(chunks, text.length).every(Boolean)).toBe(true);
  });

  it("overlaps successive chunks: each starts before its predecessor ended and repeats the tail sentence", () => {
    const chunks = chunkText(text, OPTS);
    // Ranges genuinely overlap.
    for (let i = 1; i < chunks.length; i++) {
      expect(chunks[i].startOffset).toBeLessThan(chunks[i - 1].endOffset);
    }
    // The trailing sentence of chunk N reappears at the head of chunk N+1
    // (this is the overlap that preserves cross-boundary context).
    expect(chunks[1].text.startsWith(sentence(15, "b"))).toBe(true);
    expect(chunks[2].text.startsWith(sentence(15, "c"))).toBe(true);
    expect(chunks[3].text.startsWith(sentence(15, "d"))).toBe(true);
  });

  it("can emit an overlap-seeded chunk LARGER than chunkSize", () => {
    // NOTE(#630): the overlap seed is prepended without re-checking the size
    // cap, so a chunk can exceed chunkSize. Here three 60-char sentences under
    // 100/50/5 produce a middle chunk of "s1 s2" = 60 + 1 + 60 = 121 chars,
    // above the 100 cap. Correct behavior would bound seeded chunks at
    // chunkSize; consumers must NOT assume chunk.text.length <= chunkSize.
    const big = join(sentence(60, "a"), sentence(60, "b"), sentence(60, "c"));
    const chunks = chunkText(big, { chunkSize: 100, chunkOverlap: 50, minChunkSize: 5 });
    expect(chunks[1].text.length).toBe(121);
    expect(chunks[1].text.length).toBeGreaterThan(100);
  });
});

describe("chunkText — long-sentence character splitting", () => {
  it("splits a single over-long token on a fixed (chunkSize - chunkOverlap) stride", () => {
    // A 100-char unpunctuated token under 40/10/5: the char-splitter steps by
    // stride = 40 - 10 = 30, producing offsets 0/30/60/90; each chunk slices
    // back exactly and consecutive chunks share exactly chunkOverlap (10) chars.
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
    // NOTE(#630): with an 80-char token under 40/10/25, the stride pieces land
    // at 0/30/60; the last (offset 60, length 20) is below minChunkSize 25 and
    // is dropped. The previous chunk only reaches offset 70, so characters
    // [70, 80) end up in NO chunk — they are silently unsearchable. Correct
    // behavior would keep the short tail (or fold it into the previous chunk).
    // Pinned as CURRENT behavior; reported as a bug candidate.
    const text = "a".repeat(80);
    const chunks = chunkText(text, { chunkSize: 40, chunkOverlap: 10, minChunkSize: 25 });
    const maxEnd = Math.max(...chunks.map((c) => c.endOffset));
    expect(maxEnd).toBe(70); // nothing reaches the true end at 80
    const covered = coverage(chunks, text.length);
    expect(covered[text.length - 1]).toBe(false);
    expect(covered.slice(70).some(Boolean)).toBe(false); // [70, 80) fully uncovered
  });

  it("flushes accumulated sentences before splitting a long sentence, and emits the trailing sentence after", () => {
    // short + huge(90-char) + short: the leading short sentence is flushed as
    // its own chunk, the huge sentence is char-split into full-size chunks, and
    // the trailing short sentence is emitted as the final chunk.
    const text = join(sentence(10, "x"), sentence(90, "a"), sentence(10, "z"));
    const chunks = chunkText(text, { chunkSize: 40, chunkOverlap: 10, minChunkSize: 5 });
    expect(chunks[0].text).toBe(sentence(10, "x"));
    expect(chunks.some((c) => c.text.length === 40 && /^a+$/.test(c.text))).toBe(true);
    expect(chunks[chunks.length - 1].text).toBe(sentence(10, "z"));
  });
});

describe("chunkText — guards and fallbacks", () => {
  it("terminates (does not hang) when chunkOverlap >= chunkSize", () => {
    // The Math.min(requestedOverlap, chunkSize - 1) clamp is the infinite-loop
    // guard: an overlap of 50 with chunkSize 10 is clamped to 9 so the
    // char-split stride stays positive. Reaching the assertion at all proves it
    // returned rather than spinning.
    const text = join(
      ...Array.from({ length: 13 }, (_, i) => sentence(15, String.fromCharCode(97 + i)))
    );
    const chunks = chunkText(text, { chunkSize: 10, chunkOverlap: 50, minChunkSize: 2 });
    expect(chunks.length).toBeGreaterThan(1);
  });

  it("drops a trailing accumulated group that is shorter than minChunkSize at the final flush", () => {
    // With zero overlap there is no seed, so the final short sentence starts a
    // fresh group; at the final flush it is 3 chars < minChunkSize 10 and is
    // dropped. The last emitted chunk therefore does NOT contain "z", and the
    // tail characters reach no chunk (maxEnd < text.length).
    const text = join(sentence(39, "a"), sentence(39, "b"), sentence(3, "z"));
    const chunks = chunkText(text, { chunkSize: 40, chunkOverlap: 0, minChunkSize: 10 });
    expect(chunks.length).toBe(2);
    expect(chunks[chunks.length - 1].text).not.toContain("z");
    expect(Math.max(...chunks.map((c) => c.endOffset))).toBeLessThan(text.length);
  });

  it("falls back to a single trimmed chunk when the text exceeds chunkSize but has only sub-min content", () => {
    // "hi" followed by 30 spaces is 32 chars (> chunkSize 10) so it enters the
    // sentence path, but the only real content ("hi", 2 chars) is below
    // minChunkSize 5, so no chunk is produced by the main loop. The fallback
    // then returns exactly the trimmed content with raw (untrimmed) offsets.
    const text = "hi" + " ".repeat(30);
    const chunks = chunkText(text, { chunkSize: 10, chunkOverlap: 3, minChunkSize: 5 });
    expect(chunks).toEqual([{ text: "hi", startOffset: 0, endOffset: 32 }]);
  });
});
