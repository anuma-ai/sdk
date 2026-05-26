import { describe, expect, it } from "vitest";

import { scoreBM25 } from "./bm25.js";

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
