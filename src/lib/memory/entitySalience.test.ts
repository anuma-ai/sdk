import { describe, expect, it } from "vitest";

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
    for (const name of ["Today", "tomorrow", "Friday", "March", "next week", "the weekend"]) {
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

  it("drops an all-generic phrase, determiners included", () => {
    for (const name of ["the meeting", "my home office", "a birthday dinner"]) {
      expect(isGenericEntityName(name)).toBe(true);
    }
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
