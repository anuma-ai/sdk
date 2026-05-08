import { describe, it, expect } from "vitest";
import { buildSystemPrompt } from "@anuma/sdk";

import { HAVEN_PROMPT } from "./prompt";

describe("HAVEN_PROMPT", () => {
  it("is a non-empty string", () => {
    expect(typeof HAVEN_PROMPT).toBe("string");
    expect(HAVEN_PROMPT.length).toBeGreaterThan(0);
  });

  it("contains Haven identity marker", () => {
    expect(HAVEN_PROMPT).toContain("You are Haven");
  });

  it("contains core capability markers", () => {
    expect(HAVEN_PROMPT).toContain("Lease review");
    expect(HAVEN_PROMPT).toContain("Rent increase analysis");
    expect(HAVEN_PROMPT).toContain("Demand letters");
    expect(HAVEN_PROMPT).toContain("HOA disputes");
  });

  it("contains the NOT-a-lawyer disclaimer", () => {
    expect(HAVEN_PROMPT).toContain("You are NOT a lawyer");
  });

  it("works as basePrompt in buildSystemPrompt", () => {
    const result = buildSystemPrompt({ basePrompt: HAVEN_PROMPT });
    expect(result.prompt).toContain("You are Haven");
    expect(result.activeSections).toContain("base");
  });
});
