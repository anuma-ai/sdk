import { describe, it, expect } from "vitest";
import type { SkillConfig } from "@anuma/sdk";

import { HAVEN_SKILLS } from "./index";

describe("Haven skills", () => {
  it("exports exactly 4 skills", () => {
    expect(HAVEN_SKILLS).toHaveLength(4);
  });

  it("each skill satisfies SkillConfig shape", () => {
    for (const skill of HAVEN_SKILLS) {
      const typed: SkillConfig = skill;
      expect(typeof typed.id).toBe("string");
      expect(typeof typed.name).toBe("string");
      expect(typeof typed.promptTemplate).toBe("string");
      expect(typed.promptTemplate.length).toBeGreaterThan(0);
    }
  });

  it("has the correct skill IDs", () => {
    const ids = HAVEN_SKILLS.map((s) => s.id);
    expect(ids).toEqual([
      "housing.lease-review",
      "housing.demand-letter",
      "housing.rent-increase-checker",
      "housing.hoa-dispute",
    ]);
  });

  it("lease-review requires state (lease_text is optional — file upload is the alternative)", () => {
    const skill = HAVEN_SKILLS.find((s) => s.id === "housing.lease-review")!;
    expect(skill.requiredVariables).toEqual(["state"]);
  });

  it("demand-letter requires tenant/landlord/property/state/issue", () => {
    const skill = HAVEN_SKILLS.find((s) => s.id === "housing.demand-letter")!;
    expect(skill.requiredVariables).toEqual([
      "tenant_name",
      "landlord_name",
      "property_address",
      "state",
      "issue_description",
    ]);
  });

  it("rent-increase-checker requires city/state/current_rent/proposed_rent", () => {
    const skill = HAVEN_SKILLS.find((s) => s.id === "housing.rent-increase-checker")!;
    expect(skill.requiredVariables).toEqual(["city", "state", "current_rent", "proposed_rent"]);
  });

  it("hoa-dispute requires state/hoa_name/issue_type (hoa_notice is optional — file upload is the alternative)", () => {
    const skill = HAVEN_SKILLS.find((s) => s.id === "housing.hoa-dispute")!;
    expect(skill.requiredVariables).toEqual(["state", "hoa_name", "issue_type"]);
  });

  it("all skills use anthropic/claude-sonnet-4-6 as preferredModel", () => {
    for (const skill of HAVEN_SKILLS) {
      expect(skill.preferredModel).toBe("anthropic/claude-sonnet-4-6");
    }
  });

  it("each promptTemplate is non-empty", () => {
    for (const skill of HAVEN_SKILLS) {
      expect(skill.promptTemplate.length).toBeGreaterThan(50);
    }
  });
});
