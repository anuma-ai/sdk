import { describe, expect, it } from "vitest";

import {
  buildAppSystemPrompt,
  buildSlideSystemPrompt,
  createAppGenerationTools,
  createSlideTools,
  MapFileStorage,
  type ToolConfig,
} from "./index.js";

const KNOWN_NON_TOOL_WORDS = new Set<string>([
  "update_element",
  "replace_element",
  "insert_element",
  "remove_element",
  "replace_slide",
  "insert_slide",
  "remove_slide",
  "update_theme",
  "check_circle",
  "rocket_launch",
  "trending_up",
  "replaces_interaction_id",
  "anuma_create_image",
]);

const SNAKE_CASE_RE = /\b[a-z]+(?:_[a-z]+)+\b/g;

function extractSnakeCaseWords(text: string): Set<string> {
  return new Set(text.match(SNAKE_CASE_RE) ?? []);
}

function toolFn(tool: ToolConfig): { name: string; description?: string } {
  return tool.function as { name: string; description?: string };
}

function getToolNames(tools: ToolConfig[]): Set<string> {
  return new Set(tools.map((t) => toolFn(t).name));
}

function buildTools(): { app: ToolConfig[]; slide: ToolConfig[] } {
  const app = createAppGenerationTools({
    getConversationId: () => "test-conversation",
    storage: new MapFileStorage(),
  });
  const slide = createSlideTools({
    getConversationId: () => "test-conversation",
    storage: new MapFileStorage(),
  });
  return { app, slide };
}

describe("tool prompt/schema consistency", () => {
  const { app, slide } = buildTools();
  const allToolNames = new Set([...getToolNames(app), ...getToolNames(slide)]);

  function assertNoUnknownReferences(label: string, text: string): void {
    const unknown = [...extractSnakeCaseWords(text)].filter(
      (w) => !allToolNames.has(w) && !KNOWN_NON_TOOL_WORDS.has(w)
    );
    expect(
      unknown,
      `${label} mentions snake_case identifier(s) that aren't registered tools or in KNOWN_NON_TOOL_WORDS: ${unknown.join(", ")}`
    ).toEqual([]);
  }

  it("app tool descriptions only reference registered tools", () => {
    for (const tool of app) {
      const { name, description } = toolFn(tool);
      assertNoUnknownReferences(`${name}.description`, description ?? "");
    }
  });

  it("slide tool descriptions only reference registered tools", () => {
    for (const tool of slide) {
      const { name, description } = toolFn(tool);
      assertNoUnknownReferences(`${name}.description`, description ?? "");
    }
  });

  it("app system prompt only references registered tools", () => {
    assertNoUnknownReferences("buildAppSystemPrompt()", buildAppSystemPrompt());
  });

  it("slide system prompt only references registered tools", () => {
    assertNoUnknownReferences("buildSlideSystemPrompt()", buildSlideSystemPrompt());
  });

  it("slide system prompt disambiguates palette names from design-system suffixes", () => {
    const prompt = buildSlideSystemPrompt();
    expect(prompt).toMatch(/Palette names .*\bnot a system\b/i);
    expect(prompt).toMatch(/humanist cream/);
    expect(prompt).toMatch(/paletteName/);
  });

  it("flags a snake_case reference to a non-existent tool", () => {
    const ghostText = "After writing files, call ghost_tool to refresh.";
    const unknown = [...extractSnakeCaseWords(ghostText)].filter(
      (w) => !allToolNames.has(w) && !KNOWN_NON_TOOL_WORDS.has(w)
    );
    expect(unknown).toEqual(["ghost_tool"]);
  });

  it("ignores camelCase / kebab-case / dot-paths so CSS and config keys don't false-positive", () => {
    const noise =
      "Set fontSize to 18; use background-color: red; edit package.json; tag <Anuma.Slide>.";
    const unknown = [...extractSnakeCaseWords(noise)].filter(
      (w) => !allToolNames.has(w) && !KNOWN_NON_TOOL_WORDS.has(w)
    );
    expect(unknown).toEqual([]);
  });
});
