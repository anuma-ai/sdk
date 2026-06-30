import { describe, it, expect } from "vitest";

import { bootstrapMeanCI, pairedBootstrapDelta } from "./metrics.js";

describe("bootstrapMeanCI", () => {
  it("returns the sample mean with a zero-width CI for a constant sample", () => {
    const ci = bootstrapMeanCI([1, 1, 1, 1, 1]);
    expect(ci.mean).toBe(1);
    expect(ci.lo).toBe(1);
    expect(ci.hi).toBe(1);
  });

  it("brackets the mean (lo <= mean <= hi) and is deterministic across calls", () => {
    const values = [1, 0, 1, 1, 0, 1, 0, 1, 1, 0];
    const a = bootstrapMeanCI(values);
    const b = bootstrapMeanCI(values);
    expect(a).toEqual(b); // seeded PRNG → reproducible bounds
    expect(a.mean).toBeCloseTo(0.6, 10);
    expect(a.lo).toBeLessThanOrEqual(a.mean);
    expect(a.hi).toBeGreaterThanOrEqual(a.mean);
  });

  it("handles the empty sample", () => {
    expect(bootstrapMeanCI([])).toEqual({ mean: 0, lo: 0, hi: 0 });
  });
});

describe("pairedBootstrapDelta", () => {
  it("reports no difference (not significant) for identical samples", () => {
    const x = [1, 0, 1, 1, 0, 1];
    const d = pairedBootstrapDelta(x, x);
    expect(d.mean).toBe(0);
    expect(d.significant).toBe(false);
  });

  it("flags a large, consistent improvement as significant with a CI above 0", () => {
    const a = Array(40).fill(1);
    const b = Array(40).fill(0);
    const d = pairedBootstrapDelta(a, b);
    expect(d.mean).toBe(1);
    expect(d.lo).toBeGreaterThan(0);
    expect(d.significant).toBe(true);
  });

  it("throws on mismatched array lengths rather than silently truncating", () => {
    expect(() => pairedBootstrapDelta([1, 0, 1], [1, 0])).toThrow(/equal-length/);
  });

  it("treats a tiny one-query difference on a noisy sample as not significant", () => {
    // 39 ties + a single +1 → mean +0.025, CI must include 0.
    const base = Array(39).fill(1);
    const a = [...base, 1];
    const b = [...base, 0];
    const d = pairedBootstrapDelta(a, b);
    expect(d.mean).toBeCloseTo(0.025, 10);
    expect(d.lo).toBeLessThanOrEqual(0);
    expect(d.significant).toBe(false);
  });
});
