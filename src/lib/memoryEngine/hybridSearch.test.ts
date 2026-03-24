import { describe, it, expect } from "vitest";
import { keywordSearch, mergeWithRRF } from "./hybridSearch";
import type { HybridSearchWeights } from "./hybridSearch";

describe("keywordSearch", () => {
  it("ranks documents by BM25 relevance", () => {
    const docs = [
      { id: "a", text: "the cat sat on the mat" },
      { id: "b", text: "error ECONNREFUSED on port 3000" },
      { id: "c", text: "the quick brown fox" },
    ];

    const results = keywordSearch("ECONNREFUSED", docs, (d) => d.text);

    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("b");
  });

  it("returns empty array for empty query", () => {
    const docs = [{ id: "a", text: "hello world" }];
    expect(keywordSearch("", docs, (d) => d.text)).toEqual([]);
  });

  it("returns empty array for empty documents", () => {
    expect(keywordSearch("hello", [], (d: { text: string }) => d.text)).toEqual([]);
  });

  it("matches multiple terms and scores higher for more matches", () => {
    const docs = [
      { id: "a", text: "error code 404 not found" },
      { id: "b", text: "error code 500 internal server error" },
      { id: "c", text: "success response 200" },
    ];

    const results = keywordSearch("error code", docs, (d) => d.text);

    expect(results.length).toBeGreaterThanOrEqual(2);
    // Both "a" and "b" should appear, "c" should not
    const ids = results.map((r) => r.id);
    expect(ids).toContain("a");
    expect(ids).toContain("b");
    expect(ids).not.toContain("c");
  });

  it("is case insensitive", () => {
    const docs = [{ id: "a", text: "TypeError at line 42" }];
    const results = keywordSearch("typeerror", docs, (d) => d.text);
    expect(results).toHaveLength(1);
  });

  it("handles hyphenated terms", () => {
    const docs = [
      { id: "a", text: "use the on-chain data" },
      { id: "b", text: "something else entirely" },
    ];
    const results = keywordSearch("on-chain", docs, (d) => d.text);
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("a");
  });
});

describe("mergeWithRRF", () => {
  it("merges two ranked lists using reciprocal rank fusion", () => {
    const items = [
      { id: "a", text: "first" },
      { id: "b", text: "second" },
      { id: "c", text: "third" },
    ];

    const semanticRanked = [items[0], items[1], items[2]]; // a, b, c
    const keywordRanked = [items[2], items[0], items[1]]; // c, a, b

    const merged = mergeWithRRF(semanticRanked, keywordRanked, (item) => item.id);

    // "a" is rank 1 in semantic, rank 2 in keyword → highest combined RRF
    expect(merged[0].id).toBe("a");
    expect(merged).toHaveLength(3);
  });

  it("handles items appearing in only one list", () => {
    const semanticOnly = [{ id: "a", text: "semantic" }];
    const keywordOnly = [{ id: "b", text: "keyword" }];

    const merged = mergeWithRRF(semanticOnly, keywordOnly, (item) => item.id);

    expect(merged).toHaveLength(2);
    // With default weights (0.7 semantic, 0.3 keyword), the semantic-only item
    // should rank higher than the keyword-only item
    expect(merged[0].id).toBe("a");
    expect(merged[1].id).toBe("b");
  });

  it("respects custom weights", () => {
    const items = [
      { id: "a", text: "first" },
      { id: "b", text: "second" },
    ];

    const semanticRanked = [items[1]]; // b only
    const keywordRanked = [items[0]]; // a only

    // Heavy keyword weight should make "a" rank first
    const weights: HybridSearchWeights = { semantic: 0.1, keyword: 0.9 };
    const merged = mergeWithRRF(semanticRanked, keywordRanked, (item) => item.id, weights);

    expect(merged[0].id).toBe("a");
  });

  it("returns empty array when both lists are empty", () => {
    const merged = mergeWithRRF<{ id: string }>([], [], (item) => item.id);
    expect(merged).toEqual([]);
  });

  it("handles duplicate keys — item from first encounter wins", () => {
    const semItem = { id: "a", text: "semantic version" };
    const kwItem = { id: "a", text: "keyword version" };

    const merged = mergeWithRRF([semItem], [kwItem], (item) => item.id);

    expect(merged).toHaveLength(1);
    // The item reference from semantic (first list processed) should be kept
    expect(merged[0].text).toBe("semantic version");
  });
});
