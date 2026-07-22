import { describe, expect, it } from "vitest";

import type { LlmapiChatCompletionTool } from "../../../client";
import { getToolName } from "../clientToolSelection";
import { composeCouncilClientTools, resolveCouncilPlan, selectCouncilClientTools } from "./council";
import type { ServerToolCatalog } from "./intents";

const t = (name: string): LlmapiChatCompletionTool =>
  ({ type: "function", name }) as unknown as LlmapiChatCompletionTool;

const catalog: ServerToolCatalog = {
  council: { serverTools: (_e, _t) => [] },
  aggregation: { serverTools: (_e, _t) => [] },
};
const ctx = { catalog };

describe("composeCouncilClientTools — per-worker memory + never-persist", () => {
  const memoryTools = [t("recall_memory"), t("memory_vault_save")];
  const sharedTools = [t("notion_search")];

  it("a persist-capable worker keeps memory_vault_save (memory first, then shared)", () => {
    const out = composeCouncilClientTools({ memoryTools, sharedTools, canPersistMemory: true });
    expect(out.map(getToolName)).toEqual(["recall_memory", "memory_vault_save", "notion_search"]);
  });

  it("the aggregation worker (canPersistMemory:false) drops memory_vault_save, keeps recall", () => {
    const out = composeCouncilClientTools({ memoryTools, sharedTools, canPersistMemory: false });
    const names = out.map(getToolName);
    expect(names).toContain("recall_memory");
    expect(names).toContain("notion_search");
    expect(names).not.toContain("memory_vault_save");
  });

  it("handles function-call-shape memory tools too", () => {
    const fnSave = {
      type: "function",
      function: { name: "memory_vault_save" },
    } as unknown as LlmapiChatCompletionTool;
    const out = composeCouncilClientTools({
      memoryTools: [t("recall_memory"), fnSave],
      canPersistMemory: false,
    });
    expect(out.map(getToolName)).toEqual(["recall_memory"]);
  });
});

describe("resolveCouncilPlan", () => {
  it("routes the council lane and carries no per-mode client toolkit", () => {
    const plan = resolveCouncilPlan({ lane: "council", creation: "plain" }, ctx);
    expect(plan.clientFactories).toEqual([]);
    expect(plan.toolChoice).toBe("auto");
  });

  it("normalizes an aggregation descriptor onto the aggregation lane", () => {
    const plan = resolveCouncilPlan({ lane: "aggregation", creation: "plain" }, ctx);
    expect(plan.clientFactories).toEqual([]);
  });
});

describe("selectCouncilClientTools — runs the shared semantic selector", () => {
  it("a terse prompt with the composed candidate returns memory-only (short-prompt gate)", async () => {
    const result = await selectCouncilClientTools(
      {
        memoryTools: [t("recall_memory")],
        sharedTools: [t("notion_search")],
        canPersistMemory: true,
      },
      {
        promptEmbeddings: null,
        cache: new Map(),
        embeddingOptions: {},
        noEmbeddingsReason: "short-prompt",
      }
    );
    // short-prompt + no active sets → zero tools (same gate the chat hook uses)
    expect(result.tools).toEqual([]);
  });
});
