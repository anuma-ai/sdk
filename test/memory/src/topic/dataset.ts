/**
 * Topic-extraction quality corpus.
 *
 * Unlike the extraction corpus (which scores entities riding along on
 * `extractFacts`), this targets the standalone topic pass
 * `extractEntitiesForMemories`: each item is a SAVED-MEMORY string (the shape
 * the topic pass actually runs on), paired with its COMPLETE gold entity set.
 *
 * "Complete" is the whole point: every named entity in `content` is labeled, so
 * an extracted entity that matches no gold is a genuine FALSE POSITIVE. That
 * makes precision + junk-rate measurable — the dimensions the recall-only proxy
 * couldn't see. Empty `gold` ([]) is a deliberate junk trap: generic nouns and
 * no-entity memories must yield nothing.
 *
 * Kinds follow ENTITY_KINDS: person | organization | place | event | product |
 * thing | concept | other. `concept` (named skills/topics/languages) is the
 * subtle boundary — "Spanish" is a concept entity, "cooking" is a generic noun
 * to skip. Debatable kind calls are flagged in comments; kind accuracy is
 * scored separately from coverage so a kind quibble never hides a coverage win.
 */
import type { EntityKind } from "../../../../src/lib/db/entities/types.js";

export interface GoldEntity {
  name: string;
  kind: EntityKind;
}

export type TopicCategory =
  | "single" // one clear named entity
  | "multi" // several named entities, mixed kinds
  | "concept" // named concept/skill/language — keep, don't skip as generic
  | "messy" // realistic longer memory with entities + generic-noun distractors
  | "kind-hard" // entity is obvious; the KIND is the challenge
  | "generic-skip" // only generic nouns — gold is empty (over-extraction trap)
  | "negative"; // nothing nameable — gold is empty (junk trap)

export interface TopicCase {
  id: string;
  category: TopicCategory;
  content: string;
  /** COMPLETE set of named entities in `content`. [] = must extract nothing. */
  gold: GoldEntity[];
}

export const TOPIC_CASES: TopicCase[] = [
  // ---- single ----
  {
    id: "s-wife",
    category: "single",
    content: "User's wife is named Sara.",
    gold: [{ name: "Sara", kind: "person" }],
  },
  {
    id: "s-employer",
    category: "single",
    content: "User works at Stripe.",
    gold: [{ name: "Stripe", kind: "organization" }],
  },
  {
    id: "s-city",
    category: "single",
    content: "User lives in Austin.",
    gold: [{ name: "Austin", kind: "place" }],
  },
  {
    id: "s-tool",
    category: "single",
    content: "User uses Notion every day for notes.",
    gold: [{ name: "Notion", kind: "product" }],
  },

  // ---- multi ----
  {
    id: "m-manager-move",
    category: "multi",
    content: "User's manager Priya moved from Google to Airbnb last year.",
    gold: [
      { name: "Priya", kind: "person" },
      { name: "Google", kind: "organization" },
      { name: "Airbnb", kind: "organization" },
    ],
  },
  {
    id: "m-marathon",
    category: "multi",
    content: "User is training for the Boston Marathon with their friend Dev.",
    gold: [
      { name: "Boston Marathon", kind: "event" },
      { name: "Dev", kind: "person" },
    ],
  },
  {
    id: "m-dune",
    category: "multi",
    content: "User read Dune and is now watching the Denis Villeneuve adaptation.",
    gold: [
      { name: "Dune", kind: "product" },
      { name: "Denis Villeneuve", kind: "person" },
    ],
  },
  {
    id: "m-tools-switch",
    category: "multi",
    content: "User switched their community from Slack to Discord.",
    gold: [
      { name: "Slack", kind: "product" },
      { name: "Discord", kind: "product" },
    ],
  },

  // ---- concept (named concept/skill/language — KEEP) ----
  {
    id: "c-spanish",
    category: "concept",
    content: "User is learning Spanish and practices daily.",
    gold: [{ name: "Spanish", kind: "concept" }],
  },
  {
    id: "c-ml",
    category: "concept",
    content: "User is diving deep into machine learning and reinforcement learning.",
    gold: [
      { name: "machine learning", kind: "concept" },
      { name: "reinforcement learning", kind: "concept" },
    ],
  },

  // ---- messy / realistic ----
  {
    id: "x-report-pg",
    category: "messy",
    content:
      "User's report Marcus is struggling with the migration to Postgres, and they're pairing on it before the quarterly review.",
    // "migration" and "quarterly review" are generic (unnamed) → not entities.
    gold: [
      { name: "Marcus", kind: "person" },
      { name: "Postgres", kind: "product" },
    ],
  },
  {
    id: "x-tahoe",
    category: "messy",
    content:
      "User spent the weekend hiking near Lake Tahoe with Jordan, then drove back to Sacramento on Sunday.",
    // "weekend", "dog", "Sunday" → not named entities.
    gold: [
      { name: "Lake Tahoe", kind: "place" },
      { name: "Jordan", kind: "person" },
      { name: "Sacramento", kind: "place" },
    ],
  },
  {
    id: "x-blocked",
    category: "messy",
    content:
      "User said the Helix project is blocked on the Twilio integration until legal signs off.",
    // "integration", "legal" → generic. "Helix" internal project name → product-ish.
    gold: [
      { name: "Helix", kind: "product" },
      { name: "Twilio", kind: "organization" },
    ],
  },
  {
    id: "x-daughter-school",
    category: "messy",
    content: "User's daughter Mia just started at Lincoln Elementary.",
    gold: [
      { name: "Mia", kind: "person" },
      { name: "Lincoln Elementary", kind: "organization" },
    ],
  },

  // ---- kind-hard (entity clear, kind is the test) ----
  {
    id: "k-peloton",
    category: "kind-hard",
    content: "User just bought a Peloton.",
    gold: [{ name: "Peloton", kind: "product" }],
  },
  {
    id: "k-warriors",
    category: "kind-hard",
    content: "User is a huge fan of the Warriors.",
    gold: [{ name: "Warriors", kind: "organization" }],
  },
  {
    id: "k-louvre",
    category: "kind-hard",
    content: "User visited the Louvre in Paris.",
    gold: [
      { name: "Louvre", kind: "place" },
      { name: "Paris", kind: "place" },
    ],
  },
  {
    id: "k-figma",
    category: "kind-hard",
    content: "User uses Figma at work.",
    gold: [{ name: "Figma", kind: "product" }],
  },
  {
    id: "k-startup",
    category: "kind-hard",
    content: "User's company Kestrel raised a Series A.",
    gold: [{ name: "Kestrel", kind: "organization" }],
  },
  {
    id: "k-revolution",
    category: "kind-hard",
    content: "User is reading about the French Revolution.",
    gold: [{ name: "French Revolution", kind: "event" }],
  },
  {
    id: "k-japan",
    category: "kind-hard",
    content: "User mentioned they might visit Japan someday.",
    gold: [{ name: "Japan", kind: "place" }],
  },
  {
    id: "k-office",
    category: "kind-hard",
    content: "User quoted a line from The Office during the call.",
    gold: [{ name: "The Office", kind: "product" }],
  },

  // ---- generic-skip (only generic nouns → gold empty) ----
  {
    id: "g-tea",
    category: "generic-skip",
    content: "User prefers tea over coffee in the mornings.",
    gold: [],
  },
  {
    id: "g-apartment",
    category: "generic-skip",
    content: "User is looking for a new apartment with more natural light.",
    gold: [],
  },
  {
    id: "g-shellfish",
    category: "generic-skip",
    content: "User is allergic to shellfish.",
    gold: [],
  },
  {
    id: "g-cooking",
    category: "generic-skip",
    content: "User wants to get better at cooking and read more books.",
    gold: [],
  },
  {
    id: "g-dentist",
    category: "generic-skip",
    content: "User set a reminder to call the dentist.",
    gold: [],
  },

  // ---- negative (nothing nameable → gold empty) ----
  {
    id: "n-weather",
    category: "negative",
    content: "User asked what the weather is like today.",
    gold: [],
  },
  {
    id: "n-thanks",
    category: "negative",
    content: "User said thanks and ended the conversation.",
    gold: [],
  },
];

/**
 * Canonicalization corpus. Each memory refers to ONE seeded canonical entity
 * via a variant spelling. `normalizeEntityName` is only trim+lowercase, so CASE
 * variants collapse for free — the real fragmentation risk is spacing,
 * punctuation, and abbreviation, which the model must actively resolve using the
 * seeded vocabulary hint. A case PASSES if any extracted entity normalizes to
 * the canonical's normalized form; otherwise the model FRAGMENTED the graph.
 *
 * `hard: true` marks abbreviation/alias cases (NYC→New York City) where even a
 * good model may reasonably keep the surface form — reported separately.
 */
export const CANON_VOCAB: string[] = [
  "ZetaChain",
  "San Francisco",
  "Boston Children's Hospital",
  "New York City",
  "machine learning",
];

export interface CanonCase {
  id: string;
  content: string;
  canonical: string; // the seeded name the model should reuse
  hard: boolean; // abbreviation/alias (vs mere spacing/punctuation)
}

export const CANON_CASES: CanonCase[] = [
  {
    id: "cn-space",
    content: "User pushed a fix to zeta chain today.",
    canonical: "ZetaChain",
    hard: false,
  },
  {
    id: "cn-apostrophe",
    content: "User had an interview at Boston Childrens Hospital.",
    canonical: "Boston Children's Hospital",
    hard: false,
  },
  {
    id: "cn-case",
    content: "User contributes to zetachain's core repo.",
    canonical: "ZetaChain",
    hard: false,
  },
  {
    id: "cn-nyc",
    content: "User relocated to NYC last month.",
    canonical: "New York City",
    hard: true,
  },
  { id: "cn-sf", content: "User loves living in SF.", canonical: "San Francisco", hard: true },
  {
    id: "cn-ml",
    content: "User is applying ML to their side project.",
    canonical: "machine learning",
    hard: true,
  },
  {
    id: "cn-space2",
    content: "User visits San Fransisco every summer.",
    canonical: "San Francisco",
    hard: false,
  }, // misspelling
  { id: "cn-nyc2", content: "User grew up in New York.", canonical: "New York City", hard: true },
];
