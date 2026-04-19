import { describe, expect, it } from "vitest";

import type { ToolConfig } from "../../lib/chat/useChat/types";
import { createSlideTools } from "./index";

type NamedTool = ToolConfig & { function: { name: string } };

function toolName(t: ToolConfig): string {
  return (t as NamedTool).function.name;
}

function makeStore() {
  const m = new Map<string, string>();
  return {
    store: m,
    storage: {
      getFile: async (_c: string, p: string) => (m.has(p) ? { path: p, content: m.get(p)! } : null),
      putFile: async (_c: string, p: string, content: string) => {
        m.set(p, content);
      },
    },
  };
}

function getTool(name: string): ToolConfig {
  const { storage } = makeStore();
  const tools = createSlideTools({
    getConversationId: () => "cid",
    storage,
  });
  return tools.find((t) => toolName(t) === name)!;
}

describe("plan_slides executor", () => {
  it("returns an error for an unknown fontPreset", async () => {
    const result = (await getTool("plan_slides").executor!({
      fontPreset: "nope",
      paletteName: "warm editorial",
      slides: [{ id: "cover", layout: "cover-centered", topic: "x" }],
    })) as { error?: string };
    expect(result.error).toMatch(/Unknown fontPreset/);
  });

  it("returns an error for an unknown paletteName", async () => {
    const result = (await getTool("plan_slides").executor!({
      fontPreset: "editorial",
      paletteName: "not a palette",
      slides: [{ id: "cover", layout: "cover-centered", topic: "x" }],
    })) as { error?: string };
    expect(result.error).toMatch(/Unknown paletteName/);
  });

  it("returns an error listing unknown layout names", async () => {
    const result = (await getTool("plan_slides").executor!({
      fontPreset: "editorial",
      paletteName: "warm editorial",
      slides: [
        { id: "cover", layout: "cover-centered", topic: "x" },
        { id: "bad", layout: "NOT A LAYOUT", topic: "y" },
      ],
    })) as { error?: string };
    expect(result.error).toMatch(/Unknown layout/);
    expect(result.error).toMatch(/NOT A LAYOUT/);
  });

  it("returns an error when slides is empty", async () => {
    const result = (await getTool("plan_slides").executor!({
      fontPreset: "editorial",
      paletteName: "warm editorial",
      slides: [],
    })) as { error?: string };
    expect(result.error).toMatch(/slides array/);
  });

  it("returns recipes for chosen layouts and inject the palette hex values", async () => {
    const result = (await getTool("plan_slides").executor!({
      fontPreset: "editorial",
      paletteName: "warm editorial",
      slides: [
        { id: "cover", layout: "cover-centered", topic: "Deck title" },
        {
          id: "soil",
          layout: "text-two-col",
          topic: "Soil types",
        },
      ],
    })) as { content?: string; error?: string };
    expect(result.error).toBeUndefined();
    const content = result.content ?? "";
    expect(content).toContain("Theme: warm editorial");
    expect(content).toContain("fontPreset: editorial");
    expect(content).toContain("#F3EEE5"); // warm editorial slideBg
    expect(content).toContain("cover-centered — ");
    expect(content).toContain("text-two-col — ");
    expect(content).toContain("NOW call create_slides");
  });

  it("dedupes layout recipes when the same layout is picked more than once", async () => {
    const result = (await getTool("plan_slides").executor!({
      fontPreset: "editorial",
      paletteName: "warm editorial",
      slides: [
        { id: "a", layout: "cover-centered", topic: "x" },
        { id: "b", layout: "cover-centered", topic: "y" },
        { id: "c", layout: "cover-centered", topic: "z" },
      ],
    })) as { content?: string };
    const content = result.content ?? "";
    const occurrences = content.split("cover-centered — ").length - 1;
    expect(occurrences).toBe(1);
  });
});

describe("create_slides executor", () => {
  it("rejects when title is missing", async () => {
    const result = (await getTool("create_slides").executor!({
      deck: {
        version: 2,
        theme: {},
        slides: [{ id: "s1", elements: [] }],
      },
    })) as { error?: string };
    expect(result.error).toMatch(/title is required/);
  });

  it("rejects when deck is missing", async () => {
    const result = (await getTool("create_slides").executor!({ title: "Hi" })) as {
      error?: string;
    };
    expect(result.error).toMatch(/deck is required/);
  });

  it("rejects when slides is empty", async () => {
    const result = (await getTool("create_slides").executor!({
      title: "Hi",
      deck: { version: 2, theme: {}, slides: [] },
    })) as { error?: string };
    expect(result.error).toMatch(/slides must be a non-empty array/);
  });

  it("writes slides.json on success", async () => {
    const { store, storage } = makeStore();
    const tools = createSlideTools({ getConversationId: () => "cid", storage });
    const tool = tools.find((t) => toolName(t) === "create_slides")!;
    const deck = {
      version: 2,
      theme: { fontPreset: "editorial", colors: { background: "#fff" } },
      slides: [{ id: "s1", elements: [] }],
    };
    const result = (await tool.executor!({ title: "Hi", deck })) as {
      success?: boolean;
      slides?: number;
      error?: string;
    };
    expect(result.error).toBeUndefined();
    expect(result.success).toBe(true);
    expect(result.slides).toBe(1);
    const raw = store.get("slides.json");
    expect(raw).toBeDefined();
    const parsed = JSON.parse(raw!);
    expect(parsed.slides).toHaveLength(1);
    expect(parsed.version).toBe(2);
  });

  it("merges displaySlides result into the tool response", async () => {
    const { storage } = makeStore();
    let received: Record<string, unknown> | undefined;
    const tools = createSlideTools({
      getConversationId: () => "cid",
      storage,
      displaySlides: async (args) => {
        received = args;
        return { interaction_id: "slides_abc", displayType: "slides" };
      },
    });
    const result = (await tools.find((t) => toolName(t) === "create_slides")!.executor!({
      title: "My Deck",
      deck: {
        version: 2,
        theme: { fontPreset: "editorial", colors: {} },
        slides: [{ id: "s1", elements: [] }],
      },
    })) as { interaction_id?: string; displayType?: string; success?: boolean };
    expect(received).toEqual({ title: "My Deck" });
    expect(result.success).toBe(true);
    expect(result.interaction_id).toBe("slides_abc");
    expect(result.displayType).toBe("slides");
  });
});

describe("patch_slides executor — display wiring", () => {
  it("calls displaySlides with replaces_interaction_id when provided", async () => {
    const { storage } = makeStore();
    let received: Record<string, unknown> | undefined;
    const tools = createSlideTools({
      getConversationId: () => "cid",
      storage,
      displaySlides: async (args) => {
        received = args;
        return { interaction_id: "slides_abc" };
      },
    });
    // Seed slides.json via create_slides first.
    await tools.find((t) => toolName(t) === "create_slides")!.executor!({
      title: "Hi",
      deck: {
        version: 2,
        theme: { fontPreset: "editorial", colors: {} },
        slides: [{ id: "s1", elements: [] }],
      },
    });
    received = undefined; // reset so we only capture the patch call

    const result = (await tools.find((t) => toolName(t) === "patch_slides")!.executor!({
      replaces_interaction_id: "slides_abc",
      operations: [{ action: "update_theme", set: { fontPreset: "techno" } }],
    })) as { success?: boolean; interaction_id?: string };
    expect(received).toEqual({ replaces_interaction_id: "slides_abc" });
    expect(result.success).toBe(true);
    expect(result.interaction_id).toBe("slides_abc");
  });
});

describe("createSlideTools tool list", () => {
  it("exposes plan/create/read/patch with no standalone display tool", () => {
    const { storage } = makeStore();
    const tools = createSlideTools({
      getConversationId: () => "cid",
      storage,
      displaySlides: async () => ({}),
    });
    const names = tools.map((t) => toolName(t));
    expect(names).toEqual(["plan_slides", "create_slides", "read_slides", "patch_slides"]);
  });

  it("works without a displaySlides callback (headless mode)", () => {
    const { storage } = makeStore();
    const tools = createSlideTools({ getConversationId: () => "cid", storage });
    const names = tools.map((t) => toolName(t));
    expect(names).toEqual(["plan_slides", "create_slides", "read_slides", "patch_slides"]);
  });
});
