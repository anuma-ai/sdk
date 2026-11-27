import { describe, expect, it } from "vitest";

import { ZETALABS_MARKETS_PROFILE } from "../../../../src/lib/memory/appProfile.js";
import type { FactType } from "../../../../src/lib/memory/autoExtract.js";
import { EXTRACTION_CASES, type ExtractionCategory, FINANCE_EXTRACTION_CASES } from "./dataset.js";

const TYPE_BY_CATEGORY: Partial<Record<ExtractionCategory, FactType>> = {
  holding: "ongoing_context",
  trade: "ongoing_context",
  watchlist: "ongoing_context",
  thesis: "plan",
  "trade-plan": "plan",
  "risk-limit": "constraint",
  "venue-wallet": "preference",
  instrument: "preference",
  instruction: "instruction",
};

describe("finance extraction cases", () => {
  it("cover every category of the markets profile, and negatives", () => {
    const categories = new Set(FINANCE_EXTRACTION_CASES.map((c) => c.category));
    expect([...categories].sort()).toEqual([...Object.keys(TYPE_BY_CATEGORY), "negative"].sort());
  });

  it("include negatives for assistant-stated prices and pasted third-party text", () => {
    const negatives = FINANCE_EXTRACTION_CASES.filter((c) => c.category === "negative");
    expect(negatives.map((c) => c.id)).toEqual(
      expect.arrayContaining(["f-neg-assistant-prices", "f-neg-pasted-research"])
    );
    for (const c of negatives) {
      expect(c.expected).toEqual([]);
      expect(c.forbidden?.length).toBeGreaterThan(0);
    }
  });

  it("expect the fact type the profile maps each category to", () => {
    for (const c of FINANCE_EXTRACTION_CASES.filter((x) => x.category !== "negative")) {
      expect(c.expectedTypes, c.id).toEqual(c.expected.map(() => TYPE_BY_CATEGORY[c.category]));
    }
  });

  it("keep every gold fact within the profile content cap", () => {
    for (const fact of FINANCE_EXTRACTION_CASES.flatMap((c) => c.expected))
      expect(fact.length).toBeLessThanOrEqual(ZETALABS_MARKETS_PROFILE.maxContentLength ?? 0);
  });

  it("use case ids unique across both datasets", () => {
    const ids = [...EXTRACTION_CASES, ...FINANCE_EXTRACTION_CASES].map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("leave the general dataset untouched", () => {
    expect(EXTRACTION_CASES).toHaveLength(45);
    expect(EXTRACTION_CASES.some((c) => c.expectedTypes)).toBe(false);
  });
});
