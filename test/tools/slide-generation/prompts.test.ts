import { describe, expect, it } from "vitest";

import {
  buildSlideSystemPrompt,
  SLIDE_CANVAS_HEIGHT,
  SLIDE_CANVAS_WIDTH,
} from "../../../src/tools/slides/index.js";
import {
  config,
  createFileStore,
  dumpFiles,
  elementsOf,
  getDeck,
  printResult,
  slidesOf,
  timedToolLoop,
  type ToolCallLog,
  wrapTool,
} from "./setup.js";
import { createTestSlideTools } from "./tools.js";

const SYSTEM_PROMPT = buildSlideSystemPrompt();

const MODELS = process.env.E2E_MODELS
  ? process.env.E2E_MODELS.split(",")
      .map((m) => m.trim())
      .filter(Boolean)
  : [config.model];

function modelSlug(model: string): string {
  return (model.split("/").pop() ?? model).replace(/[^a-zA-Z0-9-_.]/g, "_");
}

type Message = { role: string; content: Array<{ type: string; text: string }> };

function makeMessages(userText: string): Message[] {
  return [
    { role: "system", content: [{ type: "text", text: SYSTEM_PROMPT }] },
    { role: "user", content: [{ type: "text", text: userText }] },
  ];
}

describe.concurrent.each(MODELS)("slide-generation prompts [%s]", (model) => {
  const slug = modelSlug(model);

  it("home gardening fundamentals (no images)", { timeout: 600_000 }, async () => {
    const store = createFileStore();
    const log: ToolCallLog[] = [];
    const tools = createTestSlideTools(store).map((t) => wrapTool(t, log));

    const result = await timedToolLoop({
      messages: makeMessages(
        "Create a deck of at least 10 slides teaching beginners the fundamentals of home gardening, covering soil types, seasonal planting, common pests, and starter plants for different climates. No images."
      ),
      model,
      baseUrl: config.baseUrl,
      headers: { "X-API-Key": config.portalKey },
      apiType: config.apiType,
      tools,
      toolChoice: "auto",
      maxToolRounds: 20,
      maxOutputTokens: 16000,
    });

    const tag = `[${slug}]`;
    if (result.error) {
      console.error(`${tag} ERROR: ${result.error}`);
    } else {
      printResult(result);
    }
    console.log(
      `${tag} Rounds: ${result.rounds.length} · ${(result.elapsedMs / 1000).toFixed(1)}s` +
        (result.rounds.length > 0
          ? ` · tools=${result.rounds.map((r) => r.toolCalls.map((c) => c.name).join("+")).join("→")}`
          : "")
    );
    dumpFiles(store, `prompt-home-gardening/${slug}`);
    expect(result.error).toBeNull();

    const deck = getDeck(store);
    const slides = slidesOf(deck);

    expect(slides.length).toBeGreaterThanOrEqual(7);

    const imageCount = slides.reduce(
      (n, s) => n + elementsOf(s).filter((e) => e.tag === "Image").length,
      0
    );
    expect(imageCount).toBe(0);

    for (const slide of slides) {
      for (const el of elementsOf(slide)) {
        const x = typeof el.attrs.x === "number" ? el.attrs.x : 0;
        const y = typeof el.attrs.y === "number" ? el.attrs.y : 0;
        const w = typeof el.attrs.w === "number" ? el.attrs.w : 0;
        const h = typeof el.attrs.h === "number" ? el.attrs.h : 0;
        expect(x).toBeGreaterThanOrEqual(0);
        expect(x + w).toBeLessThanOrEqual(SLIDE_CANVAS_WIDTH);
        expect(y).toBeGreaterThanOrEqual(0);
        expect(y + h).toBeLessThanOrEqual(SLIDE_CANVAS_HEIGHT);
      }
    }

    const allText = slides
      .flatMap((s) =>
        elementsOf(s)
          .filter((e) => e.tag === "Text")
          .map((e) => e.children.filter((c): c is string => typeof c === "string").join(""))
      )
      .join(" ")
      .toLowerCase();
    expect(allText).toMatch(/soil/);
    expect(allText).toMatch(/season|spring|summer|fall|winter/);
    expect(allText).toMatch(/pest|insect|bug/);
    expect(allText).toMatch(/plant|climate/);

    const tagCounts: Record<string, number> = {};
    for (const slide of slides) {
      for (const el of elementsOf(slide)) tagCounts[el.tag] = (tagCounts[el.tag] ?? 0) + 1;
    }
    console.log(`  Slides: ${slides.length}, element tags: ${JSON.stringify(tagCounts)}`);
  });
});
