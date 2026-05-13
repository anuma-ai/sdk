import { describe, it, expect } from "vitest";
import { buildSystemPrompt } from "@anuma/sdk";

import { SENTINEL_PROMPT } from "./prompt";

describe("SENTINEL_PROMPT", () => {
  it("is a non-empty string", () => {
    expect(typeof SENTINEL_PROMPT).toBe("string");
    expect(SENTINEL_PROMPT.length).toBeGreaterThan(0);
  });

  it("contains Sentinel identity marker", () => {
    expect(SENTINEL_PROMPT).toContain("You are Sentinel");
  });

  it("contains core capability markers", () => {
    expect(SENTINEL_PROMPT.toLowerCase()).toContain("subscription");
    expect(SENTINEL_PROMPT.toLowerCase()).toContain("chargeback");
    expect(SENTINEL_PROMPT.toLowerCase()).toContain("collection");
  });

  it("contains the NOT-a-financial-planner disclaimer", () => {
    expect(SENTINEL_PROMPT).toContain("You are NOT a financial planner");
  });

  it("works as basePrompt in buildSystemPrompt", () => {
    const result = buildSystemPrompt({ basePrompt: SENTINEL_PROMPT });
    expect(result.prompt).toContain("You are Sentinel");
    expect(result.activeSections).toContain("base");
  });
});
