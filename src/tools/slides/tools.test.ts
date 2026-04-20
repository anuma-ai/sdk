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
      getFile: async (_c: string, p: string) =>
        m.has(p) ? { path: p, content: m.get(p)! } : null,
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

describe("plan_deck executor", () => {
  it("rejects when title is missing", async () => {
    const result = (await getTool("plan_deck").executor!({
      fontPreset: "editorial",
      paletteName: "warm editorial",
    })) as { error?: string };
    expect(result.error).toMatch(/title is required/);
  });

  it("rejects when fontPreset is unknown", async () => {
    const result = (await getTool("plan_deck").executor!({
      title: "Hi",
      fontPreset: "nope",
      paletteName: "warm editorial",
    })) as { error?: string };
    expect(result.error).toMatch(/Unknown fontPreset/);
  });

  it("rejects when paletteName is unknown", async () => {
    const result = (await getTool("plan_deck").executor!({
      title: "Hi",
      fontPreset: "editorial",
      paletteName: "not a palette",
    })) as { error?: string };
    expect(result.error).toMatch(/Unknown paletteName/);
  });

  it("initializes slides.json with the chosen theme and an empty slides array", async () => {
    const { store, storage } = makeStore();
    const tools = createSlideTools({ getConversationId: () => "cid", storage });
    const result = (await tools
      .find((t) => toolName(t) === "plan_deck")!
      .executor!({
        title: "Home Gardening",
        fontPreset: "editorial",
        paletteName: "warm editorial",
      })) as { content?: string; error?: string };
    expect(result.error).toBeUndefined();
    expect(result.content).toContain("Deck initialized");

    const raw = store.get("slides.json");
    expect(raw).toBeDefined();
    const parsed = JSON.parse(raw!);
    expect(parsed.version).toBe(2);
    expect(parsed.theme.fontPreset).toBe("editorial");
    expect(parsed.slides).toEqual([]);
    expect(parsed.theme.colors.slideBg).toBe("#F3EEE5"); // warm editorial
  });

  it("returns content with palette hex values, element kinds, shared header, and layout recipes", async () => {
    const result = (await getTool("plan_deck").executor!({
      title: "Deck",
      fontPreset: "editorial",
      paletteName: "warm editorial",
    })) as { content?: string };
    const content = result.content ?? "";
    expect(content).toContain("#F3EEE5"); // palette hex
    expect(content).toContain("ELEMENT TYPES"); // element kinds header
    expect(content).toContain("SHARED HEADER PATTERN"); // shared header
    expect(content).toContain("LAYOUT RECIPES"); // full catalog
    expect(content).toContain("NOW call add_slide"); // instructions
  });

  it("calls displaySlides with the title and merges the result into the response", async () => {
    const { storage } = makeStore();
    let received: Record<string, unknown> | undefined;
    const tools = createSlideTools({
      getConversationId: () => "cid",
      storage,
      displaySlides: async (args) => {
        received = args;
        return { interaction_id: "deck_xyz", displayType: "slides" };
      },
    });
    const result = (await tools
      .find((t) => toolName(t) === "plan_deck")!
      .executor!({
        title: "My Deck",
        fontPreset: "editorial",
        paletteName: "warm editorial",
      })) as { interaction_id?: string; content?: string };
    expect(received).toEqual({ title: "My Deck" });
    expect(result.interaction_id).toBe("deck_xyz");
  });
});

describe("add_slide executor", () => {
  async function initDeck(
    storage: ReturnType<typeof makeStore>["storage"],
    displaySlides?: (args: Record<string, unknown>) => Promise<unknown>
  ) {
    const tools = createSlideTools({
      getConversationId: () => "cid",
      storage,
      displaySlides,
    });
    await tools
      .find((t) => toolName(t) === "plan_deck")!
      .executor!({
        title: "Test",
        fontPreset: "editorial",
        paletteName: "warm editorial",
      });
    return tools;
  }

  it("rejects when slide is missing", async () => {
    const { storage } = makeStore();
    const tools = await initDeck(storage);
    const result = (await tools
      .find((t) => toolName(t) === "add_slide")!
      .executor!({})) as { error?: string };
    expect(result.error).toMatch(/slide is required/);
  });

  it("rejects when slide.id is missing", async () => {
    const { storage } = makeStore();
    const tools = await initDeck(storage);
    const result = (await tools
      .find((t) => toolName(t) === "add_slide")!
      .executor!({
        slide: { elements: [] },
      })) as { error?: string };
    expect(result.error).toMatch(/slide.id is required/);
  });

  it("rejects when slide.elements is not an array", async () => {
    const { storage } = makeStore();
    const tools = await initDeck(storage);
    const result = (await tools
      .find((t) => toolName(t) === "add_slide")!
      .executor!({
        slide: { id: "s1", elements: "nope" },
      })) as { error?: string };
    expect(result.error).toMatch(/elements must be an array/);
  });

  it("errors if plan_deck was never called", async () => {
    const { storage } = makeStore();
    const tools = createSlideTools({ getConversationId: () => "cid", storage });
    const result = (await tools
      .find((t) => toolName(t) === "add_slide")!
      .executor!({
        slide: { id: "s1", elements: [] },
      })) as { error?: string };
    expect(result.error).toMatch(/Call plan_deck first/);
  });

  it("appends a slide and writes to storage", async () => {
    const { store, storage } = makeStore();
    const tools = await initDeck(storage);
    const result = (await tools
      .find((t) => toolName(t) === "add_slide")!
      .executor!({
        slide: { id: "cover", elements: [{ kind: "text", id: "t1", x: 0, y: 0, w: 10, h: 5 }] },
      })) as {
      success?: boolean;
      slideIndex?: number;
      totalSlides?: number;
    };
    expect(result.success).toBe(true);
    expect(result.slideIndex).toBe(0);
    expect(result.totalSlides).toBe(1);
    const parsed = JSON.parse(store.get("slides.json")!);
    expect(parsed.slides).toHaveLength(1);
    expect(parsed.slides[0].id).toBe("cover");
  });

  it("appends multiple slides in order across calls", async () => {
    const { store, storage } = makeStore();
    const tools = await initDeck(storage);
    const addSlide = tools.find((t) => toolName(t) === "add_slide")!;
    await addSlide.executor!({ slide: { id: "s1", elements: [] } });
    await addSlide.executor!({ slide: { id: "s2", elements: [] } });
    const result = (await addSlide.executor!({ slide: { id: "s3", elements: [] } })) as {
      slideIndex?: number;
      totalSlides?: number;
    };
    expect(result.slideIndex).toBe(2);
    expect(result.totalSlides).toBe(3);
    const parsed = JSON.parse(store.get("slides.json")!);
    expect(parsed.slides.map((s: { id: string }) => s.id)).toEqual(["s1", "s2", "s3"]);
  });

  it("reuses the plan_deck interaction_id on subsequent add_slide calls (in-place update)", async () => {
    const { storage } = makeStore();
    const calls: Record<string, unknown>[] = [];
    let nextId = 1;
    const displaySlides = async (args: Record<string, unknown>) => {
      calls.push(args);
      return { interaction_id: `deck_${nextId++}` };
    };
    const tools = await initDeck(storage, displaySlides);

    const addSlide = tools.find((t) => toolName(t) === "add_slide")!;
    await addSlide.executor!({ slide: { id: "s1", elements: [] } });
    await addSlide.executor!({ slide: { id: "s2", elements: [] } });

    // plan_deck: called with { title }
    expect(calls[0]).toEqual({ title: "Test" });
    // add_slide #1: should pass plan_deck's returned id as replaces_interaction_id
    expect(calls[1]).toEqual({ replaces_interaction_id: "deck_1" });
    // add_slide #2: should pass add_slide #1's returned id
    expect(calls[2]).toEqual({ replaces_interaction_id: "deck_2" });
  });
});

describe("patch_slides interaction_id fallback", () => {
  it("falls back to the closure-tracked id when the model doesn't pass one", async () => {
    const { storage } = makeStore();
    const calls: Record<string, unknown>[] = [];
    let nextId = 1;
    const displaySlides = async (args: Record<string, unknown>) => {
      calls.push(args);
      return { interaction_id: `deck_${nextId++}` };
    };
    const tools = createSlideTools({
      getConversationId: () => "cid",
      storage,
      displaySlides,
    });
    // plan_deck (interaction_id=deck_1), add one slide (interaction_id=deck_2)
    await tools
      .find((t) => toolName(t) === "plan_deck")!
      .executor!({
        title: "Test",
        fontPreset: "editorial",
        paletteName: "warm editorial",
      });
    await tools
      .find((t) => toolName(t) === "add_slide")!
      .executor!({ slide: { id: "s1", elements: [] } });

    // patch_slides without replaces_interaction_id — should fall back to deck_2
    await tools
      .find((t) => toolName(t) === "patch_slides")!
      .executor!({
        operations: [{ action: "update_theme", set: { fontPreset: "techno" } }],
      });

    // Last call should carry the closure-tracked id (deck_2)
    expect(calls[calls.length - 1]).toEqual({ replaces_interaction_id: "deck_2" });
  });

  it("prefers the model-supplied replaces_interaction_id when provided", async () => {
    const { storage } = makeStore();
    const calls: Record<string, unknown>[] = [];
    let nextId = 1;
    const displaySlides = async (args: Record<string, unknown>) => {
      calls.push(args);
      return { interaction_id: `deck_${nextId++}` };
    };
    const tools = createSlideTools({
      getConversationId: () => "cid",
      storage,
      displaySlides,
    });
    await tools
      .find((t) => toolName(t) === "plan_deck")!
      .executor!({
        title: "Test",
        fontPreset: "editorial",
        paletteName: "warm editorial",
      });

    // Explicit id overrides the closure-tracked one.
    await tools
      .find((t) => toolName(t) === "patch_slides")!
      .executor!({
        replaces_interaction_id: "custom_id",
        operations: [{ action: "update_theme", set: { fontPreset: "techno" } }],
      });

    expect(calls[calls.length - 1]).toEqual({ replaces_interaction_id: "custom_id" });
  });
});

describe("createSlideTools tool list", () => {
  it("exposes plan_deck, add_slide, read_slides, patch_slides (no standalone display tool)", () => {
    const { storage } = makeStore();
    const tools = createSlideTools({
      getConversationId: () => "cid",
      storage,
      displaySlides: async () => ({}),
    });
    const names = tools.map((t) => toolName(t));
    expect(names).toEqual(["plan_deck", "add_slide", "read_slides", "patch_slides"]);
  });

  it("works without a displaySlides callback (headless mode)", () => {
    const { storage } = makeStore();
    const tools = createSlideTools({ getConversationId: () => "cid", storage });
    const names = tools.map((t) => toolName(t));
    expect(names).toEqual(["plan_deck", "add_slide", "read_slides", "patch_slides"]);
  });
});
