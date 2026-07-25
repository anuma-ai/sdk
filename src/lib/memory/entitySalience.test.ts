import { describe, expect, it } from "vitest";

import { TOPIC_CASES } from "../../../test/memory/src/topic/dataset";
import { parseEntities } from "./autoExtract";
import { isGenericEntityName } from "./entitySalience";

describe("isGenericEntityName", () => {
  it("drops the bare generic nouns the models leak as topics", () => {
    // The reported case: a calendar all-day block titled "Home".
    for (const name of ["Home", "home", "Work", "Meeting", "Lunch", "Birthday", "Appointment"]) {
      expect(isGenericEntityName(name)).toBe(true);
    }
  });

  it("drops pure date noise", () => {
    for (const name of ["Today", "tomorrow", "Friday", "March", "next week", "this weekend"]) {
      expect(isGenericEntityName(name)).toBe(true);
    }
  });

  it("keeps a phrase with any distinctive token", () => {
    for (const name of [
      "Chicago Marathon",
      "Blue Bottle on Valencia",
      "Hollowpoint Labs",
      "Japan trip",
      "Monday Night Football",
      // A weak modifier is ignored, never treated as generic itself.
      "Next.js",
      "The Last Supper",
    ]) {
      expect(isGenericEntityName(name)).toBe(false);
    }
  });

  it("drops an all-generic phrase held together by modifiers", () => {
    for (const name of [
      "my home office",
      "a birthday dinner",
      "meeting at home",
      "work from home",
      "home and work",
      "next week",
    ]) {
      expect(isGenericEntityName(name)).toBe(true);
    }
  });

  it("drops plural generics too", () => {
    for (const name of ["Meetings", "Trips", "Calls", "weekends", "Appointments"]) {
      expect(isGenericEntityName(name)).toBe(true);
    }
  });

  it("keeps an article + single noun, which reads as a title", () => {
    // "The Office" is a gold product entity — dropping it would lose the link
    // AND make the re-extraction sweep delete existing valid ones. Possessives
    // and qualifiers deliberately do NOT get this protection.
    expect(isGenericEntityName("The Office")).toBe(false);
    expect(isGenericEntityName("The Trip")).toBe(false);
    expect(isGenericEntityName("my office")).toBe(true);
    expect(isGenericEntityName("this trip")).toBe(true);
    // The accepted cost of the guard: an article + generic noun is kept even
    // when it reads as date noise, because the shape is indistinguishable from
    // a title ("The Weeknd", "The Trip"). A cheap miss, unlike a lost entity.
    expect(isGenericEntityName("the weekend")).toBe(false);
  });

  it("never drops a gold entity from the topic-extraction eval dataset", () => {
    // The dataset is the spec for what extraction should produce, so it is also
    // the spec for what this gate must not throw away. This is what would have
    // caught "The Office".
    const dropped = TOPIC_CASES.flatMap((c) => c.gold)
      .map((g) => g.name)
      .filter((name) => isGenericEntityName(name));
    expect(dropped).toEqual([]);
  });

  it("keeps the connectors a personal memory graph needs", () => {
    // Deliberate exclusions — relationship hubs, interests, and foods are real
    // topics. Guards the list against being widened into a stopword dump.
    for (const name of ["Mom", "wife", "boss", "coffee", "matcha", "Spanish", "machine learning"]) {
      expect(isGenericEntityName(name)).toBe(false);
    }
  });

  it("treats a name with no letters or digits as generic", () => {
    expect(isGenericEntityName("---")).toBe(true);
  });
});

describe("parseEntities — salience gate", () => {
  it("drops generic entities from both the object and bare-string shapes", () => {
    expect(
      parseEntities([
        { name: "Home", kind: "place" },
        { name: "Hollowpoint Labs", kind: "organization" },
        "Meeting",
        "Whoop",
      ])
    ).toEqual([{ name: "Hollowpoint Labs", kind: "organization" }, { name: "Whoop" }]);
  });

  it("still returns an empty array rather than throwing when everything is generic", () => {
    expect(parseEntities([{ name: "Today" }, "Lunch"])).toEqual([]);
  });
});
