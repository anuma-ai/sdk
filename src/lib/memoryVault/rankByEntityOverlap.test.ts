import { describe, expect, it } from "vitest";

import { rankByEntityOverlap } from "./searchTool.js";

const item = (id: string, ...entities: string[]) => ({
  id,
  content: id,
  entities: new Set(entities),
});

describe("rankByEntityOverlap", () => {
  it("returns empty when query has no entities", () => {
    expect(rankByEntityOverlap(new Set(), [item("a", "x")])).toEqual([]);
  });

  it("returns empty when no items match", () => {
    expect(rankByEntityOverlap(new Set(["x"]), [item("a", "y")])).toEqual([]);
  });

  it("ranks items by shared entity count, descending", () => {
    const result = rankByEntityOverlap(new Set(["x", "y", "z"]), [
      item("one", "x"),
      item("three", "x", "y", "z"),
      item("two", "x", "y"),
      item("none", "q"),
    ]);
    expect(result.map((r) => r.uniqueId)).toEqual(["three", "two", "one"]);
  });

  it("scores by tanh(0.5 * shared_count)", () => {
    const result = rankByEntityOverlap(new Set(["x", "y", "z"]), [
      item("one", "x"),
      item("two", "x", "y"),
      item("three", "x", "y", "z"),
    ]);
    expect(result.find((r) => r.uniqueId === "one")?.similarity).toBeCloseTo(Math.tanh(0.5));
    expect(result.find((r) => r.uniqueId === "two")?.similarity).toBeCloseTo(Math.tanh(1));
    expect(result.find((r) => r.uniqueId === "three")?.similarity).toBeCloseTo(Math.tanh(1.5));
  });

  it("excludes items with zero overlap (not just zero score)", () => {
    const result = rankByEntityOverlap(new Set(["x"]), [item("hit", "x"), item("miss", "y")]);
    expect(result.map((r) => r.uniqueId)).toEqual(["hit"]);
  });
});
