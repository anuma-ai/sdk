/**
 * Unit tests for the W5 graph-lane query-entity extractor. This file did not
 * exist before — it closes the `queryEntities.ts` slice of the test-gap table
 * in issue #630 while pinning the two-pass design added for epic #719 item D4
 * (the casing gap: all-lowercase / dictated queries used to get no graph lane).
 *
 * Two invariants the assertions below encode:
 *  1. STRICT pass is UNCHANGED. Every capitalized-pass test pins the exact
 *     current output — including its warts ("What's" survives stopwording; a
 *     non-ASCII INITIAL like "Łukasz" isn't matched by the strict regex because
 *     its `\b` anchor is ASCII-only). This PR must not silently "fix" those.
 *  2. FALLBACK only engages when the strict pass is EMPTY, and its output is
 *     deterministic (tier-major n-grams, position order within a tier,
 *     capped, stopworded).
 *
 * `extractQueryEntities` is pure/synchronous, so these run with no DB or mocks —
 * downstream, `getMemoriesByEntityNamesOp` validates candidates against stored
 * names, which is why the fallback can afford to over-emit (see recall.test.ts /
 * graphTraversal.test.ts for the integration proof).
 */
import { describe, expect, it } from "vitest";

import { extractQueryEntities } from "./queryEntities";

describe("extractQueryEntities — strict capitalized pass (unchanged invariants)", () => {
  it("extracts capitalized names and canonicalizes them (lower-trim)", () => {
    // "where"/"is"/"living"/"in" are lowercase → skipped; only the two proper
    // nouns survive, lowercased. No lowercase-only token leaks in.
    expect(extractQueryEntities("where is Sara living in Kyoto")).toEqual(["sara", "kyoto"]);
  });

  it("emits the multi-word canonical AND each token, hyphens intact", () => {
    // The write side may store "Jean-Luc Picard" as one entity or as separate
    // tokens; querying every variant recovers that parity.
    expect(extractQueryEntities("please call Jean-Luc Picard tomorrow")).toEqual([
      "jean-luc picard",
      "jean-luc",
      "picard",
    ]);
  });

  it("keeps apostrophes inside a name (O'Brien)", () => {
    expect(extractQueryEntities("did you see O'Brien yesterday")).toEqual(["o'brien"]);
  });

  it("matches non-ASCII letters in the BODY of a name (São Paulo)", () => {
    // S and P are ASCII initials, so the `\b` anchor holds; the accented body
    // letters are covered by the \p{L} class.
    expect(extractQueryEntities("flights to São Paulo please")).toEqual([
      "são paulo",
      "são",
      "paulo",
    ]);
  });

  it("caps a capitalized run at 3 tokens (never emits a 4-token unit)", () => {
    const out = extractQueryEntities("meet Alpha Bravo Charlie Delta");
    expect(out).toContain("alpha bravo charlie");
    expect(out).toContain("delta");
    // The 4th capitalized word starts a NEW match; the run is never 4 wide.
    expect(out).not.toContain("alpha bravo charlie delta");
  });

  it("drops a phrase whose every token is a stopword", () => {
    // Days/months and "The User" are stopwords; a multi-word phrase whose tokens
    // are ALL stopwords is dropped too (not just the individual tokens).
    expect(extractQueryEntities("Monday Tuesday January")).toEqual([]);
    expect(extractQueryEntities("The User")).toEqual([]);
  });

  it("deduplicates repeated names", () => {
    expect(extractQueryEntities("did Sara and Sara meet")).toEqual(["sara"]);
  });

  it("returns [] for empty and whitespace-only input (no fallback emission)", () => {
    expect(extractQueryEntities("")).toEqual([]);
    expect(extractQueryEntities("   ")).toEqual([]);
    expect(extractQueryEntities("\n\t")).toEqual([]);
  });

  it("pins the known contraction wart: 'What's' survives stopwording", () => {
    // "What" is a stopword but "what's" is not, so the contraction leaks. This
    // is documented CURRENT behavior — encoded so a future refactor is a
    // conscious decision, not an accidental regression.
    expect(extractQueryEntities("What's Sara doing in Kyoto")).toEqual([
      "what's sara",
      "what's",
      "sara",
      "kyoto",
    ]);
  });
});

describe("extractQueryEntities — lowercase fallback (recovers the W5 lane)", () => {
  it("emits n-gram candidates for an all-lowercase People-Nearby query", () => {
    // The motivating bug: this extracted NOTHING before, so the graph lane was
    // silently dead. is/there/anyone/in/who/works are all stopworded; the
    // content survives as tier-major n-grams (unigrams first, then bigrams).
    expect(extractQueryEntities("is there anyone in san francisco who works in ai")).toEqual([
      "san",
      "francisco",
      "ai",
      "san francisco",
    ]);
  });

  it("does NOT run when the strict pass already extracted (byte-identical path)", () => {
    // "Sara" is capitalized → strict hits → the fallback never runs, so the
    // lowercase "san francisco" is NOT emitted. Any query that already extracts
    // is unchanged.
    expect(extractQueryEntities("is Sara in san francisco")).toEqual(["sara"]);
  });

  it("returns [] for a stopword-only lowercase query (lane stays a no-op)", () => {
    // No candidate → buildGraphLaneRanking / traverseGraphLane short-circuit
    // with zero DB lookups.
    expect(extractQueryEntities("is there anyone who can help me")).toEqual([]);
  });

  it("recovers a name with a non-ASCII INITIAL that the strict pass drops", () => {
    // The strict regex's leading `\b` is ASCII-only, so "Łukasz" isn't matched
    // by the strict pass — but the fallback tokenizer is Unicode-aware and
    // recovers it. (Contrast São Paulo above, whose ASCII initials strict-match.)
    expect(extractQueryEntities("Łukasz")).toEqual(["łukasz"]);
    expect(extractQueryEntities("is łukasz here")).toEqual(["łukasz"]);
  });

  it("admits 2-char tokens (acronyms), which the strict pass would reject", () => {
    // "SF" is skipped by the strict pass (first word needs ≥3 chars); the
    // fallback admits "sf" — every 2-letter function word is stopworded, so a
    // surviving 2-char token is almost always a real short name/acronym.
    expect(extractQueryEntities("anyone in sf")).toEqual(["sf"]);
  });

  it("normalizes tokens (lower + collapse whitespace) exactly like the write side", () => {
    // Leading/trailing/repeated whitespace and case are all normalized, so the
    // candidates match stored canonical names byte-for-byte.
    expect(extractQueryEntities("  san    francisco  ")).toEqual([
      "san",
      "francisco",
      "san francisco",
    ]);
  });

  it("suppresses the fallback on a MIXED-case query once the strict pass hits", () => {
    // "Sara" strict-matches, so the lowercase "tokyo" (a real place) is NOT
    // recovered — the fallback is gated strictly on the strict pass being empty.
    expect(extractQueryEntities("does Sara live in tokyo")).toEqual(["sara"]);
  });
});

describe("extractQueryEntities — fallback ordering and cap", () => {
  it("emits tier-major: every unigram, then every bigram, then every trigram", () => {
    // Position order within a tier; no gram of length n+1 is formed until the
    // whole query has been covered at length n.
    const out = extractQueryEntities("went to san francisco bay yesterday");
    // "went"/"to"/"yesterday" are stopworded; the content window is
    // [san, francisco, bay].
    expect(out).toEqual([
      "san",
      "francisco",
      "bay",
      "san francisco",
      "francisco bay",
      "san francisco bay",
    ]);
  });

  it("covers the tail of a run-on query instead of starving it under the cap", () => {
    // Regression: emission used to be position-major/longest-first, which spent
    // the whole 12-slot budget on the first FOUR start positions (3 grams each)
    // and never reached position 5 — so a real entity at the end of a dictated
    // run-on got no lookup at all and the graph lane silently missed it.
    const out = extractQueryEntities("wa wb wc wd wx kyoto");
    expect(out).toContain("kyoto");
    // ...and it lands in the unigram tier, before any multi-word gram.
    expect(out.slice(0, 6)).toEqual(["wa", "wb", "wc", "wd", "wx", "kyoto"]);
  });

  it("hard-caps the candidate count so a run-on sentence can't fan out unbounded", () => {
    // 15 distinct non-stopword 2-char tokens: 15 unigrams alone overflow the
    // budget, so emission stops mid-unigram-tier and no bigram is ever formed.
    const query = "wa wb wc wd we wf wg wh wi wj wk wl wm wn wo";
    const out = extractQueryEntities(query);
    expect(out).toHaveLength(12);
    expect(out.every((c) => !c.includes(" "))).toBe(true);
    expect(out.slice(0, 3)).toEqual(["wa", "wb", "wc"]);
  });
});
