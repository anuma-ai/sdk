import { describe, expect, it, vi } from "vitest";

import { assembleClientTools, filterAssembledClientTools } from "./assembleClientTools";
import type { ClientFactoryKey } from "./intents";

type T = { name: string };
const t = (name: string): T => ({ name });

describe("assembleClientTools — capability gating", () => {
  const factories: ClientFactoryKey[] = [
    "memory",
    "connectors",
    "slides",
    "app",
    "document",
    "ui",
    "saved",
    "background",
    "schedule",
  ];

  it("only instantiates factories whose builder (adapter) is present", () => {
    // Mobile-shaped adapters: memory + connectors + document only.
    const tools = assembleClientTools<T>(
      { clientFactories: factories },
      {
        builders: {
          memory: () => [t("recall_memory")],
          connectors: () => [t("notion_search")],
          document: () => [t("create_document")],
        },
      }
    );
    expect(tools.map((x) => x.name)).toEqual(["recall_memory", "notion_search", "create_document"]);
  });

  it("yields ZERO document tools when the document builder is absent (mirrors createDocumentTools)", () => {
    const tools = assembleClientTools<T>({ clientFactories: ["document"] }, { builders: {} });
    expect(tools).toEqual([]);
  });

  it("yields the FULL set when every builder is present, preserving factory order", () => {
    const tools = assembleClientTools<T>(
      { clientFactories: ["memory", "slides", "app"] },
      {
        builders: {
          app: () => [t("create_file")],
          slides: () => [t("plan_deck")],
          memory: () => [t("recall_memory")],
        },
      }
    );
    // Order follows clientFactories, not the builders object.
    expect(tools.map((x) => x.name)).toEqual(["recall_memory", "plan_deck", "create_file"]);
  });

  it("a throwing builder is logged and skipped; other factories still assemble", () => {
    const error = vi.fn();
    const tools = assembleClientTools<T>(
      { clientFactories: ["memory", "slides"] },
      {
        logger: { warn: vi.fn(), error },
        builders: {
          memory: () => {
            throw new Error("boom");
          },
          slides: () => [t("plan_deck")],
        },
      }
    );
    expect(tools.map((x) => x.name)).toEqual(["plan_deck"]);
    expect(error).toHaveBeenCalledOnce();
  });
});

describe("filterAssembledClientTools", () => {
  const tools = [t("plan_deck"), t("add_slide"), t("notion_search"), t("recall_memory")];
  const getName = (x: T) => x.name;

  it("include-all and auto pass everything through", () => {
    expect(filterAssembledClientTools(tools, "include-all", { getName })).toBe(tools);
    expect(filterAssembledClientTools(tools, "auto", { getName })).toBe(tools);
  });

  it("slide-editor keeps only the named slide tools", () => {
    const out = filterAssembledClientTools(tools, "slide-editor", {
      slideEditorToolNames: new Set(["plan_deck", "add_slide"]),
      getName,
    });
    expect((out as T[]).map(getName)).toEqual(["plan_deck", "add_slide"]);
  });

  it("slide-editor with NO name set fails closed (returns []), never the full list", () => {
    // A missing slideEditorToolNames must not leak the whole toolkit into the
    // overlay; consumers wanting everything use "include-all".
    expect(filterAssembledClientTools(tools, "slide-editor", { getName })).toEqual([]);
  });

  it("a custom filter function is applied directly", () => {
    const out = filterAssembledClientTools(
      tools,
      (ts) => ts.filter((x) => x.name === "recall_memory"),
      {
        getName,
      }
    );
    expect((out as T[]).map(getName)).toEqual(["recall_memory"]);
  });
});
