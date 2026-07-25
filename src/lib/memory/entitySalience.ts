/**
 * Salience gate for LLM-extracted entity names.
 *
 * Both extraction prompts tell the model to emit only NAMED entities and skip
 * generic nouns, and both models still leak the occasional bare common noun —
 * a calendar block titled "Home" becomes a "Home" topic, which reads as a
 * keyword tag rather than a topic (client issue #5135). Prompt wording alone
 * can't be relied on, so `parseEntities` drops the leaks deterministically.
 *
 * Scope is deliberately narrow: time words, generic containers/venues, and
 * generic calendar-activity nouns — terms that carry no identity, so nothing
 * links to them meaningfully in either the Topics UI or the W5 graph lane.
 *
 * Just as deliberately NOT here, because they are weak-looking but genuinely
 * useful connectors in a personal memory graph — do not "complete" this list
 * with them:
 *  - relationship words ("mom", "wife", "boss") — real hubs; a user's memories
 *    about their mother should share a node.
 *  - foods, drinks, and interests ("coffee", "matcha", "fitness", "spanish") —
 *    exactly the durable-preference material the extractor exists to capture,
 *    and "concept" is a first-class entity kind.
 *  - anything that is also a common proper noun ("may", "will", "summer" as
 *    names). Months and weekdays are the one exception: as topics they are
 *    pure date noise, and the same call is already made in the client's
 *    heuristic extractor.
 */

const GENERIC_ENTITY_NAMES = new Set([
  // Relative and absolute time
  "today",
  "tomorrow",
  "yesterday",
  "tonight",
  "morning",
  "afternoon",
  "evening",
  "night",
  "day",
  "date",
  "time",
  "week",
  "weekend",
  "weekday",
  "month",
  "year",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
  // Generic containers and venues — the named ones ("Blue Bottle on Valencia",
  // "Stanford") are unaffected because they are not bare tokens.
  "home",
  "house",
  "apartment",
  "room",
  "office",
  "work",
  "workplace",
  "school",
  "gym",
  "store",
  "shop",
  "hospital",
  "airport",
  "hotel",
  "city",
  "town",
  "country",
  "place",
  // Generic calendar entries — "Chicago Marathon" survives, "meeting" doesn't.
  "meeting",
  "call",
  "appointment",
  "reminder",
  "event",
  "birthday",
  "breakfast",
  "lunch",
  "dinner",
  "brunch",
  "vacation",
  "holiday",
  "trip",
  // Meta / filler the models occasionally echo back as an entity
  "user",
  "assistant",
  "memory",
  "memories",
  "note",
  "notes",
  "thing",
  "things",
  "stuff",
  "something",
  "someone",
  "anything",
  "everything",
  "none",
  "other",
  "misc",
  "general",
  "unknown",
]);

/**
 * True when an entity name is too generic to be a topic.
 *
 * Single tokens are matched against {@link GENERIC_ENTITY_NAMES}. A multi-token
 * name is dropped only when EVERY token is generic ("the meeting", "home
 * office") — one distinctive token is enough to make the phrase a real entity
 * ("Chicago Marathon", "Anuma offsite"), mirroring the multi-word rule the
 * client's heuristic extractor already uses.
 */
export function isGenericEntityName(name: string): boolean {
  const tokens = name
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((token) => token.length > 0);
  if (tokens.length === 0) return true;
  // Determiners and temporal qualifiers can't rescue a phrase from being
  // all-generic ("the meeting", "next week"), so they don't count as
  // distinctive tokens. They are still only IGNORED, never treated as generic
  // themselves — "Next.js" keeps its distinctive "js".
  const meaningful = tokens.filter((token) => !WEAK_MODIFIERS.has(token));
  const judged = meaningful.length > 0 ? meaningful : tokens;
  return judged.every((token) => GENERIC_ENTITY_NAMES.has(token));
}

const WEAK_MODIFIERS = new Set([
  "the",
  "a",
  "an",
  "my",
  "our",
  "their",
  "his",
  "her",
  "its",
  "this",
  "next",
  "last",
  "upcoming",
  "every",
]);
