import { describe, expect, it } from "vitest";

import { prepareBM25Corpus, scoreBM25, scoreBM25Prepared } from "./bm25.js";

describe("scoreBM25", () => {
  it("returns empty map for empty query", () => {
    expect(scoreBM25("", [{ id: "a", content: "hello world" }])).toEqual(new Map());
  });

  it("returns empty map for empty items", () => {
    expect(scoreBM25("hello", [])).toEqual(new Map());
  });

  it("scores a single matching doc", () => {
    const scores = scoreBM25("hello", [{ id: "a", content: "hello world" }]);
    expect(scores.size).toBe(1);
    expect(scores.get("a")).toBeGreaterThan(0);
  });

  it("omits docs with zero query-term overlap", () => {
    const scores = scoreBM25("hello", [
      { id: "a", content: "hello world" },
      { id: "b", content: "completely unrelated" },
    ]);
    expect(scores.has("a")).toBe(true);
    expect(scores.has("b")).toBe(false);
  });

  it("ranks rarer terms higher (IDF)", () => {
    // 'common' appears in every doc; 'rare' only in one
    const items = [
      { id: "a", content: "common common rare" },
      { id: "b", content: "common common common" },
      { id: "c", content: "common common common" },
    ];
    const rareScores = scoreBM25("rare", items);
    const commonScores = scoreBM25("common", items);
    expect(rareScores.get("a")!).toBeGreaterThan(commonScores.get("a")!);
  });

  it("penalizes longer docs (length normalization)", () => {
    const items = [
      { id: "short", content: "biscuit" },
      { id: "long", content: `biscuit ${"filler ".repeat(50).trim()}` },
    ];
    const scores = scoreBM25("biscuit", items);
    expect(scores.get("short")!).toBeGreaterThan(scores.get("long")!);
  });

  it("hits the proper-noun case cosine struggles with", () => {
    const items = [
      { id: "p09", content: "Has a golden retriever named Biscuit" },
      { id: "i06", content: "Enjoys hiking in Marin County on weekends" },
      { id: "p25", content: "Vegetarian since 2020, but eats fish occasionally" },
    ];
    const scores = scoreBM25("biscuit", items);
    expect(scores.get("p09")).toBeGreaterThan(0);
    expect(scores.get("i06")).toBeUndefined();
    expect(scores.get("p25")).toBeUndefined();
  });

  it("is case- and punctuation-insensitive", () => {
    const items = [{ id: "a", content: "Hello, World!" }];
    const a = scoreBM25("hello", items).get("a");
    const b = scoreBM25("HELLO", items).get("a");
    const c = scoreBM25("hello,", items).get("a");
    expect(a).toBeGreaterThan(0);
    expect(b).toBe(a);
    expect(c).toBe(a);
  });

  it("scales with multiple query-term hits", () => {
    const items = [
      { id: "single", content: "hello" },
      { id: "double", content: "hello world" },
    ];
    const scores = scoreBM25("hello world", items);
    expect(scores.get("double")!).toBeGreaterThan(scores.get("single")!);
  });
});

describe("prepareBM25Corpus + scoreBM25Prepared (B3 tokenize-once)", () => {
  const corpusItems = [
    { id: "p09", content: "Has a golden retriever named Biscuit" },
    { id: "i06", content: "Enjoys hiking in Marin County on weekends" },
    { id: "p25", content: "Vegetarian since 2020, but eats fish occasionally" },
    { id: "d1", content: "common common rare tokens here" },
    { id: "d2", content: "common common common filler words" },
    { id: "empty", content: "" },
    { id: "stop", content: "the and of to a" }, // all stopwords → zero tokens
  ];

  // Exactness: for any query, prepared scoring must equal the single-shot path byte-for-byte.
  it.each([
    ["biscuit"],
    ["common"],
    ["rare"],
    ["hiking marin"],
    [""], // empty query
    ["the and of"], // stopword-only query
    ["nonexistentterm"], // no overlap
    ["Biscuit HIKING, fish"], // mixed case + punctuation + multi-term
  ])("scoreBM25Prepared(%j) equals scoreBM25", (query) => {
    const corpus = prepareBM25Corpus(corpusItems);
    expect(scoreBM25Prepared(query, corpus)).toEqual(scoreBM25(query, corpusItems));
  });

  it("one prepared corpus serves many queries identically (the shared-pass invariant)", () => {
    const corpus = prepareBM25Corpus(corpusItems);
    for (const q of ["biscuit", "common", "rare", "fish"]) {
      // Re-preparing per query (old behavior) must match reusing the shared corpus.
      expect(scoreBM25Prepared(q, corpus)).toEqual(
        scoreBM25Prepared(q, prepareBM25Corpus(corpusItems))
      );
    }
  });

  it("handles an empty corpus and an all-zero-length corpus", () => {
    expect(scoreBM25Prepared("hello", prepareBM25Corpus([]))).toEqual(new Map());
    const allEmpty = [
      { id: "a", content: "" },
      { id: "b", content: "the and of" }, // stopwords only → zero tokens
    ];
    expect(scoreBM25Prepared("hello", prepareBM25Corpus(allEmpty))).toEqual(new Map());
    // avgdl is 0 here; no NaN must leak (docs are skipped by the dl===0 guard).
    expect(scoreBM25Prepared("hello", prepareBM25Corpus(allEmpty)).size).toBe(0);
  });
});
