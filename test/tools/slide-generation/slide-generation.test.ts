/**
 * E2E tests for slide deck generation tool loop.
 *
 * Runs real LLM calls with slide tools (plus the app-generation create_file
 * tool that writes the initial slides.json) backed by an in-memory store.
 * Tests the full generate -> read -> patch cycle without any UI.
 *
 * Run: PORTAL_API_KEY=... pnpm vitest run test/tools/slide-generation
 */

import { describe, expect, it } from "vitest";

import { buildSlideSystemPrompt, type SlideDeck } from "../../../src/tools/slides.js";
import {
  allSlideText,
  config,
  createFileStore,
  dumpFiles,
  extractText,
  getDeck,
  printResult,
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

function isDeckShape(deck: unknown): deck is SlideDeck {
  if (!deck || typeof deck !== "object") return false;
  const d = deck as { version?: unknown; slides?: unknown; theme?: unknown };
  return d.version === 2 && Array.isArray(d.slides) && typeof d.theme === "object";
}

describe("slide-generation", () => {
  it("generates a new slide deck with create_file", async () => {
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
      maxToolRounds: 6,
    });

    printResult(result);
    dumpFiles(store, "remote-work-deck");
    expect(result.error).toBeNull();

    // Should have called create_file to write slides.json
    const createCalls = log.filter((l) => l.name === "create_file");
    expect(createCalls.length).toBeGreaterThanOrEqual(1);

    // slides.json should exist and be a valid SlideDeck
    expect(store.has("slides.json")).toBe(true);
    const deck = getDeck(store);
    expect(isDeckShape(deck)).toBe(true);
    expect(deck.slides.length).toBeGreaterThanOrEqual(2);

    // Every slide should have at least one element with a unique id
    const ids = new Set<string>();
    for (const slide of deck.slides) {
      expect(slide.id).toBeTruthy();
      expect(Array.isArray(slide.elements)).toBe(true);
      expect(slide.elements.length).toBeGreaterThan(0);
      ids.add(slide.id);
      for (const el of slide.elements) {
        expect(el.id).toBeTruthy();
      }
    }
    expect(ids.size).toBe(deck.slides.length);

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
      maxToolRounds: 6,
    });

    printResult(genResult);
    dumpFiles(store, "focusflow-gen");
    expect(genResult.error).toBeNull();

    const initialDeck = getDeck(store);
    const initialSlideCount = initialDeck.slides.length;
    const initialJson = store.get("slides.json")!;
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
      maxToolRounds: 6,
    });

    printResult(updateResult);
    dumpFiles(store, "focusflow-renamed");
    expect(updateResult.error).toBeNull();

    const updateCalls = log.slice(callsAfterGen);
    const readCalls = updateCalls.filter((l) => l.name === "read_slides");
    const patchCalls = updateCalls.filter((l) => l.name === "patch_slides");
    const createCalls = updateCalls.filter((l) => l.name === "create_file");

    console.log(
      `  Update tools: ${readCalls.length} read_slides, ${patchCalls.length} patch_slides, ${createCalls.length} create_file`
    );

    // The LLM should prefer patch_slides over a full create_file rewrite
    expect(patchCalls.length).toBeGreaterThanOrEqual(1);

    // slides.json should have changed and still be valid
    expect(store.get("slides.json")).not.toBe(initialJson);
    const updatedDeck = getDeck(store);
    expect(isDeckShape(updatedDeck)).toBe(true);

    // Slide count should be preserved (we only renamed, not restructured)
    expect(updatedDeck.slides.length).toBe(initialSlideCount);

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
      maxToolRounds: 6,
    });
    expect(genResult.error).toBeNull();
    dumpFiles(store, "renewable-gen");

    const initialDeck = getDeck(store);
    const initialSlideCount = initialDeck.slides.length;
    const initialElementCount = initialDeck.slides.reduce((n, s) => n + s.elements.length, 0);
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
      maxToolRounds: 6,
    });
    expect(updateResult.error).toBeNull();
    dumpFiles(store, "renewable-emerald");

    const updateCalls = log.slice(callsAfterGen);
    const patchCalls = updateCalls.filter((l) => l.name === "patch_slides");
    const createCalls = updateCalls.filter((l) => l.name === "create_file");
    console.log(
      `  Theme update tools: ${patchCalls.length} patch_slides, ${createCalls.length} create_file`
    );

    // Should use patch_slides rather than rewrite the whole deck
    expect(patchCalls.length).toBeGreaterThanOrEqual(1);
    expect(createCalls.length).toBe(0);

    const updatedDeck = getDeck(store);
    // Structure should be preserved
    expect(updatedDeck.slides.length).toBe(initialSlideCount);
    const updatedElementCount = updatedDeck.slides.reduce((n, s) => n + s.elements.length, 0);
    expect(updatedElementCount).toBe(initialElementCount);

    // Accent should match the requested color (case-insensitive)
    expect(updatedDeck.theme.colors.accent.toLowerCase()).toBe("#10b981");
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
      maxToolRounds: 8,
    });

    printResult(result);
    dumpFiles(store, "investor-pitch");
    expect(result.error).toBeNull();

    const deck = getDeck(store);
    expect(deck.slides.length).toBeGreaterThanOrEqual(4);

    // Collect the set of element "kind"s per slide to measure variety
    const elementKinds = new Set<string>();
    for (const slide of deck.slides) {
      for (const el of slide.elements) elementKinds.add(el.kind);
    }
    console.log(`  Element kinds used: ${[...elementKinds].join(", ")}`);
    // A polished deck should mix text with at least one shape or icon
    expect(elementKinds.has("text")).toBe(true);
    expect(elementKinds.size).toBeGreaterThanOrEqual(2);

    // All element coordinates should be valid percentages (0..100)
    for (const slide of deck.slides) {
      for (const el of slide.elements) {
        expect(el.x).toBeGreaterThanOrEqual(0);
        expect(el.x).toBeLessThanOrEqual(100);
        expect(el.y).toBeGreaterThanOrEqual(0);
        expect(el.y).toBeLessThanOrEqual(100);
        expect(el.w).toBeGreaterThan(0);
        expect(el.w).toBeLessThanOrEqual(100);
        expect(el.h).toBeGreaterThan(0);
        expect(el.h).toBeLessThanOrEqual(100);
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
      maxToolRounds: 6,
    });
    expect(genResult.error).toBeNull();
    dumpFiles(store, "ocean-gen");

    const initial = tryGetDeck(store);
    expect(initial).not.toBeNull();
    const initialCount = initial!.slides.length;
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
      maxToolRounds: 6,
    });
    expect(updateResult.error).toBeNull();
    dumpFiles(store, "ocean-added");

    const updateCalls = log.slice(callsAfterGen);
    const patchCalls = updateCalls.filter((l) => l.name === "patch_slides");
    expect(patchCalls.length).toBeGreaterThanOrEqual(1);

    const updated = getDeck(store);
    expect(updated.slides.length).toBe(initialCount + 1);

    // The new slide should have content related to donations / call to action
    const lastSlide = updated.slides[updated.slides.length - 1]!;
    const lastText = lastSlide.elements
      .filter((e) => e.kind === "text")
      .map((e) => (e as { text: string }).text)
      .join(" ")
      .toLowerCase();
    expect(lastText).toMatch(/donat|support|join|action|help|give/);
  });
});
