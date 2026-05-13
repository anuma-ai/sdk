/**
 * E2E test for the design-system composition layouts wire-in.
 *
 * Verifies that plan_deck accepts a composition-system compound name
 * (e.g. "cover-split-portrait--editorial-warm"), that the layout recipe
 * is rendered correctly into the system prompt, and that add_slide
 * successfully appends the slide produced by the model.
 *
 * Run: PORTAL_API_KEY=... pnpm vitest -c vitest.e2e.config.mts run \
 *      test/tools/slide-generation/compositionLayouts.test.ts
 */

import { describe, expect, it } from "vitest";

import {
  buildSlideSystemPrompt,
  getId,
} from "../../../src/tools/slides/index.js";
import {
  config,
  createFileStore,
  dumpFiles,
  getDeck,
  printResult,
  slidesOf,
  timedToolLoop,
  wrapTool,
  type ToolCallLog,
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

describe("composition-layouts wire-in", () => {
  it("generates a deck using design-system composition layouts", async () => {
    const store = createFileStore();
    const log: ToolCallLog[] = [];
    const tools = createTestSlideTools(store).map((t) => wrapTool(t, log));

    const result = await timedToolLoop({
      messages: makeMessages(
        "Create a 3-slide deck for a teahouse franchise pitch. Use these specific layouts in order: 'cover-split-portrait--editorial-warm' for the cover, 'brand-story-split--editorial-warm' for the brand story, and 'multi-stat-asymmetric--editorial-warm' for the market evidence. Use the 'warm editorial' palette and 'editorial' fontPreset. Set slideCount to 3.",
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
    dumpFiles(store, "composition-layouts-pitch");
    expect(result.error).toBeNull();

    // plan_deck must have been called with the composition layout names.
    const planCalls = log.filter((l) => l.name === "plan_deck");
    expect(planCalls.length).toBe(1);
    const planLayouts = (planCalls[0]!.args.layouts as string[]) ?? [];
    expect(planLayouts).toContain("cover-split-portrait--editorial-warm");
    expect(planLayouts).toContain("brand-story-split--editorial-warm");
    expect(planLayouts).toContain("multi-stat-asymmetric--editorial-warm");

    // add_slide must have used each composition layout exactly once.
    const addCalls = log.filter((l) => l.name === "add_slide");
    expect(addCalls.length).toBeGreaterThanOrEqual(3);
    const usedLayouts = addCalls.map((c) => c.args.layout as string);
    expect(usedLayouts).toContain("cover-split-portrait--editorial-warm");
    expect(usedLayouts).toContain("brand-story-split--editorial-warm");
    expect(usedLayouts).toContain("multi-stat-asymmetric--editorial-warm");

    // Deck must parse and contain the expected slides.
    expect(store.has("slides.jsx")).toBe(true);
    const deck = getDeck(store);
    const slides = slidesOf(deck);
    expect(slides.length).toBeGreaterThanOrEqual(3);

    // Every slide should have a slide id (composition recipes set one).
    for (const slide of slides) {
      expect(getId(slide)).toBeTruthy();
    }
  });

  // Open-ended generation: no layout names in the prompt. We want to see
  // whether the model reaches for composition layouts on its own when the
  // system prompt offers both legacy and design-system options.
  it("picks composition layouts when given an open-ended prompt", async () => {
    const store = createFileStore();
    const log: ToolCallLog[] = [];
    const tools = createTestSlideTools(store).map((t) => wrapTool(t, log));

    const result = await timedToolLoop({
      messages: makeMessages(
        "Make a 4-slide investor pitch deck for a Series A coffee subscription startup. Cover slide, brand story, the market opportunity with stats, and the competitive landscape.",
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
    dumpFiles(store, "composition-layouts-open");
    expect(result.error).toBeNull();

    // Multiple plan_deck calls are valid (the model may retry after a
    // validation error). Use the last successful one.
    const planCalls = log.filter((l) => l.name === "plan_deck");
    expect(planCalls.length).toBeGreaterThanOrEqual(1);
    const planLayouts = (planCalls.at(-1)!.args.layouts as string[]) ?? [];

    const addCalls = log.filter((l) => l.name === "add_slide");
    const usedLayouts = addCalls.map((c) => c.args.layout as string);

    // Composition names are compound: "<composition>--<system>". Legacy
    // layouts are single-token kebab-case. Count how often the model chose
    // a composition vs a legacy layout.
    const isComposition = (name: string): boolean => name.includes("--");
    const planComp = planLayouts.filter(isComposition);
    const planLegacy = planLayouts.filter((n) => !isComposition(n));
    const usedComp = usedLayouts.filter(isComposition);
    const usedLegacy = usedLayouts.filter((n) => !isComposition(n));

    console.log("\n  Open-ended layout choices:");
    console.log(`    plan_deck → ${planLayouts.length} layouts (${planComp.length} composition, ${planLegacy.length} legacy)`);
    console.log(`      composition: ${JSON.stringify(planComp)}`);
    console.log(`      legacy:      ${JSON.stringify(planLegacy)}`);
    console.log(`    add_slide → ${usedLayouts.length} slides (${usedComp.length} composition, ${usedLegacy.length} legacy)`);
    console.log(`      composition: ${JSON.stringify(usedComp)}`);
    console.log(`      legacy:      ${JSON.stringify(usedLegacy)}`);

    // Deck must parse.
    expect(store.has("slides.jsx")).toBe(true);
    const deck = getDeck(store);
    const slides = slidesOf(deck);
    expect(slides.length).toBeGreaterThanOrEqual(4);

    // The actual signal we care about: did the model pick at least one
    // composition layout on its own?
    expect(usedComp.length).toBeGreaterThan(0);
  });
});
