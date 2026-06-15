import { describe, expect, it } from "vitest";

import type { ToolConfig } from "../chat/useChat/types";
import { APP_BUILDER_PROMPT } from "../../tools/appBuilderPrompt";
import {
  activatedToolSetNames,
  BUILT_IN_TOOL_SETS,
  mergeTools,
  type ToolSet,
  toolSetSystemPrompts,
} from "./serverTools";

describe("mergeTools — client-side field preservation", () => {
  const clientTool: ToolConfig = {
    type: "function",
    function: { name: "memory_vault_save", parameters: { type: "object", properties: {} } },
    executor: async () => "ok",
    skipContinuation: true,
    deAnonymizeArgs: true,
    dependsOn: ["other"],
  };

  for (const apiType of ["responses", "completions"] as const) {
    it(`preserves executor/deAnonymizeArgs/dependsOn through ${apiType} normalization`, () => {
      const [merged] = mergeTools([], [clientTool], apiType) as Array<Record<string, unknown>>;
      // These client-side-only fields must survive normalization so runToolLoop
      // can build the executor map (deAnonymizeArgs drives PII de-anonymization).
      expect(typeof merged.executor).toBe("function");
      expect(merged.deAnonymizeArgs).toBe(true);
      expect(merged.skipContinuation).toBe(true);
      expect(merged.dependsOn).toEqual(["other"]);
    });
  }
});

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

  it("skips sets that carry no systemPrompt (e.g. slides today)", () => {
    expect(toolSetSystemPrompts(["plan_deck"])).toEqual([]);
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

  // Gating on genuine activation (the fix): a borderline anchor that ends up in
  // the selection (kept by recall-over-precision) must NOT inject the prompt
  // unless the set actually activated.
  it("gates on activatedSetNames when provided", () => {
    // create_file is selected, but no set activated → prompt suppressed.
    expect(toolSetSystemPrompts(["create_file"], BUILT_IN_TOOL_SETS, new Set())).toEqual([]);
    // app-generation activated → prompt rides in.
    expect(
      toolSetSystemPrompts(["create_file"], BUILT_IN_TOOL_SETS, new Set(["app-generation"]))
    ).toEqual([APP_BUILDER_PROMPT]);
  });
});

describe("activatedToolSetNames", () => {
  it("activates only when an anchor clears anchorMinSimilarity", () => {
    // app-generation's anchorMinSimilarity is 0.55.
    expect(activatedToolSetNames(new Map([["create_file", 0.54]]))).toEqual(new Set());
    expect(activatedToolSetNames(new Map([["create_file", 0.55]]))).toEqual(
      new Set(["app-generation"])
    );
  });

  it("activates a forced set regardless of score", () => {
    expect(
      activatedToolSetNames(
        new Map([["create_file", 0.1]]),
        BUILT_IN_TOOL_SETS,
        new Set(["app-generation"])
      )
    ).toEqual(new Set(["app-generation"]));
  });

  it("does not activate on a non-anchor member's score", () => {
    // read_file is a member but not an anchor — its score can't activate the set.
    expect(activatedToolSetNames(new Map([["read_file", 0.99]]))).toEqual(new Set());
  });
});
