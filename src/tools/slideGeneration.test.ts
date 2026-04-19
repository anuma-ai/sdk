import { describe, expect, it } from "vitest";

import { MapFileStorage } from "./appGeneration.js";
import {
  createSlideGenerationTools,
  extractSlideContent,
  SLIDE_TOOL_NAMES,
} from "./slideGeneration.js";

function makeTools(storage?: MapFileStorage) {
  const store = storage ?? new MapFileStorage();
  const tools = createSlideGenerationTools({
    getConversationId: () => "conv-1",
    storage: store,
  });
  return { tools, store };
}

function getExecutor(tools: ReturnType<typeof makeTools>["tools"], name: string) {
  const tool = tools.find((t) => (t.function as { name: string }).name === name);
  if (!tool?.executor) throw new Error(`Tool ${name} not found`);
  return tool.executor;
}

const SAMPLE_DECK = {
  version: 2,
  theme: {
    fontPreset: "bold",
    colors: { background: "#222", accent: "#e67519" },
  },
  slides: [
    {
      id: "s1",
      elements: [
        {
          id: "title",
          kind: "text",
          x: 6,
          y: 30,
          w: 88,
          h: 20,
          text: "Hello World",
        },
      ],
    },
    {
      id: "s2",
      elements: [
        {
          id: "body",
          kind: "text",
          x: 6,
          y: 20,
          w: 88,
          h: 60,
          text: "Content here",
        },
      ],
    },
  ],
};

describe("SLIDE_TOOL_NAMES", () => {
  it("contains all three tool names", () => {
    expect(SLIDE_TOOL_NAMES.has("create_slides")).toBe(true);
    expect(SLIDE_TOOL_NAMES.has("read_slides")).toBe(true);
    expect(SLIDE_TOOL_NAMES.has("patch_slides")).toBe(true);
    expect(SLIDE_TOOL_NAMES.size).toBe(3);
  });
});

describe("createSlideGenerationTools", () => {
  it("returns three tools", () => {
    const { tools } = makeTools();
    expect(tools).toHaveLength(3);
    const names = tools.map((t) => (t.function as { name: string }).name);
    expect(names).toContain("create_slides");
    expect(names).toContain("read_slides");
    expect(names).toContain("patch_slides");
  });

  it("create_slides has skipContinuation", () => {
    const { tools } = makeTools();
    const createTool = tools.find((t) => (t.function as { name: string }).name === "create_slides");
    expect(createTool?.skipContinuation).toBe(true);
  });
});

describe("create_slides", () => {
  it("writes slides.json and returns slideCount", async () => {
    const { tools, store } = makeTools();
    const exec = getExecutor(tools, "create_slides");
    const result = (await exec({ deck: SAMPLE_DECK })) as {
      success: boolean;
      slideCount: number;
    };
    expect(result.success).toBe(true);
    expect(result.slideCount).toBe(2);

    const file = await store.getFile("conv-1", "slides.json");
    expect(file).not.toBeNull();
    const deck = JSON.parse(file!.content);
    expect(deck.version).toBe(2);
    expect(deck.slides).toHaveLength(2);
  });

  it("rejects non-object deck", async () => {
    const { tools } = makeTools();
    const exec = getExecutor(tools, "create_slides");
    const result = (await exec({ deck: "not an object" })) as {
      error: string;
    };
    expect(result.error).toContain("deck argument is required");
  });

  it("rejects missing deck", async () => {
    const { tools } = makeTools();
    const exec = getExecutor(tools, "create_slides");
    const result = (await exec({})) as { error: string };
    expect(result.error).toContain("deck argument is required");
  });
});

describe("read_slides", () => {
  it("returns compact slide content", async () => {
    const store = new MapFileStorage();
    await store.putFile("conv-1", "slides.json", JSON.stringify(SAMPLE_DECK));
    const { tools } = makeTools(store);
    const exec = getExecutor(tools, "read_slides");
    const result = (await exec({})) as { content: string };
    expect(result.content).toContain("Slide 1 [s1]");
    expect(result.content).toContain("Hello World");
    expect(result.content).toContain("Slide 2 [s2]");
  });

  it("returns error when no slides.json exists", async () => {
    const { tools } = makeTools();
    const exec = getExecutor(tools, "read_slides");
    const result = (await exec({})) as { error: string };
    expect(result.error).toContain("No slides.json found");
  });
});

describe("patch_slides", () => {
  it("updates an element", async () => {
    const store = new MapFileStorage();
    await store.putFile("conv-1", "slides.json", JSON.stringify(SAMPLE_DECK));
    const { tools } = makeTools(store);
    const exec = getExecutor(tools, "patch_slides");
    const result = (await exec({
      operations: [
        {
          action: "update_element",
          slideId: "s1",
          elementId: "title",
          set: { text: "Updated Title" },
        },
      ],
    })) as { success: boolean; results: string[] };
    expect(result.success).toBe(true);
    expect(result.results).toContain("updated s1/title");

    const file = await store.getFile("conv-1", "slides.json");
    expect(file!.content).toContain("Updated Title");
  });

  it("adds a slide", async () => {
    const store = new MapFileStorage();
    await store.putFile("conv-1", "slides.json", JSON.stringify(SAMPLE_DECK));
    const { tools } = makeTools(store);
    const exec = getExecutor(tools, "patch_slides");
    await exec({
      operations: [
        {
          action: "add_slide",
          slide: {
            id: "s3",
            elements: [{ id: "end", kind: "text", x: 50, y: 50, w: 30, h: 10, text: "The End" }],
          },
        },
      ],
    });

    const file = await store.getFile("conv-1", "slides.json");
    const deck = JSON.parse(file!.content);
    expect(deck.slides).toHaveLength(3);
    expect(deck.slides[2].id).toBe("s3");
  });

  it("deletes a slide", async () => {
    const store = new MapFileStorage();
    await store.putFile("conv-1", "slides.json", JSON.stringify(SAMPLE_DECK));
    const { tools } = makeTools(store);
    const exec = getExecutor(tools, "patch_slides");
    await exec({
      operations: [{ action: "delete_slide", slideId: "s2" }],
    });

    const file = await store.getFile("conv-1", "slides.json");
    const deck = JSON.parse(file!.content);
    expect(deck.slides).toHaveLength(1);
    expect(deck.slides[0].id).toBe("s1");
  });

  it("updates theme", async () => {
    const store = new MapFileStorage();
    await store.putFile("conv-1", "slides.json", JSON.stringify(SAMPLE_DECK));
    const { tools } = makeTools(store);
    const exec = getExecutor(tools, "patch_slides");
    await exec({
      operations: [{ action: "update_theme", set: { fontPreset: "elegant" } }],
    });

    const file = await store.getFile("conv-1", "slides.json");
    const deck = JSON.parse(file!.content);
    expect(deck.theme.fontPreset).toBe("elegant");
  });

  it("rejects empty operations", async () => {
    const store = new MapFileStorage();
    await store.putFile("conv-1", "slides.json", JSON.stringify(SAMPLE_DECK));
    const { tools } = makeTools(store);
    const exec = getExecutor(tools, "patch_slides");
    const result = (await exec({ operations: [] })) as { error: string };
    expect(result.error).toContain("operations array is required");
  });

  it("reports missing slide", async () => {
    const store = new MapFileStorage();
    await store.putFile("conv-1", "slides.json", JSON.stringify(SAMPLE_DECK));
    const { tools } = makeTools(store);
    const exec = getExecutor(tools, "patch_slides");
    const result = (await exec({
      operations: [
        {
          action: "update_element",
          slideId: "nonexistent",
          elementId: "title",
          set: { text: "x" },
        },
      ],
    })) as { success: boolean; results: string[] };
    expect(result.success).toBe(true);
    expect(result.results[0]).toContain("not found");
  });
});

describe("extractSlideContent", () => {
  it("produces compact summary", () => {
    const content = extractSlideContent(JSON.stringify(SAMPLE_DECK));
    expect(content).toContain("Slide 1 [s1]");
    expect(content).toContain('[title] text "Hello World"');
    expect(content).toContain("Slide 2 [s2]");
  });

  it("returns raw json on parse failure", () => {
    const result = extractSlideContent("not json");
    expect(result).toBe("not json");
  });
});
