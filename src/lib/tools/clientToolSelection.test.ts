import { describe, expect, it } from "vitest";

import type { LlmapiChatCompletionTool } from "../../client";
import { CONFIRM_TOOL_NAME } from "../../tools/confirmConstants";
import { autoFilterClientTools, getToolDescription, getToolName } from "./clientToolSelection";

function tool(name: string, description = name): LlmapiChatCompletionTool {
  return { type: "function", name, description } as unknown as LlmapiChatCompletionTool;
}

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
    expect(getToolDescription(tool("c", ""))).toBe("c");
  });
});

describe("autoFilterClientTools — gate outcomes (parity)", () => {
  const cache = () => new Map<string, number[]>();

  it("always keeps memory tools; a memory-only catalog passes through", async () => {
    const clientTools = [tool("recall_memory"), tool("memory_vault_save")];
    const { tools } = await autoFilterClientTools(clientTools, null, cache(), {});
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
      tool("plan_deck"),
      tool("add_slide"),
      tool("notion_search"),
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
    const c = new Map<string, number[]>([
      ["display_weather", [1, 0]],
      ["display_chart", [0, 1]],
    ]);
    const clientTools = [
      tool("recall_memory"),
      tool("display_weather", "show the weather"),
      tool("display_chart", "render a chart"),
    ];
    const { tools } = await autoFilterClientTools(clientTools, [1, 0], c, {});
    const got = names(tools);
    expect(got).toContain("recall_memory");
    expect(got).toContain("display_weather");
    expect(got).not.toContain("display_chart");
  });
});

describe("autoFilterClientTools — the confirm tool is always included", () => {
  const scoring = (score: number) => [score, Math.sqrt(1 - score * score)];

  it("keeps prompt_user_confirm when nothing clears the similarity floor", async () => {
    const c = new Map<string, number[]>([
      [CONFIRM_TOOL_NAME, scoring(0.498)],
      ["notion_search", scoring(0.3)],
    ]);
    const clientTools = [
      tool("recall_memory"),
      tool("memory_vault_save"),
      tool(CONFIRM_TOOL_NAME),
      tool("notion_search"),
    ];
    const { tools } = await autoFilterClientTools(clientTools, [1, 0], c, {});
    expect(names(tools).sort()).toEqual(["memory_vault_save", CONFIRM_TOOL_NAME, "recall_memory"]);
  });

  it("keeps prompt_user_confirm alongside a strong match that would cut it", async () => {
    const c = new Map<string, number[]>([
      [CONFIRM_TOOL_NAME, scoring(0.498)],
      ["display_weather", scoring(1)],
    ]);
    const clientTools = [tool("recall_memory"), tool(CONFIRM_TOOL_NAME), tool("display_weather")];
    const { tools } = await autoFilterClientTools(clientTools, [1, 0], c, {});
    expect(names(tools).sort()).toEqual(["display_weather", CONFIRM_TOOL_NAME, "recall_memory"]);
  });

  it("short-prompt + sticky ['slides'] → confirm rides along with memory and the set", async () => {
    const clientTools = [
      tool("recall_memory"),
      tool(CONFIRM_TOOL_NAME),
      tool("plan_deck"),
      tool("notion_search"),
    ];
    const { tools } = await autoFilterClientTools(
      clientTools,
      null,
      new Map(),
      {},
      [],
      ["slides"],
      "short-prompt"
    );
    expect(names(tools).sort()).toEqual(["plan_deck", CONFIRM_TOOL_NAME, "recall_memory"]);
  });

  it("short-prompt + no active sets → still zero tools", async () => {
    const clientTools = [tool("recall_memory"), tool(CONFIRM_TOOL_NAME), tool("notion_search")];
    const { tools } = await autoFilterClientTools(clientTools, null, new Map(), {});
    expect(tools).toEqual([]);
  });
});

describe("autoFilterClientTools — matchedSetNames (score-based activation only)", () => {
  const clientTools = [
    tool("recall_memory"),
    tool("gmail_send_message", "send an email"),
    tool("display_weather", "show the weather"),
  ];
  const cache = () =>
    new Map<string, number[]>([
      ["gmail_send_message", [1, 0]],
      ["display_weather", [0, 1]],
    ]);

  it("names a set whose anchor cleared its floor on this prompt", async () => {
    const { matchedSetNames } = await autoFilterClientTools(clientTools, [1, 0], cache(), {});
    expect([...matchedSetNames]).toEqual(["gmail"]);
  });

  it("leaves out a set that is only forced active by activeToolSets", async () => {
    const { activatedSetNames, matchedSetNames } = await autoFilterClientTools(
      clientTools,
      [0, 1],
      cache(),
      {},
      [],
      ["gmail"]
    );
    expect([...(activatedSetNames ?? [])]).toContain("gmail");
    expect([...matchedSetNames]).not.toContain("gmail");
  });

  it("is empty on a short prompt, even with a sticky set", async () => {
    const { activatedSetNames, matchedSetNames } = await autoFilterClientTools(
      clientTools,
      null,
      cache(),
      {},
      [],
      ["gmail"],
      "short-prompt"
    );
    expect([...(activatedSetNames ?? [])]).toEqual(["gmail"]);
    expect([...matchedSetNames]).toEqual([]);
  });
});
