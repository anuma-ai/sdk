/**
 * Query-entity extraction for the W5 graph recall lane.
 *
 * Given a user query like "What's Sara doing in Kyoto next week?" we
 * want to surface "Sara" and "Kyoto" so the graph lane can pull memories
 * sharing those entities. This runs at recall-time, not extraction-time
 * — the auto-extractor's full LLM-based entity extraction would be far
 * too expensive on every query.
 *
 * Returns canonicalized (lowercased, trimmed) names so they can be
 * looked up directly via {@link getMemoriesByEntityNamesOp}, which
 * normalizes the same way at write time.
 *
 * TWO TIERS. When the caller can supply an {@link EntityVocabulary} — the set
 * of canonical names the vault actually holds — query tokens are RESOLVED
 * against it and the heuristic below does not run; see `entityVocabulary.ts`
 * for why that is a lookup rather than a guess and what it costs. When it
 * cannot, the heuristic runs, and it is the floor: the lane degrades to
 * guessing, never to nothing.
 *
 * The rest of this comment is about the heuristic tier.
 *
 * TWO PASSES, ONE BUDGET, NO GATE (epic #719, item D4 — the W5 casing gap):
 *  1. STRICT pass — the capitalized-noun-phrase {@link ENTITY_REGEX} below.
 *     Precise, but an uppercase initial is mandatory, so it extracts NOTHING
 *     from an all-lowercase query. Dictated text, mobile keyboards with
 *     autocaps off, and the lowercase conversational phrasing the People-Nearby
 *     chat-discovery surface is built on ("is there anyone in san francisco who
 *     works in ai") all lose case — and used to silently get no graph lane.
 *  2. LEXICAL pass — capped, aggressively-stopworded n-gram candidates
 *     regardless of case.
 *
 * Both passes ALWAYS run, into one shared candidate budget.
 *
 * WHY THERE IS NO "only fall back when the strict pass found nothing" GATE.
 * "The strict pass found something" is not a proxy for "extraction worked", and
 * no predicate can make it one. Three query shapes prove it, and only the first
 * is a stopwording problem:
 *  - QUESTION-INITIAL. "Are there any designers in san francisco" — the strict
 *    regex matches any capitalized ≥3-char token, so the leading auxiliary is a
 *    "hit". A gate then suppresses the lexical pass, the lane looks up "are",
 *    matches no stored canonical, and returns nothing. That is the original
 *    silent-dead-lane bug, reintroduced on exactly the phrasing meant to catch it.
 *  - PARTIAL CASING. "did Sara mention kyoto" — the strict pass found a GENUINE
 *    entity. It is still wrong to stop: "kyoto" is lowercase and is lost.
 *  - POSSESSIVES. "Sara's flight to kyoto" — the strict pass emits "sara's" and
 *    a gate then stops, losing "kyoto". (Note "sara's" itself is NOT
 *    necessarily useless: the write side stores what it extracted, so a
 *    possessive CAN be a stored canonical. Both the surface and its stem are
 *    emitted — see {@link stripPossessive}.)
 * A predicate can be taught about function words. It cannot distinguish the
 * last two from a successful extraction, because they ARE successful
 * extractions that are also incomplete. So the gate is deleted rather than
 * patched.
 *
 * Why unioning does not flood the lane — the concern that deferred this in
 * #730. Precision here does NOT come from the regex. It comes from the
 * DOWNSTREAM validator: {@link getMemoriesByEntityNamesOp} looks each candidate
 * up against stored canonical names and "names that don't exist as entities
 * contribute nothing" (one indexed `Q.oneOf`, early-empty when nothing matches).
 * A non-entity survivor costs a single IN-clause slot and returns zero rows;
 * a real lowercase entity that was dropped silently kills the whole lane. The
 * guards are aggressive stopwording, {@link MAX_QUERY_CANDIDATES}, the
 * {@link MAX_QUERY_CHARS} input clamp, and the stored-name validation — not casing.
 *
 * ORDERING CONTRACT: proper-noun candidates first in document order, then
 * lexical grams tier-major. Order is load-bearing only under the cap, and this
 * ordering means a binding cap truncates the least-trustworthy tier rather than
 * the tail of the sentence, and that a well-cased query keeps the exact
 * candidate PREFIX the strict pass alone would have produced.
 *
 * Limitations (acceptable for v1):
 *  - The strict pass only catches capitalized noun phrases (≥3 chars for the
 *    first word), and its leading `\b` is ASCII-only, so a name with a
 *    non-ASCII INITIAL ("Łukasz") isn't matched by the strict pass at all — the
 *    lexical pass recovers it. Non-ASCII letters in the body ("São Paulo") work
 *    in both passes.
 *  - Stopwords are filtered on BOTH passes; the lexical pass filters strictly
 *    more aggressively (a wider union set, and any-token-stopword rejection vs
 *    the strict pass's every-token test), since it sees every word in the
 *    sentence rather than just capitalized phrases.
 *  - Won't disambiguate "Sara" → "Sara Park" (the alias-coalescing pass
 *    in the chat-side graph builder is presentation-layer; the storage
 *    layer keeps both as separate canonicals). Caller can pass both
 *    forms by extracting all matches.
 *  - Every candidate is a LEXICAL guess at a stored name. "my sister" never
 *    reaches "sara". Closing that needs entity embeddings or a write-side alias
 *    table; `entityLane.test.ts` reports the residual as `semanticHeadroom`.
 */

import { normalizeEntityName } from "../db/entities/types.js";
import {
  type EntityVocabulary,
  MAX_VOCABULARY_CANDIDATES,
  nameTokens,
} from "./entityVocabulary.js";

const STOPWORDS = new Set(
  [
    "User",
    "Anuma",
    "Assistant",
    "I",
    "You",
    "They",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
    "The",
    "A",
    "An",
    "Yes",
    "No",
    "Maybe",
    "OK",
    "Ok",
    "Hi",
    "Hello",
    "Thanks",
    "What",
    "When",
    "Where",
    "Who",
    "Why",
    "How",
  ].map((w) => w.toLowerCase())
);

// Capitalized noun phrases. The character class covers hyphenated names
// ("Jean-Luc"), apostrophes ("O'Brien"), and non-ASCII letters
// ("São Paulo", "Łukasz") via Unicode property escapes. Three-token cap
// keeps "São Paulo Lakers" but not full sentences.
const ENTITY_REGEX = /\b\p{Lu}[\p{L}'-]{2,}(?:\s+\p{Lu}[\p{L}'-]+){0,2}\b/gu;

/**
 * Stopwords that apply ONLY to the lexical pass — the strict pass's
 * {@link STOPWORDS} set stays byte-identical so already-extracting queries keep
 * their exact candidate prefix. The lexical pass sees EVERY token in a
 * sentence, not just capitalized noun phrases, so it needs a far wider net:
 * pronouns, auxiliaries, prepositions, conjunctions, deictics, and the
 * conversational filler the People-Nearby discovery surface is phrased in ("is
 * there anyone who…", "where is everyone going"). This aggressive filtering —
 * NOT the regex — is the lexical pass's precision guard, so when a common word
 * slips through and a test flags it, the fix is to ADD the word here, never to
 * weaken the downstream assertion. Overlaps with STOPWORDS are harmless (the
 * Set union dedupes them).
 *
 * Deliberately EXCLUDES 2-letter content acronyms like "ai"/"ml"/"sf": every
 * 2-letter English *function* word ("of", "to", "in", "is", "we", "he", …) is
 * already listed here, so a surviving 2-char token is almost always a real
 * short name/acronym — and the stored-name lookup validates it regardless.
 */
const FALLBACK_ONLY_STOPWORDS: string[] = (
  "a an and or but nor not if then than because so too also just very really " +
  "about above after again against all am any anyone anybody anything are " +
  "around as at be been being before behind below between both by can cannot " +
  "could currently did do does doing done down during each ever every " +
  "everybody everyone everything few find finds finding for from get gets " +
  "getting go goes going gone got had has have having he help her here hers " +
  "him his hmm i in into is it its knew know knows later like liked likes " +
  "live lived lives living look looked looking looks made make makes may me " +
  // "new" is deliberately ABSENT. It is a function word on its own, but it also
  // leads a large family of canonical place names — "new york", "new orleans",
  // "new delhi", "new jersey" — and a gram is rejected if ANY of its tokens is a
  // stopword, so listing it meant "anyone in new york" emitted only "york" and
  // the exact-canonical lookup missed the stored "new york" entirely. The cost
  // of leaving it out is that a query mentioning "new" spends one IN-clause slot
  // on a candidate the stored-name lookup resolves to zero rows, which is the
  // trade this whole pass is built on.
  "meet meets might mine more most must my near need needed needs never " +
  "nobody nothing now of off okay on once only onto other our ours out over " +
  "own people person please recently said same say says see seen shall she " +
  "should since some somebody someone something soon still such talk tell " +
  "tells thank that the their theirs them there these they think thinks this " +
  "those thought through to today told tomorrow under until up us want wanted " +
  "wants was we went were which while will with without work worked working " +
  "works would yeah year years yep yesterday you your yours " +
  // Contractions, grouped rather than merged alphabetically because they are a
  // distinct leak: `normalizeEntityName` keeps the apostrophe, so "What's"
  // canonicalizes to "what's" and never matches the bare "what" in STOPWORDS.
  // They therefore reach BOTH passes. {@link stripPossessive} now folds the
  // single-token ones back onto their stem, which is what puts them within
  // reach of these sets at all.
  "aren't can't couldn't didn't doesn't don't hadn't hasn't haven't he's " +
  "how's i'd i'll i'm i've isn't it's let's she's shouldn't that's there's " +
  "they're they've wasn't we're we've weren't what's when's where's who's " +
  "why's won't wouldn't you'll you're you've"
).split(" ");

/**
 * The lexical pass's effective stopword set: the strict {@link STOPWORDS}
 * unioned with {@link FALLBACK_ONLY_STOPWORDS}. Superset of STOPWORDS by
 * construction, so anything the strict pass drops as a stopword the lexical
 * pass also drops — a query whose only matches were stopwords can't sneak a
 * candidate in via the lexical path.
 */
const FALLBACK_STOPWORDS = new Set([...STOPWORDS, ...FALLBACK_ONLY_STOPWORDS]);

/**
 * Hard cap on candidates emitted for one query, across BOTH passes. Bounds the
 * `IN`-clause the graph lane issues so a long sentence can't fan out an
 * unbounded lookup. 12 comfortably covers a "person + place + topic"
 * People-Nearby query (only a handful of content tokens survive stopwording)
 * while capping the pathological run-on; retrieval on the benchmark corpus is
 * identical at 12, 24 and 48, so the extra width buys nothing.
 */
const MAX_QUERY_CANDIDATES = 12;

/**
 * Input clamp. Extraction is O(tokens) with a 3-token gram window, so without
 * this a pasted document — not a query — would set the bound on the recall hot
 * path. Worst measured cost at this length is ~107µs.
 */
const MAX_QUERY_CHARS = 4096;

/**
 * Token pattern for the lexical pass. ALPHANUMERIC-initial, not letter-initial:
 * on the benchmark corpus 19% of stored canonical names start with a digit or
 * mix digits into a short token (`s3`, `p99`, `1password`, `100ms`, `7am`) and
 * are unreachable at ANY casing under a letter-only initial. That buys zero
 * measured retrieval on this corpus — the names are there but no benchmark
 * query asks for them — so it ships on capability coverage, not on a number.
 *
 * U+2019 sits in the continuation class alongside U+0027 so a curly apostrophe
 * tokenizes identically to a straight one; otherwise "o’brien" splits into a
 * dropped 1-char token plus "brien".
 */
const TOKEN_REGEX = /[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu;

/**
 * Longest contiguous n-gram the lexical pass forms — mirrors the strict regex's
 * 3-capitalized-token cap, so a multi-word canonical like "san francisco bay"
 * is reachable but a whole clause is not.
 */
const MAX_FALLBACK_TOKENS = 3;

/**
 * Strip a trailing possessive: "sara's" → "sara", "boss'" → "boss".
 *
 * ADDITIVE — every caller emits the stem ALONGSIDE the original surface, never
 * instead of it. Substituting looks obviously right and is wrong: a possessive
 * form absolutely can be a stored canonical name. `normalizeEntityName` is
 * `trim().toLowerCase()` (db/entities/types.ts) — it does not strip
 * inflection — so whatever the write-side extractor emitted is stored verbatim,
 * and possessive-form proper nouns are an ordinary and large class of them
 * ("McDonald's", "Lowe's", "Trader Joe's", "Levi's", "Dunkin'"). Replacing the
 * token makes every one of those unreachable in BOTH tiers: the heuristic emits
 * "mcdonald", and the grounded tier probes "mcdonald" against an index whose
 * key is "mcdonald's" (a single-token name is indexed under itself verbatim,
 * and depluralize/pluralize produce "mcdonalds", never the apostrophe form).
 * The eval corpus cannot see this — none of its 353 stored canonicals contains
 * an apostrophe — so it is checked directly in the test suite instead.
 *
 * Emitting the stem as WELL is what folds contractions ("what's" → "what") back
 * within reach of the stopword sets, which is the job it was added for.
 *
 * The `>= 2` stem guard keeps "o'brien" whole: the lazy group would otherwise
 * happily cut it to "o". Multi-word candidates that don't END in an apostrophe
 * form ("sara's bakery") don't match the anchor and pass through untouched.
 */
function stripPossessive(token: string): string {
  const match = /^(.*?)['’](?:s)?$/u.exec(token);
  return match && match[1].length >= 2 ? match[1] : token;
}

/**
 * Fold U+2019 onto U+0027 for the retained possessive SURFACE only.
 *
 * The surface is emitted so it can match a stored possessive canonical, and a
 * stored one is written by the extraction LLM, which types a straight
 * apostrophe. Phone keyboards type a curly one. Without this fold the two
 * spellings are different candidates and "McDonald’s" as typed never matches
 * "mcdonald's" as stored — which would make the retained surface useless in
 * exactly the case it exists for.
 *
 * Applied ONLY to that extra candidate, never to the tokens the n-grams are
 * built from, so no existing candidate changes shape.
 */
function foldApostrophe(token: string): string {
  return token.includes("’") ? token.replace(/’/gu, "'") : token;
}

/**
 * Naive English de-pluralization. The stored side is LLM-written and
 * inconsistent about number ("keyboard" vs "keyboards" for the same concept),
 * so probing both directions costs two extra Map lookups and recovers the
 * mismatch. Returns `undefined` when the token is already singular-shaped.
 */
function depluralize(token: string): string | undefined {
  if (token.length > 4 && token.endsWith("ies")) return `${token.slice(0, -3)}y`;
  if (token.length > 4 && /(?:s|x|z|ch|sh)es$/u.test(token)) return token.slice(0, -2);
  if (token.length > 3 && token.endsWith("s") && !token.endsWith("ss")) return token.slice(0, -1);
  return undefined;
}

/** The other direction of {@link depluralize}. */
function pluralize(token: string): string | undefined {
  if (token.endsWith("s")) return undefined;
  if (/(?:s|x|z|ch|sh)$/u.test(token)) return `${token}es`;
  if (token.length > 2 && token.endsWith("y") && !/[aeiou]y$/u.test(token)) {
    return `${token.slice(0, -1)}ies`;
  }
  return `${token}s`;
}

/**
 * Resolve query tokens against the stored entity names — the grounded tier.
 *
 * REPLACES the heuristic rather than unioning with it. Unioning was measured:
 * it adds exactly zero gold recall and 3.6x the `IN`-clause width, because a
 * heuristic candidate that the vocabulary did not already find is by
 * construction a name the vault does not hold. The completeness argument in
 * `entityVocabulary.ts` is what turns that measurement into a guarantee, and
 * the property test in this file's test suite is what keeps it honest.
 *
 * NO query-side stopwording, deliberately. The heuristic needs
 * {@link FALLBACK_STOPWORDS} because it invents candidates and a common word
 * would invent a useless one; here a common word can only resolve to a name the
 * vault actually stores. The cost is that a generic token fans out to every
 * stored name containing it, which is real and is part of the lane-precision
 * trade this tier makes — bounded by {@link MAX_VOCABULARY_CANDIDATES}, and
 * measured on both sides in `entityLane.test.ts`, not argued away.
 *
 * Uses the SAME {@link TOKEN_REGEX} and {@link stripPossessive} as the lexical
 * pass. That is not stylistic: the guarantee above holds only while the two
 * tiers agree on what a token is.
 *
 * Scoring is `matched query tokens / tokens in the name`, so a fully covered
 * short name outranks a partially covered long one. The sort is a genuine total
 * order — canonical names are unique, so the third key never ties — which
 * matters because the enumeration order of the entity table is not stable and a
 * partial order would let it leak into the emitted candidates.
 */
function extractGroundedCandidates(query: string, vocabulary: EntityVocabulary): string[] {
  const clamped = query.length > MAX_QUERY_CHARS ? query.slice(0, MAX_QUERY_CHARS) : query;
  const queryTokens = new Set<string>();
  for (const raw of clamped.match(TOKEN_REGEX) ?? []) {
    const surface = normalizeEntityName(raw);
    // Probe the possessive surface as well as its stem: a stored canonical can
    // BE a possessive ("mcdonald's"), in which case the stem matches no index
    // key at all. See {@link stripPossessive}.
    for (const token of new Set([foldApostrophe(surface), stripPossessive(surface)])) {
      if (token.length < 2) continue;
      queryTokens.add(token);
      const singular = depluralize(token);
      if (singular) queryTokens.add(singular);
      const plural = pluralize(token);
      if (plural) queryTokens.add(plural);
    }
  }

  const matchedTokens = new Map<string, number>();
  for (const token of queryTokens) {
    for (const name of vocabulary.index.get(token) ?? []) {
      matchedTokens.set(name, (matchedTokens.get(name) ?? 0) + 1);
    }
  }

  return [...matchedTokens.entries()]
    .map(([name, matched]) => [name, matched / nameTokens(name).length] as const)
    .sort((a, b) => b[1] - a[1] || b[0].length - a[0].length || (a[0] < b[0] ? -1 : 1))
    .slice(0, MAX_VOCABULARY_CANDIDATES)
    .map(([name]) => name);
}

/**
 * Extract candidate entity names from a query. Returns canonical
 * (lowercased) forms, deduplicated and capped.
 *
 * With a `vocabulary`, query tokens are RESOLVED against the names the vault
 * actually holds ({@link extractGroundedCandidates}) and the heuristic below
 * does not run. Without one — no entity context, an unreadable entity table, a
 * fresh vault, a multi-user server, or the caller's kill switch — the heuristic
 * runs and is the floor. The grounded tier can replace the heuristic; it can
 * never degrade to nothing.
 *
 * Heuristic behaviour: both passes always run into one shared budget — see the
 * module comment for why there is no gate between them. Candidate ORDER is the
 * strict pass's survivors in document order, then the lexical pass's grams
 * tier-major; that ordering is only observable when the cap binds, and it is
 * what keeps a well-cased query's candidate prefix identical to what the strict
 * pass alone would have produced.
 *
 * An empty/whitespace query, or one whose every token is a stopword, returns an
 * empty array, and an empty array makes the rest of the W5 graph lane a no-op —
 * no `getMemoriesByEntityNamesOp`, no traversal.
 *
 * That is not the same as free on the default path, and the difference is worth
 * being precise about. `buildGraphLaneRanking` resolves the vocabulary BEFORE
 * calling this function, because the grounded tier can resolve names the
 * heuristic cannot and so extraction cannot run first. So a recall carrying an
 * `entityCtx` pays one indexed COUNT — plus, on the first call of a session or
 * any call after an entity write moved the version stamp, a raw enumeration and
 * an index build — before discovering the query yields no seeds. Only the
 * lane's own lookups are avoided. `entityVocabulary: "off"` skips the read
 * entirely.
 *
 * Pure, synchronous, total on both paths: it cannot throw and cannot block,
 * which is why the lane can call it before deciding whether to issue a lookup.
 */
export function extractQueryEntities(query: string, vocabulary?: EntityVocabulary): string[] {
  if (!query) return [];
  if (vocabulary) return extractGroundedCandidates(query, vocabulary);
  const clamped = query.length > MAX_QUERY_CHARS ? query.slice(0, MAX_QUERY_CHARS) : query;

  const out: string[] = [];
  const seen = new Set<string>();
  /** Record a candidate; returns false once the shared budget is spent. */
  const push = (candidate: string): boolean => {
    if (!candidate || seen.has(candidate)) return true;
    seen.add(candidate);
    out.push(candidate);
    return out.length < MAX_QUERY_CANDIDATES;
  };

  // ── Strict pass: capitalized noun phrases, in document order ──────────────
  for (const match of clamped.matchAll(ENTITY_REGEX)) {
    const surface = normalizeEntityName(match[0]);
    if (!surface) continue;
    // Emit both the multi-word canonical AND each token. The write side
    // (LLM-driven `entities[]`) is non-deterministic: the same name may
    // be stored as one entry ("Jean-Luc Picard") on one extraction and
    // as separate tokens (["Jean-Luc", "Picard"]) on another. Querying
    // for every variant recovers parity at modest cost.
    const candidates = surface.includes(" ") ? [surface, ...surface.split(/\s+/)] : [surface];
    for (const raw of candidates) {
      // Stopwording is decided on the STEM, and it drops both forms. That is
      // what keeps a contraction of a function word out: "what's" stems to
      // "what", which is a strict stopword, so neither spelling is emitted.
      // Testing the surface instead would let every "What's"/"Who's"/"Where's"
      // through, since `normalizeEntityName` keeps the apostrophe and the
      // narrow STOPWORDS set lists only the bare word.
      const stem = stripPossessive(raw);
      if (!stem) continue;
      if (STOPWORDS.has(stem)) continue;
      if (stem.split(/\s+/).every((w) => STOPWORDS.has(w))) continue;
      // Surface first, then stem. Order is observable under the cap, and the
      // surface is the literal text — the form that matches a stored possessive
      // canonical — so it keeps the higher-precision slot.
      for (const candidate of new Set([foldApostrophe(raw), stem])) {
        if (!candidate) continue;
        if (!push(candidate)) return out;
      }
    }
  }

  // ── Lexical pass: case-blind n-grams. ALWAYS runs ─────────────────────────
  // Normalized exactly like the write side ({@link normalizeEntityName},
  // types.ts) so lookup parity holds byte for byte.
  // Grams are formed over the POSSESSIVE-STEMMED tokens, so "what's" folds onto
  // "what" and is caught by the stopword sets. The un-stemmed surfaces are kept
  // alongside because a stored canonical can itself be a possessive
  // ("mcdonald's") — see {@link stripPossessive} — and are emitted as unigrams
  // only, since a stored MULTI-word name is normalized from its own text and
  // the stemmed gram already covers it.
  const rawTokens = (clamped.match(TOKEN_REGEX) ?? []).map((t) => normalizeEntityName(t));
  const tokens = rawTokens.map(stripPossessive);
  // Tier-major (n outer, position inner): the whole query is covered at n=1
  // before any bigram is formed, so a binding cap truncates the least-valuable
  // TIER rather than the tail of the SENTENCE. The obvious alternative —
  // walking positions outward and taking longest-first at each — is
  // depth-first: it perfects the first few start positions and can exhaust the
  // budget before ever reaching the tail, leaving a real entity at the end of a
  // dictated run-on with no lookup at all.
  for (let n = 1; n <= MAX_FALLBACK_TOKENS; n++) {
    for (let start = 0; start + n <= tokens.length; start++) {
      const gram = tokens.slice(start, start + n);
      // A single stopword or sub-2-char token disqualifies the whole gram —
      // strictly more aggressive than the strict pass's every-token test, which
      // is the point: this pass sees every word in the sentence. 2-char tokens
      // ("ai", "sf") are admitted on purpose: every 2-letter function word is
      // already stopworded, and the DB validates the rest.
      if (gram.some((t) => t.length < 2 || FALLBACK_STOPWORDS.has(t))) continue;
      if (!push(gram.join(" "))) return out;
      // Only reached when the STEM already cleared stopwording above, so a
      // function-word contraction ("what's" -> "what") never gets here.
      if (n === 1) {
        const surface = foldApostrophe(rawTokens[start]);
        if (surface !== gram[0] && surface.length >= 2 && !push(surface)) return out;
      }
    }
  }
  return out;
}
