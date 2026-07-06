import { describe, expect, it } from "vitest";

import { parseQueryTimeWindow } from "./queryTemporal.js";

// Fixed reference "now" so windows are deterministic: 2026-05-04 (local).
const NOW = new Date(2026, 4, 4, 12, 0, 0).getTime();

describe("parseQueryTimeWindow", () => {
  it("returns null for an empty or non-temporal query", () => {
    expect(parseQueryTimeWindow("", NOW)).toBeNull();
    expect(parseQueryTimeWindow("what is my dog's name", NOW)).toBeNull();
  });

  it("resolves a small future offset to a finite window", () => {
    const w = parseQueryTimeWindow("in 3 days", NOW);
    expect(w).not.toBeNull();
    expect(Number.isFinite(w!.start)).toBe(true);
    expect(Number.isFinite(w!.end)).toBe(true);
    expect(w!.end).toBeGreaterThan(w!.start);
    expect(w!.matchedPhrase).toBe("in 3 days");
  });

  it("resolves a small past offset to a finite window", () => {
    const w = parseQueryTimeWindow("2 weeks ago", NOW);
    expect(w).not.toBeNull();
    expect(Number.isFinite(w!.start)).toBe(true);
    expect(w!.start).toBeLessThan(NOW);
  });

  it("returns null for an offset that overflows the JS Date range", () => {
    // 999999999 days ≈ 8.6e16 ms, past the ±8.64e15 ms Date limit → NaN window.
    // The guard must return null (no temporal lane) rather than a NaN window
    // that silently scores every memory 0.
    expect(parseQueryTimeWindow("in 999999999 days", NOW)).toBeNull();
    expect(parseQueryTimeWindow("999999999 months ago", NOW)).toBeNull();
  });

  it("returns null for an absurdly long digit run (parseInt → Infinity)", () => {
    expect(parseQueryTimeWindow(`in ${"9".repeat(400)} weeks`, NOW)).toBeNull();
  });

  it("returns null for a non-finite `now` on EVERY branch (not just offsets)", () => {
    // A NaN clock would otherwise build NaN bounds in the relative-day / week /
    // month / day-of-week / absolute-date branches too.
    expect(parseQueryTimeWindow("today", NaN)).toBeNull();
    expect(parseQueryTimeWindow("this week", NaN)).toBeNull();
    expect(parseQueryTimeWindow("last month", NaN)).toBeNull();
    expect(parseQueryTimeWindow("next monday", NaN)).toBeNull();
    expect(parseQueryTimeWindow("2026-05-23", NaN)).toBeNull();
  });
});
