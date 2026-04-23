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

/** Valid plan_deck args that can be reused across tests. */
const VALID_PLAN = {
  title: "Test",
  fontPreset: "editorial",
  paletteName: "warm editorial",
  slideCount: 5,
  layouts: ["cover-centered", "text-bullets"],
};

describe("plan_deck executor", () => {
  it("rejects when title is missing", async () => {
    const result = (await getTool("plan_deck").executor!({
      fontPreset: "editorial",
      paletteName: "warm editorial",
      slideCount: 5,
      layouts: ["cover-centered"],
    })) as { error?: string };
    expect(result.error).toMatch(/title is required/);
  });

  it("rejects when layouts is missing or empty", async () => {
    for (const layouts of [undefined, [], "cover-centered", null]) {
      const result = (await getTool("plan_deck").executor!({
        ...VALID_PLAN,
        layouts,
      })) as { error?: string };
      expect(result.error, `layouts=${JSON.stringify(layouts)}`).toMatch(
        /layouts is required|at least one valid layout/
      );
    }
  });

  it("rejects when layouts contains unknown names", async () => {
    const result = (await getTool("plan_deck").executor!({
      ...VALID_PLAN,
      layouts: ["cover-centered", "not-a-layout", "another-bogus"],
    })) as { error?: string };
    expect(result.error).toMatch(/Unknown layout name\(s\) in layouts/);
    expect(result.error).toContain('"not-a-layout"');
    expect(result.error).toContain('"another-bogus"');
  });

  it("renders recipes only for the planned layouts, not the full catalog", async () => {
    const result = (await getTool("plan_deck").executor!({
      ...VALID_PLAN,
      layouts: ["cover-centered", "text-bullets"],
    })) as { content?: string };
    const content = result.content ?? "";
    // Planned layouts are present
    expect(content).toContain("cover-centered");
    expect(content).toContain("text-bullets");
    // An unrelated layout is NOT rendered as a recipe heading
    expect(content).not.toMatch(/^compare-two-panel —/m);
    expect(content).not.toMatch(/^takeaways-numbered —/m);
  });

  it("rejects when fontPreset is unknown", async () => {
    const result = (await getTool("plan_deck").executor!({
      ...VALID_PLAN,
      fontPreset: "nope",
    })) as { error?: string };
    expect(result.error).toMatch(/Unknown fontPreset/);
  });

  it("rejects when paletteName is unknown", async () => {
    const result = (await getTool("plan_deck").executor!({
      ...VALID_PLAN,
      paletteName: "not a palette",
    })) as { error?: string };
    expect(result.error).toMatch(/Unknown paletteName/);
  });

  it("rejects when slideCount is missing or out of range", async () => {
    for (const slideCount of [undefined, 0, 2, 20, 31, 100, "five", 5.5]) {
      const result = (await getTool("plan_deck").executor!({
        ...VALID_PLAN,
        slideCount,
      })) as { error?: string };
      expect(result.error, `slideCount=${JSON.stringify(slideCount)}`).toMatch(
        /slideCount must be an integer between 3 and 19/
      );
    }
  });

  it("initializes slides.json with the chosen theme and an empty slides array", async () => {
    const { store, storage } = makeStore();
    const tools = createSlideTools({ getConversationId: () => "cid", storage });
    const result = (await tools.find((t) => toolName(t) === "plan_deck")!.executor!({
      ...VALID_PLAN,
      title: "Home Gardening",
      slideCount: 10,
    })) as { content?: string; error?: string };
    expect(result.error).toBeUndefined();
    expect(result.content).toContain("Deck initialized");
    expect(result.content).toContain("10"); // slideCount surfaced in prompt

    const raw = store.get("slides.json");
    expect(raw).toBeDefined();
    const parsed = JSON.parse(raw!);
    expect(parsed.version).toBe(2);
    expect(parsed.theme.fontPreset).toBe("editorial");
    expect(parsed.slides).toEqual([]);
    expect(parsed.theme.colors.slideBg).toBe("#F3EEE5"); // warm editorial
  });

  it("honors the model's fontPreset when it differs from the palette's default", async () => {
    const { store, storage } = makeStore();
    const tools = createSlideTools({ getConversationId: () => "cid", storage });
    // "warm editorial" palette has fontPreset "editorial"; override to "bold".
    const result = (await tools.find((t) => toolName(t) === "plan_deck")!.executor!({
      ...VALID_PLAN,
      fontPreset: "bold",
    })) as { content?: string; error?: string };
    expect(result.error).toBeUndefined();
    const parsed = JSON.parse(store.get("slides.json")!);
    expect(parsed.theme.fontPreset).toBe("bold");
    expect(result.content).toContain("fontPreset: bold");
  });

  it("returns content with palette hex values, element kinds, shared header, and layout recipes", async () => {
    const result = (await getTool("plan_deck").executor!(VALID_PLAN)) as { content?: string };
    const content = result.content ?? "";
    expect(content).toContain("#F3EEE5"); // palette hex
    expect(content).toContain("ELEMENT TYPES");
    expect(content).toContain("SHARED HEADER PATTERN");
    expect(content).toContain("LAYOUT RECIPES");
    expect(content).toContain("NOW call add_slide");
  });

  it("refuses to overwrite an existing non-empty deck (state-machine guard)", async () => {
    const { storage } = makeStore();
    const tools = createSlideTools({ getConversationId: () => "cid", storage });
    const planDeck = tools.find((t) => toolName(t) === "plan_deck")!;
    const addSlide = tools.find((t) => toolName(t) === "add_slide")!;

    // Initialize + add one slide.
    await planDeck.executor!(VALID_PLAN);
    await addSlide.executor!({
      layout: "cover-centered",
      slide: { id: "s1", elements: [] },
    });

    // Second plan_deck should error instead of clobbering.
    const result = (await planDeck.executor!(VALID_PLAN)) as { error?: string };
    expect(result.error).toMatch(/Deck already exists with 1 slide/);
    expect(result.error).toMatch(/read_slides \+ patch_slides/);
  });

  it("allows plan_deck to re-run if the deck exists but has zero slides (pre-add_slide)", async () => {
    const { storage } = makeStore();
    const tools = createSlideTools({ getConversationId: () => "cid", storage });
    const planDeck = tools.find((t) => toolName(t) === "plan_deck")!;

    // First plan_deck writes an empty deck.
    await planDeck.executor!(VALID_PLAN);
    // Second plan_deck on an empty deck is allowed (e.g. user picks a
    // different palette before adding any slides).
    const result = (await planDeck.executor!({
      ...VALID_PLAN,
      paletteName: "techno dark",
    })) as { content?: string; error?: string };
    expect(result.error).toBeUndefined();
    expect(result.content).toContain("Deck initialized");
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
    const result = (await tools.find((t) => toolName(t) === "plan_deck")!.executor!({
      ...VALID_PLAN,
      title: "My Deck",
    })) as {
      interaction_id?: string;
    };
    expect(received).toEqual({ title: "My Deck" });
    expect(result.interaction_id).toBe("deck_xyz");
  });
});

describe("add_slide executor", () => {
  async function initDeck(
    storage: ReturnType<typeof makeStore>["storage"],
    displaySlides?: (args: Record<string, unknown>) => Promise<unknown>,
    slideCount = 5
  ) {
    const tools = createSlideTools({
      getConversationId: () => "cid",
      storage,
      displaySlides,
    });
    await tools.find((t) => toolName(t) === "plan_deck")!.executor!({ ...VALID_PLAN, slideCount });
    return tools;
  }

  const VALID_SLIDE = { id: "s1", elements: [] };

  it("rejects when layout is missing", async () => {
    const { storage } = makeStore();
    const tools = await initDeck(storage);
    const result = (await tools.find((t) => toolName(t) === "add_slide")!.executor!({
      slide: VALID_SLIDE,
    })) as { error?: string };
    expect(result.error).toMatch(/layout is required/);
  });

  it("rejects when layout is not in the catalog", async () => {
    const { storage } = makeStore();
    const tools = await initDeck(storage);
    const result = (await tools.find((t) => toolName(t) === "add_slide")!.executor!({
      layout: "bogus-layout",
      slide: VALID_SLIDE,
    })) as { error?: string };
    expect(result.error).toMatch(/Unknown layout 'bogus-layout'/);
  });

  it("rejects a layout that wasn't in plan_deck's planned layouts list", async () => {
    const { storage } = makeStore();
    const tools = createSlideTools({ getConversationId: () => "cid", storage });
    await tools.find((t) => toolName(t) === "plan_deck")!.executor!({
      ...VALID_PLAN,
      layouts: ["cover-centered"],
    });
    // "text-bullets" is a valid catalog name but not in this deck's plan.
    const result = (await tools.find((t) => toolName(t) === "add_slide")!.executor!({
      layout: "text-bullets",
      slide: VALID_SLIDE,
    })) as { error?: string };
    expect(result.error).toMatch(/not in the plan_deck layouts list/);
    expect(result.error).toContain("'cover-centered'");
  });

  it("rejects when slide is missing", async () => {
    const { storage } = makeStore();
    const tools = await initDeck(storage);
    const result = (await tools.find((t) => toolName(t) === "add_slide")!.executor!({
      layout: "cover-centered",
    })) as { error?: string };
    expect(result.error).toMatch(/slide is required/);
  });

  it("rejects when slide.id is missing", async () => {
    const { storage } = makeStore();
    const tools = await initDeck(storage);
    const result = (await tools.find((t) => toolName(t) === "add_slide")!.executor!({
      layout: "cover-centered",
      slide: { elements: [] },
    })) as {
      error?: string;
    };
    expect(result.error).toMatch(/slide.id is required/);
  });

  it("rejects when slide.elements is not an array", async () => {
    const { storage } = makeStore();
    const tools = await initDeck(storage);
    const result = (await tools.find((t) => toolName(t) === "add_slide")!.executor!({
      layout: "cover-centered",
      slide: { id: "s1", elements: "nope" },
    })) as { error?: string };
    expect(result.error).toMatch(/elements must be an array/);
  });

  it("errors if plan_deck was never called", async () => {
    const { storage } = makeStore();
    const tools = createSlideTools({ getConversationId: () => "cid", storage });
    const result = (await tools.find((t) => toolName(t) === "add_slide")!.executor!({
      layout: "cover-centered",
      slide: VALID_SLIDE,
    })) as { error?: string };
    expect(result.error).toMatch(/Call plan_deck first/);
  });

  it("appends a slide, tracks layout usage, and reports remaining", async () => {
    const { store, storage } = makeStore();
    const tools = await initDeck(storage, undefined, 3);
    const result = (await tools.find((t) => toolName(t) === "add_slide")!.executor!({
      layout: "cover-centered",
      slide: { id: "cover", elements: [{ kind: "text", id: "t1", x: 0, y: 0, w: 10, h: 5 }] },
    })) as {
      success?: boolean;
      slideIndex?: number;
      totalSlides?: number;
      remaining?: number;
      layoutUsage?: Record<string, number>;
    };
    expect(result.success).toBe(true);
    expect(result.slideIndex).toBe(0);
    expect(result.totalSlides).toBe(1);
    expect(result.remaining).toBe(2);
    expect(result.layoutUsage).toEqual({ "cover-centered": 1 });
    const parsed = JSON.parse(store.get("slides.json")!);
    expect(parsed.slides).toHaveLength(1);
    expect(parsed.slides[0].id).toBe("cover");
  });

  it("bumps layoutUsage and decrements remaining across multiple calls", async () => {
    const { storage } = makeStore();
    const tools = await initDeck(storage, undefined, 3);
    const addSlide = tools.find((t) => toolName(t) === "add_slide")!;
    await addSlide.executor!({
      layout: "cover-centered",
      slide: { id: "s1", elements: [] },
    });
    await addSlide.executor!({
      layout: "text-bullets",
      slide: { id: "s2", elements: [] },
    });
    const result = (await addSlide.executor!({
      layout: "cover-centered",
      slide: { id: "s3", elements: [] },
    })) as { remaining?: number; layoutUsage?: Record<string, number> };
    expect(result.remaining).toBe(0);
    expect(result.layoutUsage).toEqual({ "cover-centered": 2, "text-bullets": 1 });
  });

  it("rejects an unknown fontFamily on any element", async () => {
    const { storage } = makeStore();
    const tools = await initDeck(storage);
    const result = (await tools.find((t) => toolName(t) === "add_slide")!.executor!({
      layout: "cover-centered",
      slide: {
        id: "s1",
        elements: [
          {
            kind: "text",
            id: "t1",
            x: 0,
            y: 0,
            w: 10,
            h: 5,
            text: "Hi",
            fontFamily: "Comic Sans MS",
          },
        ],
      },
    })) as { error?: string };
    expect(result.error).toMatch(/Unknown fontFamily/);
    expect(result.error).toMatch(/Comic Sans MS/);
  });

  it("accepts any fontFamily listed in the library", async () => {
    const { storage } = makeStore();
    const tools = await initDeck(storage);
    const result = (await tools.find((t) => toolName(t) === "add_slide")!.executor!({
      layout: "cover-centered",
      slide: {
        id: "s1",
        elements: [
          {
            kind: "text",
            id: "t1",
            x: 0,
            y: 0,
            w: 10,
            h: 5,
            text: "Hi",
            fontFamily: "Bebas Neue",
          },
        ],
      },
    })) as { success?: boolean; error?: string };
    expect(result.error).toBeUndefined();
    expect(result.success).toBe(true);
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
    await addSlide.executor!({
      layout: "cover-centered",
      slide: { id: "s1", elements: [] },
    });
    await addSlide.executor!({
      layout: "text-bullets",
      slide: { id: "s2", elements: [] },
    });

    // plan_deck: called with { title }
    expect(calls[0]).toEqual({ title: "Test" });
    // add_slide #1: should pass plan_deck's returned id as replaces_interaction_id,
    // and thread the deck title so the viewer header stays stable across appends.
    expect(calls[1]).toEqual({ title: "Test", replaces_interaction_id: "deck_1" });
    // add_slide #2: should pass add_slide #1's returned id
    expect(calls[2]).toEqual({ title: "Test", replaces_interaction_id: "deck_2" });
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
    // plan_deck (deck_1), add one slide (deck_2)
    await tools.find((t) => toolName(t) === "plan_deck")!.executor!(VALID_PLAN);
    await tools.find((t) => toolName(t) === "add_slide")!.executor!({
      layout: "cover-centered",
      slide: { id: "s1", elements: [] },
    });

    // patch_slides without replaces_interaction_id — should fall back to deck_2
    await tools.find((t) => toolName(t) === "patch_slides")!.executor!({
      operations: [{ action: "update_theme", set: { fontPreset: "techno" } }],
    });

    expect(calls[calls.length - 1]).toEqual({
      title: "Test",
      replaces_interaction_id: "deck_2",
    });
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
    await tools.find((t) => toolName(t) === "plan_deck")!.executor!(VALID_PLAN);

    // Explicit id overrides the closure-tracked one.
    await tools.find((t) => toolName(t) === "patch_slides")!.executor!({
      replaces_interaction_id: "custom_id",
      operations: [{ action: "update_theme", set: { fontPreset: "techno" } }],
    });

    expect(calls[calls.length - 1]).toEqual({
      title: "Test",
      replaces_interaction_id: "custom_id",
    });
  });
});

describe("patch_slides fontFamily validation", () => {
  async function setupDeckWithOneSlide() {
    const { store, storage } = makeStore();
    const tools = createSlideTools({
      getConversationId: () => "cid",
      storage,
    });
    await tools.find((t) => toolName(t) === "plan_deck")!.executor!(VALID_PLAN);
    await tools.find((t) => toolName(t) === "add_slide")!.executor!({
      layout: "cover-centered",
      slide: {
        id: "s1",
        elements: [{ kind: "text", id: "t1", x: 0, y: 0, w: 10, h: 5, text: "Hi" }],
      },
    });
    return { store, storage, tools };
  }

  it("rejects update_element setting an unknown fontFamily", async () => {
    const { tools } = await setupDeckWithOneSlide();
    const result = (await tools.find((t) => toolName(t) === "patch_slides")!.executor!({
      operations: [
        {
          action: "update_element",
          slideId: "s1",
          elementId: "t1",
          set: { fontFamily: "Bogus Font" },
        },
      ],
    })) as { results?: string[] };
    expect(result.results).toBeDefined();
    expect(result.results!.join(" | ")).toMatch(/update_element: Unknown fontFamily/);
  });

  it("rejects add_element with an unknown fontFamily", async () => {
    const { tools } = await setupDeckWithOneSlide();
    const result = (await tools.find((t) => toolName(t) === "patch_slides")!.executor!({
      operations: [
        {
          action: "add_element",
          slideId: "s1",
          element: {
            kind: "text",
            id: "t2",
            x: 0,
            y: 0,
            w: 10,
            h: 5,
            text: "X",
            fontFamily: "Bogus",
          },
        },
      ],
    })) as { results?: string[] };
    expect(result.results!.join(" | ")).toMatch(/add_element: Unknown fontFamily/);
  });

  it("accepts patch_slides ops that use library fonts", async () => {
    const { tools } = await setupDeckWithOneSlide();
    const result = (await tools.find((t) => toolName(t) === "patch_slides")!.executor!({
      operations: [
        {
          action: "update_element",
          slideId: "s1",
          elementId: "t1",
          set: { fontFamily: "Caveat" },
        },
      ],
    })) as { results?: string[] };
    expect(result.results![0]).toMatch(/updated s1\/t1/);
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
