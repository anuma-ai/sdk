import { describe, it, expect } from "vitest";

import { DRAFT_PROMPT, CRITIQUE_PROMPT, REVISE_PROMPT, SYNTHESIZE_PROMPT } from "./prompts";

const placeholders = (template: string): string[] =>
  [...template.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]);

describe("debate prompts", () => {
  it("each stage template is non-empty prose", () => {
    for (const template of [DRAFT_PROMPT, CRITIQUE_PROMPT, REVISE_PROMPT, SYNTHESIZE_PROMPT]) {
      expect(typeof template).toBe("string");
      expect(template.length).toBeGreaterThan(100);
    }
  });

  it("every stage names the forced tool it expects (one-step, DESIGN §0.3)", () => {
    expect(DRAFT_PROMPT).toContain("submit_draft");
    expect(CRITIQUE_PROMPT).toContain("submit_critique");
    expect(REVISE_PROMPT).toContain("submit_revision");
    expect(SYNTHESIZE_PROMPT).toContain("submit_final");
  });

  it("every stage carries the user prompt placeholder", () => {
    for (const template of [DRAFT_PROMPT, CRITIQUE_PROMPT, REVISE_PROMPT, SYNTHESIZE_PROMPT]) {
      expect(placeholders(template)).toContain("prompt");
    }
  });

  it("critique reads the other drafts; revise reads its own draft + critiques", () => {
    expect(placeholders(CRITIQUE_PROMPT)).toContain("drafts");
    expect(placeholders(REVISE_PROMPT)).toEqual(expect.arrayContaining(["draft", "critiques"]));
  });

  it("synthesize reads the final drafts and the surfaced disagreements", () => {
    expect(placeholders(SYNTHESIZE_PROMPT)).toEqual(
      expect.arrayContaining(["drafts", "disagreements"])
    );
  });

  it("uses no em dashes (house style)", () => {
    for (const template of [DRAFT_PROMPT, CRITIQUE_PROMPT, REVISE_PROMPT, SYNTHESIZE_PROMPT]) {
      expect(template).not.toContain("—");
    }
  });
});
