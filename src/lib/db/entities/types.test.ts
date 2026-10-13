import { describe, expect, it } from "vitest";

import { parseTopics, primaryTopic, serializeTopics, topicWeight } from "./types";

describe("topic weights", () => {
  it("round-trips a weight and drops one outside (0, 1]", () => {
    const stored = serializeTopics([
      { name: "Chicago Marathon", source: "auto", weight: 1 },
      { name: "Ana", source: "auto", weight: 0.6 },
    ]);
    expect(parseTopics(stored)).toEqual([
      { name: "Chicago Marathon", source: "auto", weight: 1 },
      { name: "Ana", source: "auto", weight: 0.6 },
    ]);
    expect(
      parseTopics(
        JSON.stringify([
          { name: "A", weight: 0 },
          { name: "B", weight: 2 },
          { name: "C", weight: "1" },
        ])
      )
    ).toEqual([
      { name: "A", source: "auto" },
      { name: "B", source: "auto" },
      { name: "C", source: "auto" },
    ]);
  });

  it("reads a missing weight and a user-set topic as 1", () => {
    expect(topicWeight({ name: "A", source: "auto" })).toBe(1);
    expect(topicWeight({ name: "A", source: "user", weight: 0.3 })).toBe(1);
    expect(topicWeight({ name: "A", source: "auto", weight: 0.3 })).toBe(0.3);
  });

  it("picks the first topic with the highest weight", () => {
    expect(primaryTopic(null)).toBeNull();
    expect(primaryTopic([])).toBeNull();
    expect(
      primaryTopic([
        { name: "Nike", source: "auto", weight: 0.3 },
        { name: "Chicago Marathon", source: "auto", weight: 1 },
        { name: "Boston Marathon", source: "auto", weight: 1 },
      ])?.name
    ).toBe("Chicago Marathon");
  });
});
