import { PII_PATTERNS } from "../pii/patterns.js";
import type { PiiRedactor } from "../pii/redactor.js";

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

const MAX_ENTITY_NAME_LENGTH = 120;
const MAX_ENTITY_NAME_TOKENS = 11;

const PREFIXED_HEX = /^0x[0-9a-f]{16,}$/i;
const BARE_HEX = /^[0-9a-f]{32,}$/i;
const BASE58_STRING = /^[1-9A-HJ-NP-Za-km-z]{32,88}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TRUNCATED_ID = /^[0-9a-z]{3,}(?:…|\.{2,3})[0-9a-z]{3,}$/i;
const KEY_SEGMENT_MIN_LENGTH = 16;
const LONG_DIGIT_RUN = /^\d{6,}$/;
const CURRENCY_MARKED = /[$€£¥₹₿]\d|\d[$€£¥₹₿]/;

const NUMERIC_TOKEN =
  /^[~≈+\-−]?(?:us\$|[$€£¥₹₿])?\d(?:[\d,.]*\d)?(?:k|mm|m|bn|b|t|x|%|[$€£¥₹₿])?$/i;
const PLAIN_YEAR = /^(?:1\d{3}|20\d{2})$/;
const SUFFIXED_NAME = /^\d*[1-9][kmb]$/i;
const BARE_INTEGER = /^\d+$/;
const TICKER = /^\$?[A-Z]{2,6}$/;
const DETACHED_CURRENCY_SYMBOL = /(^|\s)([$€£¥₹₿])\s+(?=\d)|(\d)\s+([$€£¥₹₿])(?=\s|$)/gu;
const LEADING_PUNCTUATION = /^[^\p{L}\p{N}$€£¥₹₿~≈+\-−]+/u;
const TRAILING_KEPT_CHARACTER = /[\p{L}\p{N}$€£¥₹₿%]/u;

const LEADING_CURRENCY_CODES = new Set(["usd", "eur", "gbp", "jpy", "cad", "aud", "chf", "cny"]);

const QUANTITY_UNIT_WORDS = new Set([
  "usd",
  "usdc",
  "usdt",
  "eur",
  "gbp",
  "sol",
  "eth",
  "btc",
  "dollar",
  "dollars",
  "euro",
  "euros",
  "buck",
  "bucks",
  "k",
  "thousand",
  "million",
  "billion",
  "trillion",
  "share",
  "shares",
  "token",
  "tokens",
  "coin",
  "coins",
  "unit",
  "units",
  "position",
  "balance",
  "stake",
  "holdings",
]);

const AMOUNT_WORDS = new Set([...QUANTITY_UNIT_WORDS, "percent", "of"]);

const NAME_PII_CATEGORIES = new Set<string>(["EMAIL", "PHONE", "SSN", "CREDIT_CARD"]);
const NAME_PII_PATTERNS = PII_PATTERNS.filter(
  (pattern) => NAME_PII_CATEGORIES.has(pattern.category) && pattern.context === undefined
);

const KEPT_PLACEHOLDER_CATEGORIES = new Set(["PERSON", "LOCATION", "ORG"]);
const PLACEHOLDER_TOKEN = /\b([A-Za-z]+(?:_[A-Za-z]+)*)_\d+\b/g;

function trimPunctuation(token: string): string {
  const chars = Array.from(token.replace(LEADING_PUNCTUATION, ""));
  let end = chars.length;
  while (end > 0 && !TRAILING_KEPT_CHARACTER.test(chars[end - 1])) end--;
  return chars.slice(0, end).join("");
}

function hasLetterAndDigit(text: string): boolean {
  return /\p{L}/u.test(text) && /\p{N}/u.test(text);
}

function isIdentifierToken(token: string): boolean {
  if (PREFIXED_HEX.test(token) || BARE_HEX.test(token) || BASE58_STRING.test(token)) return true;
  if (UUID.test(token) || LONG_DIGIT_RUN.test(token)) return true;
  if (TRUNCATED_ID.test(token) && hasLetterAndDigit(token)) return true;
  return token
    .split(/[-_.]/)
    .some((segment) => segment.length >= KEY_SEGMENT_MIN_LENGTH && hasLetterAndDigit(segment));
}

function containsStructuredPii(name: string): boolean {
  return NAME_PII_PATTERNS.some((pattern) =>
    (name.match(pattern.regex) ?? []).some((match) => pattern.validate?.(match) ?? true)
  );
}

function isAmountUnitToken(token: string): boolean {
  return NUMERIC_TOKEN.test(token) || TICKER.test(token) || AMOUNT_WORDS.has(token.toLowerCase());
}

function isAmountWordOrNumber(token: string): boolean {
  return NUMERIC_TOKEN.test(token) || AMOUNT_WORDS.has(token.toLowerCase());
}

function isAmount(tokens: readonly string[]): boolean {
  const start = LEADING_CURRENCY_CODES.has(tokens[0]?.toLowerCase() ?? "") ? 1 : 0;
  const first = tokens[start];
  if (first === undefined || !NUMERIC_TOKEN.test(first)) return false;
  const units = tokens.slice(start + 1);
  if (start === 0 && units.length === 0)
    return !PLAIN_YEAR.test(first) && !SUFFIXED_NAME.test(first);
  if (!units.every(isAmountUnitToken)) return false;
  return start === 1 || !BARE_INTEGER.test(first) || units.some(isAmountWordOrNumber);
}

function hasQuantityPhrase(tokens: readonly string[]): boolean {
  return tokens.some(
    (token, i) =>
      NUMERIC_TOKEN.test(token) && QUANTITY_UNIT_WORDS.has(tokens[i + 1]?.toLowerCase() ?? "")
  );
}

export function isIdentifierOrAmountEntityName(name: string): boolean {
  const trimmed = name.trim();
  if (trimmed.length > MAX_ENTITY_NAME_LENGTH) return true;
  if (containsStructuredPii(trimmed)) return true;
  const tokens = trimmed
    .replace(DETACHED_CURRENCY_SYMBOL, "$1$2$3$4")
    .split(/\s+/)
    .map(trimPunctuation)
    .filter((token) => token.length > 0);
  if (tokens.length === 0) return false;
  if (tokens.length > MAX_ENTITY_NAME_TOKENS) return true;
  if (tokens.some(isIdentifierToken)) return true;
  if (tokens.some((token) => CURRENCY_MARKED.test(token))) return true;
  return isAmount(tokens) || hasQuantityPhrase(tokens);
}

export function restoreEntityName(
  name: string,
  redactor: Pick<PiiRedactor, "restoreForStorage">
): string | null {
  for (const [token, category] of name.matchAll(PLACEHOLDER_TOKEN)) {
    if (KEPT_PLACEHOLDER_CATEGORIES.has(category.toUpperCase())) continue;
    if (redactor.restoreForStorage(token).text !== token) return null;
  }
  const restored = redactor.restoreForStorage(name);
  return restored.unresolved || isIdentifierOrAmountEntityName(restored.text)
    ? null
    : restored.text;
}
