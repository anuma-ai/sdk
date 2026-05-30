import { describe, expect, it } from "vitest";

import { APP_BUILDER_PROMPT } from "../../tools/appBuilderPrompt";
import { SLIDE_BUILDER_PROMPT } from "../../tools/slides/slidePrompt";
import { BUILT_IN_TOOL_SETS, type ToolSet, toolSetSystemPrompts } from "./serverTools";

describe("toolSetSystemPrompts", () => {
  it("attaches APP_BUILDER_PROMPT to the built-in app-generation set", () => {
    const appSet = BUILT_IN_TOOL_SETS.find((s) => s.name === "app-generation");
    expect(appSet?.systemPrompt).toBe(APP_BUILDER_PROMPT);
  });

  it("returns the app-builder prompt when an app-gen anchor is selected", () => {
    expect(toolSetSystemPrompts(["create_file"])).toEqual([APP_BUILDER_PROMPT]);
    expect(toolSetSystemPrompts(["patch_file", "App.css"])).toEqual([APP_BUILDER_PROMPT]);
  });

  it("activates on anchors only, not on non-anchor members", () => {
    // read_file is a member of the app-generation set but not an anchor, so on
    // its own it must not pull in the prompt (the set hasn't activated).
    expect(toolSetSystemPrompts(["read_file"])).toEqual([]);
  });

  it("returns nothing when no set's anchor is present", () => {
    expect(toolSetSystemPrompts(["some_unrelated_tool"])).toEqual([]);
    expect(toolSetSystemPrompts([])).toEqual([]);
  });

  it("de-duplicates when multiple anchors of the same set are selected", () => {
    expect(toolSetSystemPrompts(["create_file", "patch_file"])).toEqual([APP_BUILDER_PROMPT]);
  });

  it("attaches SLIDE_BUILDER_PROMPT to the built-in slides set", () => {
    const slidesSet = BUILT_IN_TOOL_SETS.find((s) => s.name === "slides");
    expect(slidesSet?.systemPrompt).toBe(SLIDE_BUILDER_PROMPT);
  });

  it("returns the slide-builder prompt when a slides anchor is selected", () => {
    expect(toolSetSystemPrompts(["plan_deck"])).toEqual([SLIDE_BUILDER_PROMPT]);
    expect(toolSetSystemPrompts(["patch_slides"])).toEqual([SLIDE_BUILDER_PROMPT]);
  });

  it("preserves toolSets order and skips promptless sets with a custom list", () => {
    const sets: ToolSet[] = [
      { name: "a", members: ["a1"], anchors: ["a1"], systemPrompt: "PROMPT_A" },
      { name: "b", members: ["b1"], anchors: ["b1"] },
      { name: "c", members: ["c1"], anchors: ["c1"], systemPrompt: "PROMPT_C" },
    ];
    expect(toolSetSystemPrompts(["c1", "a1", "b1"], sets)).toEqual(["PROMPT_A", "PROMPT_C"]);
  });

  it("accepts a Set as input", () => {
    expect(toolSetSystemPrompts(new Set(["create_file"]))).toEqual([APP_BUILDER_PROMPT]);
  });
});
