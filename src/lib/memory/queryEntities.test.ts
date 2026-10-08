import { describe, expect, it } from "vitest";

import { extractQueryEntities } from "./queryEntities";

describe("extractQueryEntities — strict capitalized pass (unchanged invariants)", () => {
  it("extracts capitalized names and canonicalizes them (lower-trim)", () => {
    expect(extractQueryEntities("where is Sara living in Kyoto")).toEqual(["sara", "kyoto"]);
  });

  it("emits the multi-word canonical AND each token, hyphens intact", () => {
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
    expect(out).not.toContain("alpha bravo charlie delta");
  });

  it("drops a phrase whose every token is a stopword", () => {
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
    expect(extractQueryEntities("is there anyone in san francisco who works in ai")).toEqual([
      "san",
      "francisco",
      "ai",
      "san francisco",
    ]);
  });

  it("does NOT run when the strict pass already extracted (byte-identical path)", () => {
    expect(extractQueryEntities("is Sara in san francisco")).toEqual(["sara"]);
  });

  it("returns [] for a stopword-only lowercase query (lane stays a no-op)", () => {
    expect(extractQueryEntities("is there anyone who can help me")).toEqual([]);
  });

  it("recovers a name with a non-ASCII INITIAL that the strict pass drops", () => {
    expect(extractQueryEntities("Łukasz")).toEqual(["łukasz"]);
    expect(extractQueryEntities("is łukasz here")).toEqual(["łukasz"]);
  });

  it("admits 2-char tokens (acronyms), which the strict pass would reject", () => {
    expect(extractQueryEntities("anyone in sf")).toEqual(["sf"]);
  });

  it("normalizes tokens (lower + collapse whitespace) exactly like the write side", () => {
    expect(extractQueryEntities("  san    francisco  ")).toEqual([
      "san",
      "francisco",
      "san francisco",
    ]);
  });

  it("suppresses the fallback on a MIXED-case query once the strict pass hits", () => {
    expect(extractQueryEntities("does Sara live in tokyo")).toEqual(["sara"]);
  });
});

describe("extractQueryEntities — the fallback gate ignores function words", () => {
  it("falls back when the only strict hit is a leading auxiliary", () => {
    expect(extractQueryEntities("Are there any designers in san francisco")).toEqual([
      "designers",
      "san",
      "francisco",
      "san francisco",
      "are",
    ]);
  });

  it("falls back when the only strict hit is a contraction", () => {
    expect(extractQueryEntities("What's happening in kyoto")).toEqual([
      "happening",
      "kyoto",
      "what's",
    ]);
  });

  it("falls back when the only strict hit is a leading pronoun-ish quantifier", () => {
    expect(extractQueryEntities("Someone mentioned tokyo")).toEqual([
      "mentioned",
      "tokyo",
      "mentioned tokyo",
      "someone",
    ]);
  });

  it("treats a MULTI-WORD all-function-word strict hit as no hit", () => {
    expect(extractQueryEntities("Are You going to san francisco")).toEqual([
      "san",
      "francisco",
      "san francisco",
      "are you",
      "are",
    ]);
  });

  it("still returns the strict result verbatim when a real name is present", () => {
    expect(extractQueryEntities("Are you meeting Sara in tokyo")).toEqual(["are", "sara"]);
  });

  it("does not manufacture candidates when the whole query is function words", () => {
    expect(extractQueryEntities("Are there any of them")).toEqual(["are"]);
    expect(extractQueryEntities("are there any of them")).toEqual([]);
  });
});

describe("extractQueryEntities — falling back never loses a strict candidate", () => {
  it("keeps a capitalized name that is also a function word", () => {
    expect(extractQueryEntities("Is Will here")).toEqual(["will"]);
  });

  it("unions the strict survivor in alongside recovered lowercase candidates", () => {
    expect(extractQueryEntities("Is Will coming to dinner")).toEqual(["coming", "dinner", "will"]);
    expect(extractQueryEntities("does Will know san francisco")).toEqual([
      "san",
      "francisco",
      "san francisco",
      "will",
    ]);
  });
});

describe("extractQueryEntities — multi-word canonicals led by a common word", () => {
  it("emits the 'new <place>' bigram, not just the distinctive token", () => {
    expect(extractQueryEntities("anyone in new york")).toEqual(["new", "york", "new york"]);
    expect(extractQueryEntities("who lives in new orleans")).toEqual([
      "new",
      "orleans",
      "new orleans",
    ]);
  });

  it("does not recover a canonical whose INTERIOR token is a stopword", () => {
    expect(extractQueryEntities("anyone at bank of america")).toEqual(["bank", "america"]);
  });
});

describe("extractQueryEntities — fallback ordering and cap", () => {
  it("emits tier-major: every unigram, then every bigram, then every trigram", () => {
    const out = extractQueryEntities("went to san francisco bay yesterday");
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
    const out = extractQueryEntities("wa wb wc wd wx kyoto");
    expect(out).toContain("kyoto");
    expect(out.slice(0, 6)).toEqual(["wa", "wb", "wc", "wd", "wx", "kyoto"]);
  });

  it("hard-caps the candidate count so a run-on sentence can't fan out unbounded", () => {
    const query = "wa wb wc wd we wf wg wh wi wj wk wl wm wn wo";
    const out = extractQueryEntities(query);
    expect(out).toHaveLength(12);
    expect(out.every((c) => !c.includes(" "))).toBe(true);
    expect(out.slice(0, 3)).toEqual(["wa", "wb", "wc"]);
  });
});
