/**
 * E2E tests for slide deck generation tool loop.
 *
 * Runs real LLM calls with the slide-tool suite (plan_deck, add_slide,
 * read_slides, patch_slides) backed by an in-memory store. Tests the full
 * generate → read → patch cycle without any UI.
 *
 * Run: PORTAL_API_KEY=... pnpm vitest -c vitest.e2e.config.mts run test/tools/slide-generation
 */

import { describe, expect, it } from "vitest";

import {
  type AnumaNode,
  buildSlideSystemPrompt,
  getId,
  SLIDE_CANVAS_HEIGHT,
  SLIDE_CANVAS_WIDTH,
} from "../../../src/tools/slides/index.js";
import {
  allSlideText,
  config,
  createFileStore,
  dumpFiles,
  elementsOf,
  extractText,
  getDeck,
  printResult,
  slidesOf,
  timedToolLoop,
  tryGetDeck,
  type ToolCallLog,
  wrapTool,
} from "./setup.js";
import { createTestSlideTools } from "./tools.js";

const SYSTEM_PROMPT = buildSlideSystemPrompt();

type Message = {
  role: string;
  content: Array<{ type: string; text: string }>;
};

function makeMessages(userText: string, systemPrompt?: string): Message[] {
  const msgs: Message[] = [];
  if (systemPrompt) {
    msgs.push({ role: "system", content: [{ type: "text", text: systemPrompt }] });
  }
  msgs.push({ role: "user", content: [{ type: "text", text: userText }] });
  return msgs;
}

function isDeckShape(deck: unknown): deck is AnumaNode {
  if (!deck || typeof deck !== "object") return false;
  const d = deck as { tag?: unknown; attrs?: unknown; children?: unknown };
  return d.tag === "Deck" && typeof d.attrs === "object" && Array.isArray(d.children);
}

describe("slide-generation", () => {
  it("generates a new slide deck via plan_deck + add_slide", async () => {
    const store = createFileStore();
    const log: ToolCallLog[] = [];
    const tools = createTestSlideTools(store).map((t) => wrapTool(t, log));

    const result = await timedToolLoop({
      messages: makeMessages(
        "Create a 3-slide presentation about the benefits of remote work.",
        SYSTEM_PROMPT
      ),
      model: config.model,
      baseUrl: config.baseUrl,
      headers: { "X-API-Key": config.portalKey },
      apiType: config.apiType,
      tools,
      toolChoice: "auto",
      maxToolRounds: 15,
    });

    printResult(result);
    dumpFiles(store, "remote-work-deck");
    expect(result.error).toBeNull();

    // Generation flow: one plan_deck + one add_slide per slide.
    const planCalls = log.filter((l) => l.name === "plan_deck");
    const addCalls = log.filter((l) => l.name === "add_slide");
    expect(planCalls.length).toBe(1);
    expect(addCalls.length).toBeGreaterThanOrEqual(2);

    // slides.jsx should exist and be a valid SlideDeck
    expect(store.has("slides.jsx")).toBe(true);
    const deck = getDeck(store);
    expect(isDeckShape(deck)).toBe(true);
    const slides = slidesOf(deck);
    expect(slides.length).toBeGreaterThanOrEqual(2);

    // Every slide should have at least one element with a unique id
    const ids = new Set<string>();
    for (const slide of slides) {
      const slideId = getId(slide);
      expect(slideId).toBeTruthy();
      const els = elementsOf(slide);
      expect(els.length).toBeGreaterThan(0);
      ids.add(slideId!);
      for (const el of els) {
        expect(getId(el)).toBeTruthy();
      }
    }
    expect(ids.size).toBe(slides.length);

    // Content should relate to the requested topic
    const text = allSlideText(deck).toLowerCase();
    expect(text).toMatch(/remote|work|flexible|home/);
  });

  it("uses read_slides + patch_slides to modify an existing deck", async () => {
    const store = createFileStore();
    const log: ToolCallLog[] = [];
    const tools = createTestSlideTools(store).map((t) => wrapTool(t, log));

    // Step 1: Generate initial deck
    const genResult = await timedToolLoop({
      messages: makeMessages(
        "Create a 3-slide deck introducing a new productivity app called FocusFlow.",
        SYSTEM_PROMPT
      ),
      model: config.model,
      baseUrl: config.baseUrl,
      headers: { "X-API-Key": config.portalKey },
      apiType: config.apiType,
      tools,
      toolChoice: "auto",
      maxToolRounds: 15,
    });

    printResult(genResult);
    dumpFiles(store, "focusflow-gen");
    expect(genResult.error).toBeNull();

    const initialDeck = getDeck(store);
    const initialSlideCount = slidesOf(initialDeck).length;
    const initialJsx = store.get("slides.jsx")!;
    const initialFocusFlowCount = (allSlideText(initialDeck).match(/FocusFlow/gi) ?? []).length;
    const callsAfterGen = log.length;

    // Step 2: Ask the LLM to update the title on the first slide
    const updateMessages: Message[] = [
      ...makeMessages(
        "Create a 3-slide deck introducing a new productivity app called FocusFlow.",
        SYSTEM_PROMPT
      ),
      {
        role: "assistant",
        content: [{ type: "text", text: extractText(genResult) || "Done." }],
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: 'Rename the product from "FocusFlow" to "Momentum" throughout the deck.',
          },
        ],
      },
    ];

    const updateResult = await timedToolLoop({
      messages: updateMessages,
      model: config.model,
      baseUrl: config.baseUrl,
      headers: { "X-API-Key": config.portalKey },
      apiType: config.apiType,
      tools,
      toolChoice: "auto",
      maxToolRounds: 15,
    });

    printResult(updateResult);
    dumpFiles(store, "focusflow-renamed");
    expect(updateResult.error).toBeNull();

    const updateCalls = log.slice(callsAfterGen);
    const readCalls = updateCalls.filter((l) => l.name === "read_slides");
    const patchCalls = updateCalls.filter((l) => l.name === "patch_slides");
    const reinitCalls = updateCalls.filter((l) => l.name === "plan_deck");

    console.log(
      `  Update tools: ${readCalls.length} read_slides, ${patchCalls.length} patch_slides, ${reinitCalls.length} plan_deck (reinits)`
    );

    // The LLM should prefer patch_slides over re-initializing the deck
    expect(patchCalls.length).toBeGreaterThanOrEqual(1);
    expect(reinitCalls.length).toBe(0);

    // slides.jsx should have changed and still be valid
    expect(store.get("slides.jsx")).not.toBe(initialJsx);
    const updatedDeck = getDeck(store);
    expect(isDeckShape(updatedDeck)).toBe(true);

    // Slide count should be preserved (we only renamed, not restructured)
    expect(slidesOf(updatedDeck).length).toBe(initialSlideCount);

    // Text should now contain "Momentum" and have fewer "FocusFlow" references
    // than before. We don't require every occurrence to be replaced — LLMs
    // sometimes miss a stray reference in body copy, and the test's intent is
    // to verify that patch_slides-driven renames take effect.
    const text = allSlideText(updatedDeck);
    expect(text).toMatch(/Momentum/i);
    const remainingFocusFlow = (text.match(/FocusFlow/gi) ?? []).length;
    expect(remainingFocusFlow).toBeLessThan(initialFocusFlowCount);
  });

  it("applies surgical update_element patches instead of rewriting the deck", async () => {
    const store = createFileStore();
    const log: ToolCallLog[] = [];
    const tools = createTestSlideTools(store).map((t) => wrapTool(t, log));

    // Step 1: Generate
    const genResult = await timedToolLoop({
      messages: makeMessages(
        "Create a 2-slide deck with a cover and one content slide about renewable energy.",
        SYSTEM_PROMPT
      ),
      model: config.model,
      baseUrl: config.baseUrl,
      headers: { "X-API-Key": config.portalKey },
      apiType: config.apiType,
      tools,
      toolChoice: "auto",
      maxToolRounds: 15,
    });
    expect(genResult.error).toBeNull();
    dumpFiles(store, "renewable-gen");

    const initialDeck = getDeck(store);
    const initialSlides = slidesOf(initialDeck);
    const initialSlideCount = initialSlides.length;
    const initialElementCount = initialSlides.reduce((n, s) => n + elementsOf(s).length, 0);
    const callsAfterGen = log.length;

    // Step 2: Request a minor tweak
    const updateMessages: Message[] = [
      ...makeMessages(
        "Create a 2-slide deck with a cover and one content slide about renewable energy.",
        SYSTEM_PROMPT
      ),
      {
        role: "assistant",
        content: [{ type: "text", text: extractText(genResult) || "Done." }],
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Change the accent color of the theme to #10b981 (emerald green).",
          },
        ],
      },
    ];

    const updateResult = await timedToolLoop({
      messages: updateMessages,
      model: config.model,
      baseUrl: config.baseUrl,
      headers: { "X-API-Key": config.portalKey },
      apiType: config.apiType,
      tools,
      toolChoice: "auto",
      maxToolRounds: 15,
    });
    expect(updateResult.error).toBeNull();
    dumpFiles(store, "renewable-emerald");

    const updateCalls = log.slice(callsAfterGen);
    const patchCalls = updateCalls.filter((l) => l.name === "patch_slides");
    const reinitCalls = updateCalls.filter((l) => l.name === "plan_deck");
    console.log(
      `  Theme update tools: ${patchCalls.length} patch_slides, ${reinitCalls.length} plan_deck (reinits)`
    );

    // Should use patch_slides rather than rewrite the whole deck
    expect(patchCalls.length).toBeGreaterThanOrEqual(1);
    expect(reinitCalls.length).toBe(0);

    const updatedDeck = getDeck(store);
    // Structure should be preserved
    const updatedSlides = slidesOf(updatedDeck);
    expect(updatedSlides.length).toBe(initialSlideCount);
    const updatedElementCount = updatedSlides.reduce((n, s) => n + elementsOf(s).length, 0);
    expect(updatedElementCount).toBe(initialElementCount);

    // Accent should match the requested color (case-insensitive)
    const accent = updatedDeck.attrs.accent;
    expect(typeof accent === "string" ? accent.toLowerCase() : accent).toBe("#10b981");
  });

  it("varies layouts across a multi-slide deck", async () => {
    const store = createFileStore();
    const log: ToolCallLog[] = [];
    const tools = createTestSlideTools(store).map((t) => wrapTool(t, log));

    const result = await timedToolLoop({
      messages: makeMessages(
        "Build a 5-slide investor pitch deck for a SaaS startup. Include a cover, key metrics, a quote from a customer, a market opportunity slide, and a call to action.",
        SYSTEM_PROMPT
      ),
      model: config.model,
      baseUrl: config.baseUrl,
      headers: { "X-API-Key": config.portalKey },
      apiType: config.apiType,
      tools,
      toolChoice: "auto",
      maxToolRounds: 15,
    });

    printResult(result);
    dumpFiles(store, "investor-pitch");
    expect(result.error).toBeNull();

    const deck = getDeck(store);
    const slides = slidesOf(deck);
    expect(slides.length).toBeGreaterThanOrEqual(4);

    // Collect the set of element tags per slide to measure variety
    const elementTags = new Set<string>();
    for (const slide of slides) {
      for (const el of elementsOf(slide)) elementTags.add(el.tag);
    }
    console.log(`  Element tags used: ${[...elementTags].join(", ")}`);
    // A polished deck should mix text with at least one shape or icon
    expect(elementTags.has("Text")).toBe(true);
    expect(elementTags.size).toBeGreaterThanOrEqual(2);

    // All element coordinates should be within the 960×540 canvas.
    for (const slide of slides) {
      for (const el of elementsOf(slide)) {
        const x = typeof el.attrs.x === "number" ? el.attrs.x : 0;
        const y = typeof el.attrs.y === "number" ? el.attrs.y : 0;
        const w = typeof el.attrs.w === "number" ? el.attrs.w : 0;
        const h = typeof el.attrs.h === "number" ? el.attrs.h : 0;
        expect(x).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThanOrEqual(SLIDE_CANVAS_WIDTH);
        expect(y).toBeGreaterThanOrEqual(0);
        expect(y).toBeLessThanOrEqual(SLIDE_CANVAS_HEIGHT);
        // Lines legitimately have h=0 or w=0 (rendered as borders).
        expect(w).toBeGreaterThanOrEqual(0);
        expect(w).toBeLessThanOrEqual(SLIDE_CANVAS_WIDTH);
        expect(h).toBeGreaterThanOrEqual(0);
        expect(h).toBeLessThanOrEqual(SLIDE_CANVAS_HEIGHT);
      }
    }
  });

  it("adds a new slide with the add_slide patch operation", async () => {
    const store = createFileStore();
    const log: ToolCallLog[] = [];
    const tools = createTestSlideTools(store).map((t) => wrapTool(t, log));

    // Step 1: Generate initial deck
    const genResult = await timedToolLoop({
      messages: makeMessages("Create a 2-slide deck about ocean conservation.", SYSTEM_PROMPT),
      model: config.model,
      baseUrl: config.baseUrl,
      headers: { "X-API-Key": config.portalKey },
      apiType: config.apiType,
      tools,
      toolChoice: "auto",
      maxToolRounds: 15,
    });
    expect(genResult.error).toBeNull();
    dumpFiles(store, "ocean-gen");

    const initial = tryGetDeck(store);
    expect(initial).not.toBeNull();
    const initialCount = slidesOf(initial!).length;
    const callsAfterGen = log.length;

    // Step 2: Add a new slide at the end
    const updateMessages: Message[] = [
      ...makeMessages("Create a 2-slide deck about ocean conservation.", SYSTEM_PROMPT),
      {
        role: "assistant",
        content: [{ type: "text", text: extractText(genResult) || "Done." }],
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Add one more slide at the end with a call to action encouraging donations.",
          },
        ],
      },
    ];

    const updateResult = await timedToolLoop({
      messages: updateMessages,
      model: config.model,
      baseUrl: config.baseUrl,
      headers: { "X-API-Key": config.portalKey },
      apiType: config.apiType,
      tools,
      toolChoice: "auto",
      maxToolRounds: 15,
    });
    expect(updateResult.error).toBeNull();
    dumpFiles(store, "ocean-added");

    const updateCalls = log.slice(callsAfterGen);
    const patchCalls = updateCalls.filter((l) => l.name === "patch_slides");
    expect(patchCalls.length).toBeGreaterThanOrEqual(1);

    const updated = getDeck(store);
    const updatedSlides = slidesOf(updated);
    expect(updatedSlides.length).toBe(initialCount + 1);

    // The new slide should have content related to donations / call to action
    const lastSlide = updatedSlides[updatedSlides.length - 1]!;
    const lastText = elementsOf(lastSlide)
      .filter((e) => e.tag === "Text")
      .map((e) => e.children.filter((c): c is string => typeof c === "string").join(""))
      .join(" ")
      .toLowerCase();
    expect(lastText).toMatch(/donat|support|join|action|help|give/);
  });
});
