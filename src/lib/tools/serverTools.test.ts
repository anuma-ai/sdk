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

describe("connector tool sets (#587)", () => {
  it.each([
    [
      "gmail",
      ["gmail_search_messages", "gmail_get_message", "gmail_create_draft", "gmail_send_message"],
    ],
    [
      "google-calendar",
      [
        "google_calendar_list_events",
        "google_calendar_create_event",
        "google_calendar_update_event",
      ],
    ],
    [
      "google-drive",
      ["google_drive_search", "google_drive_list_recent", "google_drive_get_content"],
    ],
    ["notion", ["notion-search", "notion-fetch", "notion-create-pages", "notion-update-page"]],
  ])("defines %s with the expected members and no systemPrompt", (name, members) => {
    const set = BUILT_IN_TOOL_SETS.find((s) => s.name === name);
    expect(set).toBeDefined();
    expect(set?.members).toEqual(members);
    expect(set?.anchorMinSimilarity).toBe(0.53);
    expect(set?.anchors.every((a) => set.members.includes(a))).toBe(true);
    expect(set?.systemPrompt).toBeUndefined();
  });

  it("activates a connector set when its anchor clears the floor, pulling in every member", () => {
    expect(activatedToolSetNames(new Map([["gmail_search_messages", 0.53]]))).toEqual(
      new Set(["gmail"])
    );
    expect(activatedToolSetNames(new Map([["gmail_search_messages", 0.52]]))).toEqual(new Set());
  });
});

describe("mergeTools — defer-loading (Phase 3, opt-in)", () => {
  const st = (name: string): import("./serverTools").ServerTool => ({
    name,
    description: `desc ${name}`,
    parameters: { type: "object", properties: {} },
  });
  // Catalog in arbitrary input order to prove ordering is imposed by the helper, not the input.
  const catalog = [
    st("ZetaMCP-z_tool"),
    st("AnumaJinaMCP-read_url"),
    st("AnumaJinaMCP-search_web"),
    st("AnumaSearchMCP-anuma_text_search"),
    st("AnumaImageMCP-edit_cloud_image"),
  ];
  const hot = [
    "AnumaJinaMCP-search_web",
    "AnumaSearchMCP-anuma_text_search",
    "AnumaJinaMCP-read_url",
  ];

  it("OFF (absent/false) is byte-identical to today", () => {
    for (const apiType of ["responses", "completions"] as const) {
      const today = JSON.stringify(mergeTools(catalog, undefined, apiType));
      expect(
        JSON.stringify(
          mergeTools(catalog, undefined, apiType, { enabled: false, hotToolNames: hot })
        )
      ).toBe(today);
    }
  });

  it("ON (responses) emits [search] -> [hot in order] -> [deferred name-sorted] with full defs", () => {
    const merged = mergeTools(catalog, undefined, "responses", {
      enabled: true,
      hotToolNames: hot,
    }) as Array<Record<string, unknown>>;
    // Order (responses = flat name at top level)
    expect(merged[0].type).toBe("tool_search_tool_regex_20251119");
    expect(merged[0].name).toBe("tool_search");
    expect(merged[1].name).toBe("AnumaJinaMCP-search_web");
    expect(merged[2].name).toBe("AnumaSearchMCP-anuma_text_search");
    expect(merged[3].name).toBe("AnumaJinaMCP-read_url");
    // Deferred = the two non-hot tools, name-sorted: AnumaImageMCP-edit_cloud_image < ZetaMCP-z_tool
    expect(merged[4].name).toBe("AnumaImageMCP-edit_cloud_image");
    expect(merged[5].name).toBe("ZetaMCP-z_tool");
    // defer flags: search + hot non-deferred; deferred flagged
    expect(merged.slice(0, 4).every((t) => t.defer_loading === undefined)).toBe(true);
    expect(merged[4].defer_loading).toBe(true);
    expect(merged[5].defer_loading).toBe(true);
    // Deferred keep FULL definitions (not name-only)
    expect(merged[4].description).toBe("desc AnumaImageMCP-edit_cloud_image");
    expect(merged[4].parameters).toEqual({ type: "object", properties: {} });
  });

  it("ON + completions → defer DISABLED (responses-only): no tool_search, normal completions format", () => {
    const merged = mergeTools(catalog, undefined, "completions", {
      enabled: true,
      hotToolNames: hot,
    }) as Array<Record<string, unknown>>;
    // No tool-search tool (completions toolsToApiFormat would mangle its type; ai-portal can't carry it).
    expect(merged.every((t) => t.type !== "tool_search_tool_regex_20251119")).toBe(true);
    expect(merged.every((t) => t.defer_loading === undefined)).toBe(true);
    // Same as today's non-defer completions formatting (function-wrapped, catalog order, no extra tools).
    expect(merged).toEqual(mergeTools(catalog, undefined, "completions"));
  });

  it("ON responses format: flat defs + defer_loading on deferred", () => {
    const merged = mergeTools(catalog, undefined, "responses", {
      enabled: true,
      hotToolNames: hot,
    }) as Array<Record<string, unknown>>;
    expect(merged[0].type).toBe("tool_search_tool_regex_20251119");
    expect(merged[1].name).toBe("AnumaJinaMCP-search_web");
    expect(merged[1].defer_loading).toBeUndefined();
    expect(merged[4].name).toBe("AnumaImageMCP-edit_cloud_image");
    expect(merged[4].defer_loading).toBe(true);
    expect(merged[4].parameters).toEqual({ type: "object", properties: {} });
  });

  it("ON is byte-stable across calls (same catalog -> same bytes)", () => {
    const a = JSON.stringify(
      mergeTools(catalog, undefined, "responses", { enabled: true, hotToolNames: hot })
    );
    const b = JSON.stringify(
      mergeTools([...catalog].reverse(), undefined, "responses", {
        enabled: true,
        hotToolNames: hot,
      })
    );
    expect(a).toBe(b); // input order must not matter
  });
});

describe("mergeTools — defer-loading edge: empty server catalog + client tools", () => {
  const st = (name: string): import("./serverTools").ServerTool => ({
    name,
    description: `d ${name}`,
    parameters: { type: "object", properties: {} },
  });
  it("empty catalog + defer on → NO tool_search (nothing to load), client tools only", () => {
    // An empty server catalog (e.g. the skip-storage/completions path that never fetched it) must not
    // emit a tool-search tool — there are no deferred tools for it to load.
    const clientTool = {
      type: "function",
      function: { name: "display_chart", parameters: {} },
    } as never;
    const merged = mergeTools([], [clientTool], "responses", {
      enabled: true,
      hotToolNames: [],
    }) as Array<Record<string, unknown>>;
    const names = merged.map((t) => (t.function as { name?: string } | undefined)?.name ?? t.name);
    expect(names).not.toContain("tool_search"); // no useless search tool
    expect(merged.every((t) => t.type !== "tool_search_tool_regex_20251119")).toBe(true);
    expect(names).toEqual(["display_chart"]); // client tools only
  });
  it("OFF + empty serverTools + client tools → only client tools (unchanged)", () => {
    const clientTool = {
      type: "function",
      function: { name: "display_chart", parameters: {} },
    } as never;
    const merged = mergeTools([], [clientTool], "completions") as Array<Record<string, unknown>>;
    expect(merged).toHaveLength(1);
    expect((merged[0].function as { name: string }).name).toBe("display_chart");
  });
  it("ON: non-empty catalog + client tools → [search, ...server, ...client] (no drop)", () => {
    const clientTool = {
      type: "function",
      function: { name: "display_chart", parameters: {} },
    } as never;
    const merged = mergeTools([st("AnumaJinaMCP-read_url")], [clientTool], "responses", {
      enabled: true,
      hotToolNames: ["AnumaJinaMCP-read_url"],
    }) as Array<Record<string, unknown>>;
    expect(merged[0].type).toBe("tool_search_tool_regex_20251119");
    const names = merged.map((t) => (t.function as { name?: string } | undefined)?.name ?? t.name);
    expect(names).toContain("AnumaJinaMCP-read_url");
    expect(names).toContain("display_chart");
  });
});

describe("mergeTools — defer-loading: duplicate hot names", () => {
  const st = (name: string): import("./serverTools").ServerTool => ({
    name,
    description: `d ${name}`,
    parameters: { type: "object", properties: {} },
  });
  it("emits each hot tool once even if hotToolNames repeats it", () => {
    const merged = mergeTools([st("AnumaJinaMCP-read_url")], undefined, "responses", {
      enabled: true,
      hotToolNames: ["AnumaJinaMCP-read_url", "AnumaJinaMCP-read_url"], // duplicated
    }) as Array<Record<string, unknown>>;
    const names = merged.map((t) => (t.function as { name?: string } | undefined)?.name ?? t.name);
    expect(names.filter((n) => n === "AnumaJinaMCP-read_url")).toHaveLength(1); // once, not twice
    expect(merged[0].type).toBe("tool_search_tool_regex_20251119");
  });
});
