import { describe, it, expect } from "vitest";

import type { AgentConfig, AgentManifest, SkillConfig } from "./types";

describe("Agent type definitions", () => {
  it("a Haven-shaped object satisfies AgentConfig", () => {
    const config: AgentConfig = {
      id: "haven",
      runtimes: ["server"],
      prompt: "You are Haven, a housing advisor.",
      skills: [
        {
          id: "housing.lease-review",
          name: "Lease Review",
          promptTemplate: "Review this lease for {{state}}.",
          requiredTools: ["JinaMCP-search_web"],
          preferredModel: "anthropic/claude-sonnet-4-6",
          maxSteps: 15,
          requiredVariables: ["state", "lease_text"],
          contextSuffix: "Extra context here.",
        },
      ],
      tools: [],
      model: { default: "anthropic/claude-sonnet-4-6", allowed: ["anthropic/claude-sonnet-4-6"] },
      manifest: {
        id: "haven",
        name: "Haven",
        description: "Housing advisor",
        runtimes: ["server"],
        skills: [
          {
            id: "housing.lease-review",
            name: "Lease Review",
            requiredVariables: ["state", "lease_text"],
          },
        ],
      },
    };

    expect(config.id).toBe("haven");
    expect(config.runtimes).toContain("server");
    expect(config.skills).toHaveLength(1);
    expect(config.tools).toEqual([]);
    expect(config.model.default).toBe("anthropic/claude-sonnet-4-6");
  });

  it("AgentManifest excludes prompt field", () => {
    const manifest: AgentManifest = {
      id: "haven",
      name: "Haven",
      description: "Housing advisor",
      runtimes: ["server"],
      skills: [{ id: "housing.lease-review", name: "Lease Review" }],
    };

    expect("prompt" in manifest).toBe(false);
    expect(manifest.id).toBe("haven");
  });

  it("SkillConfig with all optional fields is valid", () => {
    const skill: SkillConfig = {
      id: "housing.lease-review",
      name: "Lease Review",
      promptTemplate: "Analyze this lease under {{state}} law.",
      requiredTools: ["JinaMCP-search_web"],
      preferredModel: "anthropic/claude-sonnet-4-6",
      maxSteps: 15,
      requiredVariables: ["state", "lease_text"],
      contextSuffix: "Memory context here.",
    };

    expect(skill.id).toBe("housing.lease-review");
    expect(skill.requiredTools).toHaveLength(1);
    expect(skill.maxSteps).toBe(15);
  });

  it("SkillConfig with only required fields is valid", () => {
    const skill: SkillConfig = {
      id: "test.minimal",
      name: "Minimal Skill",
      promptTemplate: "Do the thing.",
    };

    expect(skill.id).toBe("test.minimal");
    expect(skill.requiredTools).toBeUndefined();
    expect(skill.preferredModel).toBeUndefined();
    expect(skill.maxSteps).toBeUndefined();
    expect(skill.requiredVariables).toBeUndefined();
    expect(skill.contextSuffix).toBeUndefined();
  });
});
