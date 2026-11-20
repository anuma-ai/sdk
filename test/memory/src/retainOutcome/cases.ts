export type Expected = "keep-both" | "one-memory" | "replace";

export interface OutcomeCase {
  group: string;
  existing: string;
  incoming: string;
  expect: Expected;
}

const keep = (group: string, existing: string, incoming: string): OutcomeCase => ({
  group,
  existing,
  incoming,
  expect: "keep-both",
});
const one = (group: string, existing: string, incoming: string): OutcomeCase => ({
  group,
  existing,
  incoming,
  expect: "one-memory",
});
const replace = (group: string, existing: string, incoming: string): OutcomeCase => ({
  group,
  existing,
  incoming,
  expect: "replace",
});

export const OUTCOME_CASES: OutcomeCase[] = [
  keep("other-subject", "User is allergic to peanuts.", "User's daughter is allergic to peanuts."),
  keep("other-subject", "User lives in Denver.", "User's sister lives in Denver."),
  keep("other-subject", "User works at Google.", "User's wife works at Google."),
  keep("other-subject", "User is vegetarian.", "User's partner is vegetarian."),
  keep("other-subject", "User's mother has diabetes.", "User's father has diabetes."),
  keep("other-subject", "User plays the piano.", "User's son plays the piano."),
  keep(
    "other-subject",
    "User's dog Biscuit is three years old.",
    "User's cat Mochi is three years old."
  ),
  keep("other-subject", "User drives a Tesla Model 3.", "User's brother drives a Tesla Model 3."),
  keep("other-subject", "User was born in Lisbon.", "User's husband was born in Lisbon."),
  keep(
    "other-subject",
    "User's manager is called Priya.",
    "User's skip-level manager is called Priya's boss, Daniel."
  ),

  keep("separate-event", "User went to the gym on Monday.", "User went to the gym on Friday."),
  keep(
    "separate-event",
    "User spent $150 on groceries yesterday.",
    "User spent $200 on groceries today."
  ),
  keep(
    "separate-event",
    "User ran a half marathon in March 2026.",
    "User ran a half marathon in October 2026."
  ),
  keep(
    "separate-event",
    "User flew to Tokyo for work in May.",
    "User flew to Tokyo on holiday in September."
  ),
  keep(
    "separate-event",
    "User had a dentist appointment on 3 June.",
    "User had a dentist appointment on 12 November."
  ),
  keep(
    "separate-event",
    "User bought 0.5 BTC on 2 November.",
    "User bought 0.5 BTC on 16 November."
  ),
  keep("separate-event", "User saw Radiohead live in 2018.", "User saw Radiohead live in 2025."),
  keep(
    "separate-event",
    "User interviewed at Stripe last spring.",
    "User interviewed at Stripe again this autumn."
  ),
  keep(
    "separate-event",
    "User visited their parents over Easter.",
    "User visited their parents over Thanksgiving."
  ),
  keep("separate-event", "User had a migraine on Tuesday.", "User had a migraine on Saturday."),

  keep("other-facet", "User's dog is named Biscuit.", "User's dog is a golden retriever."),
  keep("other-facet", "User shops at Zara.", "User returned a sweater to Zara last week."),
  keep("other-facet", "User likes Thai food.", "User likes Vietnamese food."),
  keep("other-facet", "User's favorite band is Radiohead.", "User's favorite film is Stalker."),
  keep("other-facet", "User is learning Spanish.", "User is learning Japanese."),
  keep("other-facet", "User takes vitamin D every morning.", "User takes magnesium every evening."),
  keep(
    "other-facet",
    "User holds ETH as a long-term position.",
    "User holds SOL as a long-term position."
  ),
  keep(
    "other-facet",
    "User never uses more than 3x leverage on perps.",
    "User never risks more than 2% of the account on one trade."
  ),
  keep(
    "other-facet",
    "User's sister Ana lives in Paris.",
    "User's sister Ana works as an architect."
  ),
  keep(
    "other-facet",
    "User prefers morning meetings.",
    "User prefers written updates over meetings."
  ),

  one("same-fact", "User has a dog named Biscuit.", "User has a dog named Biscuit."),
  one("same-fact", "User has two kids.", "User has two children."),
  one("same-fact", "Climbs at Movement.", "Climbs at Movement gym."),
  one("same-fact", "User is allergic to penicillin.", "User has a penicillin allergy."),
  one("same-fact", "User lives in San Francisco.", "User is based in San Francisco."),
  one(
    "same-fact",
    "User works as a software engineer.",
    "User is a software engineer by profession."
  ),
  one("same-fact", "User prefers dark mode in every app.", "User prefers dark mode in all apps."),
  one("same-fact", "User is vegetarian.", "User does not eat meat."),
  one("same-fact", "User's sister is called Ana.", "User has a sister named Ana."),
  one("same-fact", "User is training for a marathon.", "User is preparing to run a marathon."),
  one(
    "same-fact",
    "User never uses more than 3x leverage on perps.",
    "User caps perp leverage at 3x."
  ),
  one("same-fact", "User drinks oat milk in coffee.", "User takes their coffee with oat milk."),

  one("adds-detail", "User has a dog named Biscuit.", "User's dog Biscuit is a golden retriever."),
  one("adds-detail", "User has a cat named Mochi.", "User's cat Mochi is four years old."),
  one("adds-detail", "User's sister is called Ana.", "User's sister Ana lives in Paris."),
  one(
    "adds-detail",
    "User is training for a marathon.",
    "User is training for the Berlin marathon in September."
  ),
  one("adds-detail", "User works at Riverbend.", "User works at Riverbend as a staff engineer."),
  one(
    "adds-detail",
    "User is learning Spanish.",
    "User is learning Spanish with a tutor twice a week."
  ),

  replace("changed-value", "User lives in Portland.", "User lives in San Francisco."),
  replace("changed-value", "User works at Google.", "User works at Riverbend."),
  replace(
    "changed-value",
    "User prefers dark mode in every app.",
    "User prefers light mode in every app."
  ),
  replace("changed-value", "User eats meat a few times a week.", "User is vegetarian."),
  replace("changed-value", "User is engaged to Sam.", "User and Sam broke up."),
  replace(
    "changed-value",
    "User never uses more than 3x leverage on perps.",
    "User never uses more than 5x leverage on perps."
  ),
  replace(
    "changed-value",
    "User drives a Tesla Model 3.",
    "User sold the Tesla and now drives a Rivian R2."
  ),
  replace(
    "changed-value",
    "User's sister Ana lives in Paris.",
    "User's sister Ana lives in London."
  ),
  replace(
    "changed-value",
    "User is renting a flat in Lisbon.",
    "User bought a house in Porto and moved there."
  ),
  replace(
    "changed-value",
    "User's main exchange is Binance.",
    "User's main exchange is Hyperliquid."
  ),
];
