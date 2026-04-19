/**
 * Visual-quality tests for slide generation.
 *
 * Each test runs a real user-style prompt end-to-end and dumps the resulting
 * slides.json to `.output/` for manual visual review. Assertions cover only
 * structural invariants and constraints stated in the prompt — the actual
 * "does it look good" judgment is left to the reviewer reading the dumped
 * deck (or feeding it into the slide renderer).
 *
 * Runs once per model. By default, uses the single model from `E2E_MODEL`
 * (or the project default). Set `E2E_MODELS` to a comma-separated list to
 * compare outputs across multiple models side by side — each model's deck
 * is dumped to its own subdirectory, e.g. `.output/prompt-home-gardening/kimi-k2p5/`.
 *
 * Run: pnpm vitest -c vitest.e2e.config.mts run test/tools/slide-generation/prompts
 * Compare: E2E_MODELS=model-a,model-b pnpm vitest -c vitest.e2e.config.mts run test/tools/slide-generation/prompts
 */

import { describe, expect, it } from "vitest";

import { buildSlideSystemPrompt } from "../../../src/tools/slides/index.js";
import {
  config,
  createFileStore,
  dumpFiles,
  getDeck,
  printResult,
  timedToolLoop,
  type ToolCallLog,
  wrapTool,
} from "./setup.js";
import { createTestSlideTools } from "./tools.js";

const SYSTEM_PROMPT = buildSlideSystemPrompt();

/**
 * Models to run each prompt against. `E2E_MODELS` (comma-separated) wins over
 * the single-model `E2E_MODEL` / default picked up by `config.model`.
 */
const MODELS = process.env.E2E_MODELS
  ? process.env.E2E_MODELS.split(",")
      .map((m) => m.trim())
      .filter(Boolean)
  : [config.model];

/** Filesystem-safe slug derived from a model id (last path segment). */
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

describe.each(MODELS)("slide-generation prompts [%s]", (model) => {
  const slug = modelSlug(model);

  it("home gardening fundamentals (no images)", async () => {
    const store = createFileStore();
    const log: ToolCallLog[] = [];
    const tools = createTestSlideTools(store).map((t) => wrapTool(t, log));

    const result = await timedToolLoop({
      messages: makeMessages(
        "Create a deck teaching beginners the fundamentals of home gardening, covering soil types, seasonal planting, common pests, and starter plants for different climates. No images."
      ),
      model,
      baseUrl: config.baseUrl,
      headers: { "X-API-Key": config.portalKey },
      apiType: config.apiType,
      tools,
      toolChoice: "auto",
      maxToolRounds: 8,
      // Anthropic via Bifrost seems to 500 when the streamed JSON payload
      // exceeds the default output-token budget on dense decks. Raise it.
      maxOutputTokens: 16000,
    });

    printResult(result);
    dumpFiles(store, `prompt-home-gardening/${slug}`);
    expect(result.error).toBeNull();

    const deck = getDeck(store);

    // Prompt listed 4 topic areas plus an implied intro → expect at least 5 slides
    expect(deck.slides.length).toBeGreaterThanOrEqual(5);

    // "No images" constraint: there should be zero image elements
    const imageCount = deck.slides.reduce(
      (n, s) => n + s.elements.filter((e) => e.kind === "image").length,
      0
    );
    expect(imageCount).toBe(0);

    // Coordinate validity — elements should stay within the canvas
    for (const slide of deck.slides) {
      for (const el of slide.elements) {
        expect(el.x).toBeGreaterThanOrEqual(0);
        expect(el.x + el.w).toBeLessThanOrEqual(100);
        expect(el.y).toBeGreaterThanOrEqual(0);
        expect(el.y + el.h).toBeLessThanOrEqual(100);
      }
    }

    // Content should mention the topics the prompt called out
    const allText = deck.slides
      .flatMap((s) =>
        s.elements.filter((e) => e.kind === "text").map((e) => (e as { text: string }).text)
      )
      .join(" ")
      .toLowerCase();
    expect(allText).toMatch(/soil/);
    expect(allText).toMatch(/season|spring|summer|fall|winter/);
    expect(allText).toMatch(/pest|insect|bug/);
    expect(allText).toMatch(/plant|climate/);

    // Log element-kind mix so the reviewer can spot text-only decks vs varied ones
    const kindCounts: Record<string, number> = {};
    for (const slide of deck.slides) {
      for (const el of slide.elements) kindCounts[el.kind] = (kindCounts[el.kind] ?? 0) + 1;
    }
    console.log(`  Slides: ${deck.slides.length}, element kinds: ${JSON.stringify(kindCounts)}`);
  });
});
