import { describe, it, expect } from "vitest";
import type { AgentConfig } from "@anuma/sdk";

import { APP_BUILDER_PROMPT, appBuilderAgent } from "./index";

describe("appBuilderAgent", () => {
  it("satisfies AgentConfig", () => {
    const agent: AgentConfig = appBuilderAgent;
    expect(agent).toBeDefined();
  });

  it('has id "app-builder"', () => {
    expect(appBuilderAgent.id).toBe("app-builder");
  });

  it('runtimes is ["server"]', () => {
    expect(appBuilderAgent.runtimes).toEqual(["server"]);
  });

  it("has no static skills (app-builder is conversational, not skill-driven)", () => {
    expect(appBuilderAgent.skills).toEqual([]);
  });

  it("tools is empty array (app-gen tools are runtime-instantiated via createAppGenerationTools)", () => {
    expect(appBuilderAgent.tools).toEqual([]);
  });

  it('manifest.id is "app-builder"', () => {
    expect(appBuilderAgent.manifest.id).toBe("app-builder");
  });

  it("manifest.skills is empty (matches the AgentConfig.skills array)", () => {
    expect(appBuilderAgent.manifest.skills).toEqual([]);
  });

  it("manifest does NOT contain a prompt field", () => {
    expect("prompt" in appBuilderAgent.manifest).toBe(false);
  });

  it("prompt is the exported APP_BUILDER_PROMPT constant", () => {
    expect(appBuilderAgent.prompt).toBe(APP_BUILDER_PROMPT);
  });

  it("prompt contains the App Builder identity line", () => {
    expect(appBuilderAgent.prompt).toContain("App Builder mode");
  });

  it("prompt references the audit + critique workflow", () => {
    expect(appBuilderAgent.prompt).toContain("critique_design");
    expect(appBuilderAgent.prompt).toContain("audit_design");
  });

  it("model.default is a Claude family model", () => {
    expect(appBuilderAgent.model.default).toMatch(/^anthropic\/claude-/);
  });
});
