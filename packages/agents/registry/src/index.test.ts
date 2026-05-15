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
