#!/usr/bin/env node
import "dotenv/config";
import { writeFile, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { TestCase, StructuredFact } from "./types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = "claude-opus-4-6";

// ---------------------------------------------------------------------------
// Anthropic Messages API caller with retry
// ---------------------------------------------------------------------------

async function callAnthropic(prompt: string, maxTokens = 4096): Promise<string> {
  const maxRetries = 5;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 300_000);

      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": ANTHROPIC_API_KEY!,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: maxTokens,
          messages: [{ role: "user", content: prompt }],
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!res.ok) {
        const body = await res.text();
        throw new Error(`API ${res.status}: ${body}`);
      }

      const json = (await res.json()) as {
        content: { type: string; text: string }[];
      };
      return json.content[0].text;
    } catch (err) {
      console.error(`Attempt ${attempt}/${maxRetries} failed:`, (err as Error).message);
      if (attempt === maxRetries) throw err;
      const backoff = attempt * 5000;
      console.log(`Retrying in ${backoff / 1000}s...`);
      await new Promise((r) => setTimeout(r, backoff));
    }
  }

  throw new Error("Unreachable");
}

// ---------------------------------------------------------------------------
// Scenarios
// ---------------------------------------------------------------------------

const SCENARIOS: {
  difficulty: TestCase["difficulty"];
  scenario: string;
  description: string;
  count: number;
}[] = [
  // easy
  {
    difficulty: "easy",
    scenario: "explicit-identity",
    description: "User explicitly states personal identity facts: name, age, location, nationality",
    count: 4,
  },
  {
    difficulty: "easy",
    scenario: "explicit-preference",
    description:
      "User explicitly states preferences: favourite food, music genre, programming language, tools, hobbies",
    count: 4,
  },
  {
    difficulty: "easy",
    scenario: "explicit-job",
    description: "User explicitly mentions their job title, company, team, or professional role",
    count: 4,
  },

  // medium
  {
    difficulty: "medium",
    scenario: "implicit-skill",
    description:
      "User demonstrates a skill without directly stating it — e.g. writes fluent Python, discusses advanced music theory, debugs a Kubernetes issue",
    count: 4,
  },
  {
    difficulty: "medium",
    scenario: "multi-turn-context",
    description:
      "A fact only becomes clear when combining information across 3+ turns. No single message contains the full fact.",
    count: 4,
  },
  {
    difficulty: "medium",
    scenario: "fact-update",
    description:
      "User initially states one fact, then corrects or updates it later in the conversation. Only the FINAL corrected version should be in ground truth.",
    count: 4,
  },

  // hard
  {
    difficulty: "hard",
    scenario: "hypothetical-not-fact",
    description:
      "User discusses hypotheticals, wishes, or speculations (e.g. 'If I were a chef...', 'I've been thinking about maybe learning Rust'). These should NOT appear in ground truth.",
    count: 4,
  },
  {
    difficulty: "hard",
    scenario: "negation",
    description:
      "User negates something: 'I don't like spicy food', 'I'm not a morning person', 'I stopped using vim'. The negation IS a fact and should appear in ground truth.",
    count: 4,
  },
  {
    difficulty: "hard",
    scenario: "sarcasm",
    description:
      "User uses sarcasm or irony that could be misinterpreted as a literal fact. E.g. 'Oh yeah, I absolutely LOVE waking up at 4am' (meaning the opposite). Sarcastic statements should NOT appear in ground truth as literal facts.",
    count: 4,
  },
  {
    difficulty: "hard",
    scenario: "mixed",
    description:
      "A single conversation contains a MIX of real facts, hypotheticals, negations, and sarcasm. Only genuine facts (including negations) should appear in ground truth.",
    count: 4,
  },
];

// ---------------------------------------------------------------------------
// Generation prompt
// ---------------------------------------------------------------------------

function buildPrompt(scenario: (typeof SCENARIOS)[number]): string {
  return `You are generating synthetic test data for evaluating a memory-extraction system.
Your task: produce exactly ${scenario.count} realistic multi-turn conversations between a user and an AI assistant.

SCENARIO
--------
Difficulty: ${scenario.difficulty}
Category: ${scenario.scenario}
Description: ${scenario.description}

INSTRUCTIONS
------------
1. Each conversation should have 4-8 message turns (alternating user/assistant).
2. Make the conversations feel natural — include greetings, tangents, follow-up questions.
3. Vary the user persona across conversations: different names, ages, professions, interests.
4. For each conversation, annotate the GROUND TRUTH facts — the facts about the USER that a perfect memory system should extract.

CRITICAL RULES FOR GROUND TRUTH:
- Only include facts that are genuinely true about the user based on the conversation.
- Hypotheticals ("If I were...", "I might consider...", "I've been thinking about maybe...") are NOT facts. Do NOT include them.
- Sarcasm or irony (e.g. "Oh sure, I just love getting stuck in traffic") should NOT be taken literally. Do NOT include the literal (wrong) interpretation.
- Negations ARE facts. "I don't drink coffee" is a real fact about the user.
- Corrections/updates: if the user says "Actually, I moved to Berlin last year" after previously mentioning London, only the LATEST fact (Berlin) should be in ground truth.
- Only extract facts about the USER, not about the assistant or general world knowledge.
- Each fact should be a single atomic piece of information.

OUTPUT FORMAT
-------------
Return a JSON array (no markdown fences, no extra text) where each element has this exact shape:

{
  "conversation": [
    { "role": "user", "content": "..." },
    { "role": "assistant", "content": "..." },
    ...
  ],
  "groundTruthFacts": [
    "- The user's name is Alex",
    "- The user works as a backend engineer",
    "- The user prefers TypeScript over JavaScript"
  ],
  "groundTruthStructured": [
    { "type": "identity", "namespace": "personal", "key": "name", "value": "Alex" },
    { "type": "skill", "namespace": "programming", "key": "backend-engineering", "value": "Works as a backend engineer" },
    { "type": "preference", "namespace": "programming", "key": "language-preference", "value": "Prefers TypeScript over JavaScript" }
  ],
  "difficulty": "${scenario.difficulty}",
  "scenarios": ["${scenario.scenario}"]
}

STRUCTURED FACT TYPES (use exactly these):
- "identity": personal info (name, age, location, nationality, etc.)
- "preference": likes, dislikes, favourites, preferred tools/methods
- "project": current or past projects, companies, teams
- "skill": demonstrated or stated abilities, expertise, experience
- "constraint": limitations, restrictions, things the user cannot or does not do

NAMESPACE: a short category string like "personal", "programming", "work", "food", "music", etc.
KEY: a kebab-case identifier for the specific fact.
VALUE: a concise human-readable description of the fact.

For "groundTruthFacts" (flat strings), always start each string with "- The user".

Return ONLY the JSON array. No preamble, no explanation.`;
}

// ---------------------------------------------------------------------------
// Parse helper
// ---------------------------------------------------------------------------

function parseGeneratedCases(raw: string, scenario: (typeof SCENARIOS)[number]): TestCase[] {
  // Strip markdown fences if present
  let cleaned = raw.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    // Try to find JSON array in the response
    const match = cleaned.match(/\[[\s\S]*\]/);
    if (!match) {
      console.error(
        `Failed to parse JSON for ${scenario.scenario}. Raw response (first 500 chars):`,
        cleaned.slice(0, 500)
      );
      return [];
    }
    parsed = JSON.parse(match[0]);
  }

  if (!Array.isArray(parsed)) {
    console.error(`Expected array for ${scenario.scenario}, got`, typeof parsed);
    return [];
  }

  return (parsed as Record<string, unknown>[]).map(
    (entry, i): TestCase => ({
      id: `${scenario.difficulty}-${scenario.scenario}-${String(i).padStart(3, "0")}`,
      conversation: (entry.conversation as TestCase["conversation"]) || [],
      groundTruthFacts: (entry.groundTruthFacts as string[]) || [],
      groundTruthStructured: (entry.groundTruthStructured as StructuredFact[]) || [],
      difficulty: scenario.difficulty,
      scenarios: [scenario.scenario],
    })
  );
}

// ---------------------------------------------------------------------------
// Main generation loop — sequential to respect rate limits
// ---------------------------------------------------------------------------

async function generateTestCases(): Promise<TestCase[]> {
  const allCases: TestCase[] = [];

  for (let i = 0; i < SCENARIOS.length; i++) {
    const scenario = SCENARIOS[i];
    console.log(
      `\n[${i + 1}/${SCENARIOS.length}] Generating ${scenario.difficulty}/${scenario.scenario} (${scenario.count} cases)...`
    );

    const prompt = buildPrompt(scenario);
    const raw = await callAnthropic(prompt, 8192);
    const cases = parseGeneratedCases(raw, scenario);

    console.log(`  ✓ ${cases.length} cases parsed`);
    allCases.push(...cases);
  }

  return allCases;
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  if (!ANTHROPIC_API_KEY) {
    console.error("ANTHROPIC_API_KEY required");
    process.exit(1);
  }

  console.log("Generating synthetic test cases for memory extraction eval...");
  console.log(`Model: ${MODEL} (Anthropic API direct)`);
  console.log(
    `Target: ~${SCENARIOS.reduce((s, sc) => s + sc.count, 0)} cases across ${SCENARIOS.length} scenarios\n`
  );

  const cases = await generateTestCases();

  const outDir = join(__dirname, "test-cases");
  await mkdir(outDir, { recursive: true });
  const outPath = join(outDir, "extraction-cases.json");
  await writeFile(outPath, JSON.stringify(cases, null, 2));

  console.log(`\nGenerated ${cases.length} total test cases → ${outPath}`);

  // Breakdown by difficulty
  const byDifficulty: Record<string, number> = {};
  for (const c of cases) {
    byDifficulty[c.difficulty] = (byDifficulty[c.difficulty] || 0) + 1;
  }
  console.log("\nBreakdown by difficulty:");
  for (const [diff, count] of Object.entries(byDifficulty)) {
    console.log(`  ${diff}: ${count}`);
  }

  // Breakdown by scenario
  const byScenario: Record<string, number> = {};
  for (const c of cases) {
    for (const s of c.scenarios) {
      byScenario[s] = (byScenario[s] || 0) + 1;
    }
  }
  console.log("\nBreakdown by scenario:");
  for (const [sc, count] of Object.entries(byScenario)) {
    console.log(`  ${sc}: ${count}`);
  }
}

main().catch(console.error);
