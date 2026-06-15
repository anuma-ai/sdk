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

  it("prompt is non-empty and contains the agent identity", () => {
    expect(havenAgent.prompt).toContain("You are Anuma Housing Agent");
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

  it("firstTimeDisclaimer is a non-empty string mentioning AI and Privacy Policy", () => {
    expect(typeof havenAgent.firstTimeDisclaimer).toBe("string");
    expect(havenAgent.firstTimeDisclaimer!.length).toBeGreaterThan(0);
    expect(havenAgent.firstTimeDisclaimer).toContain("AI");
    expect(havenAgent.firstTimeDisclaimer).toContain("Privacy Policy");
  });

  it("firstTimeDisclaimer contains the {{agent_name}} placeholder", () => {
    expect(havenAgent.firstTimeDisclaimer).toContain("{{agent_name}}");
  });

  it("persistentFooter is a non-empty single-line string", () => {
    expect(typeof havenAgent.persistentFooter).toBe("string");
    expect(havenAgent.persistentFooter!.length).toBeGreaterThan(0);
    expect(havenAgent.persistentFooter).not.toContain("\n");
  });

  it("persistentFooter contains the {{agent_name}} placeholder", () => {
    expect(havenAgent.persistentFooter).toContain("{{agent_name}}");
  });

  it("each skill's requiredVariables has a matching journey field", () => {
    // requiredVariables is the full set of slots the prompt template needs (used
    // by the SMS gateway, which has no file upload). Every required variable
    // must have a matching journey field — even when the journey accepts file
    // uploads, the SMS path needs the same data via a question prompt.
    for (const skill of havenAgent.skills) {
      const journey = havenAgent.skillJourneys![skill.id];
      const fieldKeys = new Set(journey.fields.map((f) => f.key));
      for (const variable of skill.requiredVariables ?? []) {
        expect(
          fieldKeys.has(variable),
          `${skill.id}.requiredVariables[${variable}] must have a matching journey field`
        ).toBe(true);
      }
    }
  });
});
