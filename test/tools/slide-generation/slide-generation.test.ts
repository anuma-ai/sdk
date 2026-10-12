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
  succeeded,
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

describe.concurrent("slide-generation", () => {
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

    const planCalls = log.filter((l) => l.name === "plan_deck" && succeeded(l));
    const addCalls = log.filter((l) => l.name === "add_slide");
    expect(planCalls.length).toBe(1);
    expect(addCalls.length).toBeGreaterThanOrEqual(2);

    expect(store.has("slides.jsx")).toBe(true);
    const deck = getDeck(store);
    expect(isDeckShape(deck)).toBe(true);
    const slides = slidesOf(deck);
    expect(slides.length).toBeGreaterThanOrEqual(2);

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

    const text = allSlideText(deck).toLowerCase();
    expect(text).toMatch(/remote|work|flexible|home/);
  });

  it("uses read_slides + patch_slides to modify an existing deck", async () => {
    const store = createFileStore();
    const log: ToolCallLog[] = [];
    const tools = createTestSlideTools(store).map((t) => wrapTool(t, log));

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
    const reinitCalls = updateCalls.filter((l) => l.name === "plan_deck" && succeeded(l));

    console.log(
      `  Update tools: ${readCalls.length} read_slides, ${patchCalls.length} patch_slides, ${reinitCalls.length} plan_deck (reinits)`
    );

    expect(patchCalls.length).toBeGreaterThanOrEqual(1);
    expect(reinitCalls.length).toBe(0);

    expect(store.get("slides.jsx")).not.toBe(initialJsx);
    const updatedDeck = getDeck(store);
    expect(isDeckShape(updatedDeck)).toBe(true);

    expect(slidesOf(updatedDeck).length).toBe(initialSlideCount);

    const text = allSlideText(updatedDeck);
    expect(text).toMatch(/Momentum/i);
    const remainingFocusFlow = (text.match(/FocusFlow/gi) ?? []).length;
    expect(remainingFocusFlow).toBeLessThan(initialFocusFlowCount);
  });

  it("applies surgical update_element patches instead of rewriting the deck", async () => {
    const store = createFileStore();
    const log: ToolCallLog[] = [];
    const tools = createTestSlideTools(store).map((t) => wrapTool(t, log));

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
    const reinitCalls = updateCalls.filter((l) => l.name === "plan_deck" && succeeded(l));
    console.log(
      `  Theme update tools: ${patchCalls.length} patch_slides, ${reinitCalls.length} plan_deck (reinits)`
    );

    expect(patchCalls.length).toBeGreaterThanOrEqual(1);
    expect(reinitCalls.length).toBe(0);

    const updatedDeck = getDeck(store);
    const updatedSlides = slidesOf(updatedDeck);
    expect(updatedSlides.length).toBe(initialSlideCount);
    const updatedElementCount = updatedSlides.reduce((n, s) => n + elementsOf(s).length, 0);
    expect(updatedElementCount).toBe(initialElementCount);

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

    const elementTags = new Set<string>();
    for (const slide of slides) {
      for (const el of elementsOf(slide)) elementTags.add(el.tag);
    }
    console.log(`  Element tags used: ${[...elementTags].join(", ")}`);
    expect(elementTags.has("Text")).toBe(true);
    expect(elementTags.size).toBeGreaterThanOrEqual(2);

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

    const lastSlide = updatedSlides[updatedSlides.length - 1]!;
    const lastText = elementsOf(lastSlide)
      .filter((e) => e.tag === "Text")
      .map((e) => e.children.filter((c): c is string => typeof c === "string").join(""))
      .join(" ")
      .toLowerCase();
    expect(lastText).toMatch(/donat|support|join|action|help|give/);
  });
});
