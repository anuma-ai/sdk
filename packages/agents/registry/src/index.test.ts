import { describe, expect, it } from "vitest";

import { getAgent, getAgentSkillMeta, listAgents } from "./index";

describe("agents-registry", () => {
  it("lists Haven and Sentinel", () => {
    const ids = listAgents().map((a) => a.id);
    expect(ids).toEqual(expect.arrayContaining(["haven", "sentinel"]));
  });

  it("returns Haven skill meta", () => {
    const meta = getAgentSkillMeta("haven", "housing.lease-review");
    expect(meta?.requiredVariables).toContain("state");
  });

  it("surfaces smsPrompts when defined on the skill", () => {
    const meta = getAgentSkillMeta("haven", "housing.lease-review");
    expect(meta?.smsPrompts).toBeDefined();
    expect(meta?.smsPrompts?.state?.trim().length).toBeGreaterThan(0);
    for (const name of meta?.requiredVariables ?? []) {
      expect(meta?.smsPrompts?.[name]?.trim().length).toBeGreaterThan(0);
    }
  });

  it("returns Sentinel skill meta with smsPrompts", () => {
    const meta = getAgentSkillMeta("sentinel", "finance.collection-response");
    expect(meta?.requiredVariables).toContain("state");
    expect(meta?.smsPrompts?.state?.trim().length).toBeGreaterThan(0);
  });

  it("returns null for unknown agent", () => {
    expect(getAgent("unknown")).toBeNull();
    expect(getAgentSkillMeta("unknown", "x.y")).toBeNull();
  });

  it("returns null for unknown skill on known agent", () => {
    expect(getAgentSkillMeta("haven", "nope.nope")).toBeNull();
  });

  it("matches agent id case-insensitively", () => {
    expect(getAgent("HAVEN")?.id).toBe("haven");
  });
});
