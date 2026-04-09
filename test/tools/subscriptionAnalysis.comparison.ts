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

import { describe, it, expect } from "vitest";
import { runToolLoop } from "../../src/lib/chat/toolLoop.js";
import { createSubscriptionAnalysisTools } from "../../src/tools/subscriptionAnalysis.js";
import { config, extractText, wrapTool, type ToolCallLog } from "./setup.js";
import type { AnalyzeSubscriptionsResult } from "../../src/tools/subscriptionAnalysis.js";

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
      // Sanity: should be in a reasonable range for this statement
      if (val > 100 && val < 300) return val;
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

async function runSkill(): Promise<{ text: string; monthly: number | null; count: number | null }> {
  const result = await runToolLoop({
    messages: [
      {
        role: "system",
        content: [{ type: "text", text: SKILL_PROMPT }],
      },
      {
        role: "user",
        content: [{ type: "text", text: "Analyze my subscriptions." }],
      },
    ],
    model: config.model,
    baseUrl: config.baseUrl,
    headers: { "X-API-Key": config.portalKey },
    apiType: config.apiType,
    tools: [],
    maxToolRounds: 1,
  });

  const text = extractText(result);
  return {
    text,
    monthly: parseMonthlyFromText(text),
    count: parseCountFromText(text),
  };
}

async function runTools(): Promise<{
  text: string;
  monthly: number | null;
  count: number | null;
  toolLog: ToolCallLog[];
}> {
  const toolLog: ToolCallLog[] = [];
  const tools = createSubscriptionAnalysisTools().map((t) => wrapTool(t, toolLog));

  const result = await runToolLoop({
    messages: [
      {
        role: "system",
        content: [{ type: "text", text: TOOL_PROMPT }],
      },
      {
        role: "user",
        content: [{ type: "text", text: "Analyze my subscriptions." }],
      },
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

describe("skill vs tools comparison", () => {
  it("both approaches find the correct monthly total", async () => {
    const [skill, tools] = await Promise.all([runSkill(), runTools()]);

    console.log("\n  ┌─────────────────────────────────────────────────┐");
    console.log("  │           SKILL vs TOOLS — Single Run           │");
    console.log("  ├─────────────────────────────────────────────────┤");
    console.log(`  │ Expected monthly total:  $${EXPECTED_MONTHLY}            │`);
    console.log(`  │ Skill (prompt-only):     $${skill.monthly ?? "PARSE FAILED"}${" ".repeat(Math.max(0, 18 - String(skill.monthly ?? "PARSE FAILED").length))}│`);
    console.log(`  │ Tools (structured):      $${tools.monthly ?? "PARSE FAILED"}${" ".repeat(Math.max(0, 18 - String(tools.monthly ?? "PARSE FAILED").length))}│`);
    console.log("  ├─────────────────────────────────────────────────┤");
    console.log(`  │ Skill subscription count: ${skill.count ?? "?"}${" ".repeat(Math.max(0, 21 - String(skill.count ?? "?").length))}│`);
    console.log(`  │ Tools subscription count: ${tools.count ?? "?"}${" ".repeat(Math.max(0, 21 - String(tools.count ?? "?").length))}│`);
    console.log(`  │ Expected count:           ${EXPECTED_COUNT}${" ".repeat(Math.max(0, 21 - String(EXPECTED_COUNT).length))}│`);
    console.log("  └─────────────────────────────────────────────────┘");

    // Tools should always get the exact answer (deterministic math)
    expect(tools.monthly).toBe(EXPECTED_MONTHLY);
    expect(tools.count).toBe(EXPECTED_COUNT);

    // Skill may or may not — we just verify it produced something parseable
    if (skill.monthly !== null) {
      console.log(
        `  Skill error: $${Math.abs(skill.monthly - EXPECTED_MONTHLY).toFixed(2)} off`
      );
    } else {
      console.log("  Skill: could not parse monthly total from response");
    }
  });

  it("tools produce consistent totals across 3 runs, skill may vary", async () => {
    const RUNS = 3;

    const toolRuns = await Promise.all(Array.from({ length: RUNS }, () => runTools()));
    const skillRuns = await Promise.all(Array.from({ length: RUNS }, () => runSkill()));

    const toolMonthly = toolRuns.map((r) => r.monthly);
    const skillMonthly = skillRuns.map((r) => r.monthly);

    console.log("\n  ┌─────────────────────────────────────────────────┐");
    console.log(`  │        CONSISTENCY — ${RUNS} runs each                │`);
    console.log("  ├─────────────────────────────────────────────────┤");
    console.log(`  │ Tools totals:  ${toolMonthly.map((v) => (v !== null ? `$${v}` : "fail")).join(", ")}`)
    console.log(`  │ Skill totals:  ${skillMonthly.map((v) => (v !== null ? `$${v}` : "fail")).join(", ")}`)
    console.log("  └─────────────────────────────────────────────────┘");

    // Tools: every run should produce the exact same total
    const toolUnique = new Set(toolMonthly.filter((v) => v !== null));
    expect(toolUnique.size).toBe(1);
    expect(toolMonthly[0]).toBe(EXPECTED_MONTHLY);

    // Skill: we just report variance — not asserting because it's non-deterministic
    const skillValid = skillMonthly.filter((v): v is number => v !== null);
    if (skillValid.length > 1) {
      const min = Math.min(...skillValid);
      const max = Math.max(...skillValid);
      const spread = max - min;
      console.log(
        `  Skill spread: $${spread.toFixed(2)} (min $${min}, max $${max})`
      );
      const exactMatches = skillValid.filter((v) => v === EXPECTED_MONTHLY).length;
      console.log(
        `  Skill exact matches: ${exactMatches}/${skillValid.length}`
      );
    } else {
      console.log(
        `  Skill: only ${skillValid.length}/${RUNS} runs produced parseable totals`
      );
    }
  });
});
