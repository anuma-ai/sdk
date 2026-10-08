import { describe, expect, it } from "vitest";

import { buildSlideSystemPrompt, getId } from "../../../src/tools/slides/index.js";
import {
  config,
  createFileStore,
  dumpFiles,
  getDeck,
  getServerToolSchemas,
  printResult,
  slidesOf,
  timedToolLoop,
  succeeded,
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

describe.concurrent("composition-layouts wire-in", () => {
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

    const planCalls = log.filter((l) => l.name === "plan_deck" && succeeded(l));
    expect(planCalls.length).toBe(1);
    const planLayouts = (planCalls[0]!.args.layouts as string[]) ?? [];
    expect(planLayouts).toContain("cover-split-portrait--editorial-warm");
    expect(planLayouts).toContain("brand-story-split--editorial-warm");
    expect(planLayouts).toContain("multi-stat-asymmetric--editorial-warm");

    const addCalls = log.filter((l) => l.name === "add_slide");
    expect(addCalls.length).toBeGreaterThanOrEqual(3);
    const usedLayouts = addCalls.map((c) => c.args.layout as string);
    expect(usedLayouts).toContain("cover-split-portrait--editorial-warm");
    expect(usedLayouts).toContain("brand-story-split--editorial-warm");
    expect(usedLayouts).toContain("multi-stat-asymmetric--editorial-warm");

    expect(store.has("slides.jsx")).toBe(true);
    const deck = getDeck(store);
    const slides = slidesOf(deck);
    expect(slides.length).toBeGreaterThanOrEqual(3);

    for (const slide of slides) {
      expect(getId(slide)).toBeTruthy();
    }
  });

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

    const planCalls = log.filter((l) => l.name === "plan_deck" && succeeded(l));
    expect(planCalls.length).toBeGreaterThanOrEqual(1);
    const planLayouts = (planCalls.at(-1)!.args.layouts as string[]) ?? [];

    const addCalls = log.filter((l) => l.name === "add_slide");
    const usedLayouts = addCalls.map((c) => c.args.layout as string);

    const suffixOf = (n: string): string => n.split("--").at(-1) ?? "";

    console.log("\n  Open-ended layout choices:");
    console.log(`    plan_deck → ${planLayouts.length} layouts: ${JSON.stringify(planLayouts)}`);
    console.log(`    add_slide → ${usedLayouts.length} slides: ${JSON.stringify(usedLayouts)}`);

    expect(store.has("slides.jsx")).toBe(true);
    const deck = getDeck(store);
    const slides = slidesOf(deck);
    expect(slides.length).toBeGreaterThanOrEqual(4);

    expect(planLayouts.length).toBeGreaterThan(0);
    for (const n of planLayouts) {
      expect(n, `plan layout "${n}" must be compound <composition>--<system>`).toContain("--");
    }
    const planSuffix = suffixOf(planLayouts[0]!);
    for (const n of planLayouts) {
      expect(suffixOf(n)).toBe(planSuffix);
    }
    for (const n of usedLayouts) {
      expect(planLayouts).toContain(n);
    }
    expect(new Set(usedLayouts).size).toBeGreaterThanOrEqual(2);
  });

  it.skip("generates a 7-slide demo deck with real images", { timeout: 600_000 }, async () => {
    const store = createFileStore();
    const log: ToolCallLog[] = [];
    const slideTools = createTestSlideTools(store).map((t) => wrapTool(t, log));
    const imageSchemas = await getServerToolSchemas(["AnumaMediaMCP-anuma_create_image"]);
    const tools = [...slideTools, ...imageSchemas];

    const result = await timedToolLoop({
      messages: makeMessages(
        "Build a 7-slide investor pitch deck for a high-end electric vehicle startup called Volta Atelier. " +
          "Cover, brand story, market opportunity with stats, founder quote, product showcase, competitive comparison, and a closing 'why now' moment. " +
          "Use image-rich composition layouts where it fits the slide intent. " +
          "For every image slot in the chosen layouts, FIRST call AnumaMediaMCP-anuma_create_image to produce a real, on-brand image URL (generate 4-5 max, share between slides), THEN reference those URLs in the slide JSX. " +
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

    const jsx = store.get("slides.jsx") ?? "";
    const realImages = (jsx.match(/src="https?:\/\/(?!placehold\.co)[^"]+"/g) ?? []).length;
    const placeholderImages = (jsx.match(/src="https?:\/\/placehold\.co\/[^"]+"/g) ?? []).length;
    console.log(`    image URLs → ${realImages} real, ${placeholderImages} placeholder`);

    expect(slides.length).toBeGreaterThanOrEqual(7);
  });

  it(
    "fills the agenda composition's flex region with N items end-to-end",
    { timeout: 300_000 },
    async () => {
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

      expect(usedLayouts).toContain("agenda--editorial-warm");

      const jsx = store.get("slides.jsx") ?? "";
      const outerGroup = jsx.match(/<Anuma\.Group\s+[^>]*id="agenda(-\d+)?"/s);
      expect(outerGroup, "expected agenda outer Anuma.Group in serialized deck").toBeTruthy();

      const itemGroups = jsx.match(/<Anuma\.Group id="agenda_\d+"/g) ?? [];
      console.log(`    item groups: ${itemGroups.length}`);
      expect(itemGroups.length).toBeGreaterThanOrEqual(3);

      const titleIds = (jsx.match(/id="agenda_\d+_title"/g) ?? []).length;
      console.log(`    title slots: ${titleIds}`);
      expect(titleIds).toBeGreaterThanOrEqual(3);
    }
  );

  it("picks a register-appropriate design system from a topic-only prompt", async () => {
    const store = createFileStore();
    const log: ToolCallLog[] = [];
    const tools = createTestSlideTools(store).map((t) => wrapTool(t, log));

    const result = await timedToolLoop({
      messages: makeMessages(
        "Build a 3-slide quarterly board update for a publicly-traded financial-services firm. Restrained institutional voice, no marketing flourishes — this gets read by the audit committee.",
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
    dumpFiles(store, "board-update-tone");
    expect(result.error).toBeNull();

    const planCalls = log.filter((l) => l.name === "plan_deck" && succeeded(l));
    expect(planCalls.length).toBeGreaterThanOrEqual(1);
    const planLayouts = (planCalls.at(-1)!.args.layouts as string[]) ?? [];
    expect(planLayouts.length).toBeGreaterThan(0);
    const suffixOf = (n: string) => n.split("--").at(-1) ?? "";
    const systemSuffix = suffixOf(planLayouts[0]!);
    expect(systemSuffix.length).toBeGreaterThan(0);
    for (const n of planLayouts) expect(suffixOf(n)).toBe(systemSuffix);

    console.log(`\n  Topic→system pick: ${systemSuffix}`);
    const acceptable = new Set(["corporate-modern", "minimal-swiss", "editorial-warm"]);
    expect(
      acceptable.has(systemSuffix),
      `expected one of ${[...acceptable].join(", ")}; got ${systemSuffix}`
    ).toBe(true);
  });
});
