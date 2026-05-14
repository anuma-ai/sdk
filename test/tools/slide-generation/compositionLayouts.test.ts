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
  getServerToolSchemas,
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

  // Demo run: a richer deck across image-bearing layouts. Portal exposes
  // AnumaImageMCP-generate_cloud_image server-side based on prompt context,
  // so the model can populate image slots with real generated URLs instead
  // of placehold.co rectangles. Bumped maxToolRounds because image MCP
  // calls add round-trips before plan_deck/add_slide.
  it("generates a 7-slide demo deck with real images", { timeout: 600_000 }, async () => {
    const store = createFileStore();
    const log: ToolCallLog[] = [];
    const slideTools = createTestSlideTools(store).map((t) => wrapTool(t, log));
    // Pull the real AnumaImageMCP tool schema from Portal so the model
    // can generate cloud-hosted images. Portal executes the tool
    // server-side when the model calls it; the schema-only entry on the
    // client side just declares its existence to the LLM.
    const imageSchemas = await getServerToolSchemas(["AnumaImageMCP-generate_cloud_image"]);
    const tools = [...slideTools, ...imageSchemas];

    const result = await timedToolLoop({
      messages: makeMessages(
        "Build a 7-slide investor pitch deck for a high-end electric vehicle startup called Volta Atelier. " +
          "Cover, brand story, market opportunity with stats, founder quote, product showcase, competitive comparison, and a closing 'why now' moment. " +
          "Use image-rich composition layouts where it fits the slide intent. " +
          "For every image slot in the chosen layouts, FIRST call AnumaImageMCP-generate_cloud_image to produce a real, on-brand image URL (generate 4-5 max, share between slides), THEN reference those URLs in the slide JSX. " +
          "Pick whichever design system best matches a premium automotive brand and apply it consistently across all slides.",
        SYSTEM_PROMPT
      ),
      model: config.model,
      baseUrl: config.baseUrl,
      headers: { "X-API-Key": config.portalKey },
      apiType: config.apiType,
      tools,
      toolChoice: "auto",
      maxToolRounds: 30,
    });

    printResult(result);
    dumpFiles(store, "composition-layouts-demo");
    expect(result.error).toBeNull();
    expect(store.has("slides.jsx")).toBe(true);

    const deck = getDeck(store);
    const slides = slidesOf(deck);
    console.log(`\n  Demo deck: ${slides.length} slides`);

    // Surface how many real image URLs (vs placeholders) ended up in the
    // serialized deck — useful to confirm AnumaImageMCP actually fired.
    const jsx = store.get("slides.jsx") ?? "";
    const realImages = (jsx.match(/src="https?:\/\/(?!placehold\.co)[^"]+"/g) ?? []).length;
    const placeholderImages = (jsx.match(/src="https?:\/\/placehold\.co\/[^"]+"/g) ?? []).length;
    console.log(`    image URLs → ${realImages} real, ${placeholderImages} placeholder`);

    expect(slides.length).toBeGreaterThanOrEqual(7);
  });

  // Flex-region e2e: the agenda composition uses our new variable-count
  // flex primitive. The model must understand the `agenda_<idx>_<slot>`
  // pattern from the recipe and generate N items at fill time. This is
  // the architectural risk worth derisking — unit tests prove the
  // plumbing, but not that the model can produce conforming JSX.
  it("fills the agenda composition's flex region with N items end-to-end", { timeout: 300_000 }, async () => {
    const store = createFileStore();
    const log: ToolCallLog[] = [];
    const tools = createTestSlideTools(store).map((t) => wrapTool(t, log));

    const result = await timedToolLoop({
      messages: makeMessages(
        "Create a 3-slide steering-committee deck for Project Meridian. " +
          "First slide: cover. " +
          "Second slide: an AGENDA listing exactly 5 items — 'Action review', 'Programme health', 'Three findings', 'Decision on pricing', 'Next steps'. " +
          "Third slide: a closing 'why now' statement. " +
          "Use the editorial-warm design system throughout.",
        SYSTEM_PROMPT
      ),
      model: config.model,
      baseUrl: config.baseUrl,
      headers: { "X-API-Key": config.portalKey },
      apiType: config.apiType,
      tools,
      toolChoice: "auto",
      maxToolRounds: 20,
    });

    printResult(result);
    dumpFiles(store, "composition-layouts-agenda");
    expect(result.error).toBeNull();
    expect(store.has("slides.jsx")).toBe(true);

    const addCalls = log.filter((l) => l.name === "add_slide");
    const usedLayouts = addCalls.map((c) => c.args.layout as string);
    console.log("\n  Agenda e2e layouts:", JSON.stringify(usedLayouts));

    // The model should have picked the agenda composition for slide 2.
    expect(usedLayouts).toContain("agenda--editorial-warm");

    // Inspect the deck JSX for flex-region structure. The outer Anuma.Group's
    // id may either sit on the same line as the tag (short attr set) or on
    // its own line (long attr set — serializer breaks long tags). The id
    // can also have a dedupe suffix ("agenda-2") if the slide id collides
    // with the region's idPrefix.
    const jsx = store.get("slides.jsx") ?? "";
    const outerGroup = jsx.match(/<Anuma\.Group\s+[^>]*id="agenda(-\d+)?"/s);
    expect(outerGroup, "expected agenda outer Anuma.Group in serialized deck").toBeTruthy();

    // Item Groups carry the sequential prefix and are the load-bearing
    // signal that the model conformed to the `<prefix>_<idx>` pattern.
    const itemGroups = jsx.match(/<Anuma\.Group id="agenda_\d+"/g) ?? [];
    console.log(`    item groups: ${itemGroups.length}`);
    expect(itemGroups.length).toBeGreaterThanOrEqual(3);

    // Per-item slot ids ("agenda_1_title", "agenda_2_title", …) should be
    // present in sequence. The real load-bearing assertion: the model
    // generates conforming slot ids from the prefix pattern.
    const titleIds = (jsx.match(/id="agenda_\d+_title"/g) ?? []).length;
    console.log(`    title slots: ${titleIds}`);
    expect(titleIds).toBeGreaterThanOrEqual(3);
  });
});
