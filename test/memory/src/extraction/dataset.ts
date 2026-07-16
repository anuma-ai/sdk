/**
 * Extraction-quality eval corpus.
 *
 * Each case is a short conversation transcript fed to `extractFacts`, paired
 * with the durable facts that SHOULD be extracted (`expected`) and, for the
 * trap cases, the junk that must NOT be (`forbidden`). The point is to measure
 * what the extractor *remembers* — not what retrieval later finds:
 *
 *   - recall    : did it catch the durable facts? (over cases with expected)
 *   - precision : are the facts it extracted real durable facts? (vs over-extraction)
 *   - junk rate : did a "negative" turn (no durable fact) yield any memory?
 *
 * Categories deliberately stress known failure modes: search queries, transient
 * state, hypotheticals, assistant-directed requests, and echoed quotes ("the
 * user said 'tiger'") that have leaked into prod as junk memories before.
 *
 * Facts are written third-person / present-tense to match the extractor's own
 * output convention, so embedding-match scoring is apples-to-apples.
 */

import type { EntityKind } from "../../../../src/lib/db/entities/types.js";

/** A named entity the extractor should surface, with its expected kind. */
export interface ExpectedEntity {
  name: string;
  kind: EntityKind;
}

export type ExtractionCategory =
  | "durable" // one or more clear durable facts
  | "multi-fact" // several durable facts in one turn
  | "buried" // a durable fact wrapped in chit-chat / noise
  | "update" // a fact that supersedes an earlier state
  | "negative"; // nothing durable — must extract NOTHING

export interface ExtractionMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export interface ExtractionCase {
  id: string;
  category: ExtractionCategory;
  messages: ExtractionMessage[];
  /** Durable facts that should be extracted (third-person, present-tense). */
  expected: string[];
  /** Junk that must NOT be extracted (optional; for eyeballing/regression). */
  forbidden?: string[];
  /**
   * Named entities the extractor should surface, each with its correct kind.
   * Scored by the benchmark's kind-accuracy pass: coverage (was the entity
   * extracted at all?) + kind correctness (did it get the right label?).
   * A subset of cases — only those with unambiguous named entities are labeled.
   */
  expectedEntities?: ExpectedEntity[];
}

// Compact helper for two-turn transcripts (user then assistant ack).
const turn = (id: string, user: string, assistant = "Got it."): ExtractionMessage[] => [
  { id: `${id}-u`, role: "user", content: user },
  { id: `${id}-a`, role: "assistant", content: assistant },
];

export const EXTRACTION_CASES: ExtractionCase[] = [
  // ---- durable: single clear facts ----
  {
    id: "d-partner-name",
    category: "durable",
    messages: turn("d1", "My wife's name is Sara and we just celebrated our 5th anniversary."),
    expected: ["User's wife is named Sara.", "User has been married for 5 years."],
    expectedEntities: [{ name: "Sara", kind: "person" }],
  },
  {
    id: "d-allergy",
    category: "durable",
    messages: turn("d2", "Please keep in mind I’m allergic to shellfish — it’s pretty severe."),
    expected: ["User is allergic to shellfish."],
  },
  {
    id: "d-job",
    category: "durable",
    messages: turn("d3", "I work as a pediatric nurse at Boston Children’s Hospital."),
    expected: ["User works as a pediatric nurse at Boston Children's Hospital."],
    expectedEntities: [{ name: "Boston Children's Hospital", kind: "organization" }],
  },
  {
    id: "d-pet",
    category: "durable",
    messages: turn("d4", "We adopted a golden retriever puppy last month — her name is Mochi."),
    expected: ["User has a golden retriever named Mochi."],
  },
  {
    id: "d-preference",
    category: "durable",
    messages: turn("d5", "I really prefer dark roast coffee, the darker the better honestly."),
    expected: ["User prefers dark roast coffee."],
  },
  {
    id: "d-constraint",
    category: "durable",
    messages: turn("d6", "I'm vegetarian, so please never suggest recipes with meat."),
    expected: ["User is vegetarian."],
  },
  {
    id: "d-location",
    category: "durable",
    messages: turn("d7", "I live in Austin, Texas — been here about three years now."),
    expected: ["User lives in Austin, Texas."],
    expectedEntities: [{ name: "Austin", kind: "place" }],
  },

  // ---- multi-fact ----
  {
    id: "m-family",
    category: "multi-fact",
    messages: turn(
      "m1",
      "I have two kids — Leo is 7 and Mia is 4. My partner Jordan teaches high-school chemistry."
    ),
    expected: [
      "User has a child named Leo who is 7.",
      "User has a child named Mia who is 4.",
      "User's partner is named Jordan.",
      "Jordan teaches high-school chemistry.",
    ],
    expectedEntities: [
      { name: "Leo", kind: "person" },
      { name: "Mia", kind: "person" },
      { name: "Jordan", kind: "person" },
    ],
  },
  {
    id: "m-work-stack",
    category: "multi-fact",
    messages: turn(
      "m2",
      "I’m a backend engineer, mostly Go and Postgres, and I’m the tech lead for our payments team."
    ),
    expected: [
      "User is a backend engineer.",
      "User works mostly with Go and Postgres.",
      "User is the tech lead for the payments team.",
    ],
    expectedEntities: [
      { name: "Go", kind: "concept" },
      { name: "Postgres", kind: "product" },
    ],
  },
  {
    id: "m-goals",
    category: "multi-fact",
    messages: turn(
      "m3",
      "I'm training for the Chicago marathon in October, and I'm trying to learn Spanish on the side."
    ),
    expected: [
      "User is training for the Chicago marathon in October.",
      "User is learning Spanish.",
    ],
    expectedEntities: [
      { name: "Chicago marathon", kind: "event" },
      { name: "Spanish", kind: "concept" },
    ],
  },

  // ---- buried: durable fact inside chit-chat ----
  {
    id: "b-name-in-rant",
    category: "buried",
    messages: turn(
      "b1",
      "Ugh today was so long, the commute was awful and my coffee was cold. Anyway — I just moved into a new apartment in Seattle's Capitol Hill neighborhood, so at least that's exciting."
    ),
    expected: ["User lives in the Capitol Hill neighborhood of Seattle."],
    forbidden: ["User had a long day.", "User had cold coffee."],
    expectedEntities: [{ name: "Seattle", kind: "place" }],
  },
  {
    id: "b-diet-in-question",
    category: "buried",
    messages: turn(
      "b2",
      "Can you give me a dinner idea? Something quick. Oh and I'm lactose intolerant so no dairy."
    ),
    expected: ["User is lactose intolerant."],
    forbidden: ["User wants a quick dinner idea."],
  },
  {
    id: "b-fact-in-thanks",
    category: "buried",
    messages: turn(
      "b3",
      "thanks that helps! btw I’m left-handed so those ergonomic tips were extra useful"
    ),
    expected: ["User is left-handed."],
  },

  // ---- update / supersession ----
  {
    id: "u-moved",
    category: "update",
    messages: turn(
      "u1",
      "Quick update — I no longer live in Portland, I relocated to San Francisco for a new job."
    ),
    expected: ["User lives in San Francisco."],
    forbidden: ["User lives in Portland."],
    expectedEntities: [{ name: "San Francisco", kind: "place" }],
  },
  {
    id: "u-job-change",
    category: "update",
    messages: turn(
      "u2",
      "I left my job at Google last month — I'm at a startup called Riverbend now."
    ),
    expected: ["User works at a startup called Riverbend."],
    forbidden: ["User works at Google."],
    expectedEntities: [{ name: "Riverbend", kind: "organization" }],
  },
  {
    id: "u-status",
    category: "update",
    messages: turn("u3", "Update: the wedding is off, we broke up. Rough few weeks."),
    expected: ["User went through a breakup."],
    forbidden: ["User is getting married.", "User had a rough few weeks."],
  },

  // ---- entity-kind stress: org / product / event vs the old "thing" bucket ----
  {
    id: "k-org-product-event",
    category: "multi-fact",
    messages: turn(
      "k1",
      "I'm speaking at DEF CON in August, I do all my design work in Figma, and my sister works at Pixar."
    ),
    expected: [
      "User is speaking at DEF CON in August.",
      "User does design work in Figma.",
      "User's sister works at Pixar.",
    ],
    expectedEntities: [
      { name: "DEF CON", kind: "event" },
      { name: "Figma", kind: "product" },
      { name: "Pixar", kind: "organization" },
    ],
  },
  {
    id: "k-school-is-org",
    category: "durable",
    messages: turn("k2", "I just started grad school at MIT, studying computational biology."),
    expected: ["User is in grad school at MIT studying computational biology."],
    expectedEntities: [
      { name: "MIT", kind: "organization" },
      { name: "computational biology", kind: "concept" },
    ],
  },

  // ---- negative: nothing durable should be extracted ----
  {
    id: "n-search-query",
    category: "negative",
    messages: turn(
      "n1",
      "What's the weather in Tokyo this weekend?",
      "It looks rainy on Saturday."
    ),
    expected: [],
    forbidden: ["User is interested in Tokyo weather.", "User is going to Tokyo."],
  },
  {
    id: "n-transient",
    category: "negative",
    messages: turn("n2", "Ugh I'm so hungry right now and kind of tired."),
    expected: [],
    forbidden: ["User is hungry.", "User is tired."],
  },
  {
    id: "n-hypothetical",
    category: "negative",
    messages: turn("n3", "If I moved to Berlin, what neighborhoods would you recommend?"),
    expected: [],
    forbidden: ["User is moving to Berlin.", "User lives in Berlin."],
  },
  {
    id: "n-assistant-task",
    category: "negative",
    messages: turn("n4", "Can you summarize this article and make it shorter?"),
    expected: [],
    forbidden: ["User wants a summary."],
  },
  {
    id: "n-world-fact",
    category: "negative",
    messages: turn(
      "n5",
      "Is it true that the Eiffel Tower is 330 meters tall?",
      "Yes, about that."
    ),
    expected: [],
    forbidden: ["The Eiffel Tower is 330 meters tall."],
  },
  {
    id: "n-quote-echo",
    category: "negative",
    messages: turn("n6", "Generate an image of a tiger.", "Here is an image of a tiger."),
    expected: [],
    forbidden: ["User said tiger.", "User likes tigers.", "User requested a tiger image."],
  },
  {
    id: "n-chitchat",
    category: "negative",
    messages: turn("n7", "lol that’s hilarious 😂", "Glad you liked it!"),
    expected: [],
    forbidden: ["User found something funny."],
  },
  {
    id: "n-aspiration-vague",
    category: "negative",
    messages: turn("n8", "I should really start working out more at some point."),
    expected: [],
    forbidden: ["User works out.", "User is starting to work out."],
  },
  {
    id: "n-question-about-self",
    category: "negative",
    messages: turn("n9", "What kind of laptop do you think I should buy?"),
    expected: [],
    forbidden: ["User wants to buy a laptop.", "User needs a new laptop."],
  },
];
