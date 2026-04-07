import { describe, it, expect } from "vitest";

import { PERSONA_PRESETS, presetContext } from "./presets";
import { buildSystemPrompt } from "./buildPrompt";

describe("PERSONA_PRESETS", () => {
  it("includes app-builder preset", () => {
    const preset = PERSONA_PRESETS["app-builder"];
    expect(preset).toBeDefined();
    expect(preset.basePrompt).toContain("App Builder mode");
    expect(preset.basePrompt).toContain("WORKFLOW");
    expect(preset.basePrompt).toContain("VISUAL DESIGN");
  });
});

describe("presetContext", () => {
  it("returns a PromptContext for a valid preset", () => {
    const ctx = presetContext("app-builder");
    expect(ctx.basePrompt).toContain("App Builder mode");
  });

  it("throws for an unknown preset", () => {
    expect(() => presetContext("nonexistent")).toThrow('Unknown persona preset: "nonexistent"');
  });

  it("merges overrides into the context", () => {
    const ctx = presetContext("app-builder", { preferredLanguage: "ja" });
    expect(ctx.basePrompt).toContain("App Builder mode");
    expect(ctx.preferredLanguage).toBe("ja");
  });

  it("works end-to-end with buildSystemPrompt", () => {
    const ctx = presetContext("app-builder");
    const result = buildSystemPrompt(ctx);
    expect(result.prompt).toContain("App Builder mode");
    expect(result.activeSections).toContain("base");
    expect(result.activeSections).toContain("date");
  });
});
