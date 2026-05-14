/**
 * E2E probe for the `accent` override in plan_deck.
 *
 * Asks the LLM to generate decks for a handful of topics where a specific
 * brand-color register is obvious from context (coffee roastery → warm
 * terracotta, fintech series-A → trust blue, climate tech → green). Logs
 * the accent the LLM chose for each topic (or "default" if it didn't
 * reach for the knob), then dumps each deck to HTML for visual review.
 *
 * Use to answer: does the prompt copy in PLAN_DECK_SCHEMA + system
 * prompt nudge the LLM into using `accent` unprompted? Or does it
 * always fall back to the system's default?
 *
 * Run:
 *   PORTAL_API_KEY=... pnpm exec tsx test/tools/slide-generation/probeAccent.ts
 *
 * Output:
 *   test/tools/slide-generation/.output/probe-accent-<topic>/index.html
 */

import { buildSlideSystemPrompt } from "../../../src/tools/slides/index.js";
import {
  config,
  createFileStore,
  dumpFiles,
  timedToolLoop,
  tryGetDeck,
  wrapTool,
  type ToolCallLog,
} from "./setup.js";
import { createTestSlideTools } from "./tools.js";

const SYSTEM_PROMPT = buildSlideSystemPrompt();

type Probe = {
  slug: string;
  /** What we expect the LLM to do (informally) — used in the summary print. */
  expect: string;
  prompt: string;
};

const PROBES: Probe[] = [
  {
    slug: "coffee-roastery",
    expect: "warm earthy accent (terracotta / burnt orange / coffee brown)",
    prompt:
      "Create a 5-slide wholesale partner deck for Atlas Roasters, a small direct-trade coffee roastery. Audience is cafés and hotels considering bulk orders. Cover the brand origin story, sourcing, pricing tiers, and onboarding.",
  },
  {
    slug: "climate-tech",
    expect: "green / forest / sustainable accent",
    prompt:
      "Create a 5-slide investor deck for Verdure, a climate-tech startup that builds soil-carbon measurement hardware for regenerative farms. Audience is climate-focused VCs. Cover the problem, solution, traction, and ask.",
  },
  {
    slug: "fintech-series-a",
    expect: "indigo / navy / trust-blue accent",
    prompt:
      "Create a 5-slide Series A pitch for Vault, a B2B fintech that automates corporate treasury for mid-market companies. Audience is institutional investors. Cover the problem, market, product, traction, and ask.",
  },
];

async function runProbe(probe: Probe): Promise<{
  slug: string;
  accent: string | null;
  designSystem: string | null;
  rounds: number;
  elapsedMs: number;
  error: string | null;
}> {
  console.log(`\n══════════ ${probe.slug} ══════════`);
  console.log(`  expect: ${probe.expect}`);
  console.log(`  prompt: ${probe.prompt.slice(0, 80)}…`);
  const store = createFileStore();
  const log: ToolCallLog[] = [];
  const tools = createTestSlideTools(store).map((t) => wrapTool(t, log));

  const result = await timedToolLoop({
    messages: [
      { role: "system", content: [{ type: "text", text: SYSTEM_PROMPT }] },
      { role: "user", content: [{ type: "text", text: probe.prompt }] },
    ],
    model: config.model,
    baseUrl: config.baseUrl,
    headers: { "X-API-Key": config.portalKey },
    apiType: config.apiType,
    tools,
    toolChoice: "auto",
    maxToolRounds: 15,
  });

  if (result.error) {
    console.error(`  ERROR: ${result.error}`);
    return { slug: probe.slug, accent: null, designSystem: null, rounds: 0, elapsedMs: result.elapsedMs ?? 0, error: result.error };
  }

  // Inspect the plan_deck call to learn whether the LLM reached for the
  // accent knob and which design-system suffix it picked.
  const planCall = log.find((l) => l.name === "plan_deck");
  const args = (planCall?.args ?? {}) as { accent?: string; layouts?: string[] };
  const accent = typeof args.accent === "string" ? args.accent : null;
  // Layouts use compound names like "cover-statement--minimal-swiss".
  // Pull the suffix off the first one.
  const layout = Array.isArray(args.layouts) && typeof args.layouts[0] === "string"
    ? args.layouts[0]
    : null;
  const designSystem = layout?.includes("--") ? layout.split("--").slice(-1)[0]! : null;

  console.log(`  picked system : ${designSystem ?? "(none)"}`);
  console.log(`  picked accent : ${accent ?? "(default — knob NOT used)"}`);

  if (tryGetDeck(store)) {
    dumpFiles(store, `probe-accent-${probe.slug}`);
  }

  return {
    slug: probe.slug,
    accent,
    designSystem,
    rounds: result.rounds.length,
    elapsedMs: result.elapsedMs,
    error: null,
  };
}

async function main(): Promise<void> {
  const results: Array<Awaited<ReturnType<typeof runProbe>>> = [];
  for (const probe of PROBES) {
    results.push(await runProbe(probe));
  }

  console.log(`\n══════════ SUMMARY ══════════`);
  for (const r of results) {
    const usedKnob = r.accent ? "✓" : "✗";
    console.log(
      `  ${usedKnob} ${r.slug.padEnd(20)} system=${(r.designSystem ?? "—").padEnd(20)} accent=${r.accent ?? "(default)"}   ${r.rounds}r ${(r.elapsedMs / 1000).toFixed(1)}s${r.error ? ` ERROR:${r.error}` : ""}`
    );
  }
  const hits = results.filter((r) => r.accent).length;
  console.log(`\n  ${hits} / ${results.length} probes used the accent knob.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
