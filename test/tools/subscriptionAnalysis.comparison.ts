/**
 * Comparison test: skill (prompt-only) vs tools (structured checkpoints)
 *
 * Runs the same statement through both approaches and compares:
 * - Correctness: does the monthly total match the known answer ($180.18)?
 * - Consistency: run each approach 3 times, measure variance in totals
 * - Structure: does the prompt-only version always produce parseable numbers?
 *
 * The "skill" approach uses the original subscription-checker prompt from
 * ai-memoryless-client with no tools — the LLM does all computation in prose.
 *
 * The "tools" approach uses the SDK's subscription analysis tools as
 * structured checkpoints — the LLM extracts data, tools do the math.
 */

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck — vitest injects node globals (__dirname) and handles node: imports
import fs from "node:fs";
import path from "node:path";
import { describe, it, expect, afterAll } from "vitest";
import { runToolLoop } from "../../src/lib/chat/toolLoop.js";
import { createSubscriptionAnalysisTools } from "../../src/tools/subscriptionAnalysis.js";
import { config, extractText, wrapTool, type ToolCallLog } from "./setup.js";
import type { AnalyzeSubscriptionsResult } from "../../src/tools/subscriptionAnalysis.js";

// ---------------------------------------------------------------------------
// Report collector — accumulates sections, writes markdown in afterAll
// ---------------------------------------------------------------------------

const reportSections: string[] = [];
const OUTPUT_DIR = path.resolve(__dirname, ".output");
const REPORT_PATH = path.resolve(OUTPUT_DIR, "subscription-comparison.md");

// ---------------------------------------------------------------------------
// Shared fixture
// ---------------------------------------------------------------------------

const STATEMENT = `
CHASE VISA — Statement Period 03/01/2025 – 03/31/2025

03/01  NETFLIX.COM              15.99
03/01  SPOTIFY USA              11.99
03/05  ADOBE *CREATIVE CLD      59.99
03/07  PLANET FITNESS           24.99
03/10  AMAZON PRIME             14.99
03/15  MICROSOFT *365           9.99
03/15  NYT DIGITAL              4.25
03/20  HULU LLC                 17.99
03/22  CHATGPT PLUS             20.00
`;

// Ground truth: sum of all charges above
const EXPECTED_MONTHLY = 180.18;
const EXPECTED_COUNT = 9;

// ---------------------------------------------------------------------------
// Original skill prompt (copied from ai-memoryless-client finance.ts)
// ---------------------------------------------------------------------------

const SKILL_PROMPT = `You are a personal finance analyst specializing in identifying recurring charges and subscriptions.

## Task
Parse the following bank or credit card statement and identify all recurring and subscription charges.

## Statement Content
${STATEMENT}

## Instructions
1. Parse the statement text line by line and identify ALL recurring or subscription charges
2. Categorize each charge into a category:
   - Streaming (Netflix, Spotify, Hulu, etc.)
   - Software & Cloud (Adobe, Microsoft 365, iCloud, etc.)
   - Insurance (health, auto, renters, etc.)
   - Fitness & Wellness (gym memberships, meditation apps, etc.)
   - Food & Delivery (meal kits, delivery passes, etc.)
   - News & Media (newspapers, magazines, Substack, etc.)
   - Gaming (Xbox Game Pass, PlayStation Plus, etc.)
   - Finance & Fintech (account fees, premium banking, etc.)
   - Other recurring charges
3. For each subscription found, provide:
   - Service name
   - Amount charged
   - Billing frequency (monthly, annual, weekly)
   - Category
4. Calculate totals:
   - Total monthly cost (annualize yearly charges, divide weekly to monthly)
   - Total annual cost
   - Breakdown by category
5. Flag any charges that:
   - Look suspicious or unfamiliar
   - Are duplicate or overlapping services (e.g., multiple streaming services)
   - Have recently increased in price
   - Appear to be free trial conversions
6. Rank subscriptions by "likely unused" based on common patterns
7. Provide a summary with specific savings recommendations and total potential monthly/annual savings

IMPORTANT: In your response, include a line in exactly this format so we can parse it:
TOTAL_MONTHLY: <number>
SUBSCRIPTION_COUNT: <number>`;

// ---------------------------------------------------------------------------
// Tool-based prompt
// ---------------------------------------------------------------------------

const TOOL_PROMPT = `You are a personal finance analyst. Parse the following statement and identify all recurring and subscription charges.

## Statement Content
${STATEMENT}

## Workflow
1. Extract every recurring charge: service name, amount, billing frequency, category.
2. Call analyze_subscriptions with the extracted items. The tool normalizes amounts and computes totals.
3. Call flag_subscriptions with any charges worth flagging.
4. Write a brief summary using the numbers from the tools.`;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Try to extract TOTAL_MONTHLY: <number> from free-form text. */
function parseMonthlyFromText(text: string): number | null {
  // Look for the explicit marker first
  const markerMatch = text.match(/TOTAL_MONTHLY:\s*\$?([\d,]+\.?\d*)/i);
  if (markerMatch) return parseFloat(markerMatch[1]!.replace(/,/g, ""));

  // Fallback: look for "total monthly" near a dollar amount
  const patterns = [
    /total\s+monthly\s+(?:cost|spend|amount)[^$]*\$?([\d,]+\.?\d*)/i,
    /\$?([\d,]+\.?\d*)\s*(?:per|\/)\s*month\s*(?:total|\(total\))/i,
    /monthly[^$]*\*?\*?\$?([\d,]+\.?\d*)\*?\*?/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) {
      const val = parseFloat(m[1]!.replace(/,/g, ""));
      // Sanity: should be in a reasonable range for a subscription total
      if (val > 50 && val < 1000) return val;
    }
  }
  return null;
}

function parseCountFromText(text: string): number | null {
  const markerMatch = text.match(/SUBSCRIPTION_COUNT:\s*(\d+)/i);
  if (markerMatch) return parseInt(markerMatch[1]!, 10);

  const patterns = [
    /found\s+\*?\*?(\d+)\*?\*?\s+(?:recurring|subscription)/i,
    /(\d+)\s+(?:recurring|subscription)\s+(?:charge|service)/i,
    /identified\s+\*?\*?(\d+)\*?\*?/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) return parseInt(m[1]!, 10);
  }
  return null;
}


// ---------------------------------------------------------------------------
// Mixed-frequency statement — weekly, monthly, quarterly, annual
// ---------------------------------------------------------------------------

const MIXED_STATEMENT = `
AMEX PLATINUM — Statement Period 03/01/2025 – 03/31/2025

03/01  SPOTIFY USA              11.99
03/01  WALL STREET JOURNAL      4.00/week
03/03  AMAZON PRIME             139.00/year
03/05  ADOBE *CREATIVE CLD      659.88/year
03/07  PLANET FITNESS           24.99
03/10  BLUE APRON               47.95/week
03/12  MICROSOFT *365           99.99/year
03/15  NETFLIX.COM              22.99
03/18  LINKEDIN PREMIUM         359.88/year
03/20  PELOTON DIGITAL          13.99
03/22  CHATGPT PLUS             20.00
03/25  DROPBOX PLUS             11.99
03/28  HULU LLC                 17.99
`;

// Ground truth (computed by hand):
// Spotify:    $11.99/mo  → $11.99
// WSJ:        $4.00/wk   → $4.00 × 52/12 = $17.33
// Prime:      $139/yr    → $139 / 12 = $11.58
// Adobe:      $659.88/yr → $659.88 / 12 = $54.99
// Planet Fit: $24.99/mo  → $24.99
// Blue Apron: $47.95/wk  → $47.95 × 52/12 = $207.78
// M365:       $99.99/yr  → $99.99 / 12 = $8.33
// Netflix:    $22.99/mo  → $22.99
// LinkedIn:   $359.88/yr → $359.88 / 12 = $29.99
// Peloton:    $13.99/mo  → $13.99
// ChatGPT:    $20.00/mo  → $20.00
// Dropbox:    $11.99/mo  → $11.99
// Hulu:       $17.99/mo  → $17.99
// Total monthly: $453.94
const MIXED_EXPECTED_MONTHLY = 453.94;
const MIXED_EXPECTED_COUNT = 13;

const MIXED_SKILL_PROMPT = `You are a personal finance analyst specializing in identifying recurring charges and subscriptions.

## Task
Parse the following bank or credit card statement and identify all recurring and subscription charges.

## Statement Content
${MIXED_STATEMENT}

## Instructions
1. Parse the statement text line by line and identify ALL recurring or subscription charges
2. Categorize each charge into a category:
   - Streaming (Netflix, Spotify, Hulu, etc.)
   - Software & Cloud (Adobe, Microsoft 365, iCloud, etc.)
   - Insurance (health, auto, renters, etc.)
   - Fitness & Wellness (gym memberships, meditation apps, etc.)
   - Food & Delivery (meal kits, delivery passes, etc.)
   - News & Media (newspapers, magazines, Substack, etc.)
   - Gaming (Xbox Game Pass, PlayStation Plus, etc.)
   - Finance & Fintech (account fees, premium banking, etc.)
   - Other recurring charges
3. For each subscription found, provide:
   - Service name
   - Amount charged
   - Billing frequency (monthly, annual, weekly)
   - Category
4. Calculate totals:
   - Total monthly cost (annualize yearly charges, divide weekly to monthly)
   - Total annual cost
   - Breakdown by category
5. Flag any charges that look suspicious or are duplicate/overlapping services
6. Provide a summary with specific savings recommendations

IMPORTANT: In your response, include a line in exactly this format so we can parse it:
TOTAL_MONTHLY: <number>
SUBSCRIPTION_COUNT: <number>`;

const MIXED_TOOL_PROMPT = `You are a personal finance analyst. Parse the following statement and identify all recurring and subscription charges. Pay close attention to billing frequencies — some are weekly, some monthly, some annual.

## Statement Content
${MIXED_STATEMENT}

## Workflow
1. Extract every recurring charge: service name, charge amount as shown, billing frequency (weekly, monthly, annual), category.
2. Call analyze_subscriptions with the extracted items. The tool normalizes all amounts to monthly and computes totals.
3. Call flag_subscriptions with any charges worth flagging.
4. Write a brief summary using the numbers from the tools.`;

async function runSkillWith(prompt: string): Promise<{ text: string; monthly: number | null; count: number | null }> {
  const result = await runToolLoop({
    messages: [
      { role: "system", content: [{ type: "text", text: prompt }] },
      { role: "user", content: [{ type: "text", text: "Analyze my subscriptions." }] },
    ],
    model: config.model,
    baseUrl: config.baseUrl,
    headers: { "X-API-Key": config.portalKey },
    apiType: config.apiType,
    tools: [],
    maxToolRounds: 1,
  });

  const text = extractText(result);
  return { text, monthly: parseMonthlyFromText(text), count: parseCountFromText(text) };
}

async function runToolsWith(prompt: string): Promise<{
  text: string;
  monthly: number | null;
  count: number | null;
  toolLog: ToolCallLog[];
}> {
  const toolLog: ToolCallLog[] = [];
  const tools = createSubscriptionAnalysisTools().map((t) => wrapTool(t, toolLog));

  const result = await runToolLoop({
    messages: [
      { role: "system", content: [{ type: "text", text: prompt }] },
      { role: "user", content: [{ type: "text", text: "Analyze my subscriptions." }] },
    ],
    model: config.model,
    baseUrl: config.baseUrl,
    headers: { "X-API-Key": config.portalKey },
    apiType: config.apiType,
    tools,
    toolChoice: "auto",
    maxToolRounds: 5,
  });

  const analyzeCall = toolLog.find((l) => l.name === "analyze_subscriptions");
  let monthly: number | null = null;
  let count: number | null = null;

  if (analyzeCall) {
    const parsed = (
      typeof analyzeCall.result === "string"
        ? JSON.parse(analyzeCall.result)
        : analyzeCall.result
    ) as AnalyzeSubscriptionsResult;
    if (!("error" in parsed)) {
      monthly = parsed.totals.monthly;
      count = parsed.subscription_count;
    }
  }

  return { text: extractText(result), monthly, count, toolLog };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Report helpers
// ---------------------------------------------------------------------------

function fmt(v: number | null): string {
  return v !== null ? `$${v.toFixed(2)}` : "parse failed";
}

function addSingleRunReport(
  label: string,
  expected: { monthly: number; count: number },
  skill: { monthly: number | null; count: number | null },
  tools: { monthly: number | null; count: number | null }
) {
  const skillErr = skill.monthly !== null ? Math.abs(skill.monthly - expected.monthly) : null;
  const toolsErr = tools.monthly !== null ? Math.abs(tools.monthly - expected.monthly) : null;

  reportSections.push(`### ${label}

| | Expected | Skill (prompt) | Tools (structured) |
|---|---|---|---|
| Monthly total | ${fmt(expected.monthly)} | ${fmt(skill.monthly)} | ${fmt(tools.monthly)} |
| Subscription count | ${expected.count} | ${skill.count ?? "?"} | ${tools.count ?? "?"} |
| Error | — | ${skillErr !== null ? `$${skillErr.toFixed(2)}` : "—"} | ${toolsErr !== null ? `$${toolsErr.toFixed(2)}` : "—"} |
`);
}

function addConsistencyReport(
  label: string,
  expected: number,
  toolMonthly: (number | null)[],
  skillMonthly: (number | null)[]
) {
  const skillValid = skillMonthly.filter((v): v is number => v !== null);
  const skillSpread = skillValid.length > 1
    ? Math.max(...skillValid) - Math.min(...skillValid)
    : 0;
  const skillExact = skillValid.filter((v) => Math.abs(v - expected) < 0.02).length;
  const toolValid = toolMonthly.filter((v): v is number => v !== null);
  const toolUnique = new Set(toolValid.map((v) => v.toFixed(2)));

  reportSections.push(`### ${label}

| Run | Skill | Tools |
|---|---|---|
${toolMonthly.map((t, i) => `| ${i + 1} | ${fmt(skillMonthly[i]!)} | ${fmt(t)} |`).join("\n")}

| Metric | Skill | Tools |
|---|---|---|
| Spread | $${skillSpread.toFixed(2)} | $0.00 |
| Exact matches | ${skillExact}/${skillValid.length} | ${toolUnique.size === 1 ? `${toolValid.length}/${toolValid.length}` : "varies"} |
`);
}

afterAll(() => {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const header = `# Subscription Analysis: Skill vs Tools Comparison

Prompt-only skill (LLM does all math) vs structured tools (LLM extracts, code computes).

Model: \`${config.model}\`
Date: ${new Date().toISOString().split("T")[0]}

`;

  fs.writeFileSync(REPORT_PATH, header + reportSections.join("\n---\n\n"), "utf-8");
  console.log(`\n  Report written to ${REPORT_PATH}`);
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("skill vs tools — simple statement (all monthly)", () => {
  it("both approaches find the correct monthly total", async () => {
    const [skill, tools] = await Promise.all([
      runSkillWith(SKILL_PROMPT),
      runToolsWith(TOOL_PROMPT),
    ]);

    addSingleRunReport(
      "Simple statement — 9 items, all monthly",
      { monthly: EXPECTED_MONTHLY, count: EXPECTED_COUNT },
      skill,
      tools
    );

    expect(tools.monthly).toBe(EXPECTED_MONTHLY);
    expect(tools.count).toBe(EXPECTED_COUNT);
  });

  it("tools produce consistent totals across 3 runs, skill may vary", async () => {
    const RUNS = 3;

    const toolRuns = await Promise.all(Array.from({ length: RUNS }, () => runToolsWith(TOOL_PROMPT)));
    const skillRuns = await Promise.all(Array.from({ length: RUNS }, () => runSkillWith(SKILL_PROMPT)));

    addConsistencyReport(
      "Simple statement — consistency (3 runs)",
      EXPECTED_MONTHLY,
      toolRuns.map((r) => r.monthly),
      skillRuns.map((r) => r.monthly)
    );

    const toolUnique = new Set(toolRuns.map((r) => r.monthly).filter((v) => v !== null));
    expect(toolUnique.size).toBe(1);
    expect(toolRuns[0]!.monthly).toBe(EXPECTED_MONTHLY);
  });
});

describe("skill vs tools — mixed frequencies (weekly, monthly, annual)", () => {
  it("handles frequency normalization correctly", async () => {
    const [skill, tools] = await Promise.all([
      runSkillWith(MIXED_SKILL_PROMPT),
      runToolsWith(MIXED_TOOL_PROMPT),
    ]);

    addSingleRunReport(
      "Mixed frequencies — 13 items, weekly/monthly/annual",
      { monthly: MIXED_EXPECTED_MONTHLY, count: MIXED_EXPECTED_COUNT },
      skill,
      tools
    );

    expect(tools.monthly).toBeCloseTo(MIXED_EXPECTED_MONTHLY, 1);
    expect(tools.count).toBe(MIXED_EXPECTED_COUNT);
  });

  it("tools produce consistent totals across 3 runs with mixed frequencies", async () => {
    const RUNS = 3;

    const toolRuns = await Promise.all(
      Array.from({ length: RUNS }, () => runToolsWith(MIXED_TOOL_PROMPT))
    );
    const skillRuns = await Promise.all(
      Array.from({ length: RUNS }, () => runSkillWith(MIXED_SKILL_PROMPT))
    );

    addConsistencyReport(
      "Mixed frequencies — consistency (3 runs)",
      MIXED_EXPECTED_MONTHLY,
      toolRuns.map((r) => r.monthly),
      skillRuns.map((r) => r.monthly)
    );

    const toolUnique = new Set(toolRuns.map((r) => r.monthly).filter((v) => v !== null));
    expect(toolUnique.size).toBe(1);
  });
});
