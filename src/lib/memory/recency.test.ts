import { describe, expect, it } from "vitest";

import { recencyMultiplier } from "./recency.js";

const NOW = new Date("2026-05-04T12:00:00Z");

function daysAgo(n: number): Date {
  return new Date(NOW.getTime() - n * 24 * 60 * 60 * 1000);
}

describe("recencyMultiplier", () => {
  it("returns 1.0 for a memory updated right now", () => {
    expect(recencyMultiplier(NOW, { now: NOW })).toBeCloseTo(1.0);
  });

  it("returns 0.8 for a 365-day-old memory at default decay", () => {
    expect(recencyMultiplier(daysAgo(365), { now: NOW })).toBeCloseTo(0.8);
  });

  it("returns 0.6 for a 730-day-old memory", () => {
    expect(recencyMultiplier(daysAgo(730), { now: NOW })).toBeCloseTo(0.6);
  });

  it("floors at 0.1 for very old memories (5+ years)", () => {
    expect(recencyMultiplier(daysAgo(365 * 5), { now: NOW })).toBeCloseTo(0.1);
    expect(recencyMultiplier(daysAgo(365 * 20), { now: NOW })).toBeCloseTo(0.1);
  });

  it("returns 1.0 for future-dated memories (clamps negative age)", () => {
    expect(recencyMultiplier(daysAgo(-30), { now: NOW })).toBeCloseTo(1.0);
  });

  it("returns 0.5 (neutral) when updatedAt is missing", () => {
    expect(recencyMultiplier(null, { now: NOW })).toBe(0.5);
    expect(recencyMultiplier(undefined, { now: NOW })).toBe(0.5);
  });

  it("respects custom perYearDecay", () => {
    // α=0.5 → 365d gets 0.5
    expect(recencyMultiplier(daysAgo(365), { now: NOW, perYearDecay: 0.5 })).toBeCloseTo(0.5);
  });

  it("respects custom floor", () => {
    expect(recencyMultiplier(daysAgo(365 * 100), { now: NOW, floor: 0.3 })).toBe(0.3);
  });

  it("respects custom noDateMultiplier", () => {
    expect(recencyMultiplier(null, { noDateMultiplier: 0.0 })).toBe(0.0);
  });

  it("treats an Invalid Date as missing (neutral, not NaN)", () => {
    const invalid = new Date("not a date"); // getTime() === NaN
    const result = recencyMultiplier(invalid, { now: NOW });
    expect(result).toBe(0.5);
    expect(Number.isNaN(result)).toBe(false);
  });

  it("treats an Invalid Date with a custom noDateMultiplier", () => {
    expect(recencyMultiplier(new Date(NaN), { now: NOW, noDateMultiplier: 0.0 })).toBe(0.0);
  });

  it("captures the Portland-vs-SF temporal margin", () => {
    // From the benchmark dataset: p19 (Portland) is from 2025-06-01,
    // p20 (SF relocation) is from 2025-11-15. Today (NOW) is 2026-05-04.
    // SF should outrank Portland on recency alone.
    const portland = new Date("2025-06-01T10:00:00Z");
    const sf = new Date("2025-11-15T10:00:00Z");
    const portlandMultiplier = recencyMultiplier(portland, { now: NOW });
    const sfMultiplier = recencyMultiplier(sf, { now: NOW });
    expect(sfMultiplier).toBeGreaterThan(portlandMultiplier);
  });
});
