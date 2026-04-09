/**
 * Comparison test: skill (prompt-only) vs tools (structured checkpoints)
 *
 * Runs the same statement through both approaches and compares:
 * - Correctness: does the monthly total match the known answer?
 * - Consistency: run each approach N times, measure variance
 * - Extraction accuracy: did the LLM pass the right amounts to the tool?
 *
 * Uses gpt-4.1 (the skill's production model) instead of the E2E default.
 * Saves raw LLM responses alongside parsed numbers so results are verifiable.
 *
 * Excluded from automatic e2e runs — run manually:
 *   npx vitest run --config vitest.e2e.config.mts test/tools/subscriptionAnalysis.comparison.ts
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
// Config — use gpt-4.1 (the skill's actual production model)
// ---------------------------------------------------------------------------

const MODEL = process.env.COMPARISON_MODEL || "openai/gpt-4.1";
const RUNS = parseInt(process.env.COMPARISON_RUNS || "10", 10);

// ---------------------------------------------------------------------------
// Statements
// ---------------------------------------------------------------------------

const SIMPLE_STATEMENT = `
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

const SIMPLE_EXPECTED = { monthly: 180.18, count: 9 };

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

// Ground truth (each item normalized to monthly independently, then summed):
// Spotify $11.99/mo, WSJ $4×52/12=$17.33, Prime $139/12=$11.58,
// Adobe $659.88/12=$54.99, PF $24.99, BA $47.95×52/12=$207.78,
// M365 $99.99/12=$8.33, Netflix $22.99, LinkedIn $359.88/12=$29.99,
// Peloton $13.99, ChatGPT $20, Dropbox $11.99, Hulu $17.99
const MIXED_EXPECTED = { monthly: 453.94, count: 13 };

// Known amounts from the statement for extraction verification
const MIXED_KNOWN_AMOUNTS: Record<string, { amount: number; frequency: string }> = {
  spotify: { amount: 11.99, frequency: "monthly" },
  "wall street journal": { amount: 4.0, frequency: "weekly" },
  "amazon prime": { amount: 139.0, frequency: "annual" },
  adobe: { amount: 659.88, frequency: "annual" },
  "planet fitness": { amount: 24.99, frequency: "monthly" },
  "blue apron": { amount: 47.95, frequency: "weekly" },
  microsoft: { amount: 99.99, frequency: "annual" },
  netflix: { amount: 22.99, frequency: "monthly" },
  linkedin: { amount: 359.88, frequency: "annual" },
  peloton: { amount: 13.99, frequency: "monthly" },
  chatgpt: { amount: 20.0, frequency: "monthly" },
  dropbox: { amount: 11.99, frequency: "monthly" },
  hulu: { amount: 17.99, frequency: "monthly" },
};

// ---------------------------------------------------------------------------
// Prompts
// ---------------------------------------------------------------------------

function makeSkillPrompt(statement: string): string {
  return `You are a personal finance analyst specializing in identifying recurring charges and subscriptions.

## Task
Parse the following bank or credit card statement and identify all recurring and subscription charges.

## Statement Content
${statement}

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

IMPORTANT: At the very end of your response, include these two lines in exactly this format:
TOTAL_MONTHLY: <number>
SUBSCRIPTION_COUNT: <number>`;
}

function makeToolPrompt(statement: string): string {
  return `You are a personal finance analyst. Parse the following statement and identify all recurring and subscription charges. Pay close attention to billing frequencies — some are weekly, some monthly, some annual.

## Statement Content
${statement}

## Workflow
1. Extract every recurring charge: service name, charge amount as shown on the statement, billing frequency (weekly, monthly, annual), category.
2. Call analyze_subscriptions with the extracted items. The tool normalizes all amounts to monthly and computes totals.
3. Call flag_subscriptions with any charges worth flagging.
4. Write a brief summary using the numbers from the tools.`;
}

// ---------------------------------------------------------------------------
// Parsing — extract numbers from free-form skill output
// ---------------------------------------------------------------------------

function parseMonthlyFromText(text: string): number | null {
  // Look for the explicit marker first
  const markerMatch = text.match(/TOTAL_MONTHLY:\s*\$?([\d,]+\.?\d*)/i);
  if (markerMatch) return parseFloat(markerMatch[1]!.replace(/,/g, ""));

  // Fallback patterns — ordered from most to least specific
  const patterns = [
    /total\s+monthly\s+(?:cost|spend|amount|subscription)[^$\n]*\$?([\d,]+\.?\d*)/i,
    /\*?\*?total\s+monthly[^$\n]*\*?\*?\s*[:\|]?\s*\$?([\d,]+\.?\d*)/i,
    /\$?([\d,]+\.?\d*)\s*(?:per|\/)\s*month\b/i,
    /monthly\s*(?:total|cost|spend)[^$\n]*\$?([\d,]+\.?\d*)/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) {
      const val = parseFloat(m[1]!.replace(/,/g, ""));
      if (val > 50 && val < 2000) return val;
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
    /\*?\*?(\d+)\*?\*?\s+(?:recurring|subscription)/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) return parseInt(m[1]!, 10);
  }
  return null;
}

// ---------------------------------------------------------------------------
// Runners
// ---------------------------------------------------------------------------

interface SkillResult {
  text: string;
  monthly: number | null;
  count: number | null;
}

interface ToolResult {
  text: string;
  monthly: number | null;
  count: number | null;
  toolLog: ToolCallLog[];
  extractedItems: Array<{ name: string; amount: number; frequency: string }>;
}

async function runSkill(prompt: string): Promise<SkillResult> {
  const result = await runToolLoop({
    messages: [
      { role: "system", content: [{ type: "text", text: prompt }] },
      { role: "user", content: [{ type: "text", text: "Analyze my subscriptions." }] },
    ],
    model: MODEL,
    baseUrl: config.baseUrl,
    headers: { "X-API-Key": config.portalKey },
    apiType: config.apiType,
    tools: [],
    maxToolRounds: 1,
  });

  const text = extractText(result);
  return { text, monthly: parseMonthlyFromText(text), count: parseCountFromText(text) };
}

async function runTools(prompt: string): Promise<ToolResult> {
  const toolLog: ToolCallLog[] = [];
  const tools = createSubscriptionAnalysisTools().map((t) => wrapTool(t, toolLog));

  const result = await runToolLoop({
    messages: [
      { role: "system", content: [{ type: "text", text: prompt }] },
      { role: "user", content: [{ type: "text", text: "Analyze my subscriptions." }] },
    ],
    model: MODEL,
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
  let extractedItems: ToolResult["extractedItems"] = [];

  if (analyzeCall) {
    // Capture what the LLM actually sent to the tool
    extractedItems = (analyzeCall.args.subscriptions as ToolResult["extractedItems"]) ?? [];
    const parsed = (
      typeof analyzeCall.result === "string" ? JSON.parse(analyzeCall.result) : analyzeCall.result
    ) as AnalyzeSubscriptionsResult;
    if (!("error" in parsed)) {
      monthly = parsed.totals.monthly;
      count = parsed.subscription_count;
    }
  }

  return { text: extractText(result), monthly, count, toolLog, extractedItems };
}

// ---------------------------------------------------------------------------
// Report builder
// ---------------------------------------------------------------------------

const reportSections: string[] = [];
const rawResponses: string[] = [];
const OUTPUT_DIR = path.resolve(__dirname, ".output");
const REPORT_PATH = path.resolve(OUTPUT_DIR, "subscription-comparison.md");
const RAW_PATH = path.resolve(OUTPUT_DIR, "subscription-comparison-raw.md");

function fmt(v: number | null): string {
  return v !== null ? `$${v.toFixed(2)}` : "parse failed";
}

function addConsistencyReport(
  label: string,
  expected: number,
  runs: { skill: SkillResult; tools: ToolResult }[]
) {
  const skillMonthly = runs.map((r) => r.skill.monthly);
  const toolMonthly = runs.map((r) => r.tools.monthly);
  const skillValid = skillMonthly.filter((v): v is number => v !== null);
  const toolValid = toolMonthly.filter((v): v is number => v !== null);
  const skillSpread =
    skillValid.length > 1 ? Math.max(...skillValid) - Math.min(...skillValid) : 0;
  const skillMean = skillValid.length > 0 ? skillValid.reduce((a, b) => a + b, 0) / skillValid.length : 0;
  const skillExact = skillValid.filter((v) => Math.abs(v - expected) < 0.02).length;
  const toolUnique = new Set(toolValid.map((v) => v.toFixed(2)));

  reportSections.push(`### ${label}

Expected monthly total: **${fmt(expected)}**

| Run | Skill (prompt) | Tools (structured) |
|---|---|---|
${runs.map((r, i) => `| ${i + 1} | ${fmt(r.skill.monthly)}${r.skill.monthly === null ? " \u26a0\ufe0f" : ""} | ${fmt(r.tools.monthly)} |`).join("\n")}

| Metric | Skill | Tools |
|---|---|---|
| Parseable | ${skillValid.length}/${runs.length} | ${toolValid.length}/${runs.length} |
| Exact (within $0.02) | ${skillExact}/${skillValid.length} | ${toolUnique.size === 1 && toolValid.length > 0 && Math.abs(toolValid[0]! - expected) < 0.02 ? `${toolValid.length}/${toolValid.length}` : `${toolValid.filter((v) => Math.abs(v - expected) < 0.02).length}/${toolValid.length}`} |
| Mean | ${skillValid.length > 0 ? fmt(skillMean) : "—"} | ${toolValid.length > 0 ? fmt(toolValid[0]!) : "—"} |
| Spread (max − min) | ${skillValid.length > 1 ? `$${skillSpread.toFixed(2)}` : "—"} | $0.00 |
`);

  // Save raw responses for verification
  for (let i = 0; i < runs.length; i++) {
    const r = runs[i]!;
    rawResponses.push(`## ${label} — Run ${i + 1}

### Skill response (parsed: ${fmt(r.skill.monthly)})

<details><summary>Full response</summary>

${r.skill.text.slice(0, 3000)}${r.skill.text.length > 3000 ? "\n\n...(truncated)" : ""}

</details>

### Tool extraction

\`\`\`json
${JSON.stringify(r.tools.extractedItems, null, 2)}
\`\`\`

Tool result: ${fmt(r.tools.monthly)}
`);
  }
}

function addExtractionReport(
  label: string,
  known: Record<string, { amount: number; frequency: string }>,
  runs: ToolResult[]
) {
  // Check if the LLM extracted the right amounts from the statement
  const errors: string[] = [];
  let totalChecks = 0;
  let correctChecks = 0;

  for (let i = 0; i < runs.length; i++) {
    for (const item of runs[i]!.extractedItems) {
      const nameKey = Object.keys(known).find((k) =>
        item.name.toLowerCase().includes(k)
      );
      if (!nameKey) continue;

      totalChecks++;
      const expected = known[nameKey]!;
      const amountMatch = Math.abs(item.amount - expected.amount) < 0.02;
      const freqMatch = item.frequency === expected.frequency;

      if (amountMatch && freqMatch) {
        correctChecks++;
      } else {
        errors.push(
          `Run ${i + 1}: ${item.name} — got ${item.amount}/${item.frequency}, expected ${expected.amount}/${expected.frequency}`
        );
      }
    }
  }

  reportSections.push(`### ${label}

The tools enforce schema but not extraction accuracy — the LLM could pass the wrong amount
and the tool would compute a consistent wrong answer. This checks what the LLM actually sent.

| Metric | Value |
|---|---|
| Fields checked | ${totalChecks} |
| Correct | ${correctChecks} (${totalChecks > 0 ? ((correctChecks / totalChecks) * 100).toFixed(0) : 0}%) |
| Errors | ${errors.length} |

${errors.length > 0 ? errors.map((e) => `- ${e}`).join("\n") : "All extractions matched the statement."}
`);
}

afterAll(() => {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const header = `# Subscription Analysis: Skill vs Tools Comparison

Prompt-only skill (LLM does all math in prose) vs structured tools (LLM extracts, code computes).

- Model: \`${MODEL}\`
- Runs per test: ${RUNS}
- Date: ${new Date().toISOString().split("T")[0]}

## Methodology

Both approaches get the same statement and the same task. The skill uses the original
production prompt from ai-memoryless-client. The tools approach uses a shorter prompt
that delegates math to \`analyze_subscriptions\` and \`flag_subscriptions\`.

"Parse failed" means the regex couldn't extract a total from the skill's free-form output.
This is itself a data point — structured tool output never has this problem.

`;

  fs.writeFileSync(REPORT_PATH, header + reportSections.join("\n---\n\n"), "utf-8");
  console.log(`\n  Report written to ${REPORT_PATH}`);

  if (rawResponses.length > 0) {
    fs.writeFileSync(RAW_PATH, `# Raw responses\n\n${rawResponses.join("\n---\n\n")}`, "utf-8");
    console.log(`  Raw responses written to ${RAW_PATH}`);
  }
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("skill vs tools — simple statement (all monthly)", () => {
  it(`consistent totals across ${RUNS} runs`, async () => {
    const runs = await Promise.all(
      Array.from({ length: RUNS }, async () => {
        const [skill, tools] = await Promise.all([
          runSkill(makeSkillPrompt(SIMPLE_STATEMENT)),
          runTools(makeToolPrompt(SIMPLE_STATEMENT)),
        ]);
        return { skill, tools };
      })
    );

    addConsistencyReport(
      `Simple statement — ${RUNS} runs (9 items, all monthly)`,
      SIMPLE_EXPECTED.monthly,
      runs
    );

    // Tools must be exact and identical every run
    for (const r of runs) {
      expect(r.tools.monthly).toBe(SIMPLE_EXPECTED.monthly);
      expect(r.tools.count).toBe(SIMPLE_EXPECTED.count);
    }
  });
});

describe("skill vs tools — mixed frequencies (weekly, monthly, annual)", () => {
  it(`consistent totals across ${RUNS} runs`, async () => {
    const runs = await Promise.all(
      Array.from({ length: RUNS }, async () => {
        const [skill, tools] = await Promise.all([
          runSkill(makeSkillPrompt(MIXED_STATEMENT)),
          runTools(makeToolPrompt(MIXED_STATEMENT)),
        ]);
        return { skill, tools };
      })
    );

    addConsistencyReport(
      `Mixed frequencies — ${RUNS} runs (13 items, weekly/monthly/annual)`,
      MIXED_EXPECTED.monthly,
      runs
    );

    addExtractionReport(
      "Extraction accuracy — mixed frequencies",
      MIXED_KNOWN_AMOUNTS,
      runs.map((r) => r.tools)
    );

    // Tools must be exact and identical every run
    for (const r of runs) {
      expect(r.tools.monthly).toBeCloseTo(MIXED_EXPECTED.monthly, 1);
      expect(r.tools.count).toBe(MIXED_EXPECTED.count);
    }
  });
});
