import { describe, expect, it } from "vitest";

import type { LlmapiChatCompletionTool } from "../../client";
import { autoFilterClientTools, getToolDescription, getToolName } from "./clientToolSelection";

/** Build a flat-shape client tool. */
function tool(name: string, description = name): LlmapiChatCompletionTool {
  return { type: "function", name, description } as unknown as LlmapiChatCompletionTool;
}

/** Build a function-call-shape client tool (the other supported shape). */
function fnTool(name: string, description = name): LlmapiChatCompletionTool {
  return {
    type: "function",
    function: { name, description },
  } as unknown as LlmapiChatCompletionTool;
}

const names = (tools: LlmapiChatCompletionTool[]) => tools.map(getToolName);

describe("getToolName / getToolDescription", () => {
  it("reads both flat and function-call shapes", () => {
    expect(getToolName(tool("a"))).toBe("a");
    expect(getToolName(fnTool("b"))).toBe("b");
    expect(getToolDescription(tool("a", "desc"))).toBe("desc");
    expect(getToolDescription(fnTool("b", "d2"))).toBe("d2");
    // description falls back to the name
    expect(getToolDescription(tool("c", ""))).toBe("c");
  });
});

describe("autoFilterClientTools — gate outcomes (parity)", () => {
  const cache = () => new Map<string, number[]>();

  it("always keeps memory tools; a memory-only catalog passes through", async () => {
    const clientTools = [tool("recall_memory"), tool("memory_vault_save")];
    const { tools } = await autoFilterClientTools(clientTools, null, cache(), {});
    // filterCandidates is empty → everything passes through
    expect(names(tools).sort()).toEqual(["memory_vault_save", "recall_memory"]);
  });

  it("short-prompt + no active sets → zero tools (the length gate)", async () => {
    const clientTools = [tool("recall_memory"), tool("notion_search")];
    const { tools, activatedSetNames } = await autoFilterClientTools(
      clientTools,
      null,
      cache(),
      {},
      [],
      [],
      "short-prompt"
    );
    expect(tools).toEqual([]);
    expect([...(activatedSetNames ?? [])]).toEqual([]);
  });

  it("short-prompt + sticky ['slides'] → memory + sticky set members retained (terse-follow-up fix)", async () => {
    const clientTools = [
      tool("recall_memory"),
      tool("plan_deck"), // a 'slides' set member
      tool("add_slide"), // a 'slides' set member
      tool("notion_search"), // unrelated connector — should be dropped
    ];
    const { tools, activatedSetNames } = await autoFilterClientTools(
      clientTools,
      null,
      cache(),
      {},
      [],
      ["slides"],
      "short-prompt"
    );
    expect(names(tools).sort()).toEqual(["add_slide", "plan_deck", "recall_memory"]);
    expect([...(activatedSetNames ?? [])]).toEqual(["slides"]);
  });

  it("error reason (embeddings outage) → degrades to the FULL catalog", async () => {
    const clientTools = [tool("recall_memory"), tool("notion_search"), tool("display_chart")];
    const { tools } = await autoFilterClientTools(clientTools, null, cache(), {}, [], [], "error");
    expect(names(tools).sort()).toEqual(["display_chart", "notion_search", "recall_memory"]);
  });

  it("semantic path: keeps the aligned tool + memory, drops the orthogonal one", async () => {
    // Pre-populate the embedding cache so no network call is needed.
    const c = new Map<string, number[]>([
      ["display_weather", [1, 0]],
      ["display_chart", [0, 1]],
    ]);
    const clientTools = [
      tool("recall_memory"),
      tool("display_weather", "show the weather"),
      tool("display_chart", "render a chart"),
    ];
    // Prompt embedding aligned with display_weather, orthogonal to display_chart.
    const { tools } = await autoFilterClientTools(clientTools, [1, 0], c, {});
    const got = names(tools);
    expect(got).toContain("recall_memory"); // memory always kept
    expect(got).toContain("display_weather"); // aligned → selected
    expect(got).not.toContain("display_chart"); // orthogonal → dropped
  });
});
