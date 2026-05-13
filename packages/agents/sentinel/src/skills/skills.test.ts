import { describe, it, expect } from "vitest";
import type { SkillConfig } from "@anuma/sdk";

import { SENTINEL_SKILLS } from "./index";

describe("Sentinel skills", () => {
  it("exports exactly 3 skills", () => {
    expect(SENTINEL_SKILLS).toHaveLength(3);
  });

  it("each skill satisfies SkillConfig shape", () => {
    for (const skill of SENTINEL_SKILLS) {
      const typed: SkillConfig = skill;
      expect(typeof typed.id).toBe("string");
      expect(typeof typed.name).toBe("string");
      expect(typeof typed.promptTemplate).toBe("string");
      expect(typed.promptTemplate.length).toBeGreaterThan(0);
    }
  });

  it("has the correct skill IDs", () => {
    const ids = SENTINEL_SKILLS.map((s) => s.id);
    expect(ids).toEqual([
      "finance.subscription-checker",
      "finance.chargeback-assistant",
      "finance.collection-response",
    ]);
  });

  it("subscription-checker has no required variables (file may replace text)", () => {
    const skill = SENTINEL_SKILLS.find((s) => s.id === "finance.subscription-checker")!;
    expect(skill.requiredVariables).toEqual([]);
  });

  it("chargeback-assistant requires charge_details", () => {
    const skill = SENTINEL_SKILLS.find((s) => s.id === "finance.chargeback-assistant")!;
    expect(skill.requiredVariables).toEqual(["charge_details"]);
  });

  it("collection-response requires state (statute of limitations is state-specific)", () => {
    const skill = SENTINEL_SKILLS.find((s) => s.id === "finance.collection-response")!;
    expect(skill.requiredVariables).toEqual(["state"]);
  });

  it("all skills use anthropic/claude-sonnet-4-6 as preferredModel", () => {
    for (const skill of SENTINEL_SKILLS) {
      expect(skill.preferredModel).toBe("anthropic/claude-sonnet-4-6");
    }
  });

  it("each promptTemplate is non-empty", () => {
    for (const skill of SENTINEL_SKILLS) {
      expect(skill.promptTemplate.length).toBeGreaterThan(50);
    }
  });

  it("each skill defines a userTemplate", () => {
    for (const skill of SENTINEL_SKILLS) {
      expect(typeof skill.userTemplate).toBe("string");
      expect((skill.userTemplate ?? "").length).toBeGreaterThan(0);
    }
  });

  it("userTemplate interpolates the same {{variable}} placeholders as promptTemplate", () => {
    const interpolate = (template: string, vars: Record<string, string>) =>
      template.replace(/\{\{(\w+)\}\}/g, (_, k: string) => vars[k] ?? `{{${k}}}`);

    const skill = SENTINEL_SKILLS.find((s) => s.id === "finance.collection-response")!;
    const filled = interpolate(skill.userTemplate!, {
      collector_name: "Acme Collections",
      state: "TX",
      collection_notice: "Pay us $1,234 or else.",
    });
    expect(filled).toContain("Acme Collections");
    expect(filled).toContain("TX");
    expect(filled).toContain("$1,234");
    expect(filled).not.toMatch(/\{\{\w+\}\}/);
  });
});
