const GENERIC_ENTITY_NAMES = new Set([
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
  if (generic.length === 0) return true;
  const titleShaped =
    generic.length === 1 &&
    tokens.some((token) => ARTICLES.has(token)) &&
    !tokens.some((token) => WEAK_MODIFIERS.has(token));
  return !titleShaped;
}

const ARTICLES = new Set(["the", "a", "an"]);

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
