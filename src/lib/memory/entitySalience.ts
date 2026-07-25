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
  // Plurals are listed explicitly rather than stemmed: naive `s`-stripping
  // would fold real titles into generics ("The Times" → "time"). Only plurals
  // that are junk as topics in their own right belong here — note the absence
  // of "times", "places", and anything else that reads as a name.
  "days",
  "weeks",
  "weekends",
  "months",
  "years",
  "rooms",
  "offices",
  "houses",
  "apartments",
  "stores",
  "shops",
  "hotels",
  "meetings",
  "calls",
  "appointments",
  "reminders",
  "events",
  "birthdays",
  "trips",
  "vacations",
  "holidays",
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
 * One distinctive token is enough to keep a phrase ("Chicago Marathon", "Anuma
 * offsite", "Blue Bottle on Valencia"), mirroring the multi-word rule the
 * client's heuristic extractor already uses. Tokens that are neither generic nor
 * a modifier count as distinctive, so `Next.js` survives on its "js".
 *
 * The one subtlety is the article guard. An article plus a single generic noun
 * reads as a TITLE, not a calendar leak — "The Office" is a real product entity
 * (and a gold case in `test/memory/src/topic/dataset.ts`), so dropping it would
 * both lose the link and make the version-3 re-extraction sweep delete an
 * existing valid one. Articles therefore protect a lone noun, while possessives,
 * temporal qualifiers and prepositions do not: "next week", "my office" and
 * "work from home" are still generic. The cost is that "the meeting" survives —
 * a cheap miss, where dropping "The Office" would be an expensive one.
 */
export function isGenericEntityName(name: string): boolean {
  const tokens = name
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((token) => token.length > 0);
  if (tokens.length === 0) return true;

  const distinctive = tokens.filter(
    (token) =>
      !GENERIC_ENTITY_NAMES.has(token) && !ARTICLES.has(token) && !WEAK_MODIFIERS.has(token)
  );
  if (distinctive.length > 0) return false;

  const generic = tokens.filter((token) => GENERIC_ENTITY_NAMES.has(token));
  // Nothing but modifiers ("the", "at", a bare "A") — content-free, no entity
  // here at all. This also drops the rare abbreviation spelled like a function
  // word ("ON" for Ontario); single letters that aren't function words ("C",
  // "X", "R") are distinctive and survive above.
  if (generic.length === 0) return true;
  const titleShaped =
    generic.length === 1 &&
    tokens.some((token) => ARTICLES.has(token)) &&
    !tokens.some((token) => WEAK_MODIFIERS.has(token));
  return !titleShaped;
}

/** Title-forming — these protect a single generic noun ("The Office"). */
const ARTICLES = new Set(["the", "a", "an"]);

/**
 * Never distinctive and never title-forming: possessives, temporal qualifiers,
 * and the prepositions/conjunctions that glue generic nouns together ("meeting
 * at home", "work from home", "home and work").
 */
const WEAK_MODIFIERS = new Set([
  "my",
  "our",
  "their",
  "his",
  "her",
  "its",
  "this",
  "that",
  "next",
  "last",
  "upcoming",
  "every",
  "at",
  "in",
  "on",
  "of",
  "for",
  "with",
  "from",
  "to",
  "by",
  "and",
  "or",
]);
