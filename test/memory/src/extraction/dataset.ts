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
   * `thing` is sparse and `other` is unlabeled on purpose: they are residual
   * buckets, and clean, unambiguous NAMED exemplars are rare (most named things
   * are products/orgs/places), so a forced golden would be a subjective target.
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
    // Forbidden is only the transient mood. Dropped the "User is getting
    // married." template: it was an embedding-adjacency trap — cosine can't
    // separate the *correct* supersession facts the model emits here ("wedding
    // is cancelled", "is single") from "getting married", so it flagged valid
    // extractions as junk. Those extras already show up in precision; they
    // shouldn't also be counted as forbidden hits.
    messages: turn("u3", "Update: the wedding is off, we broke up. Rough few weeks."),
    expected: ["User went through a breakup."],
    forbidden: ["User had a rough few weeks."],
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
  {
    id: "k-product-vs-thing",
    category: "multi-fact",
    messages: turn(
      "k3",
      "I keep all my notes in Obsidian these days, and on weekends we sail our boat, the Kestrel."
    ),
    expected: ["User takes notes in Obsidian.", "User owns a sailboat named Kestrel."],
    // Obsidian = a named app (product); Kestrel = a named physical object that
    // is NOT a brand (thing) — the discriminator the "thing" bucket is for.
    expectedEntities: [
      { name: "Obsidian", kind: "product" },
      { name: "Kestrel", kind: "thing" },
    ],
  },
  {
    id: "k-events",
    category: "multi-fact",
    messages: turn("k4", "I speak at WWDC every June, and I run the Boston Marathon each April."),
    expected: ["User speaks at WWDC every June.", "User runs the Boston Marathon each April."],
    expectedEntities: [
      { name: "WWDC", kind: "event" },
      { name: "Boston Marathon", kind: "event" },
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

  // ---- prod-shaped hard cases (2026-09 quality audit) ----
  //
  // The 30 cases above sat at ~99% recall / ~99% precision for two months, which
  // is a corpus that can no longer see a regression. Each case below is a shape
  // that produced junk or a miss in PRODUCTION vaults, or a shape the extraction
  // prompt explicitly rules on and nothing here exercised:
  //   - the assistant restating the user's profile back to them (prompt: NOT durable)
  //   - a connector/tool payload the assistant surfaced (prompt: bare labels are NOT durable)
  //   - the user's own name alone (prompt: NOT durable)
  //   - past-tense gossip about other people wrapped around a real fact (keep the fact)
  //   - a fact confirmed by the user after the assistant proposed it (prompt: IS durable)
  //   - a hedge wrapped around a real fact (keep the fact, drop the hedge)
  //   - coreference across the 2-message overlap the worker re-sends
  //   - a realistic long window with one fact in six messages
  //   - a state change with a distractor location
  //   - a non-English turn (the low-signal gate once killed CJK facts)
  {
    id: "n-assistant-restates-profile",
    category: "negative",
    messages: [
      {
        id: "p1-u",
        role: "user",
        content: "Can you suggest a weekend project?",
      },
      {
        id: "p1-a",
        role: "assistant",
        content:
          "As a backend engineer living in Denver who prefers Go, you might enjoy building a small CLI that pulls RTD transit times.",
      },
      { id: "p1-u2", role: "user", content: "sure, sounds fun" },
    ],
    expected: [],
    forbidden: ["User is a backend engineer.", "User lives in Denver.", "User prefers Go."],
  },
  {
    id: "n-connector-payload",
    category: "negative",
    messages: [
      { id: "c1-u", role: "user", content: "what does my slack profile say?" },
      {
        id: "c1-a",
        role: "assistant",
        content:
          "From your Slack profile: Title: Staff Engineer. Team: Payments. Timezone: America/Los_Angeles. Status: OOO.",
      },
      { id: "c1-u2", role: "user", content: "ok thanks" },
    ],
    expected: [],
    forbidden: [
      "User is a Staff Engineer.",
      "User is on the Payments team.",
      "User is out of office.",
    ],
  },
  {
    id: "n-own-name-only",
    category: "negative",
    messages: turn("nm1", "hey it's Peter Lee again, back with more questions", "Welcome back!"),
    expected: [],
    forbidden: ["User's name is Peter Lee.", "User is Peter Lee."],
  },
  {
    id: "b-gossip-about-others",
    category: "buried",
    // The durable part is the user's own world (they have a coworker Dave);
    // the gossip about Dave's Tesla history is what the prompt rules out.
    messages: turn(
      "g1",
      "lol my coworker Dave used to work at Tesla before they let him go, wild story",
      "That does sound like a story."
    ),
    expected: ["User has a coworker named Dave."],
    forbidden: ["User worked at Tesla.", "User's coworker was fired from Tesla."],
    expectedEntities: [{ name: "Dave", kind: "person" }],
  },
  {
    id: "d-user-confirms-assistant",
    category: "durable",
    messages: [
      { id: "cf1-u", role: "user", content: "dinner ideas for tonight?" },
      {
        id: "cf1-a",
        role: "assistant",
        content: "You mentioned you're vegan, right? I'll keep it plant-based.",
      },
      { id: "cf1-u2", role: "user", content: "Yes, exactly — strictly vegan, no exceptions." },
    ],
    expected: ["User is vegan."],
  },
  {
    id: "b-hedge-wraps-fact",
    category: "buried",
    messages: turn(
      "h1",
      "Maybe someday I'll get a dog, who knows. For now it's just me and my two cats, Pixel and Byte."
    ),
    expected: ["User has two cats named Pixel and Byte."],
    forbidden: ["User is getting a dog.", "User wants a dog."],
    // No expectedEntities: pet names fit no kind cleanly (the model says
    // `thing`, the taxonomy's `person` is a human), so a golden here would be a
    // subjective target — the same reason `other` is unlabeled corpus-wide.
  },
  {
    id: "b-fact-inside-question",
    category: "buried",
    messages: turn("q1", "As a type 1 diabetic, what snacks travel well on a long road trip?"),
    expected: ["User has type 1 diabetes."],
    forbidden: ["User is going on a road trip."],
  },
  {
    id: "m-coreference-across-turns",
    category: "multi-fact",
    // The worker re-sends 2 already-extracted messages for exactly this: "she"
    // in the second user turn resolves only through the first.
    messages: [
      { id: "cr1-u", role: "user", content: "My manager is Priya, she runs the platform org." },
      { id: "cr1-a", role: "assistant", content: "Got it." },
      { id: "cr1-u2", role: "user", content: "She's moving me onto the infra team next month." },
      { id: "cr1-a2", role: "assistant", content: "Congratulations on the move." },
    ],
    expected: ["User's manager is Priya.", "User is moving to the infra team next month."],
    expectedEntities: [{ name: "Priya", kind: "person" }],
  },
  {
    id: "b-long-window-one-fact",
    category: "buried",
    // A realistic six-message window: small talk, a task, one durable fact.
    messages: [
      {
        id: "lw-u1",
        role: "user",
        content: "morning! can you help me draft a reply to a landlord email?",
      },
      {
        id: "lw-a1",
        role: "assistant",
        content: "Of course — paste the email and tell me the tone you want.",
      },
      {
        id: "lw-u2",
        role: "user",
        content: "polite but firm. the heating has been broken for a week",
      },
      { id: "lw-a2", role: "assistant", content: "Here's a draft: …" },
      {
        id: "lw-u3",
        role: "user",
        content: "perfect. oh — sign it from both of us, my husband Tomás and me",
      },
      { id: "lw-a3", role: "assistant", content: "Updated to sign from you both." },
    ],
    expected: ["User's husband is named Tomás."],
    forbidden: ["User's heating is broken.", "User wants a polite but firm reply."],
    expectedEntities: [{ name: "Tomás", kind: "person" }],
  },
  {
    id: "u-moved-with-distractor",
    category: "update",
    messages: turn(
      "ud1",
      "We finally sold the Austin house and we're renting in Denver now, a few blocks from my sister."
    ),
    expected: ["User lives in Denver."],
    forbidden: ["User lives in Austin."],
    expectedEntities: [{ name: "Denver", kind: "place" }],
  },
  {
    id: "d-non-english-turn",
    category: "durable",
    // Gold is written in English like every other case; the extractor's own
    // convention is third-person English regardless of input language.
    messages: turn("jp1", "私は東京に住んでいて、猫を2匹飼っています。", "了解しました。"),
    expected: ["User lives in Tokyo.", "User has two cats."],
    expectedEntities: [{ name: "Tokyo", kind: "place" }],
  },
];
