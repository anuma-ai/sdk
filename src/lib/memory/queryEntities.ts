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

const ENTITY_REGEX = /\b\p{Lu}[\p{L}'-]{2,}(?:\s+\p{Lu}[\p{L}'-]+){0,2}\b/gu;

const FALLBACK_ONLY_STOPWORDS: string[] = (
  "a an and or but nor not if then than because so too also just very really " +
  "about above after again against all am any anyone anybody anything are " +
  "around as at be been being before behind below between both by can cannot " +
  "could currently did do does doing done down during each ever every " +
  "everybody everyone everything few find finds finding for from get gets " +
  "getting go goes going gone got had has have having he help her here hers " +
  "him his hmm i in into is it its knew know knows later like liked likes " +
  "live lived lives living look looked looking looks made make makes may me " +
  "meet meets might mine more most must my near need needed needs never " +
  "nobody nothing now of off okay on once only onto other our ours out over " +
  "own people person please recently said same say says see seen shall she " +
  "should since some somebody someone something soon still such talk tell " +
  "tells thank that the their theirs them there these they think thinks this " +
  "those thought through to today told tomorrow under until up us want wanted " +
  "wants was we went were which while will with without work worked working " +
  "works would yeah year years yep yesterday you your yours " +
  "aren't can't couldn't didn't doesn't don't hadn't hasn't haven't he's " +
  "how's i'd i'll i'm i've isn't it's let's she's shouldn't that's there's " +
  "they're they've wasn't we're we've weren't what's when's where's who's " +
  "why's won't wouldn't you'll you're you've"
).split(" ");

const FALLBACK_STOPWORDS = new Set([...STOPWORDS, ...FALLBACK_ONLY_STOPWORDS]);

const MAX_FALLBACK_CANDIDATES = 12;

const MAX_FALLBACK_TOKENS = 3;

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
    const candidates = surface.includes(" ") ? [surface, ...surface.split(/\s+/)] : [surface];
    for (const candidate of candidates) {
      if (!candidate) continue;
      if (STOPWORDS.has(candidate)) continue;
      if (candidate.split(/\s+/).every((w) => STOPWORDS.has(w))) continue;
      seen.add(candidate);
    }
  }
  if (hasMeaningfulCandidate(seen)) return [...seen];
  return [...new Set([...extractFallbackCandidates(query), ...seen])];
}

function extractFallbackCandidates(query: string): string[] {
  const tokens = (query.match(/\p{L}[\p{L}'-]*/gu) ?? []).map(normalizeEntityName);
  const out: string[] = [];
  const seen = new Set<string>();
  for (let n = 1; n <= MAX_FALLBACK_TOKENS; n++) {
    for (let start = 0; start + n <= tokens.length; start++) {
      const gram = tokens.slice(start, start + n);
      if (gram.some((t) => t.length < 2 || FALLBACK_STOPWORDS.has(t))) continue;
      const candidate = gram.join(" ");
      if (seen.has(candidate)) continue;
      seen.add(candidate);
      out.push(candidate);
      if (out.length >= MAX_FALLBACK_CANDIDATES) return out;
    }
  }
  return out;
}
