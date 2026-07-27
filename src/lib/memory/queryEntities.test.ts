/**
 * Unit tests for the W5 graph-lane query-entity extractor.
 *
 * Three invariants the assertions below encode:
 *  1. STRICT pass is UNCHANGED, warts included. "What's" survives stopwording;
 *     a non-ASCII INITIAL like "Łukasz" isn't matched because the regex's `\b`
 *     anchor is ASCII-only; a leading capitalized function word is emitted as a
 *     candidate. Each is pinned so a future change to them is a decision rather
 *     than an accident.
 *  2. BOTH passes always run. There is no gate, so no query shape can suppress
 *     the lexical pass — the three shapes that broke the gated design get named
 *     tests below.
 *  3. Under the shared cap, proper-noun candidates keep their slots and the
 *     lexical tier is what gets truncated (the ordering contract).
 *
 * `extractQueryEntities` is pure/synchronous, so these run with no DB or mocks —
 * downstream, `getMemoriesByEntityNamesOp` validates candidates against stored
 * names, which is why the lexical pass can afford to over-emit (see
 * recall.test.ts / graphTraversal.test.ts for the integration proof, and
 * test/memory/src/vault/entityLane.test.ts for the corpus-level cost).
 */
import { describe, expect, it } from "vitest";

import { buildEntityVocabulary } from "./entityVocabulary";
import { extractQueryEntities } from "./queryEntities";

describe("extractQueryEntities — strict capitalized pass (unchanged invariants)", () => {
  it("extracts capitalized names and canonicalizes them (lower-trim)", () => {
    // "where"/"is"/"living"/"in" are stopworded on both passes, so the two
    // proper nouns are all that survives.
    expect(extractQueryEntities("where is Sara living in Kyoto")).toEqual(["sara", "kyoto"]);
  });

  it("emits the multi-word canonical AND each token, hyphens intact", () => {
    // The write side may store "Jean-Luc Picard" as one entity or as separate
    // tokens; querying every variant recovers that parity. The proper-noun
    // candidates lead, in document order.
    expect(extractQueryEntities("please call Jean-Luc Picard tomorrow").slice(0, 3)).toEqual([
      "jean-luc picard",
      "jean-luc",
      "picard",
    ]);
  });

  it("keeps apostrophes inside a name (O'Brien)", () => {
    // Not a possessive: the stem guard in stripPossessive keeps this whole
    // rather than cutting it to "o".
    expect(extractQueryEntities("did you see O'Brien yesterday")).toEqual(["o'brien"]);
  });

  it("matches non-ASCII letters in the BODY of a name (São Paulo)", () => {
    // S and P are ASCII initials, so the `\b` anchor holds; the accented body
    // letters are covered by the \p{L} class.
    expect(extractQueryEntities("flights to São Paulo please").slice(0, 3)).toEqual([
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
    // are ALL stopwords is dropped too (not just the individual tokens). Neither
    // pass finds anything, so the lane stays a no-op.
    expect(extractQueryEntities("Monday Tuesday January")).toEqual([]);
    expect(extractQueryEntities("The User")).toEqual([]);
  });

  it("deduplicates repeated names", () => {
    expect(extractQueryEntities("did Sara and Sara meet")).toEqual(["sara"]);
  });

  it("returns [] for empty and whitespace-only input", () => {
    expect(extractQueryEntities("")).toEqual([]);
    expect(extractQueryEntities("   ")).toEqual([]);
    expect(extractQueryEntities("\n\t")).toEqual([]);
  });

  it("pins the known contraction wart: 'What's Sara' survives stopwording", () => {
    // "what's" alone now folds to "what" and is dropped as a stopword, but the
    // multi-word run "What's Sara" is not every-token-stopword, so the phrase
    // still leaks. Documented CURRENT behavior — encoded so a future refactor is
    // a conscious decision, not an accidental regression. It costs one IN-clause
    // slot and matches no stored canonical.
    expect(extractQueryEntities("What's Sara doing in Kyoto")).toEqual([
      "what's sara",
      "sara",
      "kyoto",
    ]);
  });

  it("pins the known function-word wart: a leading auxiliary is emitted", () => {
    // "are" is not in the strict STOPWORDS set (deliberately narrow — it exists
    // to filter capitalized noun phrases, not sentences), so the strict pass
    // emits it. It is inert: no stored canonical is named "are", so it costs one
    // IN-clause slot and returns zero rows. What matters is that it no longer
    // SUPPRESSES anything — see the question-initial block below.
    expect(extractQueryEntities("Are there any of them")).toEqual(["are"]);
  });
});

describe("extractQueryEntities — lexical pass (case-blind recall net)", () => {
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

  it("returns [] for a stopword-only lowercase query (lane stays a no-op)", () => {
    // No candidate → buildGraphLaneRanking / traverseGraphLane short-circuit
    // with zero DB lookups.
    expect(extractQueryEntities("is there anyone who can help me")).toEqual([]);
  });

  it("recovers a name with a non-ASCII INITIAL that the strict pass drops", () => {
    // The strict regex's leading `\b` is ASCII-only, so "Łukasz" isn't matched
    // by the strict pass — but the lexical tokenizer is Unicode-aware and
    // recovers it. (Contrast São Paulo above, whose ASCII initials strict-match.)
    expect(extractQueryEntities("Łukasz")).toEqual(["łukasz"]);
    expect(extractQueryEntities("is łukasz here")).toEqual(["łukasz"]);
  });

  it("admits 2-char tokens (acronyms), which the strict pass would reject", () => {
    // "SF" is skipped by the strict pass (first word needs ≥3 chars); the
    // lexical pass admits "sf" — every 2-letter function word is stopworded, so
    // a surviving 2-char token is almost always a real short name/acronym.
    expect(extractQueryEntities("anyone in sf")).toEqual(["sf"]);
  });

  it("normalizes tokens (lower + collapse whitespace) exactly like the write side", () => {
    expect(extractQueryEntities("  san    francisco  ")).toEqual([
      "san",
      "francisco",
      "san francisco",
    ]);
  });

  it("reaches alphanumeric canonicals a letter-initial tokenizer cannot", () => {
    // 19% of stored canonical names on the benchmark corpus start with (or
    // embed) a digit. Under a letter-initial tokenizer they are unreachable at
    // EVERY casing — the strict pass needs a capital and the lexical pass would
    // never form the token.
    const out = extractQueryEntities("anything on s3 or p99 latency");
    expect(out).toContain("s3");
    expect(out).toContain("p99");
  });

  it("tokenizes a curly apostrophe identically to a straight one", () => {
    // U+2019 is what every phone keyboard actually produces. Left out of the
    // token class it splits "sara’s" into "sara" + a dropped 1-char token, and
    // the bigram "sara flight" is silently never formed.
    expect(extractQueryEntities("sara’s flight")).toEqual(extractQueryEntities("sara's flight"));
    // Both spellings converge on the STRAIGHT apostrophe for the retained
    // possessive surface — the write side is an LLM, which types U+0027, so a
    // curly surface emitted verbatim could never match a stored canonical.
    expect(extractQueryEntities("sara’s flight")).toEqual([
      "sara",
      "sara's",
      "flight",
      "sara flight",
    ]);
  });
});

describe("extractQueryEntities — the three shapes a strict-pass gate gets wrong", () => {
  // A gate that skips the lexical pass "when the strict pass already found
  // something" is unfixable in principle, and these are the three proofs. Only
  // the first is a stopwording problem; the other two are queries where the
  // strict pass found a GENUINE entity and still needed the lexical pass, so no
  // predicate over the strict result can tell them apart from success.

  it("QUESTION-INITIAL: a leading auxiliary no longer costs the whole lane", () => {
    // The strict regex matches any capitalized ≥3-char token, so "Are" reads as
    // a successful extraction. Under a gate the lane looked "are" up, matched
    // nothing, and returned empty — on precisely the People-Nearby phrasing it
    // exists to serve.
    const out = extractQueryEntities("Are there any designers in san francisco");
    expect(out).toContain("san francisco");
    expect(out).toContain("designers");
    // The inert function word rides along; what changed is that it no longer
    // suppresses the candidates that matter.
    expect(out.indexOf("are")).toBe(0);
  });

  it("QUESTION-INITIAL: a leading contraction behaves the same", () => {
    // "What" is a strict stopword but "what's" was not — normalizeEntityName
    // keeps the apostrophe. stripPossessive now folds it back to "what", which
    // the strict STOPWORDS set catches.
    expect(extractQueryEntities("What's happening in kyoto")).toEqual(["happening", "kyoto"]);
  });

  it("QUESTION-INITIAL: a multi-word all-function-word run behaves the same", () => {
    // "Are You" strict-matches as one capitalized run, emitting the phrase AND
    // each token — every one a function word, none of them a stored name.
    const out = extractQueryEntities("Are You going to san francisco");
    expect(out).toContain("san francisco");
  });

  it("PARTIAL CASING: a lowercase entity survives alongside a capitalized one", () => {
    // "Sara" is a real name and a successful strict extraction. Stopping there
    // still loses "kyoto". No predicate over ["sara"] can know that.
    const out = extractQueryEntities("did Sara mention kyoto");
    expect(out).toContain("sara");
    expect(out).toContain("kyoto");
  });

  it("PARTIAL CASING: the same for a query the gate treated as fully extracted", () => {
    const out = extractQueryEntities("does Sara live in tokyo");
    expect(out).toEqual(["sara", "tokyo"]);
  });

  it("POSSESSIVE: 'Sara's' emits the stem AND keeps the inflected surface", () => {
    // "sara's" is a genuine strict hit that is ALSO incomplete — "kyoto" is
    // lowercase and would be lost by a gate. Both facts at once is what makes
    // the gate unfixable.
    const out = extractQueryEntities("Sara's flight to kyoto");
    expect(out).toContain("sara");
    expect(out).toContain("kyoto");
    // The surface is kept, not replaced. `normalizeEntityName` is trim+lowercase
    // and does not strip inflection, so a possessive CAN be a stored canonical
    // and dropping the surface would make it unreachable — see the dedicated
    // possessive-canonical cases below.
    expect(out).toContain("sara's");
  });
});

describe("extractQueryEntities — possessive-form stored canonicals", () => {
  // A whole class of ordinary proper nouns ends in "'s", and the write side
  // stores whatever the extraction LLM emitted: `normalizeEntityName` is
  // `trim().toLowerCase()` and does not strip inflection. So "mcdonald's" is a
  // perfectly normal stored canonical, and an extractor that REPLACES the
  // possessive surface with its stem cannot reach it from either tier — the
  // heuristic emits "mcdonald", and the grounded tier probes "mcdonald" against
  // an index keyed "mcdonald's" (a single-token name is indexed under itself
  // verbatim; depluralize/pluralize produce "mcdonalds", never the apostrophe).
  //
  // The eval corpus is structurally blind to this: not one of its 353 stored
  // canonicals contains an apostrophe. So it is checked here, directly.
  const POSSESSIVE_CANONICALS = ["mcdonald's", "lowe's", "trader joe's", "dunkin'"];
  const vocabulary = buildEntityVocabulary(POSSESSIVE_CANONICALS, "test");

  it.each([
    ["Where is the nearest McDonald's", "mcdonald's"],
    ["what did i buy at Lowe's", "lowe's"],
    ["anything about Trader Joe's", "trader joe's"],
    ["coffee at Dunkin' this morning", "dunkin'"],
  ])("heuristic tier reaches the stored canonical in %j", (query, stored) => {
    expect(extractQueryEntities(query)).toContain(stored);
  });

  it.each([
    ["Where is the nearest McDonald's", "mcdonald's"],
    ["what did i buy at Lowe's", "lowe's"],
    ["anything about Trader Joe's", "trader joe's"],
    ["coffee at Dunkin' this morning", "dunkin'"],
  ])("grounded tier resolves the stored canonical in %j", (query, stored) => {
    expect(extractQueryEntities(query, vocabulary)).toContain(stored);
  });

  it("reaches it from an all-lowercase query too, where the strict pass is blind", () => {
    expect(extractQueryEntities("where is the nearest mcdonald's")).toContain("mcdonald's");
    expect(extractQueryEntities("where is the nearest mcdonald's", vocabulary)).toContain(
      "mcdonald's"
    );
  });

  it("reaches it from a curly apostrophe, which is what a phone keyboard types", () => {
    expect(extractQueryEntities("where is the nearest mcdonald’s")).toContain("mcdonald's");
    expect(extractQueryEntities("where is the nearest mcdonald’s", vocabulary)).toContain(
      "mcdonald's"
    );
  });

  it("still emits the stem, so a vault storing the bare noun keeps matching", () => {
    // The surface is ADDITIVE. Whichever form the write side happened to store,
    // one of the two candidates reaches it.
    expect(extractQueryEntities("Where is the nearest McDonald's")).toContain("mcdonald");
  });
});

describe("extractQueryEntities — ordering contract and bounds", () => {
  it("puts proper-noun candidates first even when they appear late in the query", () => {
    // Order is only observable under the cap, and this is the property that
    // makes truncation safe: the high-precision tier keeps its slots.
    const out = extractQueryEntities("we went to kyoto and met Sara Park");
    expect(out.slice(0, 3)).toEqual(["sara park", "sara", "park"]);
    expect(out).toContain("kyoto");
  });

  it("emits the lexical tier tier-major: every unigram, then bigrams, then trigrams", () => {
    // Position order within a tier; no gram of length n+1 is formed until the
    // whole query has been covered at length n.
    expect(extractQueryEntities("went to san francisco bay yesterday")).toEqual([
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
    expect(out.slice(0, 6)).toEqual(["wa", "wb", "wc", "wd", "wx", "kyoto"]);
  });

  it("hard-caps the SHARED budget across both passes", () => {
    // 15 distinct non-stopword tokens ("we" is stopworded): the unigram tier
    // alone overflows, so emission stops mid-tier and no bigram is ever formed.
    const out = extractQueryEntities("wa wb wc wd we wf wg wh wi wj wk wl wm wn wo");
    expect(out).toHaveLength(12);
    expect(out.every((c) => !c.includes(" "))).toBe(true);
  });

  it("spends the cap on proper nouns before lexical grams", () => {
    // The same overflowing query with two capitalized names in front. The strict
    // tier takes its three slots first and the lexical tier is what gets cut.
    const out = extractQueryEntities("Alpha Bravo wa wb wc wd wf wg wh wi wj wk wl wm wn");
    expect(out).toHaveLength(12);
    expect(out.slice(0, 3)).toEqual(["alpha bravo", "alpha", "bravo"]);
    expect(out).not.toContain("wn");
  });

  it("clamps a pathological input so extraction cost cannot be set by the caller", () => {
    // A pasted document is not a query. Without the clamp the gram window walks
    // every token in it, on the recall hot path.
    const marker = "zebracorn";
    const query = `${"wa ".repeat(2000)}${marker}`;
    expect(query.length).toBeGreaterThan(6000);
    const out = extractQueryEntities(query);
    expect(out).not.toContain(marker);
    expect(out.length).toBeLessThanOrEqual(12);
    // ...and the same token IS reached when it falls inside the clamp, so the
    // assertion above is about the clamp and not about stopwording.
    expect(extractQueryEntities(`wa ${marker}`)).toContain(marker);
  });
});

describe("extractQueryEntities — vocabulary-grounded tier", () => {
  const VAULT = [
    "sara park",
    "kyoto",
    "san francisco",
    "ai",
    "p99 latency",
    "mechanical keyboards",
    "the who",
  ];
  const vocabulary = buildEntityVocabulary(VAULT, "test");

  it("resolves a partial mention to the canonical name the vault stores", () => {
    // The heuristic emits "sara", which is not a stored name and matches
    // nothing. Grounded, the token resolves to the name it belongs to.
    expect(extractQueryEntities("where is sara", vocabulary)).toEqual(["sara park"]);
  });

  it("is casing-blind and possessive-blind, like the heuristic tier", () => {
    for (const query of ["WHERE IS SARA", "Where is Sara", "where is sara's flight"]) {
      expect(extractQueryEntities(query, vocabulary)).toContain("sara park");
    }
  });

  it("bridges a number mismatch between query and stored name", () => {
    // The write side is LLM-authored and inconsistent about number, so the same
    // concept is stored singular in one memory and plural in another.
    expect(extractQueryEntities("what keyboard do i use", vocabulary)).toContain(
      "mechanical keyboards"
    );
    expect(extractQueryEntities("anything about keyboards", vocabulary)).toContain(
      "mechanical keyboards"
    );
  });

  it("ranks a fully covered short name above a partially covered long one", () => {
    // "kyoto" is 1/1 covered; "san francisco" is 1/2. Score is coverage, so the
    // complete match leads even though the other name is longer.
    const out = extractQueryEntities("kyoto or san trip", vocabulary);
    expect(out[0]).toBe("kyoto");
    expect(out).toContain("san francisco");
  });

  it("returns NOTHING for a query that names nothing the vault holds", () => {
    // Deliberately not falling back to the heuristic. Every candidate the
    // heuristic could emit would have to be an exact stored name, and every
    // stored name is reachable from its own tokens (see the guarantee below),
    // so a fallback here can only add candidates that match no rows.
    expect(extractQueryEntities("what did they say about it", vocabulary)).toEqual([]);
    expect(extractQueryEntities("anything on quantum tunnelling", vocabulary)).toEqual([]);
  });

  it("emits a total order that does not depend on enumeration order", () => {
    // The entity table's row order is not stable, and two names can tie on both
    // coverage and length. Without a final tiebreak the emitted candidates —
    // and therefore which of them survive the cap — would vary run to run.
    const tied = ["alpha one", "alpha two"];
    const forward = extractQueryEntities("alpha", buildEntityVocabulary(tied, "t"));
    const reversed = extractQueryEntities("alpha", buildEntityVocabulary([...tied].reverse(), "t"));
    expect(forward).toEqual(reversed);
    expect(forward).toEqual(["alpha one", "alpha two"]);
  });

  it("clamps its input like the heuristic tier", () => {
    const query = `${"wa ".repeat(2000)}kyoto`;
    expect(extractQueryEntities(query, vocabulary)).toEqual([]);
    expect(extractQueryEntities("wa kyoto", vocabulary)).toEqual(["kyoto"]);
  });

  // The no-union guarantee, mechanized. It is what licenses "the grounded tier
  // returned [] and we do NOT fall back to the heuristic", and it is the only
  // thing standing between that decision and a silent recall miss.
  //
  // The proposition: for every stored name, if the HEURISTIC tier would match it
  // from its own text, the VOCABULARY tier matches it too. Then a grounded
  // result of [] implies the heuristic would also have found nothing, so
  // unioning could only add candidates that match no rows.
  //
  // (The argument that makes this the right proposition: the heuristic can only
  // match a stored name by emitting a gram whose normalized string EQUALS it, so
  // every token of the name is a query token. The index guarantees at least one
  // of those tokens is a key. Both halves rest on the two tiers tokenizing
  // identically, which is why they share one TOKEN_REGEX.)
  describe("the no-union guarantee", () => {
    const ADVERSARIAL = [
      ...new Set([
        ...VAULT,
        "the who", // every token a stopword
        "up to us", // every token below the index length floor
        "ai ml", // ditto, but the heuristic CAN match this one
        "a b", // every token below the QUERY tokenizer's floor too
        "sf", // short single tokens
        "p99",
        "s3",
        "1password", // digit-initial
        "o'brien", // apostrophe that is not a possessive
        "jean-luc picard",
        "são paulo", // non-ASCII body
      ]),
    ];
    const adversarialVocabulary = buildEntityVocabulary(ADVERSARIAL, "test");
    const heuristicReaches = ADVERSARIAL.filter((name) =>
      extractQueryEntities(name).includes(name)
    );

    it("covers a non-trivial share of the adversarial list", () => {
      // Without this the guarantee below could pass by the heuristic reaching
      // nothing at all, which is exactly the shape a vacuous test takes.
      // Exactly three are unreachable to the heuristic by construction: the two
      // all-function-word names and the 1-char one.
      expect(heuristicReaches.length).toBe(ADVERSARIAL.length - 3);
      expect(heuristicReaches).toContain("ai ml");
      expect(heuristicReaches).toContain("jean-luc picard");
      expect(heuristicReaches).toContain("1password");
    });

    it("misses no stored name the heuristic tier would have matched", () => {
      const missed = heuristicReaches.filter(
        (name) => !extractQueryEntities(name, adversarialVocabulary).includes(name)
      );
      expect(missed).toEqual([]);
    });

    it("reaches names the heuristic tier cannot", () => {
      // Strictly-more, not merely not-less: an all-stopword name is invisible to
      // the heuristic at every casing and resolvable here.
      expect(extractQueryEntities("the who")).not.toContain("the who");
      expect(extractQueryEntities("the who", adversarialVocabulary)).toContain("the who");
    });

    it("documents the one name NEITHER tier can reach", () => {
      // Both tokenizers drop sub-2-char tokens, so a name of only 1-char tokens
      // is unreachable on both sides. The guarantee holds — trivially — and this
      // pins it as known rather than discovered later as a bug.
      expect(extractQueryEntities("a b")).not.toContain("a b");
      expect(extractQueryEntities("a b", adversarialVocabulary)).not.toContain("a b");
    });
  });
});

describe("extractQueryEntities — stopword edge cases", () => {
  it("keeps a proper noun that collides with a lexical-only stopword (Will / Grace)", () => {
    // "will" is in FALLBACK_STOPWORDS but not in the strict set, so the strict
    // pass emits it and the lexical pass would not. Pinned exactly so that
    // editing either stopword list makes the consequence visible.
    expect(extractQueryEntities("Will Grace be there")).toEqual(["will grace", "will", "grace"]);
  });

  it("does not manufacture candidates from a function-word-only sentence", () => {
    // The lexical pass's own stopwording still applies — unioning the passes
    // must not turn "no entities" into "some entities".
    expect(extractQueryEntities("is there anyone who can help me")).toEqual([]);
    expect(extractQueryEntities("what did they say about it")).toEqual([]);
  });
});
