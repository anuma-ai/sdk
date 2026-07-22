import { describe, expect, it } from "vitest";

import type { LlmapiChatCompletionTool } from "../../../client";
import type { ServerToolCatalogEntry, ServerToolsFilter } from "./intents";
import {
  getMaxToolRounds,
  getThinkingMode,
  MEMORY_SAVE_TOOL_NAME,
  resolveToolChoice,
  stripCoercedMemoryWrite,
} from "./sendPolicy";

const semanticFilter: ServerToolsFilter = (_e, _t) => [];

describe("resolveToolChoice — shape derivation", () => {
  it("non-empty static array → required", () => {
    expect(resolveToolChoice(["anuma_create_image"])).toBe("required");
  });
  it("empty array → auto", () => {
    expect(resolveToolChoice([])).toBe("auto");
  });
  it("filter function → auto", () => {
    expect(resolveToolChoice(semanticFilter)).toBe("auto");
  });
  it("explicit choice always wins over the shape", () => {
    expect(resolveToolChoice(["x"], "auto")).toBe("auto");
    expect(resolveToolChoice(semanticFilter, "required")).toBe("required");
    expect(resolveToolChoice([], "required")).toBe("required");
  });
});

describe("getMaxToolRounds / getThinkingMode", () => {
  const entry = (over: Partial<ServerToolCatalogEntry>): ServerToolCatalogEntry => ({
    serverTools: [],
    ...over,
  });
  it("entry value wins, else fallback, else undefined", () => {
    expect(getMaxToolRounds(entry({ maxToolRounds: 36 }), 35)).toBe(36);
    expect(getMaxToolRounds(entry({}), 35)).toBe(35);
    expect(getMaxToolRounds(undefined, 35)).toBe(35);
    expect(getMaxToolRounds(undefined)).toBeUndefined();
  });
  it("thinking hint: entry value wins, else fallback", () => {
    expect(getThinkingMode(entry({ thinkingMode: "extended" }), "thinking")).toBe("extended");
    expect(getThinkingMode(entry({}), "fast")).toBe("fast");
    expect(getThinkingMode(undefined)).toBeUndefined();
  });
});

describe("stripCoercedMemoryWrite", () => {
  const t = (name: string) => ({ type: "function", name }) as unknown as LlmapiChatCompletionTool;

  it("removes memory_vault_save under required, keeps recall + others", () => {
    const tools = [t("recall_memory"), t(MEMORY_SAVE_TOOL_NAME), t("anuma_create_image")];
    const out = stripCoercedMemoryWrite(tools, "required");
    expect(out.map((x) => (x as { name: string }).name)).toEqual([
      "recall_memory",
      "anuma_create_image",
    ]);
  });

  it("leaves tools untouched (same reference) under auto", () => {
    const tools = [t("recall_memory"), t(MEMORY_SAVE_TOOL_NAME)];
    expect(stripCoercedMemoryWrite(tools, "auto")).toBe(tools);
  });

  it("returns the same reference under required when nothing to strip", () => {
    const tools = [t("recall_memory"), t("anuma_create_image")];
    expect(stripCoercedMemoryWrite(tools, "required")).toBe(tools);
  });
});
