import { describe, it, expect } from "vitest";
import type { AgentConfig } from "@anuma/sdk";

import { sentinelAgent } from "./index";

describe("sentinelAgent", () => {
  it("satisfies AgentConfig", () => {
    const agent: AgentConfig = sentinelAgent;
    expect(agent).toBeDefined();
  });

  it('has id "sentinel"', () => {
    expect(sentinelAgent.id).toBe("sentinel");
  });

  it('runtimes is ["server"]', () => {
    expect(sentinelAgent.runtimes).toEqual(["server"]);
  });

  it("has 3 skills", () => {
    expect(sentinelAgent.skills).toHaveLength(3);
  });

  it("tools is empty array", () => {
    expect(sentinelAgent.tools).toEqual([]);
  });

  it('manifest.id is "sentinel"', () => {
    expect(sentinelAgent.manifest.id).toBe("sentinel");
  });

  it("manifest.skills has 3 entries", () => {
    expect(sentinelAgent.manifest.skills).toHaveLength(3);
  });

  it("manifest does NOT contain a prompt field", () => {
    expect("prompt" in sentinelAgent.manifest).toBe(false);
  });

  it("prompt is non-empty and contains Sentinel identity", () => {
    expect(sentinelAgent.prompt).toContain("You are Sentinel");
  });

  it("model.default is anthropic/claude-sonnet-4-6", () => {
    expect(sentinelAgent.model.default).toBe("anthropic/claude-sonnet-4-6");
  });

  it("skillJourneys is defined", () => {
    expect(sentinelAgent.skillJourneys).toBeDefined();
  });

  it("skillJourneys has 3 entries", () => {
    expect(Object.keys(sentinelAgent.skillJourneys!)).toHaveLength(3);
  });

  it("each skill has a corresponding skillJourney entry", () => {
    for (const skill of sentinelAgent.skills) {
      expect(sentinelAgent.skillJourneys![skill.id]).toBeDefined();
    }
  });

  it("firstTimeDisclaimer is a non-empty string mentioning AI and Privacy Policy", () => {
    expect(typeof sentinelAgent.firstTimeDisclaimer).toBe("string");
    expect(sentinelAgent.firstTimeDisclaimer!.length).toBeGreaterThan(0);
    expect(sentinelAgent.firstTimeDisclaimer).toContain("AI");
    expect(sentinelAgent.firstTimeDisclaimer).toContain("Privacy Policy");
  });

  it("firstTimeDisclaimer contains the {{agent_name}} placeholder", () => {
    expect(sentinelAgent.firstTimeDisclaimer).toContain("{{agent_name}}");
  });

  it("persistentFooter is a non-empty single-line string", () => {
    expect(typeof sentinelAgent.persistentFooter).toBe("string");
    expect(sentinelAgent.persistentFooter!.length).toBeGreaterThan(0);
    expect(sentinelAgent.persistentFooter).not.toContain("\n");
  });

  it("persistentFooter contains the {{agent_name}} placeholder", () => {
    expect(sentinelAgent.persistentFooter).toContain("{{agent_name}}");
  });

  it("each skill's requiredVariables has a matching journey field", () => {
    // requiredVariables is the full set of slots the prompt template needs (used
    // by the SMS gateway, which has no file upload). Every required variable
    // must have a matching journey field — even when the journey accepts file
    // uploads, the SMS path needs the same data via a question prompt.
    for (const skill of sentinelAgent.skills) {
      const journey = sentinelAgent.skillJourneys![skill.id];
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
