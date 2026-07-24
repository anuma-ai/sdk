import { describe, expect, it } from "vitest";

import type { LlmapiChatCompletionTool } from "../../../client";
import { autoFilterClientTools, getToolName } from "../clientToolSelection";
import {
  deriveActiveToolSets,
  mergeActiveToolSets,
  type ToolActivationEvent,
} from "./activeToolSets";

describe("deriveActiveToolSets — event-shape-agnostic", () => {
  it("detects a set from a tool-result event (web signal 1 shape)", () => {
    const events: ToolActivationEvent[] = [{ kind: "tool-result", toolName: "plan_deck" }];
    expect(deriveActiveToolSets(events)).toEqual(["slides"]);
  });

  it("detects a set from a server-tool-phase id (web signal 2 shape)", () => {
    // 'server-tool-create_file-2' → ends with '-create_file'? no; contains
    // '-create_file-' → matches app-generation member create_file.
    const events: ToolActivationEvent[] = [
      { kind: "server-tool-phase", phaseId: "server-tool-create_file-2" },
    ];
    expect(deriveActiveToolSets(events)).toEqual(["app-generation"]);
  });

  it("matches a phase id that exactly equals the member", () => {
    const events: ToolActivationEvent[] = [{ kind: "server-tool-phase", phaseId: "patch_slides" }];
    expect(deriveActiveToolSets(events)).toEqual(["slides"]);
  });

  it("accumulates monotonically across events and ignores non-matches", () => {
    const events: ToolActivationEvent[] = [
      { kind: "tool-result", toolName: "plan_deck" }, // slides
      { kind: "tool-result", toolName: "unrelated_tool" }, // no set
      { kind: "server-tool-phase", phaseId: "server-tool-create_file-1" }, // app-generation
    ];
    expect(deriveActiveToolSets(events).sort()).toEqual(["app-generation", "slides"]);
  });

  it("returns [] when nothing matches", () => {
    expect(deriveActiveToolSets([{ kind: "tool-result", toolName: "nope" }])).toEqual([]);
  });
});

describe("mergeActiveToolSets — append-only union", () => {
  it("unions without removing", () => {
    expect(mergeActiveToolSets(["slides"], ["documents"]).sort()).toEqual(["documents", "slides"]);
  });
  it("keeps the same reference when nothing new is derived", () => {
    const current = ["slides"];
    expect(mergeActiveToolSets(current, [])).toBe(current);
    expect(mergeActiveToolSets(current, ["slides"])).toBe(current);
  });
});

describe("regression: derived sticky set survives a terse follow-up", () => {
  it("['slides'] + a 3-char prompt keeps the slide toolkit (not [])", async () => {
    // 1. History shows a slide tool ran → derive sticky sets.
    const active = deriveActiveToolSets([{ kind: "tool-result", toolName: "plan_deck" }]);
    expect(active).toEqual(["slides"]);

    // 2. A terse follow-up ("big") is below the length gate → promptEmbeddings=null,
    //    reason "short-prompt". Without the sticky set this would send zero tools;
    //    with it, the slide toolkit is retained.
    const tool = (name: string): LlmapiChatCompletionTool =>
      ({ type: "function", name }) as unknown as LlmapiChatCompletionTool;
    const clientTools = [tool("recall_memory"), tool("plan_deck"), tool("notion_search")];
    const { tools } = await autoFilterClientTools(
      clientTools,
      null,
      new Map(),
      {},
      [],
      active,
      "short-prompt"
    );
    const got = tools.map(getToolName);
    expect(got).toContain("plan_deck");
    expect(got).toContain("recall_memory");
    expect(got).not.toContain("notion_search");
  });
});
