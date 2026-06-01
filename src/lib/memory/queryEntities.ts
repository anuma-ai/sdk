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
 * Limitations (acceptable for v1):
 *  - Only catches capitalized noun phrases (≥3 chars per word). "SF" is
 *    skipped; "kyoto" without capitalization is skipped. The auto-extractor
 *    LLM normalizes user phrasing before storage, so most stored entity
 *    names are properly capitalized — but spoken queries can lose case.
 *  - Common stopwords ("User", days, months) are filtered.
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
 * Extract candidate entity names from a query. Returns canonical
 * (lowercased) forms, deduplicated. Empty queries or queries without
 * any capitalized noun phrases return an empty array.
 */
export function extractQueryEntities(query: string): string[] {
  if (!query) return [];
  const matches = query.matchAll(ENTITY_REGEX);
  const seen = new Set<string>();
  for (const match of matches) {
    const canonical = normalizeEntityName(match[0]);
    if (!canonical) continue;
    if (STOPWORDS.has(canonical)) continue;
    if (canonical.split(/\s+/).every((w) => STOPWORDS.has(w))) continue;
    seen.add(canonical);
  }
  return [...seen];
}
