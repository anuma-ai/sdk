#!/usr/bin/env node
import "dotenv/config";
import { parseArgs } from "node:util";
import { readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { TestCase, EvalResult, EvalSummary } from "./types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Portal API for cheap extraction model (Llama 8B)
const portalBaseUrl = process.env.ANUMA_API_URL || "https://portal.anuma-dev.ai";
const portalApiKey = process.env.PORTAL_API_KEY;

// Anthropic API direct for judge model (Opus)
const anthropicApiKey = process.env.ANTHROPIC_API_KEY;

const DEFAULT_EXTRACTION_MODEL = "cerebras/llama3.1-8b";
const JUDGE_MODEL = "claude-opus-4-6";

// Cost tracking
let totalPortalCostMicroUsd = 0;
let totalPortalCalls = 0;

const EXTRACTION_PROMPT = `Extract personal facts, preferences, and important information about the user from these messages.
Rules:
- Output one fact per line, prefixed with "- "
- Only extract PERSONAL information about the user (preferences, habits, background, projects, constraints)
- Always start each fact with "The user"
- If no personal facts found, output: NONE`;

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const { values: args } = parseArgs({
  options: {
    skill: { type: "string", default: join(__dirname, "skills", "extraction-v1.md") },
    model: { type: "string" },
    max: { type: "string" },
    verbose: { type: "boolean", default: false },
  },
  strict: true,
});

const maxCases = args.max ? parseInt(args.max, 10) : Infinity;
const verbose = args.verbose ?? false;
const EXTRACTION_MODEL = args.model || DEFAULT_EXTRACTION_MODEL;

// ---------------------------------------------------------------------------
// Portal LLM helper (for extraction via Llama 8B)
// ---------------------------------------------------------------------------

async function callPortal(
  model: string,
  messages: { role: string; content: string }[],
  temperature = 0
): Promise<string> {
  if (!portalApiKey) throw new Error("PORTAL_API_KEY is required");

  const res = await fetch(`${portalBaseUrl}/api/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": portalApiKey,
    },
    body: JSON.stringify({ model, messages, temperature, max_tokens: 2000 }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Portal call failed (${res.status}): ${text}`);
  }

  const data = (await res.json()) as {
    choices: { message: { content: string } }[];
    usage?: { cost_micro_usd?: number; prompt_tokens?: number; completion_tokens?: number };
  };

  if (data.usage?.cost_micro_usd) {
    totalPortalCostMicroUsd += data.usage.cost_micro_usd;
  }
  totalPortalCalls++;

  return data.choices[0].message.content;
}

// ---------------------------------------------------------------------------
// Anthropic API helper (for judge via Opus)
// ---------------------------------------------------------------------------

async function callAnthropic(
  messages: { role: string; content: string }[],
  maxTokens = 2000,
  retries = 3
): Promise<string> {
  if (!anthropicApiKey) throw new Error("ANTHROPIC_API_KEY is required");

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 60_000);

      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": anthropicApiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: JUDGE_MODEL,
          messages,
          max_tokens: maxTokens,
          temperature: 0,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Anthropic API ${res.status}: ${body}`);
      }

      const data = (await res.json()) as {
        content: { type: string; text: string }[];
      };
      return data.content[0].text;
    } catch (err) {
      if (attempt === retries) throw err;
      const delay = attempt * 3000;
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw new Error("Unreachable");
}

// ---------------------------------------------------------------------------
// Extraction
// ---------------------------------------------------------------------------

function buildExtractionMessages(
  conversation: { role: string; content: string }[],
  skillDocument?: string
): { role: string; content: string }[] {
  const conversationText = conversation.map((m) => `${m.role}: ${m.content}`).join("\n");

  let systemPrompt = EXTRACTION_PROMPT;
  if (skillDocument) {
    systemPrompt = `<extraction-skill>\n${skillDocument}\n</extraction-skill>\n\n${systemPrompt}`;
  }

  return [
    { role: "system", content: systemPrompt },
    { role: "user", content: conversationText },
  ];
}

function parseFacts(raw: string): string[] {
  if (raw.trim() === "NONE") return [];
  return raw
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.startsWith("- "))
    .map((l) => l.slice(2).trim())
    .filter(Boolean);
}

async function extractFacts(
  conversation: { role: string; content: string }[],
  skillDocument?: string
): Promise<string[]> {
  const messages = buildExtractionMessages(conversation, skillDocument);
  const raw = await callPortal(EXTRACTION_MODEL, messages);
  return parseFacts(raw);
}

// ---------------------------------------------------------------------------
// LLM Judge (via Anthropic direct)
// ---------------------------------------------------------------------------

type JudgeResult = {
  matchedGroundTruth: string[];
  unmatchedGroundTruth: string[];
  hallucinated: string[];
};

async function judgeFacts(
  extractedFacts: string[],
  groundTruthFacts: string[]
): Promise<JudgeResult> {
  if (extractedFacts.length === 0) {
    return {
      matchedGroundTruth: [],
      unmatchedGroundTruth: [...groundTruthFacts],
      hallucinated: [],
    };
  }
  if (groundTruthFacts.length === 0) {
    return {
      matchedGroundTruth: [],
      unmatchedGroundTruth: [],
      hallucinated: [...extractedFacts],
    };
  }

  const prompt = `You are an evaluation judge. Compare extracted facts against ground truth facts using SEMANTIC matching (not exact string match).

Ground truth facts:
${groundTruthFacts.map((f, i) => `${i + 1}. ${f}`).join("\n")}

Extracted facts:
${extractedFacts.map((f, i) => `${i + 1}. ${f}`).join("\n")}

For each ground truth fact, determine if it is semantically covered by any extracted fact.
For each extracted fact, determine if it corresponds to a real ground truth fact or is hallucinated.

Return ONLY valid JSON (no markdown fences) with this structure:
{
  "matchedGroundTruth": ["<ground truth facts that are covered>"],
  "unmatchedGroundTruth": ["<ground truth facts that are NOT covered>"],
  "hallucinated": ["<extracted facts with no corresponding ground truth>"]
}`;

  const raw = await callAnthropic([{ role: "user", content: prompt }]);

  // Strip markdown fences if present
  const cleaned = raw
    .replace(/```json\n?/g, "")
    .replace(/```\n?/g, "")
    .trim();

  try {
    return JSON.parse(cleaned) as JudgeResult;
  } catch {
    // Fallback: treat all as unmatched
    return {
      matchedGroundTruth: [],
      unmatchedGroundTruth: [...groundTruthFacts],
      hallucinated: [...extractedFacts],
    };
  }
}

// ---------------------------------------------------------------------------
// Metrics
// ---------------------------------------------------------------------------

function computeMetrics(
  judge: JudgeResult,
  extractedFacts: string[],
  groundTruthFacts: string[]
): { precision: number; recall: number; f1: number } {
  const truePositives = judge.matchedGroundTruth.length;
  const precision =
    extractedFacts.length > 0
      ? (extractedFacts.length - judge.hallucinated.length) / extractedFacts.length
      : 0;
  const recall = groundTruthFacts.length > 0 ? truePositives / groundTruthFacts.length : 0;
  const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

  return {
    precision: Math.max(0, Math.min(1, precision)),
    recall: Math.max(0, Math.min(1, recall)),
    f1: Math.max(0, Math.min(1, f1)),
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  if (!portalApiKey) {
    console.error("PORTAL_API_KEY required (for extraction model)");
    process.exit(1);
  }
  if (!anthropicApiKey) {
    console.error("ANTHROPIC_API_KEY required (for judge model)");
    process.exit(1);
  }

  const casesPath = join(__dirname, "test-cases", "extraction-cases.json");
  const casesRaw = await readFile(casesPath, "utf-8");
  const allCases: TestCase[] = JSON.parse(casesRaw);
  const cases = allCases.slice(0, maxCases);

  let skillDocument: string | undefined;
  try {
    skillDocument = await readFile(args.skill!, "utf-8");
    console.log(`Loaded skill from: ${args.skill}`);
  } catch {
    console.log(
      "No skill document found, running without-skill only comparison will use baseline."
    );
    skillDocument = undefined;
  }

  console.log(`\nEvaluating ${cases.length} test cases`);
  console.log(`Extraction model: ${EXTRACTION_MODEL} (via portal)`);
  console.log(`Judge model: ${JUDGE_MODEL} (via Anthropic API)\n`);
  console.log("─".repeat(80));

  const results: EvalResult[] = [];

  for (const tc of cases) {
    console.log(`\n[${tc.id}] difficulty=${tc.difficulty} scenarios=${tc.scenarios.join(",")}`);

    try {
      // Extract WITHOUT skill
      const factsWithout = await extractFacts(tc.conversation);
      const judgeWithout = await judgeFacts(factsWithout, tc.groundTruthFacts);
      const metricsWithout = computeMetrics(judgeWithout, factsWithout, tc.groundTruthFacts);

      // Extract WITH skill
      const factsWith = await extractFacts(tc.conversation, skillDocument);
      const judgeWith = await judgeFacts(factsWith, tc.groundTruthFacts);
      const metricsWith = computeMetrics(judgeWith, factsWith, tc.groundTruthFacts);

      const result: EvalResult = {
        testCaseId: tc.id,
        difficulty: tc.difficulty,
        withSkill: { ...metricsWith, extractedFacts: factsWith },
        withoutSkill: { ...metricsWithout, extractedFacts: factsWithout },
      };
      results.push(result);

      console.log(
        `  WITHOUT skill: P=${metricsWithout.precision.toFixed(2)} R=${metricsWithout.recall.toFixed(2)} F1=${metricsWithout.f1.toFixed(2)} (${factsWithout.length} facts)`
      );
      console.log(
        `  WITH    skill: P=${metricsWith.precision.toFixed(2)} R=${metricsWith.recall.toFixed(2)} F1=${metricsWith.f1.toFixed(2)} (${factsWith.length} facts)`
      );

      if (verbose) {
        console.log(`  Ground truth: ${tc.groundTruthFacts.join("; ")}`);
        console.log(`  Extracted (no skill): ${factsWithout.join("; ")}`);
        console.log(`  Extracted (skill):    ${factsWith.join("; ")}`);
        console.log(
          `  Judge (no skill) - matched: ${judgeWithout.matchedGroundTruth.length}, hallucinated: ${judgeWithout.hallucinated.length}`
        );
        console.log(
          `  Judge (skill)    - matched: ${judgeWith.matchedGroundTruth.length}, hallucinated: ${judgeWith.hallucinated.length}`
        );
      }
    } catch (err) {
      console.error(`  ✗ Error: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // -------------------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------------------

  const avg = (nums: number[]) =>
    nums.length > 0 ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;

  const summary: EvalSummary = {
    totalCases: results.length,
    withSkill: {
      avgPrecision: avg(results.map((r) => r.withSkill.precision)),
      avgRecall: avg(results.map((r) => r.withSkill.recall)),
      avgF1: avg(results.map((r) => r.withSkill.f1)),
    },
    withoutSkill: {
      avgPrecision: avg(results.map((r) => r.withoutSkill.precision)),
      avgRecall: avg(results.map((r) => r.withoutSkill.recall)),
      avgF1: avg(results.map((r) => r.withoutSkill.f1)),
    },
    byDifficulty: {},
  };

  const difficulties = [...new Set(results.map((r) => r.difficulty))];
  for (const diff of difficulties) {
    const subset = results.filter((r) => r.difficulty === diff);
    summary.byDifficulty[diff] = {
      withSkill: { avgF1: avg(subset.map((r) => r.withSkill.f1)) },
      withoutSkill: { avgF1: avg(subset.map((r) => r.withoutSkill.f1)) },
    };
  }

  console.log("\n" + "═".repeat(80));
  console.log("SUMMARY");
  console.log("═".repeat(80));
  console.log(`Total cases: ${summary.totalCases}\n`);

  console.log("Overall:");
  console.log(
    `  WITHOUT skill: P=${summary.withoutSkill.avgPrecision.toFixed(3)} R=${summary.withoutSkill.avgRecall.toFixed(3)} F1=${summary.withoutSkill.avgF1.toFixed(3)}`
  );
  console.log(
    `  WITH    skill: P=${summary.withSkill.avgPrecision.toFixed(3)} R=${summary.withSkill.avgRecall.toFixed(3)} F1=${summary.withSkill.avgF1.toFixed(3)}`
  );

  const f1Delta = summary.withSkill.avgF1 - summary.withoutSkill.avgF1;
  console.log(`  Delta F1:      ${f1Delta >= 0 ? "+" : ""}${f1Delta.toFixed(3)}`);

  console.log("\nBy difficulty:");
  for (const diff of difficulties) {
    const d = summary.byDifficulty[diff];
    const delta = d.withSkill.avgF1 - d.withoutSkill.avgF1;
    console.log(
      `  ${diff.padEnd(8)} WITHOUT=${d.withoutSkill.avgF1.toFixed(3)} WITH=${d.withSkill.avgF1.toFixed(3)} delta=${delta >= 0 ? "+" : ""}${delta.toFixed(3)}`
    );
  }

  console.log("\nExtraction cost (portal):");
  console.log(`  Model: ${EXTRACTION_MODEL}`);
  console.log(`  Total calls: ${totalPortalCalls}`);
  console.log(`  Total cost: $${(totalPortalCostMicroUsd / 1_000_000).toFixed(4)} (${totalPortalCostMicroUsd} micro-USD)`);
  console.log(`  Avg cost/call: $${(totalPortalCostMicroUsd / totalPortalCalls / 1_000_000).toFixed(6)}`);

  console.log("\n" + "═".repeat(80));
}

main().catch((err) => {
  console.error("Eval failed:", err);
  process.exit(1);
});
