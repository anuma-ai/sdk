import { describe, expect, it } from "vitest";

import { createSlideTools } from "./index";

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

function getTool(name: string) {
  const { storage } = makeStore();
  const tools = createSlideTools({
    getConversationId: () => "cid",
    storage,
  });
  return tools.find((t) => t.function.name === name)!;
}

describe("plan_slides executor", () => {
  it("returns an error for an unknown fontPreset", async () => {
    const result = (await getTool("plan_slides").executor!({
      fontPreset: "nope",
      paletteName: "warm editorial",
      slides: [{ id: "cover", layout: "COVER (centered)", topic: "x" }],
    })) as { error?: string };
    expect(result.error).toMatch(/Unknown fontPreset/);
  });

  it("returns an error for an unknown paletteName", async () => {
    const result = (await getTool("plan_slides").executor!({
      fontPreset: "editorial",
      paletteName: "not a palette",
      slides: [{ id: "cover", layout: "COVER (centered)", topic: "x" }],
    })) as { error?: string };
    expect(result.error).toMatch(/Unknown paletteName/);
  });

  it("returns an error listing unknown layout names", async () => {
    const result = (await getTool("plan_slides").executor!({
      fontPreset: "editorial",
      paletteName: "warm editorial",
      slides: [
        { id: "cover", layout: "COVER (centered)", topic: "x" },
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
        { id: "cover", layout: "COVER (centered)", topic: "Deck title" },
        {
          id: "soil",
          layout: "TEXT (two-column — heading left, content right)",
          topic: "Soil types",
        },
      ],
    })) as { content?: string; error?: string };
    expect(result.error).toBeUndefined();
    const content = result.content ?? "";
    expect(content).toContain("Theme: warm editorial");
    expect(content).toContain("fontPreset: editorial");
    expect(content).toContain("#F3EEE5"); // warm editorial slideBg
    expect(content).toContain("COVER (centered):");
    expect(content).toContain("TEXT (two-column — heading left, content right):");
    expect(content).toContain("NOW call create_slides");
  });

  it("dedupes layout recipes when the same layout is picked more than once", async () => {
    const result = (await getTool("plan_slides").executor!({
      fontPreset: "editorial",
      paletteName: "warm editorial",
      slides: [
        { id: "a", layout: "COVER (centered)", topic: "x" },
        { id: "b", layout: "COVER (centered)", topic: "y" },
        { id: "c", layout: "COVER (centered)", topic: "z" },
      ],
    })) as { content?: string };
    const content = result.content ?? "";
    const occurrences = content.split("COVER (centered):").length - 1;
    expect(occurrences).toBe(1);
  });
});

describe("create_slides executor", () => {
  it("rejects when deck is missing", async () => {
    const result = (await getTool("create_slides").executor!({})) as { error?: string };
    expect(result.error).toMatch(/deck is required/);
  });

  it("rejects when slides is empty", async () => {
    const result = (await getTool("create_slides").executor!({
      deck: { version: 2, theme: {}, slides: [] },
    })) as { error?: string };
    expect(result.error).toMatch(/slides must be a non-empty array/);
  });

  it("writes slides.json on success", async () => {
    const { store, storage } = makeStore();
    const tools = createSlideTools({ getConversationId: () => "cid", storage });
    const tool = tools.find((t) => t.function.name === "create_slides")!;
    const deck = {
      version: 2,
      theme: { fontPreset: "editorial", colors: { background: "#fff" } },
      slides: [{ id: "s1", elements: [] }],
    };
    const result = (await tool.executor!({ deck })) as {
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
});

describe("createSlideTools tool list", () => {
  it("exposes the two-step + edit tools without requiring create_file", () => {
    const { storage } = makeStore();
    const tools = createSlideTools({
      getConversationId: () => "cid",
      storage,
      displaySlides: async () => ({}),
    });
    const names = tools.map((t) => t.function.name);
    expect(names).toContain("plan_slides");
    expect(names).toContain("create_slides");
    expect(names).toContain("read_slides");
    expect(names).toContain("patch_slides");
    expect(names).toContain("display_slides");
  });

  it("display_slides depends on create_slides and patch_slides", () => {
    const { storage } = makeStore();
    const tools = createSlideTools({
      getConversationId: () => "cid",
      storage,
      displaySlides: async () => ({}),
    });
    const display = tools.find((t) => t.function.name === "display_slides")!;
    expect(display.dependsOn).toEqual(["create_slides", "patch_slides"]);
  });
});
