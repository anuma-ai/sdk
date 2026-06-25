import { describe, expect, it } from "vitest";

import { rrfFuse } from "./rrf.js";

describe("rrfFuse", () => {
  it("returns empty map for no rankings", () => {
    expect(rrfFuse([])).toEqual(new Map());
  });

  it("ranks single-list input by reciprocal of position", () => {
    const fused = rrfFuse([["a", "b", "c"]], 60);
    expect(fused.get("a")).toBeCloseTo(1 / 61);
    expect(fused.get("b")).toBeCloseTo(1 / 62);
    expect(fused.get("c")).toBeCloseTo(1 / 63);
  });

  it("sums contributions from multiple rankings", () => {
    // 'a' is rank 1 in both → 2/61. 'b' is rank 2 in both → 2/62.
    const fused = rrfFuse(
      [
        ["a", "b"],
        ["a", "b"],
      ],
      60
    );
    expect(fused.get("a")).toBeCloseTo(2 / 61);
    expect(fused.get("b")).toBeCloseTo(2 / 62);
  });

  it("ranks differently-positioned items by aggregate", () => {
    // 'x' top in list 1, bottom in list 2; 'y' bottom in list 1, top in list 2
    // Both should get the same score due to symmetry.
    const fused = rrfFuse(
      [
        ["x", "y"],
        ["y", "x"],
      ],
      60
    );
    expect(fused.get("x")).toBeCloseTo(1 / 61 + 1 / 62);
    expect(fused.get("y")).toBeCloseTo(1 / 62 + 1 / 61);
    expect(fused.get("x")).toBeCloseTo(fused.get("y")!);
  });

  it("handles partial overlap — items absent from one ranker contribute 0 from it", () => {
    // 'a' in both, 'b' only in first, 'c' only in second
    const fused = rrfFuse(
      [
        ["a", "b"],
        ["a", "c"],
      ],
      60
    );
    expect(fused.get("a")).toBeCloseTo(1 / 61 + 1 / 61);
    expect(fused.get("b")).toBeCloseTo(1 / 62);
    expect(fused.get("c")).toBeCloseTo(1 / 62);
    // 'a' wins because it appears in both rankers
    expect(fused.get("a")!).toBeGreaterThan(fused.get("b")!);
  });

  it("smaller k weights top of list more aggressively", () => {
    const top1With60 = 1 / 61;
    const top1With10 = 1 / 11;
    expect(top1With10).toBeGreaterThan(top1With60);

    const fusedSmall = rrfFuse([["a", "b"]], 10);
    const fusedLarge = rrfFuse([["a", "b"]], 60);
    // Gap between rank-1 and rank-2 should be wider with smaller k
    const gapSmall = fusedSmall.get("a")! - fusedSmall.get("b")!;
    const gapLarge = fusedLarge.get("a")! - fusedLarge.get("b")!;
    expect(gapSmall).toBeGreaterThan(gapLarge);
  });

  it("uses default k=60 when not specified", () => {
    expect(rrfFuse([["a"]]).get("a")).toBeCloseTo(1 / 61);
  });

  it("handles empty rankers within the array", () => {
    const fused = rrfFuse([[], ["a", "b"]], 60);
    expect(fused.get("a")).toBeCloseTo(1 / 61);
    expect(fused.get("b")).toBeCloseTo(1 / 62);
  });

  it("falls back to default k for a negative k (no Infinity poisoning)", () => {
    const fused = rrfFuse([["a", "b"]], -1);
    expect(fused.get("a")).toBeCloseTo(1 / 61); // default k=60, not 1/(−1+0+1)=Infinity
    expect(Number.isFinite(fused.get("a")!)).toBe(true);
  });

  it("falls back to default k for a non-finite k (NaN)", () => {
    const fused = rrfFuse([["a"]], NaN);
    expect(fused.get("a")).toBeCloseTo(1 / 61);
  });

  it("counts a repeated id within one ranking only once (at its best rank)", () => {
    const fused = rrfFuse([["a", "a", "b"]], 60);
    expect(fused.get("a")).toBeCloseTo(1 / 61); // not 1/61 + 1/62
    expect(fused.get("b")).toBeCloseTo(1 / 63); // positional rank preserved
  });
});
