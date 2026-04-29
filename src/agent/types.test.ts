import { describe, it, expect } from "vitest";

import type {
  AgentConfig,
  AgentManifest,
  SkillConfig,
  SkillJourneyDefinition,
  SkillJourneyField,
  SkillJourneyFieldType,
} from "./types";

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

  it("SkillJourneyField with all fields satisfies the type", () => {
    const field: SkillJourneyField = {
      key: "state",
      label: "State",
      placeholder: "Select your state",
      helper: "Required for state-specific rules.",
      type: "select",
      required: true,
      options: ["CA", "NY", "TX"],
    };

    expect(field.key).toBe("state");
    expect(field.type).toBe("select");
    expect(field.required).toBe(true);
    expect(field.options).toHaveLength(3);
  });

  it("SkillJourneyDefinition with all fields satisfies the type", () => {
    const journey: SkillJourneyDefinition = {
      title: "Lease review",
      description: "Reviews a lease for red flags.",
      steps: ["Upload lease", "Review results"],
      acceptsFiles: true,
      fileLabel: "Upload a lease PDF",
      fileHint: "PDF or scanned document",
      fields: [
        {
          key: "state",
          label: "State",
          placeholder: "Select state",
          type: "select",
          required: true,
          options: ["CA"],
        },
      ],
      requiresContext: true,
      submitLabel: "Review in chat",
      promptTitle: "Review this lease",
      systemContext: "Parse the lease clause by clause.",
    };

    expect(journey.title).toBe("Lease review");
    expect(journey.acceptsFiles).toBe(true);
    expect(journey.fields).toHaveLength(1);
    expect(journey.systemContext).toBeDefined();
  });

  it("SkillJourneyFieldType only accepts text, textarea, select", () => {
    const types: SkillJourneyFieldType[] = ["text", "textarea", "select"];
    expect(types).toHaveLength(3);
    const t: SkillJourneyFieldType = "text";
    expect(t).toBe("text");
  });

  it("AgentConfig accepts optional skillJourneys field", () => {
    const configWithJourneys: AgentConfig = {
      id: "test",
      runtimes: ["server"],
      prompt: "Test prompt",
      skills: [],
      tools: [],
      model: { default: "test-model" },
      manifest: {
        id: "test",
        name: "Test",
        description: "Test agent",
        runtimes: ["server"],
        skills: [],
      },
      skillJourneys: {
        "test.skill": {
          title: "Test",
          description: "A test journey",
          steps: ["Step 1"],
          acceptsFiles: false,
          fileLabel: "",
          fileHint: "",
          fields: [],
          requiresContext: false,
          submitLabel: "Go",
          promptTitle: "Run test",
        },
      },
    };

    expect(configWithJourneys.skillJourneys).toBeDefined();
    expect(Object.keys(configWithJourneys.skillJourneys!)).toHaveLength(1);
  });

  it("AgentConfig without skillJourneys is still valid", () => {
    const config: AgentConfig = {
      id: "test",
      runtimes: ["server"],
      prompt: "Test prompt",
      skills: [],
      tools: [],
      model: { default: "test-model" },
      manifest: {
        id: "test",
        name: "Test",
        description: "Test agent",
        runtimes: ["server"],
        skills: [],
      },
    };

    expect(config.skillJourneys).toBeUndefined();
  });
});
