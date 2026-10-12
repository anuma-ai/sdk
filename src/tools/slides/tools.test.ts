import { describe, expect, it } from "vitest";

import type { ToolConfig } from "../../lib/chat/useChat/types";
import { buildSlideSystemPrompt, createSlideTools } from "./index";
import { type AnumaNode, getId, parseJsx } from "./jsx";

function slidesOf(deck: AnumaNode): AnumaNode[] {
  return deck.children.filter((c): c is AnumaNode => typeof c !== "string" && c.tag === "Slide");
}

function elementsOf(slide: AnumaNode): AnumaNode[] {
  return slide.children.filter((c): c is AnumaNode => typeof c !== "string");
}

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

const VALID_PLAN = {
  title: "Test",
  fontPreset: "editorial",
  paletteName: "warm editorial",
  slideCount: 5,
  layouts: ["cover-split-portrait--editorial-warm", "brand-story-split--editorial-warm"],
};

const EMPTY_SLIDE_JSX = `<Anuma.Slide id="s1" />`;

function slideJsxWithText(
  opts: {
    slideId?: string;
    textId?: string;
    fontFamily?: string;
    text?: string;
  } = {}
): string {
  const { slideId = "s1", textId = "t1", fontFamily, text = "Hi" } = opts;
  const styleParts = [`fontSize: 18`, `fontWeight: 400`, `color: "textPrimary"`];
  if (fontFamily) styleParts.push(`fontFamily: ${JSON.stringify(fontFamily)}`);
  const style = `style={{ ${styleParts.join(", ")} }}`;
  return `<Anuma.Slide id="${slideId}">
    <Anuma.Text id="${textId}" x={0} y={0} w={10} h={5} fontRole="body" ${style}>${text}</Anuma.Text>
  </Anuma.Slide>`;
}

describe("plan_deck executor", () => {
  it("rejects when title is missing", async () => {
    const result = (await getTool("plan_deck").executor!({
      fontPreset: "editorial",
      paletteName: "warm editorial",
      slideCount: 5,
      layouts: ["cover-split-portrait--editorial-warm"],
    })) as { error?: string };
    expect(result.error).toMatch(/title is required/);
  });

  it("rejects when layouts is missing or empty", async () => {
    for (const layouts of [undefined, [], "cover-split-portrait--editorial-warm", null]) {
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
      layouts: ["cover-split-portrait--editorial-warm", "not-a-layout", "another-bogus"],
    })) as { error?: string };
    expect(result.error).toMatch(/Unknown layout name\(s\) in layouts/);
    expect(result.error).toContain('"not-a-layout"');
    expect(result.error).toContain('"another-bogus"');
  });

  it("renders recipes only for the planned layouts, not the full catalog", async () => {
    const result = (await getTool("plan_deck").executor!({
      ...VALID_PLAN,
      layouts: ["cover-split-portrait--editorial-warm", "brand-story-split--editorial-warm"],
    })) as { content?: string };
    const content = result.content ?? "";
    expect(content).toContain("cover-split-portrait--editorial-warm");
    expect(content).toContain("brand-story-split--editorial-warm");
    expect(content).not.toMatch(/^multi-stat-asymmetric--editorial-warm —/m);
    expect(content).not.toMatch(/^peer-comparison-table--editorial-warm —/m);
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

  it("initializes slides.jsx with the chosen theme and an empty slides array", async () => {
    const { store, storage } = makeStore();
    const tools = createSlideTools({ getConversationId: () => "cid", storage });
    const result = (await tools.find((t) => toolName(t) === "plan_deck")!.executor!({
      ...VALID_PLAN,
      title: "Home Gardening",
      slideCount: 10,
    })) as { content?: string; error?: string };
    expect(result.error).toBeUndefined();
    expect(result.content).toContain("Deck initialized");
    expect(result.content).toContain("10");

    const raw = store.get("slides.jsx");
    expect(raw).toBeDefined();
    expect(raw).toContain("<Anuma.Deck");
    const parsed = parseJsx(raw!);
    expect(parsed.tag).toBe("Deck");
    expect(parsed.attrs.fontPreset).toBe("editorial");
    expect(slidesOf(parsed)).toEqual([]);
    expect(parsed.attrs.slideBg).toBe("#F3EEE5");
  });

  it("honors the model's fontPreset when it differs from the palette's default", async () => {
    const { store, storage } = makeStore();
    const tools = createSlideTools({ getConversationId: () => "cid", storage });
    const result = (await tools.find((t) => toolName(t) === "plan_deck")!.executor!({
      ...VALID_PLAN,
      fontPreset: "bold",
    })) as { content?: string; error?: string };
    expect(result.error).toBeUndefined();
    const parsed = parseJsx(store.get("slides.jsx")!);
    expect(parsed.attrs.fontPreset).toBe("bold");
    expect(result.content).toContain("fontPreset: bold");
  });

  it("returns content with palette hex values, element tags, and layout recipes", async () => {
    const result = (await getTool("plan_deck").executor!(VALID_PLAN)) as { content?: string };
    const content = result.content ?? "";
    expect(content).toContain("#F3EEE5");
    expect(content).toContain("ELEMENT TAGS");
    expect(content).toContain("LAYOUT RECIPES");
    expect(content).toContain("NOW call add_slide");
  });

  it("rejects accent that isn't a 6-digit hex", async () => {
    for (const accent of ["green", "#abc", "#GGGGGG", "rgb(0,0,0)", 123]) {
      const result = (await getTool("plan_deck").executor!({
        ...VALID_PLAN,
        accent,
      })) as { error?: string };
      expect(result.error, `accent=${JSON.stringify(accent)}`).toMatch(
        /accent must be a 6-digit hex/
      );
    }
  });

  it("applies an accent override to a colored system's recipes", async () => {
    const result = (await getTool("plan_deck").executor!({
      ...VALID_PLAN,
      paletteName: "techno dark",
      fontPreset: "techno",
      layouts: ["cover-statement--techno-bold", "brand-story-split--techno-bold"],
      accent: "#16A34A",
    })) as { content?: string; error?: string };
    expect(result.error).toBeUndefined();
    const content = result.content ?? "";
    expect(content).toContain("#16A34A");
    expect(content).not.toContain("#3B82F6");
  });

  it("applies an accent override to palette-driven systems via the deck-level accent token", async () => {
    const { store, storage } = makeStore();
    const tools = createSlideTools({ getConversationId: () => "cid", storage });
    const result = (await tools.find((t) => toolName(t) === "plan_deck")!.executor!({
      ...VALID_PLAN,
      layouts: ["cover-split-portrait--editorial-warm"],
      accent: "#16A34A",
    })) as { content?: string; error?: string };
    expect(result.error).toBeUndefined();
    const deck = parseJsx(store.get("slides.jsx")!);
    expect(deck.attrs.accent).toBe("#16A34A");
    expect(result.content ?? "").toContain("#16A34A");
  });

  it("refuses to overwrite an existing non-empty deck (state-machine guard)", async () => {
    const { storage } = makeStore();
    const tools = createSlideTools({ getConversationId: () => "cid", storage });
    const planDeck = tools.find((t) => toolName(t) === "plan_deck")!;
    const addSlide = tools.find((t) => toolName(t) === "add_slide")!;

    await planDeck.executor!(VALID_PLAN);
    await addSlide.executor!({
      layout: "cover-split-portrait--editorial-warm",
      slideJsx: EMPTY_SLIDE_JSX,
    });

    const result = (await planDeck.executor!(VALID_PLAN)) as { error?: string };
    expect(result.error).toMatch(/Deck already exists with 1 slide/);
    expect(result.error).toMatch(/read_slides \+ patch_slides/);
  });

  it("allows plan_deck to re-run if the deck exists but has zero slides (pre-add_slide)", async () => {
    const { storage } = makeStore();
    const tools = createSlideTools({ getConversationId: () => "cid", storage });
    const planDeck = tools.find((t) => toolName(t) === "plan_deck")!;

    await planDeck.executor!(VALID_PLAN);
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

  it("rejects when layout is missing", async () => {
    const { storage } = makeStore();
    const tools = await initDeck(storage);
    const result = (await tools.find((t) => toolName(t) === "add_slide")!.executor!({
      slideJsx: EMPTY_SLIDE_JSX,
    })) as { error?: string };
    expect(result.error).toMatch(/layout is required/);
  });

  it("rejects when layout is not in the catalog", async () => {
    const { storage } = makeStore();
    const tools = await initDeck(storage);
    const result = (await tools.find((t) => toolName(t) === "add_slide")!.executor!({
      layout: "bogus-layout",
      slideJsx: EMPTY_SLIDE_JSX,
    })) as { error?: string };
    expect(result.error).toMatch(/Unknown layout 'bogus-layout'/);
  });

  it("rejects a layout that wasn't in plan_deck's planned layouts list", async () => {
    const { storage } = makeStore();
    const tools = createSlideTools({ getConversationId: () => "cid", storage });
    await tools.find((t) => toolName(t) === "plan_deck")!.executor!({
      ...VALID_PLAN,
      layouts: ["cover-split-portrait--editorial-warm"],
    });
    const result = (await tools.find((t) => toolName(t) === "add_slide")!.executor!({
      layout: "brand-story-split--editorial-warm",
      slideJsx: EMPTY_SLIDE_JSX,
    })) as { error?: string };
    expect(result.error).toMatch(/not in the plan_deck layouts list/);
    expect(result.error).toContain("'cover-split-portrait--editorial-warm'");
  });

  it("rejects when slideJsx is missing", async () => {
    const { storage } = makeStore();
    const tools = await initDeck(storage);
    const result = (await tools.find((t) => toolName(t) === "add_slide")!.executor!({
      layout: "cover-split-portrait--editorial-warm",
    })) as { error?: string };
    expect(result.error).toMatch(/slideJsx is required/);
  });

  it("rejects when slideJsx root is not <Anuma.Slide>", async () => {
    const { storage } = makeStore();
    const tools = await initDeck(storage);
    const result = (await tools.find((t) => toolName(t) === "add_slide")!.executor!({
      layout: "cover-split-portrait--editorial-warm",
      slideJsx: `<Anuma.Deck fontPreset="default" />`,
    })) as { error?: string };
    expect(result.error).toMatch(/Invalid slideJsx/);
  });

  it("rejects when slideJsx fails to parse", async () => {
    const { storage } = makeStore();
    const tools = await initDeck(storage);
    const result = (await tools.find((t) => toolName(t) === "add_slide")!.executor!({
      layout: "cover-split-portrait--editorial-warm",
      slideJsx: `<Anuma.Slide id="s1"><this is broken`,
    })) as { error?: string };
    expect(result.error).toMatch(/Invalid slideJsx/);
  });

  it("errors if plan_deck was never called", async () => {
    const { storage } = makeStore();
    const tools = createSlideTools({ getConversationId: () => "cid", storage });
    const result = (await tools.find((t) => toolName(t) === "add_slide")!.executor!({
      layout: "cover-split-portrait--editorial-warm",
      slideJsx: EMPTY_SLIDE_JSX,
    })) as { error?: string };
    expect(result.error).toMatch(/Call plan_deck first/);
  });

  it("appends a slide, tracks layout usage, and reports remaining", async () => {
    const { store, storage } = makeStore();
    const tools = await initDeck(storage, undefined, 3);
    const result = (await tools.find((t) => toolName(t) === "add_slide")!.executor!({
      layout: "cover-split-portrait--editorial-warm",
      slideJsx: slideJsxWithText({ slideId: "cover" }),
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
    expect(result.layoutUsage).toEqual({ "cover-split-portrait--editorial-warm": 1 });
    const parsed = parseJsx(store.get("slides.jsx")!);
    const slides = slidesOf(parsed);
    expect(slides).toHaveLength(1);
    expect(getId(slides[0]!)).toBe("cover");
  });

  it("sorts slides by slideIndex regardless of insertion order (parallel-batch ordering)", async () => {
    const { store, storage } = makeStore();
    const tools = await initDeck(storage, undefined, 3);
    const addSlide = tools.find((t) => toolName(t) === "add_slide")!;
    await addSlide.executor!({
      slideIndex: 3,
      layout: "cover-split-portrait--editorial-warm",
      slideJsx: `<Anuma.Slide id="slide-c" />`,
    });
    await addSlide.executor!({
      slideIndex: 1,
      layout: "cover-split-portrait--editorial-warm",
      slideJsx: `<Anuma.Slide id="slide-a" />`,
    });
    await addSlide.executor!({
      slideIndex: 2,
      layout: "brand-story-split--editorial-warm",
      slideJsx: `<Anuma.Slide id="slide-b" />`,
    });
    const deck = parseJsx(store.get("slides.jsx")!);
    const slideIds = deck.children
      .filter((c) => typeof c !== "string" && c.tag === "Slide")
      .map((c) => (c as { attrs: { id?: unknown } }).attrs.id);
    expect(slideIds).toEqual(["slide-a", "slide-b", "slide-c"]);
  });

  it("overwrites a slide when add_slide is retried with the same slideIndex", async () => {
    const { store, storage } = makeStore();
    const tools = await initDeck(storage, undefined, 3);
    const addSlide = tools.find((t) => toolName(t) === "add_slide")!;
    await addSlide.executor!({
      slideIndex: 1,
      layout: "cover-split-portrait--editorial-warm",
      slideJsx: `<Anuma.Slide id="first-attempt" />`,
    });
    await addSlide.executor!({
      slideIndex: 1,
      layout: "cover-split-portrait--editorial-warm",
      slideJsx: `<Anuma.Slide id="retry" />`,
    });
    const deck = parseJsx(store.get("slides.jsx")!);
    const slides = deck.children.filter((c) => typeof c !== "string" && c.tag === "Slide");
    expect(slides).toHaveLength(1);
    expect((slides[0] as { attrs: { id?: unknown } }).attrs.id).toBe("retry");
  });

  it("bumps layoutUsage and decrements remaining across multiple calls", async () => {
    const { storage } = makeStore();
    const tools = await initDeck(storage, undefined, 3);
    const addSlide = tools.find((t) => toolName(t) === "add_slide")!;
    await addSlide.executor!({
      layout: "cover-split-portrait--editorial-warm",
      slideJsx: `<Anuma.Slide id="s1" />`,
    });
    await addSlide.executor!({
      layout: "brand-story-split--editorial-warm",
      slideJsx: `<Anuma.Slide id="s2" />`,
    });
    const result = (await addSlide.executor!({
      layout: "cover-split-portrait--editorial-warm",
      slideJsx: `<Anuma.Slide id="s3" />`,
    })) as { remaining?: number; layoutUsage?: Record<string, number> };
    expect(result.remaining).toBe(0);
    expect(result.layoutUsage).toEqual({
      "cover-split-portrait--editorial-warm": 2,
      "brand-story-split--editorial-warm": 1,
    });
  });

  it("rejects an unknown fontFamily on any element", async () => {
    const { storage } = makeStore();
    const tools = await initDeck(storage);
    const result = (await tools.find((t) => toolName(t) === "add_slide")!.executor!({
      layout: "cover-split-portrait--editorial-warm",
      slideJsx: slideJsxWithText({ fontFamily: "Comic Sans MS" }),
    })) as { error?: string };
    expect(result.error).toMatch(/Unknown fontFamily/);
    expect(result.error).toMatch(/Comic Sans MS/);
  });

  it("auto-strips <Anuma.Image> elements whose src still carries the placeholder sentinel", async () => {
    const { store, storage } = makeStore();
    const tools = await initDeck(storage);
    const slideJsx = `<Anuma.Slide id="s1"><Anuma.Text id="t" x={0} y={0} w={100} h={20} fontRole="body" style={{ fontSize: 18, color: "textPrimary" }}>Hi</Anuma.Text><Anuma.Image id="img" x={0} y={0} w={100} h={100} src="REPLACE_WITH_IMAGE_OR_REMOVE" /></Anuma.Slide>`;
    const result = (await tools.find((t) => toolName(t) === "add_slide")!.executor!({
      layout: "cover-split-portrait--editorial-warm",
      slideJsx,
    })) as { success?: boolean; error?: string; message?: string; strippedImageCount?: number };
    expect(result.error).toBeUndefined();
    expect(result.success).toBe(true);
    expect(result.strippedImageCount).toBe(1);
    expect(result.message).toMatch(/Auto-stripped 1 unfilled <Anuma\.Image>/);
    const persisted = store.get("slides.jsx")!;
    expect(persisted).not.toContain("REPLACE_WITH_IMAGE_OR_REMOVE");
    expect(persisted).toContain(">Hi<");
  });

  it("strips multiple sentinel-carrying Image elements and counts each", async () => {
    const { store, storage } = makeStore();
    const tools = await initDeck(storage);
    const slideJsx = `<Anuma.Slide id="s2">
      <Anuma.Image id="img1" x={0} y={0} w={100} h={100} src="REPLACE_WITH_IMAGE_OR_REMOVE" />
      <Anuma.Image id="img2" x={120} y={0} w={100} h={100} src="REPLACE_WITH_IMAGE_OR_REMOVE" />
      <Anuma.Image id="img3" x={240} y={0} w={100} h={100} src="https://example.com/real.jpg" />
    </Anuma.Slide>`;
    const result = (await tools.find((t) => toolName(t) === "add_slide")!.executor!({
      layout: "cover-split-portrait--editorial-warm",
      slideJsx,
    })) as { success?: boolean; strippedImageCount?: number };
    expect(result.success).toBe(true);
    expect(result.strippedImageCount).toBe(2);
    const persisted = store.get("slides.jsx")!;
    expect(persisted).toContain('src="https://example.com/real.jpg"');
    expect(persisted).not.toContain("REPLACE_WITH_IMAGE_OR_REMOVE");
  });

  it("omits strippedImageCount from the response when no Image was stripped", async () => {
    const { storage } = makeStore();
    const tools = await initDeck(storage);
    const result = (await tools.find((t) => toolName(t) === "add_slide")!.executor!({
      layout: "cover-split-portrait--editorial-warm",
      slideJsx: `<Anuma.Slide id="s3" />`,
    })) as { success?: boolean; strippedImageCount?: number; message?: string };
    expect(result.success).toBe(true);
    expect(result.strippedImageCount).toBeUndefined();
    expect(result.message ?? "").not.toMatch(/Auto-stripped/);
  });

  it("reports unused plan layouts in the success message while the deck is in progress", async () => {
    const { storage } = makeStore();
    const tools = await initDeck(storage, undefined, 3);
    const addSlide = tools.find((t) => toolName(t) === "add_slide")!;
    const result = (await addSlide.executor!({
      layout: "cover-split-portrait--editorial-warm",
      slideJsx: `<Anuma.Slide id="cover" />`,
    })) as { message?: string };
    expect(result.message).toMatch(/Unused from your plan: brand-story-split--editorial-warm/);
    expect(result.message).toMatch(/prefer one of these for the next slide/);
  });

  it("omits the unused-layouts hint when every plan layout has been used at least once", async () => {
    const { storage } = makeStore();
    const tools = await initDeck(storage, undefined, 3);
    const addSlide = tools.find((t) => toolName(t) === "add_slide")!;
    await addSlide.executor!({
      layout: "cover-split-portrait--editorial-warm",
      slideJsx: `<Anuma.Slide id="s1" />`,
    });
    const result = (await addSlide.executor!({
      layout: "brand-story-split--editorial-warm",
      slideJsx: `<Anuma.Slide id="s2" />`,
    })) as { message?: string };
    expect(result.message).not.toMatch(/Unused from your plan/);
  });

  it("accepts any fontFamily listed in the library", async () => {
    const { storage } = makeStore();
    const tools = await initDeck(storage);
    const result = (await tools.find((t) => toolName(t) === "add_slide")!.executor!({
      layout: "cover-split-portrait--editorial-warm",
      slideJsx: slideJsxWithText({ fontFamily: "Bebas Neue" }),
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
      layout: "cover-split-portrait--editorial-warm",
      slideJsx: `<Anuma.Slide id="s1" />`,
    });
    await addSlide.executor!({
      layout: "brand-story-split--editorial-warm",
      slideJsx: `<Anuma.Slide id="s2" />`,
    });

    expect(calls[0]).toEqual({ title: "Test" });
    expect(calls[1]).toEqual({ title: "Test", replaces_interaction_id: "deck_1" });
    expect(calls[2]).toEqual({ title: "Test", replaces_interaction_id: "deck_2" });
  });

  it("rewrites duplicate element ids on append and reports them in the result", async () => {
    const { store, storage } = makeStore();
    const tools = await initDeck(storage, undefined, 3);
    const addSlide = tools.find((t) => toolName(t) === "add_slide")!;

    await addSlide.executor!({
      layout: "cover-split-portrait--editorial-warm",
      slideJsx: slideJsxWithText({ slideId: "s1", textId: "title", text: "First" }),
    });
    const second = (await addSlide.executor!({
      layout: "brand-story-split--editorial-warm",
      slideJsx: slideJsxWithText({ slideId: "s2", textId: "title", text: "Second" }),
    })) as {
      success?: boolean;
      renamedIds?: Array<{ from: string; to: string }>;
      message?: string;
    };
    expect(second.success).toBe(true);
    expect(second.renamedIds).toEqual([{ from: "title", to: "title-2" }]);
    expect(second.message).toContain("title→title-2");

    const parsed = parseJsx(store.get("slides.jsx")!);
    const slides = slidesOf(parsed);
    expect(getId(elementsOf(slides[0]!)[0]!)).toBe("title");
    expect(getId(elementsOf(slides[1]!)[0]!)).toBe("title-2");
  });

  it("does not rename ids when the new slide's ids don't collide", async () => {
    const { storage } = makeStore();
    const tools = await initDeck(storage, undefined, 3);
    const addSlide = tools.find((t) => toolName(t) === "add_slide")!;

    await addSlide.executor!({
      layout: "cover-split-portrait--editorial-warm",
      slideJsx: slideJsxWithText({ slideId: "s1", textId: "cover-title" }),
    });
    const second = (await addSlide.executor!({
      layout: "brand-story-split--editorial-warm",
      slideJsx: slideJsxWithText({ slideId: "s2", textId: "body-text" }),
    })) as { renamedIds?: unknown; message?: string };
    expect(second.renamedIds).toBeUndefined();
    expect(second.message).not.toContain("Renamed");
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
    await tools.find((t) => toolName(t) === "plan_deck")!.executor!(VALID_PLAN);
    await tools.find((t) => toolName(t) === "add_slide")!.executor!({
      layout: "cover-split-portrait--editorial-warm",
      slideJsx: `<Anuma.Slide id="s1" />`,
    });

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

describe("patch_slides JSX ops", () => {
  async function setupDeckWithOneSlide() {
    const { store, storage } = makeStore();
    const tools = createSlideTools({
      getConversationId: () => "cid",
      storage,
    });
    await tools.find((t) => toolName(t) === "plan_deck")!.executor!(VALID_PLAN);
    await tools.find((t) => toolName(t) === "add_slide")!.executor!({
      layout: "cover-split-portrait--editorial-warm",
      slideJsx: slideJsxWithText(),
    });
    return { store, storage, tools };
  }

  function textJsx(id: string, fontFamily?: string): string {
    const parts = [`fontSize: 18`, `fontWeight: 400`, `color: "textPrimary"`];
    if (fontFamily) parts.push(`fontFamily: ${JSON.stringify(fontFamily)}`);
    const style = `style={{ ${parts.join(", ")} }}`;
    return `<Anuma.Text id="${id}" x={0} y={0} w={10} h={5} fontRole="body" ${style}>X</Anuma.Text>`;
  }

  it("replace_element rejects an unknown fontFamily", async () => {
    const { tools } = await setupDeckWithOneSlide();
    const result = (await tools.find((t) => toolName(t) === "patch_slides")!.executor!({
      operations: [
        {
          action: "replace_element",
          slideId: "s1",
          elementId: "t1",
          jsx: textJsx("t1", "Bogus Font"),
        },
      ],
    })) as { results?: string[] };
    expect(result.results).toBeDefined();
    expect(result.results!.join(" | ")).toMatch(/replace_element: Unknown fontFamily/);
  });

  it("insert_element rejects an unknown fontFamily", async () => {
    const { tools } = await setupDeckWithOneSlide();
    const result = (await tools.find((t) => toolName(t) === "patch_slides")!.executor!({
      operations: [
        {
          action: "insert_element",
          slideId: "s1",
          jsx: textJsx("t2", "Bogus"),
        },
      ],
    })) as { results?: string[] };
    expect(result.results!.join(" | ")).toMatch(/insert_element: Unknown fontFamily/);
  });

  it("patch_slides ops auto-strip <Anuma.Image> elements that still carry the placeholder sentinel", async () => {
    const { store, tools } = await setupDeckWithOneSlide();
    const patch = tools.find((t) => toolName(t) === "patch_slides")!;

    const replaceElementResult = (await patch.executor!({
      operations: [
        {
          action: "replace_element",
          slideId: "s1",
          elementId: "t1",
          jsx: `<Anuma.Group id="grp" x={0} y={0} w={100} h={100}><Anuma.Image id="i_bad" x={0} y={0} w={50} h={50} src="REPLACE_WITH_IMAGE_OR_REMOVE" /><Anuma.Image id="i_good" x={50} y={0} w={50} h={50} src="https://example.com/real.jpg" /></Anuma.Group>`,
        },
      ],
    })) as { results?: string[] };
    expect(replaceElementResult.results![0]).toMatch(/replaced s1\/t1.*stripped 1 unfilled/);

    const insertElementResult = (await patch.executor!({
      operations: [
        {
          action: "insert_element",
          slideId: "s1",
          jsx: `<Anuma.Group id="grp_extra" x={0} y={0} w={100} h={100}><Anuma.Image id="i_extra" x={0} y={0} w={50} h={50} src="REPLACE_WITH_IMAGE_OR_REMOVE" /></Anuma.Group>`,
        },
      ],
    })) as { results?: string[] };
    expect(insertElementResult.results![0]).toMatch(
      /inserted grp_extra into s1.*stripped 1 unfilled/
    );

    const replaceSlideResult = (await patch.executor!({
      operations: [
        {
          action: "replace_slide",
          slideId: "s1",
          jsx: `<Anuma.Slide id="s1"><Anuma.Image id="i_swap" x={0} y={0} w={100} h={100} src="REPLACE_WITH_IMAGE_OR_REMOVE" /></Anuma.Slide>`,
        },
      ],
    })) as { results?: string[] };
    expect(replaceSlideResult.results![0]).toMatch(/replaced slide s1.*stripped 1 unfilled/);

    const insertSlideResult = (await patch.executor!({
      operations: [
        {
          action: "insert_slide",
          layout: "cover-statement--editorial-warm",
          jsx: `<Anuma.Slide id="s2"><Anuma.Image id="i2" x={0} y={0} w={100} h={100} src="REPLACE_WITH_IMAGE_OR_REMOVE" /></Anuma.Slide>`,
        },
      ],
    })) as { results?: string[] };
    expect(insertSlideResult.results![0]).toMatch(/inserted slide s2.*stripped 1 unfilled/);

    const persisted = store.get("slides.jsx")!;
    expect(persisted).not.toContain("REPLACE_WITH_IMAGE_OR_REMOVE");
  });

  it("replace_element accepts a library font", async () => {
    const { tools } = await setupDeckWithOneSlide();
    const result = (await tools.find((t) => toolName(t) === "patch_slides")!.executor!({
      operations: [
        {
          action: "replace_element",
          slideId: "s1",
          elementId: "t1",
          jsx: textJsx("t1", "Caveat"),
        },
      ],
    })) as { results?: string[] };
    expect(result.results![0]).toMatch(/replaced s1\/t1/);
  });

  it("insert_element appends a new element to the slide", async () => {
    const { store, tools } = await setupDeckWithOneSlide();
    await tools.find((t) => toolName(t) === "patch_slides")!.executor!({
      operations: [
        {
          action: "insert_element",
          slideId: "s1",
          jsx: textJsx("t2"),
        },
      ],
    });
    const parsed = parseJsx(store.get("slides.jsx")!);
    const ids = elementsOf(slidesOf(parsed)[0]!).map((e) => getId(e));
    expect(ids).toEqual(["t1", "t2"]);
  });

  it("remove_element removes the matched element", async () => {
    const { store, tools } = await setupDeckWithOneSlide();
    await tools.find((t) => toolName(t) === "patch_slides")!.executor!({
      operations: [{ action: "remove_element", slideId: "s1", elementId: "t1" }],
    });
    const parsed = parseJsx(store.get("slides.jsx")!);
    expect(elementsOf(slidesOf(parsed)[0]!)).toEqual([]);
  });

  it("replace_slide swaps the whole <Anuma.Slide>", async () => {
    const { store, tools } = await setupDeckWithOneSlide();
    await tools.find((t) => toolName(t) === "patch_slides")!.executor!({
      operations: [
        {
          action: "replace_slide",
          slideId: "s1",
          jsx: slideJsxWithText({ slideId: "s1", textId: "replaced", text: "Replaced" }),
        },
      ],
    });
    const parsed = parseJsx(store.get("slides.jsx")!);
    const firstEl = elementsOf(slidesOf(parsed)[0]!)[0]!;
    expect(getId(firstEl)).toBe("replaced");
    expect(firstEl.children[0]).toBe("Replaced");
  });

  it("insert_slide appends a new slide", async () => {
    const { store, tools } = await setupDeckWithOneSlide();
    await tools.find((t) => toolName(t) === "patch_slides")!.executor!({
      operations: [
        {
          action: "insert_slide",
          layout: "cover-statement--editorial-warm",
          jsx: slideJsxWithText({ slideId: "s2" }),
        },
      ],
    });
    const parsed = parseJsx(store.get("slides.jsx")!);
    expect(slidesOf(parsed).map((s) => getId(s))).toEqual(["s1", "s2"]);
  });

  it("remove_slide deletes the matched slide", async () => {
    const { store, tools } = await setupDeckWithOneSlide();
    await tools.find((t) => toolName(t) === "patch_slides")!.executor!({
      operations: [{ action: "remove_slide", slideId: "s1" }],
    });
    const parsed = parseJsx(store.get("slides.jsx")!);
    expect(slidesOf(parsed)).toEqual([]);
  });

  it("update_theme merges a partial theme patch", async () => {
    const { store, tools } = await setupDeckWithOneSlide();
    await tools.find((t) => toolName(t) === "patch_slides")!.executor!({
      operations: [{ action: "update_theme", set: { colors: { accent: "#ff0000" } } }],
    });
    const parsed = parseJsx(store.get("slides.jsx")!);
    expect(parsed.attrs.accent).toBe("#ff0000");
    expect(parsed.attrs.slideBg).toBe("#F3EEE5");
  });

  it("update_theme cascades the new color into literal hex usages across the slide tree", async () => {
    const { store, storage } = makeStore();
    const tools = createSlideTools({ getConversationId: () => "cid", storage });
    await tools.find((t) => toolName(t) === "plan_deck")!.executor!(VALID_PLAN);
    const accentLiteral = "#abcdef";
    await tools.find((t) => toolName(t) === "patch_slides")!.executor!({
      operations: [{ action: "update_theme", set: { accent: accentLiteral } }],
    });
    await tools.find((t) => toolName(t) === "add_slide")!.executor!({
      layout: "cover-split-portrait--editorial-warm",
      slideJsx: `<Anuma.Slide id="s1">
        <Anuma.Text id="t1" x={0} y={0} w={10} h={5} fontRole="body" style={{ fontSize: 18, color: "${accentLiteral}" }}>Hi</Anuma.Text>
        <Anuma.Rect id="r1" x={0} y={0} w={5} h={5} fill="${accentLiteral}" />
      </Anuma.Slide>`,
    });
    const before = store.get("slides.jsx")!;
    expect(before.match(new RegExp(accentLiteral, "gi")) ?? []).toHaveLength(3);
    const newAccent = "#102030";
    await tools.find((t) => toolName(t) === "patch_slides")!.executor!({
      operations: [{ action: "update_theme", set: { accent: newAccent } }],
    });
    const after = store.get("slides.jsx")!;
    expect(after).not.toContain(accentLiteral);
    expect(after.match(new RegExp(newAccent, "gi")) ?? []).toHaveLength(3);
  });

  it("update_theme rejects an unknown fontPreset", async () => {
    const { tools } = await setupDeckWithOneSlide();
    const result = (await tools.find((t) => toolName(t) === "patch_slides")!.executor!({
      operations: [{ action: "update_theme", set: { fontPreset: "not-a-preset" } }],
    })) as { results?: string[] };
    expect(result.results!.join(" | ")).toMatch(/update_theme: unknown fontPreset/);
  });

  it("update_theme rejects an unknown color key without mutating the deck", async () => {
    const { store, tools } = await setupDeckWithOneSlide();
    const before = store.get("slides.jsx")!;
    const result = (await tools.find((t) => toolName(t) === "patch_slides")!.executor!({
      operations: [{ action: "update_theme", set: { accen: "#ff0000" } }],
    })) as { results?: string[] };
    expect(result.results!.join(" | ")).toMatch(/update_theme: unknown key "accen"/);
    expect(store.get("slides.jsx")).toBe(before);
  });

  it("update_theme rejects an unknown color key inside the nested colors block", async () => {
    const { store, tools } = await setupDeckWithOneSlide();
    const before = store.get("slides.jsx")!;
    const result = (await tools.find((t) => toolName(t) === "patch_slides")!.executor!({
      operations: [{ action: "update_theme", set: { colors: { hilight: "#ff0000" } } }],
    })) as { results?: string[] };
    expect(result.results!.join(" | ")).toMatch(/update_theme: unknown key "hilight"/);
    expect(store.get("slides.jsx")).toBe(before);
  });

  it("reports unknown actions without mutating the deck", async () => {
    const { store, tools } = await setupDeckWithOneSlide();
    const before = store.get("slides.jsx")!;
    const result = (await tools.find((t) => toolName(t) === "patch_slides")!.executor!({
      operations: [{ action: "frobnicate", slideId: "s1", elementId: "t1" }],
    })) as { results?: string[] };
    expect(result.results!.join(" | ")).toMatch(/unknown action: frobnicate/);
    expect(store.get("slides.jsx")).toBe(before);
  });

  it("update_element merges top-level attrs without rewriting the element", async () => {
    const { store, tools } = await setupDeckWithOneSlide();
    const before = store.get("slides.jsx")!;
    expect(before).toContain(`id="t1"`);
    const result = (await tools.find((t) => toolName(t) === "patch_slides")!.executor!({
      operations: [
        { action: "update_element", slideId: "s1", elementId: "t1", attrs: { x: 200, y: 60 } },
      ],
    })) as { results?: string[] };
    expect(result.results![0]).toBe("updated s1/t1");
    const after = store.get("slides.jsx")!;
    expect(after).toContain(`x={200}`);
    expect(after).toContain(`y={60}`);
    expect(after).toContain(`id="t1"`);
  });

  it("update_element deep-merges style — other style keys are preserved", async () => {
    const { store, tools } = await setupDeckWithOneSlide();
    const result = (await tools.find((t) => toolName(t) === "patch_slides")!.executor!({
      operations: [
        {
          action: "update_element",
          slideId: "s1",
          elementId: "t1",
          attrs: { style: { fontSize: 32 } },
        },
      ],
    })) as { results?: string[] };
    expect(result.results![0]).toBe("updated s1/t1");
    const after = store.get("slides.jsx")!;
    expect(after).toContain("fontSize: 32");
    expect(after).toContain(`color: "textPrimary"`);
    expect(after).toContain(`fontWeight: 400`);
  });

  it("insert_slide REJECTS without layout — model is forced to anchor to a recipe", async () => {
    const { store, tools } = await setupDeckWithOneSlide();
    const before = store.get("slides.jsx")!;
    const result = (await tools.find((t) => toolName(t) === "patch_slides")!.executor!({
      operations: [
        {
          action: "insert_slide",
          jsx: `<Anuma.Slide id="s2"><Anuma.Text id="t2" x={0} y={0} w={10} h={5} fontRole="body" style={{ fontSize: 18, fontWeight: 400, color: "textPrimary" }}>Hi</Anuma.Text></Anuma.Slide>`,
        },
      ],
    })) as { results?: string[] };
    expect(result.results![0]).toMatch(/insert_slide: layout is required/);
    expect(store.get("slides.jsx")).toBe(before);
  });

  it("insert_slide rejects an unknown layout name", async () => {
    const { tools } = await setupDeckWithOneSlide();
    const result = (await tools.find((t) => toolName(t) === "patch_slides")!.executor!({
      operations: [
        {
          action: "insert_slide",
          layout: "made-up-layout--not-real",
          jsx: `<Anuma.Slide id="s2"></Anuma.Slide>`,
        },
      ],
    })) as { results?: string[] };
    expect(result.results![0]).toMatch(/insert_slide: unknown layout/);
  });

  it("insert_slide rejects top-level styling props AND includes the layout recipe in the error", async () => {
    const { store, tools } = await setupDeckWithOneSlide();
    const before = store.get("slides.jsx")!;
    const result = (await tools.find((t) => toolName(t) === "patch_slides")!.executor!({
      operations: [
        {
          action: "insert_slide",
          layout: "cover-statement--editorial-warm",
          jsx: `<Anuma.Slide id="s2"><Anuma.Text id="hero" x={58} y={194} w={844} h={76} fontSize={12} color="accent">Short.</Anuma.Text></Anuma.Slide>`,
        },
      ],
    })) as { results?: string[] };
    expect(result.results![0]).toMatch(/insert_slide: invalid jsx.*Top-level "fontSize/);
    expect(result.results![0]).toMatch(/Recipe for "cover-statement--editorial-warm"/);
    expect(result.results![0]).toContain("style={{");
    expect(store.get("slides.jsx")).toBe(before);
  });

  it("insert_slide with a valid layout passes slot validation when content fits", async () => {
    const { store, tools } = await setupDeckWithOneSlide();
    const before = store.get("slides.jsx")!;
    const result = (await tools.find((t) => toolName(t) === "patch_slides")!.executor!({
      operations: [
        {
          action: "insert_slide",
          layout: "cover-statement--editorial-warm",
          jsx: `<Anuma.Slide id="cover-statement"><Anuma.Text id="hero_1" x={57.6} y={194.4} w={844.8} h={75.6} fontRole="heading" style={{ fontSize: 57.6, fontWeight: 400, color: "textPrimary", lineHeight: 1, textAlign: "left", fontFamily: "Playfair Display" }}>Short.</Anuma.Text></Anuma.Slide>`,
        },
      ],
    })) as { results?: string[] };
    expect(result.results![0]).toMatch(/inserted slide cover-statement/);
    expect(result.results![0]).not.toMatch(/no layout passed/);
    expect(store.get("slides.jsx")).not.toBe(before);
  });

  it("update_element with text replaces ONLY the text body — every attr and style key is preserved", async () => {
    const { store, tools } = await setupDeckWithOneSlide();
    const before = store.get("slides.jsx")!;
    expect(before).toContain(">Hi</Anuma.Text>");
    expect(before).toContain(`fontSize: 18`);
    expect(before).toContain(`color: "textPrimary"`);
    const result = (await tools.find((t) => toolName(t) === "patch_slides")!.executor!({
      operations: [{ action: "update_element", slideId: "s1", elementId: "t1", text: "Renamed" }],
    })) as { results?: string[] };
    expect(result.results![0]).toBe("updated s1/t1");
    const after = store.get("slides.jsx")!;
    expect(after).toContain(">Renamed</Anuma.Text>");
    expect(after).not.toContain(">Hi</Anuma.Text>");
    expect(after).toContain(`fontSize: 18`);
    expect(after).toContain(`fontWeight: 400`);
    expect(after).toContain(`color: "textPrimary"`);
    expect(after).toContain(`x={0}`);
    expect(after).toContain(`y={0}`);
  });

  it("update_element with both attrs and text applies both in one op", async () => {
    const { store, tools } = await setupDeckWithOneSlide();
    const result = (await tools.find((t) => toolName(t) === "patch_slides")!.executor!({
      operations: [
        {
          action: "update_element",
          slideId: "s1",
          elementId: "t1",
          attrs: { y: 120 },
          text: "Combined",
        },
      ],
    })) as { results?: string[] };
    expect(result.results![0]).toBe("updated s1/t1");
    const after = store.get("slides.jsx")!;
    expect(after).toContain(">Combined</Anuma.Text>");
    expect(after).toContain(`y={120}`);
    expect(after).toContain(`fontSize: 18`);
  });

  it("update_element requires at least one of attrs or text", async () => {
    const { tools } = await setupDeckWithOneSlide();
    const result = (await tools.find((t) => toolName(t) === "patch_slides")!.executor!({
      operations: [{ action: "update_element", slideId: "s1", elementId: "t1" }],
    })) as { results?: string[] };
    expect(result.results![0]).toMatch(/pass attrs.*or text.*at least one/);
  });

  it("update_element rejects top-level styling props in incoming attrs", async () => {
    const { store, tools } = await setupDeckWithOneSlide();
    const before = store.get("slides.jsx")!;
    const result = (await tools.find((t) => toolName(t) === "patch_slides")!.executor!({
      operations: [
        {
          action: "update_element",
          slideId: "s1",
          elementId: "t1",
          attrs: { fontSize: 24 },
        },
      ],
    })) as { results?: string[] };
    expect(result.results![0]).toMatch(/Top-level "fontSize.*belong inside style/);
    expect(store.get("slides.jsx")).toBe(before);
  });

  it("update_element rejects unknown fontFamily values before committing", async () => {
    const { store, tools } = await setupDeckWithOneSlide();
    const before = store.get("slides.jsx")!;
    const result = (await tools.find((t) => toolName(t) === "patch_slides")!.executor!({
      operations: [
        {
          action: "update_element",
          slideId: "s1",
          elementId: "t1",
          attrs: { style: { fontFamily: "Definitely Not A Real Font" } },
        },
      ],
    })) as { results?: string[] };
    expect(result.results![0]).toMatch(/update_element: .*unknown fontFamily/i);
    expect(store.get("slides.jsx")).toBe(before);
  });

  it("update_element reports clear errors for missing slide / element / attrs", async () => {
    const { tools } = await setupDeckWithOneSlide();
    const patch = tools.find((t) => toolName(t) === "patch_slides")!;
    const noSlide = (await patch.executor!({
      operations: [
        { action: "update_element", slideId: "missing", elementId: "t1", attrs: { x: 0 } },
      ],
    })) as { results?: string[] };
    expect(noSlide.results![0]).toMatch(/slide missing not found/);
    const noElement = (await patch.executor!({
      operations: [
        { action: "update_element", slideId: "s1", elementId: "ghost", attrs: { x: 0 } },
      ],
    })) as { results?: string[] };
    expect(noElement.results![0]).toMatch(/element ghost not found/);
    const noAttrs = (await patch.executor!({
      operations: [{ action: "update_element", slideId: "s1", elementId: "t1" }],
    })) as { results?: string[] };
    expect(noAttrs.results![0]).toMatch(/pass attrs.*or text/);
  });
});

describe("read_slides", () => {
  async function setupTwoSlideDeck() {
    const { storage } = makeStore();
    const tools = createSlideTools({ getConversationId: () => "cid", storage });
    await tools.find((t) => toolName(t) === "plan_deck")!.executor!(VALID_PLAN);
    await tools.find((t) => toolName(t) === "add_slide")!.executor!({
      layout: "cover-split-portrait--editorial-warm",
      slideJsx: slideJsxWithText({ slideId: "s1", textId: "t1", text: "First" }),
    });
    await tools.find((t) => toolName(t) === "add_slide")!.executor!({
      layout: "cover-split-portrait--editorial-warm",
      slideJsx: slideJsxWithText({ slideId: "s2", textId: "t2", text: "Second" }),
    });
    return tools;
  }

  it("returns a compact summary by default (no slideIds), not the full deck JSX", async () => {
    const tools = await setupTwoSlideDeck();
    const result = (await tools.find((t) => toolName(t) === "read_slides")!.executor!({})) as {
      content?: string;
    };
    expect(result.content).toContain("DECK SUMMARY");
    expect(result.content).toContain('Slide 1 — id: "s1"');
    expect(result.content).toContain('Slide 2 — id: "s2"');
    expect(result.content).toContain("elements: t1");
    expect(result.content).toContain("elements: t2");
    expect(result.content).toContain('t1="First"');
    expect(result.content).toContain('t2="Second"');
    expect(result.content).not.toContain("<Anuma.Slide");
    expect(result.content).not.toContain("<Anuma.Text");
    expect(result.content).toContain("read_slides with slideIds");
  });

  it("includes full JSX for slides named in slideIds, alongside the summary", async () => {
    const tools = await setupTwoSlideDeck();
    const result = (await tools.find((t) => toolName(t) === "read_slides")!.executor!({
      slideIds: ["s2"],
    })) as { content?: string };
    expect(result.content).toContain("DECK SUMMARY");
    expect(result.content).toContain("--- s2 (full JSX) ---");
    expect(result.content).toContain("<Anuma.Slide");
    expect(result.content).toContain('id="s2"');
    expect(result.content).toContain(">Second</Anuma.Text>");
    expect(result.content).not.toContain("--- s1 (full JSX) ---");
  });

  it("notes missing slideIds in the response instead of failing the whole call", async () => {
    const tools = await setupTwoSlideDeck();
    const result = (await tools.find((t) => toolName(t) === "read_slides")!.executor!({
      slideIds: ["s2", "ghost"],
    })) as { content?: string };
    expect(result.content).toContain("--- s2 (full JSX) ---");
    expect(result.content).toContain("slide(s) not found: ghost");
  });
});

describe("buildSlideSystemPrompt IMAGES section conditionality", () => {
  it("advertises anuma_create_image when hasImageGenerator=true", () => {
    const prompt = buildSlideSystemPrompt({ hasImageGenerator: true });
    expect(prompt).toContain("AnumaMediaMCP-anuma_create_image");
  });

  it("omits the anuma_create_image reference when hasImageGenerator is false or unset", () => {
    const prompt = buildSlideSystemPrompt();
    expect(prompt).not.toContain("AnumaMediaMCP-anuma_create_image");
    expect(prompt).toContain("no image-generation tool bound");
  });

  it("opener stays in sync with backend infrastructure", () => {
    expect(buildSlideSystemPrompt()).toContain("You are a presentation design assistant.");
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
