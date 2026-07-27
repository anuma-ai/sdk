/**
 * Heuristic query-entity extractor for the W5 graph recall lane.
 *
 * Given a user query like "What's Sara doing in Kyoto next week?" we
 * want to surface "Sara" and "Kyoto" so the graph lane can pull memories
 * sharing those entities. This runs at recall-time, not extraction-time
 * — the auto-extractor's full LLM-based entity extraction would be far
 * too expensive on every query, so we use a regex similar to the chat
 * client's presentation-layer extractor.
 *
 * Returns canonicalized (lowercased, trimmed) names so they can be
 * looked up directly via {@link getMemoriesByEntityNamesOp}, which
 * normalizes the same way at write time.
 *
 * Two-pass design (epic #719, item D4 — the W5 casing gap):
 *  1. STRICT pass — the capitalized-noun-phrase {@link ENTITY_REGEX} below.
 *     Precise, but an uppercase initial is mandatory, so it extracts NOTHING
 *     from an all-lowercase query. Dictated text, mobile keyboards with
 *     autocaps off, and the lowercase conversational phrasing the People-Nearby
 *     chat-discovery surface is built on ("is there anyone in san francisco who
 *     works in ai") all lose case — and used to silently get no graph lane.
 *  2. LOWERCASE FALLBACK — runs ONLY when the strict pass yields nothing
 *     MEANINGFUL, so any query that already extracts a real name is
 *     byte-for-byte unchanged (same candidates, same order, same single
 *     downstream lookup). It emits capped, aggressively-stopworded n-gram
 *     candidates regardless of case. "Nothing meaningful" rather than "nothing"
 *     because the strict regex matches any capitalized word: a query that is
 *     lowercase apart from a leading "Are"/"Does"/"What's" would otherwise be
 *     treated as a successful extraction of that function word and never fall
 *     back. See {@link hasMeaningfulCandidate}. When it does fall back, the two
 *     passes' results are UNIONED, never swapped — a strict survivor can be a
 *     real name that collides with a function word ("Will"), and the fallback
 *     would stopword it away. So this pass only ever widens the candidate set.
 *
 * Why the naive fix (just lowercasing the regex) is wrong, and why this isn't:
 * a case-insensitive regex would treat nearly every word as a candidate and
 * flood the lane with garbage lookups — the exact concern that deferred this in
 * #730. The fallback does NOT trust the regex for precision. It trusts the
 * DOWNSTREAM validator: {@link getMemoriesByEntityNamesOp} looks each candidate
 * up against stored canonical names and "names that don't exist as entities
 * contribute nothing" (one indexed `Q.oneOf`, early-empty when nothing matches).
 * So a non-entity survivor costs a single IN-clause slot and returns zero rows
 * rather than polluting recall, while a real lowercase entity — previously
 * dropped — is recovered. Precision is defended by aggressive stopwording + a
 * hard candidate cap + the stored-name validation, not by casing.
 *
 * Limitations (acceptable for v1):
 *  - The strict pass only catches capitalized noun phrases (≥3 chars for the
 *    first word), and its leading `\b` is ASCII-only, so a name with a
 *    non-ASCII INITIAL ("Łukasz") isn't matched by the strict pass at all — the
 *    fallback recovers it. Non-ASCII letters in the body ("São Paulo") work in
 *    both passes.
 *  - Stopwords are filtered on BOTH passes; the fallback filters strictly more
 *    aggressively (a wider union set, and any-token-stopword rejection vs the
 *    strict pass's every-token test), since it sees every word in the sentence
 *    rather than just capitalized phrases.
 *  - Won't disambiguate "Sara" → "Sara Park" (the alias-coalescing pass
 *    in the chat-side graph builder is presentation-layer; the storage
 *    layer keeps both as separate canonicals). Caller can pass both
 *    forms by extracting all matches.
 *
 * Replace with an LLM-based extractor under `budget=high` in a later pass.
 */

import { normalizeEntityName } from "../db/entities/types.js";

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
 * Stopwords that apply ONLY to the lowercase fallback pass — the strict pass's
 * {@link STOPWORDS} set stays byte-identical so already-extracting queries are
 * unperturbed. The fallback sees EVERY lowercase token in a sentence, not just
 * capitalized noun phrases, so it needs a far wider net: pronouns, auxiliaries,
 * prepositions, conjunctions, deictics, and the conversational filler the
 * People-Nearby discovery surface is phrased in ("is there anyone who…",
 * "where is everyone going"). This aggressive filtering — NOT the regex — is
 * the fallback's precision guard, so when a common word slips through and a
 * test flags it, the fix is to ADD the word here, never to weaken the
 * downstream assertion. Overlaps with STOPWORDS are harmless (the Set union
 * dedupes them).
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
  // They therefore reach BOTH passes — as fallback candidates, and (more
  // importantly) as strict-pass survivors that used to suppress the fallback
  // entirely. See {@link hasMeaningfulCandidate}.
  "aren't can't couldn't didn't doesn't don't hadn't hasn't haven't he's " +
  "how's i'd i'll i'm i've isn't it's let's she's shouldn't that's there's " +
  "they're they've wasn't we're we've weren't what's when's where's who's " +
  "why's won't wouldn't you'll you're you've"
).split(" ");

/**
 * The fallback's effective stopword set: the strict {@link STOPWORDS} unioned
 * with {@link FALLBACK_ONLY_STOPWORDS}. Superset of STOPWORDS by construction,
 * so anything the strict pass drops as a stopword the fallback also drops —
 * a query whose only matches were stopwords can't sneak a candidate in via the
 * fallback path.
 */
const FALLBACK_STOPWORDS = new Set([...STOPWORDS, ...FALLBACK_ONLY_STOPWORDS]);

/**
 * Hard cap on how many candidates the fallback emits for one query. Bounds the
 * `IN`-clause the graph lane issues so a long lowercase sentence can't fan out
 * an unbounded lookup. 12 comfortably covers a "person + place + topic"
 * People-Nearby query (only a handful of content tokens survive stopwording)
 * while capping the pathological run-on.
 */
const MAX_FALLBACK_CANDIDATES = 12;

/**
 * Longest contiguous n-gram the fallback forms — mirrors the strict regex's
 * 3-capitalized-token cap, so a multi-word canonical like "san francisco bay"
 * is reachable but a whole clause is not.
 */
const MAX_FALLBACK_TOKENS = 3;

/**
 * Whether a strict-pass result carries enough identity to count as a real
 * extraction — the condition that decides if the lowercase fallback is needed.
 *
 * The naive test is "did the strict pass emit anything", but that conflates
 * "the regex matched" with "extraction worked". {@link ENTITY_REGEX} matches
 * ANY capitalized token of three or more characters, and the strict
 * {@link STOPWORDS} set is deliberately narrow, so a sentence-initial function
 * word — "Are", "Does", "Can", "Someone", "What's" — matches, survives, and
 * lands in the result. A query that is lowercase apart from that leading
 * capital would then skip the fallback, look the function word up, match no
 * stored canonical name, and leave the lane empty. That is precisely the
 * failure the fallback exists to prevent, on precisely the question-initial
 * phrasing the People-Nearby discovery surface is built on ("Are there any
 * designers in san francisco?").
 *
 * {@link FALLBACK_STOPWORDS} is the right oracle for "carries identity"
 * because it is the set the fallback itself trusts for precision: a token the
 * fallback would refuse to emit cannot be evidence that emitting was
 * unnecessary. Using it here also keeps the two passes' notions of "function
 * word" from drifting apart — the narrow set stays narrow for the strict
 * pass's own filtering, and the wide set governs the gate.
 *
 * Note this only decides WHETHER to fall back. A strict pass that clears this
 * bar still returns its own candidates verbatim, so every query that extracted
 * before still extracts the same names in the same order.
 */
function hasMeaningfulCandidate(candidates: Iterable<string>): boolean {
  for (const candidate of candidates) {
    if (!candidate.split(/\s+/).every((token) => FALLBACK_STOPWORDS.has(token))) {
      return true;
    }
  }
  return false;
}

/**
 * Extract candidate entity names from a query. Returns canonical
 * (lowercased) forms, deduplicated.
 *
 * Runs the strict capitalized-noun-phrase pass first; if it finds at least one
 * entity that isn't a bare function word, the result is returned verbatim —
 * identical to the pre-fallback behavior, so the hot path for well-cased
 * queries is unchanged and never pays for (nor is reordered by) the fallback.
 * ONLY when the strict pass comes back empty, or comes back holding nothing but
 * function words, does the lowercase {@link extractFallbackCandidates} pass run
 * ({@link hasMeaningfulCandidate}) — and its result is UNIONED with whatever the
 * strict pass held, so falling back can never lose a candidate the strict pass
 * already found.
 *
 * An empty/whitespace query, or an all-lowercase one whose every token is a
 * stopword, returns an empty array — and an empty array makes the W5 graph lane
 * a no-op (zero DB lookups in {@link buildGraphLaneRanking} /
 * {@link traverseGraphLane}), so such a query stays free. A stopword-only query
 * that happens to CAPITALIZE one of those stopwords ("Are there any of them")
 * is the one exception: the strict regex matches it, the union preserves it, and
 * the lane spends a single indexed lookup that resolves to zero rows. That is
 * the price of never dropping a real name that collides with a function word.
 */
export function extractQueryEntities(query: string): string[] {
  if (!query) return [];
  const matches = query.matchAll(ENTITY_REGEX);
  const seen = new Set<string>();
  for (const match of matches) {
    const surface = normalizeEntityName(match[0]);
    if (!surface) continue;
    // Emit both the multi-word canonical AND each token. The write side
    // (LLM-driven `entities[]`) is non-deterministic: the same name may
    // be stored as one entry ("Jean-Luc Picard") on one extraction and
    // as separate tokens (["Jean-Luc", "Picard"]) on another. Querying
    // for every variant recovers parity at modest cost.
    const candidates = surface.includes(" ") ? [surface, ...surface.split(/\s+/)] : [surface];
    for (const candidate of candidates) {
      if (!candidate) continue;
      if (STOPWORDS.has(candidate)) continue;
      if (candidate.split(/\s+/).every((w) => STOPWORDS.has(w))) continue;
      seen.add(candidate);
    }
  }
  // Strict pass hit something MEANINGFUL → return it verbatim (byte-identical
  // to the pre-fallback behavior). A pass whose every survivor is a function
  // word counts as empty: it proves the regex fired, not that extraction
  // worked. See {@link hasMeaningfulCandidate}.
  if (hasMeaningfulCandidate(seen)) return [...seen];
  // Otherwise fall back — but UNION the strict survivors back in rather than
  // discarding them. A survivor can be a function word that is also a real name
  // ("Will", "Grace"), and the fallback stopwords it exactly, so returning the
  // fallback alone would DROP a lane the pre-fallback code had: "Is Will here"
  // extracted `["will"]` before and would extract `[]` after. Unioning keeps
  // this pass monotonic — it can only widen the candidate set, never narrow it —
  // at a cost of one IN-clause slot for a term the stored-name lookup resolves
  // to zero rows. Fallback candidates come first; both call sites treat the
  // result as a set, so the order matters only under the downstream cap.
  return [...new Set([...extractFallbackCandidates(query), ...seen])];
}

/**
 * Lowercase recall net: emit candidate entity names from a query the strict
 * pass couldn't touch (no capitalized initial, or a non-ASCII initial the
 * ASCII `\b` anchor rejects). Precision here is deliberately traded for recall
 * because the DOWNSTREAM lookup is the real filter — a candidate that isn't a
 * stored canonical entity name matches no rows in
 * {@link getMemoriesByEntityNamesOp} and contributes nothing, so emitting a few
 * non-entities costs one IN-clause slot each, whereas missing a real lowercase
 * entity silently kills the whole lane (the bug this fixes).
 *
 * Rules, in priority order:
 *  - Tokenize on letters (plus intra-word apostrophes/hyphens, so "o'brien" and
 *    "jean-luc" stay whole) and normalize each token exactly like the write
 *    side ({@link normalizeEntityName}, types.ts) so lookup parity holds.
 *  - Form contiguous n-grams TIER-MAJOR: every 1-token gram (in position order),
 *    then every 2-token gram, then every 3-token gram, up to
 *    {@link MAX_FALLBACK_TOKENS}. Tier-major matters only when the cap binds,
 *    and it is what makes truncation graceful: the budget is spent covering the
 *    WHOLE query at the cheapest tier before any longer gram is formed, so a
 *    real entity late in a run-on sentence still gets a lookup. The obvious
 *    alternative — walking positions outward and taking longest-first at each —
 *    is depth-first: it perfects the first few start positions and can exhaust
 *    the budget before ever reaching the tail, leaving those tokens with no
 *    lookup at all. Dropping the trigram tier is a much cheaper loss than
 *    dropping the back half of the sentence.
 *  - Reject any gram that contains a {@link FALLBACK_STOPWORDS} token or a
 *    sub-2-char token. 2-char tokens ("ai", "sf") are admitted on purpose: the
 *    2-letter function words are all stopworded, and the DB validates the rest.
 *  - Dedupe, and hard-stop at {@link MAX_FALLBACK_CANDIDATES} so a run-on
 *    lowercase sentence can't issue an unbounded set of lookups.
 *
 * Returns candidates in emission order (tier-major: all 1-token grams, then all
 * 2-token, then all 3-token; position order within a tier). That order is
 * load-bearing only under the cap — both call sites treat the result as a set
 * (an indexed `Q.oneOf` lookup, then a shared-entity-count ranking), so nothing
 * downstream reads position. Under the cap the order decides which candidates
 * survive, and tier-major guarantees no part of the query goes unlooked-up
 * while a longer gram elsewhere holds a slot.
 */
function extractFallbackCandidates(query: string): string[] {
  // Letter-initial tokens; intra-word ' and - kept whole. Normalized to match
  // the stored canonical form (lower+trim) so the downstream lookup is parity.
  const tokens = (query.match(/\p{L}[\p{L}'-]*/gu) ?? []).map(normalizeEntityName);
  const out: string[] = [];
  const seen = new Set<string>();
  // Tier-major (n outer, position inner): the whole query is covered at n=1
  // before any bigram is formed, so a binding cap truncates the least-valuable
  // TIER rather than the tail of the SENTENCE.
  for (let n = 1; n <= MAX_FALLBACK_TOKENS; n++) {
    for (let start = 0; start + n <= tokens.length; start++) {
      const gram = tokens.slice(start, start + n);
      // A single stopword or sub-2-char token disqualifies the whole gram —
      // strictly more aggressive than the strict pass's every-token test, which
      // is the point: the fallback is the precision-sensitive path.
      if (gram.some((t) => t.length < 2 || FALLBACK_STOPWORDS.has(t))) continue;
      const candidate = gram.join(" ");
      if (seen.has(candidate)) continue;
      seen.add(candidate);
      out.push(candidate);
      // Hard cap: stop the moment the budget is full, mid-tier included.
      if (out.length >= MAX_FALLBACK_CANDIDATES) return out;
    }
  }
  return out;
}
