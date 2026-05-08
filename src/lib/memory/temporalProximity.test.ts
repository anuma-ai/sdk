import { describe, expect, it } from "vitest";

import { temporalProximityMultiplier, type TemporalWindow } from "./queryTemporal.js";

const DAY = 24 * 60 * 60 * 1000;

const window: TemporalWindow = {
  start: new Date("2026-05-11T00:00:00Z").getTime(),
  end: new Date("2026-05-18T00:00:00Z").getTime(),
  matchedPhrase: "next week",
};

describe("temporalProximityMultiplier", () => {
  it("returns 1.0 (neutral) when query has no temporal window", () => {
    expect(temporalProximityMultiplier(Date.now(), null, "point", null)).toBe(1.0);
  });

  it("returns 1.0 (neutral) when memory has no event_time", () => {
    expect(temporalProximityMultiplier(null, null, null, window)).toBe(1.0);
  });

  it("peaks at 1 + alpha for a point memory inside the window", () => {
    const t = new Date("2026-05-14T00:00:00Z").getTime();
    expect(temporalProximityMultiplier(t, null, "point", window, { alpha: 0.3 })).toBeCloseTo(1.3);
  });

  it("decays smoothly for a point memory outside the window", () => {
    const t = new Date("2026-05-25T00:00:00Z").getTime(); // 7 days past window end (one half-life)
    const m = temporalProximityMultiplier(t, null, "point", window, {
      alpha: 0.3,
      halfLifeMs: 7 * DAY,
    });
    expect(m).toBeGreaterThan(1.14);
    expect(m).toBeLessThan(1.16);
  });

  it("approaches 1.0 for a memory far outside the window", () => {
    const t = new Date("2027-05-14T00:00:00Z").getTime(); // a full year out
    const m = temporalProximityMultiplier(t, null, "point", window, { alpha: 0.3 });
    expect(m).toBeCloseTo(1.0, 3);
  });

  it("treats range memories with full overlap as in-window", () => {
    const start = new Date("2026-05-12T00:00:00Z").getTime();
    const end = new Date("2026-05-15T00:00:00Z").getTime();
    expect(temporalProximityMultiplier(start, end, "range", window, { alpha: 0.3 })).toBeCloseTo(
      1.3
    );
  });

  it("treats ongoing memories that started before window end as in-window", () => {
    const start = new Date("2024-01-01T00:00:00Z").getTime();
    expect(temporalProximityMultiplier(start, null, "ongoing", window, { alpha: 0.3 })).toBeCloseTo(
      1.3
    );
  });
});
