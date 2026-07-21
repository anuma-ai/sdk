import { describe, expect, it } from "vitest";

import { FULL_GENERATIVE_CLIENT_FACTORIES, type ServerToolCatalog } from "./intents";
import { resolvePlan } from "./plan";

// A catalog that mirrors the shape of both apps' static server-tool lists +
// send-policy knobs. Values chosen to reproduce the golden policy tables from
// issue #702 (web useChatTools / mobile chatModeRouting).
const SLIDE_PROMPT = "SLIDE_SYSTEM_PROMPT";
const DEEP_RESEARCH_PROMPT = "DEEP_RESEARCH_PROMPT";
const RESEARCH_TOOLS = ["Jina-read_url", "Jina-search_web", "Jina-search_images", "Jina-rerank"];

const catalog: ServerToolCatalog = {
  // plain chat: attachment-aware semantic filter factory (drops bg-removal on a
  // video-only attachment), matching mobile's buildChatModeServerToolsFilter.
  // The produced value is a semantic filter function → toolChoice resolves auto.
  plain: {
    resolveServerTools: (_ctx) => {
      const filter: (e: number[] | number[][], t: never[]) => string[] = () => [];
      return filter;
    },
  },
  image: { serverTools: ["AnumaMediaMCP-anuma_create_image"] },
  audio: { serverTools: ["anuma_create_sfx", "anuma_create_music"] },
  video: { serverTools: ["AnumaMediaMCP-anuma_create_video"] },
  "remove-image-bg": { serverTools: ["AnumaMediaMCP-anuma_remove_image_background"] },
  "web-search": { serverTools: RESEARCH_TOOLS },
  "deep-research": {
    serverTools: RESEARCH_TOOLS,
    toolChoice: "auto", // explicitly excluded from coercion (mobile)
    maxToolRounds: 20,
    thinkingMode: "extended",
    systemPrompt: DEEP_RESEARCH_PROMPT,
  },
  slides: {
    serverTools: ["AnumaMediaMCP-anuma_create_image"],
    maxToolRounds: 36,
    thinkingMode: "fast",
    systemPrompt: SLIDE_PROMPT,
  },
  app: { serverTools: [] }, // APP_SERVER_TOOLS is empty
  council: { serverTools: (_e, _t) => [] },
};

const ctx = { catalog, defaultMaxToolRounds: 35 };

describe("resolvePlan — chat lane golden table", () => {
  it("plain: full generative toolkit, semantic filter, auto, no coerce strip", () => {
    const plan = resolvePlan({ lane: "chat", creation: "plain" }, ctx);
    expect(plan.clientFactories).toEqual([...FULL_GENERATIVE_CLIENT_FACTORIES]);
    expect(plan.clientToolsFilter).toBe("auto");
    expect(plan.toolChoice).toBe("auto");
    expect(plan.maxToolRounds).toBe(35);
    expect(plan.postFilters).toEqual([]);
  });

  it("image: coerced required, full toolkit, strips vault-save", () => {
    const plan = resolvePlan({ lane: "chat", creation: "image" }, ctx);
    expect(plan.clientFactories).toEqual([...FULL_GENERATIVE_CLIENT_FACTORIES]);
    expect(plan.serverTools).toEqual(["AnumaMediaMCP-anuma_create_image"]);
    expect(plan.toolChoice).toBe("required");
    expect(plan.postFilters).toContain("strip-memory-save-when-coerced");
  });

  it("audio / video / remove-image-bg all coerce required", () => {
    for (const creation of ["audio", "video", "remove-image-bg"] as const) {
      const plan = resolvePlan({ lane: "chat", creation }, ctx);
      expect(plan.toolChoice).toBe("required");
    }
  });

  it("web-search: required; deep-research: auto + rounds 20 + extended + prompt", () => {
    const ws = resolvePlan({ lane: "chat", creation: "web-search" }, ctx);
    expect(ws.toolChoice).toBe("required");

    const dr = resolvePlan({ lane: "chat", creation: "deep-research" }, ctx);
    expect(dr.toolChoice).toBe("auto");
    expect(dr.maxToolRounds).toBe(20);
    expect(dr.thinkingMode).toBe("extended");
    expect(dr.systemPromptRiders).toContain(DEEP_RESEARCH_PROMPT);
  });

  it("slides: restrictive toolkit, include-all, auto, rounds 36, fast, sticky 'slides'", () => {
    const plan = resolvePlan({ lane: "chat", creation: "slides" }, ctx);
    expect(plan.clientFactories).toEqual(["slides"]);
    expect(plan.clientToolsFilter).toBe("include-all");
    expect(plan.toolChoice).toBe("auto");
    expect(plan.maxToolRounds).toBe(36);
    expect(plan.thinkingMode).toBe("fast");
    expect(plan.activeToolSets).toContain("slides");
    expect(plan.systemPromptRiders).toContain(SLIDE_PROMPT);
  });

  it("app: builder toolkit [app, saved], empty server tools → auto, sticky 'app-generation'", () => {
    const plan = resolvePlan({ lane: "chat", creation: "app" }, ctx);
    expect(plan.clientFactories).toEqual(["app", "saved"]);
    expect(plan.clientToolsFilter).toBe("include-all");
    expect(plan.toolChoice).toBe("auto");
    expect(plan.activeToolSets).toContain("app-generation");
  });

  it("slide-deck intent in plain chat forces auto + injects slide prompt + sticky 'slides'", () => {
    const plan = resolvePlan({ lane: "chat", creation: "plain", slideDeckIntent: true }, ctx);
    expect(plan.toolChoice).toBe("auto");
    expect(plan.activeToolSets).toContain("slides");
    expect(plan.systemPromptRiders).toContain(SLIDE_PROMPT);
  });

  it("imageEditIntent suppresses slide-deck escalation (no slide re-route on an image edit)", () => {
    const plan = resolvePlan(
      { lane: "chat", creation: "plain", slideDeckIntent: true, imageEditIntent: true },
      ctx
    );
    expect(plan.activeToolSets).not.toContain("slides");
    expect(plan.systemPromptRiders).not.toContain(SLIDE_PROMPT);
  });

  it("fullscreen slide-editor overlay: slide-editor filter, slide server tools, auto", () => {
    const plan = resolvePlan({ lane: "chat", creation: "plain", editorPinned: "slides" }, ctx);
    expect(plan.clientToolsFilter).toBe("slide-editor");
    expect(plan.serverTools).toEqual(["AnumaMediaMCP-anuma_create_image"]);
    expect(plan.toolChoice).toBe("auto");
    expect(plan.activeToolSets).toContain("slides");
    // full generative toolkit still registered — the filter does the narrowing
    expect(plan.clientFactories).toEqual([...FULL_GENERATIVE_CLIENT_FACTORIES]);
  });

  it("passes conversation activeToolSets through", () => {
    const plan = resolvePlan(
      { lane: "chat", creation: "plain", activeToolSets: ["documents"] },
      ctx
    );
    expect(plan.activeToolSets).toContain("documents");
  });

  it("web memory-intent post-filters are added when the host reports them", () => {
    const retrieval = resolvePlan(
      { lane: "chat", creation: "plain" },
      { ...ctx, memoryIntent: { retrieval: true } }
    );
    expect(retrieval.postFilters).toContain("strip-memory-save-on-retrieval-intent");
    const save = resolvePlan(
      { lane: "chat", creation: "plain" },
      { ...ctx, memoryIntent: { save: true } }
    );
    expect(save.postFilters).toContain("strip-server-tools-on-save-intent");
  });
});

describe("resolvePlan — attachment-aware plain filter", () => {
  it("resolves the plain factory to a filter function (auto) with attachment context", () => {
    const plan = resolvePlan(
      {
        lane: "chat",
        creation: "plain",
        attachments: { hasImages: false, hasVideos: true },
      },
      ctx
    );
    expect(typeof plan.serverTools).toBe("function");
    expect(plan.toolChoice).toBe("auto");
  });
});

describe("resolvePlan — council / aggregation lanes", () => {
  it("council: no client factories, semantic filter, auto", () => {
    const plan = resolvePlan({ lane: "council", creation: "plain" }, ctx);
    expect(plan.clientFactories).toEqual([]);
    expect(typeof plan.serverTools).toBe("function");
    expect(plan.toolChoice).toBe("auto");
    expect(plan.postFilters).toEqual([]);
  });

  it("aggregation: carries no per-mode client toolkit and no dead post-filter", () => {
    // The aggregation plan produces zero client factories; the never-persist
    // invariant is enforced by composeCouncilClientTools(canPersistMemory:false)
    // in council.ts (see council.test.ts), NOT by a plan-level post-filter — so
    // postFilters must be empty rather than carrying a no-op coerce-strip marker.
    const plan = resolvePlan({ lane: "aggregation", creation: "plain" }, ctx);
    expect(plan.clientFactories).toEqual([]);
    expect(plan.postFilters).toEqual([]);
  });
});
