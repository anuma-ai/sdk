import { describe, it, expect } from "vitest";
import type { AgentConfig } from "@anuma/sdk";

import { havenAgent } from "./index";

describe("havenAgent", () => {
  it("satisfies AgentConfig", () => {
    const agent: AgentConfig = havenAgent;
    expect(agent).toBeDefined();
  });

  it('has id "haven"', () => {
    expect(havenAgent.id).toBe("haven");
  });

  it('runtimes is ["server"]', () => {
    expect(havenAgent.runtimes).toEqual(["server"]);
  });

  it("has 4 skills", () => {
    expect(havenAgent.skills).toHaveLength(4);
  });

  it("tools is empty array", () => {
    expect(havenAgent.tools).toEqual([]);
  });

  it('manifest.id is "haven"', () => {
    expect(havenAgent.manifest.id).toBe("haven");
  });

  it("manifest.skills has 4 entries", () => {
    expect(havenAgent.manifest.skills).toHaveLength(4);
  });

  it("manifest does NOT contain a prompt field", () => {
    expect("prompt" in havenAgent.manifest).toBe(false);
  });

  it("prompt is non-empty and contains Haven identity", () => {
    expect(havenAgent.prompt).toContain("You are Haven");
  });

  it("model.default is anthropic/claude-sonnet-4-6", () => {
    expect(havenAgent.model.default).toBe("anthropic/claude-sonnet-4-6");
  });

  it("skillJourneys is defined", () => {
    expect(havenAgent.skillJourneys).toBeDefined();
  });

  it("skillJourneys has 4 entries", () => {
    expect(Object.keys(havenAgent.skillJourneys!)).toHaveLength(4);
  });

  it("each skill has a corresponding skillJourney entry", () => {
    for (const skill of havenAgent.skills) {
      expect(havenAgent.skillJourneys![skill.id]).toBeDefined();
    }
  });

  it("each skill's requiredVariables is covered by required journey fields", () => {
    for (const skill of havenAgent.skills) {
      const journey = havenAgent.skillJourneys![skill.id];
      const requiredFieldKeys = new Set(
        journey.fields.filter((f) => f.required === true).map((f) => f.key)
      );
      for (const variable of skill.requiredVariables ?? []) {
        expect(
          requiredFieldKeys.has(variable),
          `${skill.id}.requiredVariables[${variable}] must be a required journey field`
        ).toBe(true);
      }
    }
  });
});
