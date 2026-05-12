/**
 * Static cross-check between LLM-facing instructions and the actual
 * tool registry.
 *
 * Background: every tool's `function.description` and the per-mode
 * system prompts both tell the model what to do. They're maintained by
 * hand, in different files. The class of bug this test prevents:
 * removing or renaming a tool but leaving "...then call <oldName>" in
 * a description or prompt. We just shipped exactly such a regression
 * (`CREATE_FILE_SCHEMA` instructed the model to call `display_app`
 * months after the tool was deleted), so this test exists to make the
 * next occurrence loud.
 *
 * Strategy: pull every snake_case identifier out of each text source
 * (descriptions + system prompts) and assert it's either a registered
 * tool name or in `KNOWN_NON_TOOL_WORDS` (patch operation names,
 * Material icon names, etc.). When the allowlist needs a new entry,
 * add it explicitly — the noise-up-front is the point.
 */

import { describe, expect, it } from "vitest";

import {
  buildAppSystemPrompt,
  buildSlideSystemPrompt,
  createAppGenerationTools,
  createSlideTools,
  MapFileStorage,
  type ToolConfig,
} from "./index.js";

/**
 * Snake_case identifiers that legitimately appear in our prompts but
 * aren't tool names. Keep this list short and explicit — every entry
 * is a deliberate exception.
 */
const KNOWN_NON_TOOL_WORDS = new Set<string>([
  // `patch_slides` operation `action` values — they share the
  // verb_noun shape with tool names but are arguments, not tools.
  "replace_element",
  "insert_element",
  "remove_element",
  "replace_slide",
  "insert_slide",
  "remove_slide",
  "update_theme",
  // Material Symbols Rounded icon names referenced in the slide system
  // prompt's ICONS section.
  "check_circle",
  "rocket_launch",
  "trending_up",
  // Field name used in tool result JSON for interaction-id chaining.
  // Documented in `patch_slides`'s description as the threading key.
  "replaces_interaction_id",
  // External MCP tool from a different server (AnumaImageMCP) — the
  // slide system prompt references it for image generation. Not part
  // of this SDK's tool registry, so it can't be auto-resolved.
  "generate_cloud_image",
]);

/**
 * Match `lower_snake_case` words with at least one underscore.
 * Deliberately excludes camelCase, kebab-case, dot-paths, and uppercase
 * identifiers — those don't collide with tool name shape and would
 * just inflate the allowlist with CSS / JSX noise.
 */
const SNAKE_CASE_RE = /\b[a-z]+(?:_[a-z]+)+\b/g;

function extractSnakeCaseWords(text: string): Set<string> {
  return new Set(text.match(SNAKE_CASE_RE) ?? []);
}

function getToolNames(tools: ToolConfig[]): Set<string> {
  return new Set(tools.map((t) => t.function.name));
}

/**
 * Build both tool sets with minimal stubs. We never execute the tools
 * — we only inspect their schema metadata — so storage / callbacks can
 * be no-ops.
 */
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

  /**
   * Assert every snake_case identifier in `text` is either a real tool
   * name or in the allowlist. Fails with a message that names the
   * source so the developer knows where to fix.
   */
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
      const desc = tool.function.description ?? "";
      assertNoUnknownReferences(`${tool.function.name}.description`, desc);
    }
  });

  it("slide tool descriptions only reference registered tools", () => {
    for (const tool of slide) {
      const desc = tool.function.description ?? "";
      assertNoUnknownReferences(`${tool.function.name}.description`, desc);
    }
  });

  it("app system prompt only references registered tools", () => {
    assertNoUnknownReferences("buildAppSystemPrompt()", buildAppSystemPrompt());
  });

  it("slide system prompt only references registered tools", () => {
    assertNoUnknownReferences("buildSlideSystemPrompt()", buildSlideSystemPrompt());
  });

  // ---------------------------------------------------------------------------
  // Sanity: confirm the test would catch a regression
  // ---------------------------------------------------------------------------

  it("flags a snake_case reference to a non-existent tool", () => {
    // This is the bug class we just hit — the description tells the
    // model to call a tool that doesn't exist. The test should detect
    // it; if this assertion stops failing without us removing the
    // ghost reference, the detector is broken.
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
