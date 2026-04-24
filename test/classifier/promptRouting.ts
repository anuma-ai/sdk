/**
 * E2E test: prompt routing to pre-processors.
 *
 * For each prompt: generate one embedding, run every registered pre-processor
 * in observer mode, and compare triggered-names against expected. Reports
 * per-pre-processor accuracy (precision / recall / F1) so accuracy regressions
 * are visible per-pre-processor rather than as a single aggregate number.
 *
 * Runs on merge queue with a live embedding API. No LLM calls — only embedding
 * API calls + cosine similarity against centroids.
 *
 * Adding a new pre-processor:
 *   1. Append an entry to `PRE_PROCESSORS`.
 *   2. Relabel existing prompts where the new pre-processor should also fire
 *      (e.g. "Bitcoin price" might trigger both `webSearch` and `cryptoPrice`).
 *   3. Add new prompts specific to the new pre-processor.
 *
 * Environment:
 *   PORTAL_API_KEY   (required)  Portal API key
 *   ANUMA_API_URL    (optional)  Portal API base URL override
 */

import "dotenv/config";
import { describe, expect, it } from "vitest";

import type { PromptPreProcessor } from "../../src/lib/chat/preProcessor.js";
import { createWebSearchPreProcessor } from "../../src/lib/chat/webSearchClassifier.js";
import { generateEmbeddings } from "../../src/lib/memoryEngine/embeddings.js";

const config = {
  baseUrl: process.env.ANUMA_API_URL || "https://portal.anuma-dev.ai",
  portalKey: process.env.PORTAL_API_KEY || "",
};

if (!config.portalKey) {
  throw new Error("PORTAL_API_KEY is required. Add it to .env or set the environment variable.");
}

// ── Pre-processors under test ────────────────────────────────────────────────
// Each entry produces a fresh observer for a single prompt and reports whether
// its gate opened. For classify-then-fetch pre-processors this is a stub
// fetcher; for observer-only pre-processors use `onClassification` similarly.

interface PreProcessorUnderTest {
  name: string;
  makeObserver: () => { processor: PromptPreProcessor; didTrigger: () => boolean };
  /** Minimum per-pre-processor accuracy required to pass. */
  minAccuracy: number;
}

const PRE_PROCESSORS: PreProcessorUnderTest[] = [
  {
    name: "webSearch",
    minAccuracy: 0.7,
    makeObserver: () => {
      let triggered = false;
      const processor = createWebSearchPreProcessor({
        fetchSearchResults: async () => {
          triggered = true;
          return "";
        },
      });
      return { processor, didTrigger: () => triggered };
    },
  },
];

// ── Labeled prompt corpus ────────────────────────────────────────────────────
// Each prompt is annotated with the set of pre-processor names that SHOULD
// trigger. An empty `shouldTrigger` means no pre-processor should fire.

interface LabeledPrompt {
  text: string;
  shouldTrigger: string[];
}

const PROMPTS: LabeledPrompt[] = [
  // ── Prompts that should trigger webSearch ────────────────────────────
  // Time-sensitive / news
  {
    text: "What's the latest news about the OpenAI leadership changes?",
    shouldTrigger: ["webSearch"],
  },
  { text: "What did Elon Musk tweet about today?", shouldTrigger: ["webSearch"] },
  { text: "What was just announced at Google I/O?", shouldTrigger: ["webSearch"] },
  { text: "What happened in the world today?", shouldTrigger: ["webSearch"] },
  { text: "Any breaking news right now?", shouldTrigger: ["webSearch"] },

  // Financial
  { text: "What is Bitcoin's price right now?", shouldTrigger: ["webSearch"] },
  { text: "How is the S&P 500 performing today?", shouldTrigger: ["webSearch"] },
  { text: "What's the current exchange rate for USD to EUR?", shouldTrigger: ["webSearch"] },
  { text: "How much is Nvidia stock worth?", shouldTrigger: ["webSearch"] },
  { text: "What's the market cap of Apple?", shouldTrigger: ["webSearch"] },
  { text: "What are Ethereum gas fees right now?", shouldTrigger: ["webSearch"] },

  // Sports
  { text: "Who won the Super Bowl this year?", shouldTrigger: ["webSearch"] },
  { text: "What are the current NBA playoff standings?", shouldTrigger: ["webSearch"] },
  { text: "What's the score of the Manchester United match?", shouldTrigger: ["webSearch"] },
  { text: "When is the next UFC fight?", shouldTrigger: ["webSearch"] },
  { text: "Who's leading the Tour de France?", shouldTrigger: ["webSearch"] },

  // Weather
  { text: "What's the weather in San Francisco today?", shouldTrigger: ["webSearch"] },
  { text: "Will it rain in New York this weekend?", shouldTrigger: ["webSearch"] },
  { text: "What's the UV index in Miami right now?", shouldTrigger: ["webSearch"] },
  { text: "Is there a flood warning in Houston?", shouldTrigger: ["webSearch"] },

  // Local search
  { text: "Find Italian restaurants near me", shouldTrigger: ["webSearch"] },
  { text: "Where is the nearest pharmacy open right now?", shouldTrigger: ["webSearch"] },
  { text: "Coffee shops with wifi in downtown Austin", shouldTrigger: ["webSearch"] },
  { text: "How do I get to JFK airport from Manhattan?", shouldTrigger: ["webSearch"] },

  // Image / video
  { text: "Show me pictures of the new Tesla Roadster", shouldTrigger: ["webSearch"] },
  { text: "Find me a YouTube tutorial on welding", shouldTrigger: ["webSearch"] },
  { text: "What does the new MacBook Pro look like?", shouldTrigger: ["webSearch"] },
  { text: "Show me photos of the Northern Lights in Iceland", shouldTrigger: ["webSearch"] },

  // Product research / comparison
  { text: "What are the best noise-cancelling headphones in 2026?", shouldTrigger: ["webSearch"] },
  { text: "Compare iPhone 16 vs Samsung Galaxy S25", shouldTrigger: ["webSearch"] },
  { text: "Best budget laptop for students this year", shouldTrigger: ["webSearch"] },
  { text: "Reviews of the Dyson V15 vacuum", shouldTrigger: ["webSearch"] },

  // Technical lookups
  { text: "What version of React was released most recently?", shouldTrigger: ["webSearch"] },
  {
    text: "What are the current visa requirements for US citizens visiting Japan?",
    shouldTrigger: ["webSearch"],
  },
  { text: "What's new in Python 3.14?", shouldTrigger: ["webSearch"] },
  { text: "Did Next.js release a new version this month?", shouldTrigger: ["webSearch"] },

  // Current info
  { text: "Is the Golden Gate Bridge open to traffic right now?", shouldTrigger: ["webSearch"] },
  { text: "When is the next Apple keynote event?", shouldTrigger: ["webSearch"] },
  { text: "What time does Costco close today?", shouldTrigger: ["webSearch"] },
  { text: "Is there a sale going on at Amazon right now?", shouldTrigger: ["webSearch"] },

  // Political
  { text: "What legislation did Congress pass this week?", shouldTrigger: ["webSearch"] },
  { text: "Who is the current prime minister of the UK?", shouldTrigger: ["webSearch"] },
  { text: "What did the Supreme Court rule on today?", shouldTrigger: ["webSearch"] },
  { text: "When is the next presidential debate?", shouldTrigger: ["webSearch"] },

  // Edge cases — short / terse but still search-worthy
  { text: "Ethereum price", shouldTrigger: ["webSearch"] },
  { text: "weather tomorrow", shouldTrigger: ["webSearch"] },
  { text: "election results 2026", shouldTrigger: ["webSearch"] },
  { text: "flights to Tokyo", shouldTrigger: ["webSearch"] },
  { text: "Lakers score", shouldTrigger: ["webSearch"] },

  // Edge cases — questions that look general but need current data
  { text: "Is TikTok banned in the US?", shouldTrigger: ["webSearch"] },
  { text: "What's the interest rate right now?", shouldTrigger: ["webSearch"] },
  { text: "How many people have COVID this week?", shouldTrigger: ["webSearch"] },
  { text: "What's trending on Twitter?", shouldTrigger: ["webSearch"] },

  // ── Prompts that should NOT trigger any pre-processor ────────────────
  // Creative
  { text: "Write a haiku about autumn leaves", shouldTrigger: [] },
  { text: "Help me come up with a name for my startup", shouldTrigger: [] },
  { text: "Write a short horror story set in space", shouldTrigger: [] },
  { text: "Generate 10 taglines for a coffee brand", shouldTrigger: [] },

  // Reasoning / analysis
  { text: "Explain the difference between TCP and UDP", shouldTrigger: [] },
  { text: "What are the pros and cons of microservices?", shouldTrigger: [] },
  { text: "Summarize the text I pasted above", shouldTrigger: [] },
  { text: "Why is bubble sort inefficient for large arrays?", shouldTrigger: [] },
  { text: "What's the difference between REST and GraphQL?", shouldTrigger: [] },

  // Code
  { text: "Help me refactor this function to use async/await", shouldTrigger: [] },
  { text: "Write a Python function that checks if a number is prime", shouldTrigger: [] },
  { text: "Convert this SQL query to a Prisma query", shouldTrigger: [] },
  { text: "Why is my React component re-rendering infinitely?", shouldTrigger: [] },
  { text: "Write a regex that matches email addresses", shouldTrigger: [] },
  { text: "Add error handling to this Express route", shouldTrigger: [] },

  // Math
  { text: "What is the time complexity of quicksort?", shouldTrigger: [] },
  { text: "Solve this equation: 2x + 5 = 15", shouldTrigger: [] },
  { text: "What is the integral of sin(x)dx?", shouldTrigger: [] },
  { text: "How do you calculate compound interest?", shouldTrigger: [] },

  // Writing
  { text: "Help me draft a resignation letter", shouldTrigger: [] },
  { text: "Rewrite this paragraph to sound more professional", shouldTrigger: [] },
  { text: "Proofread this email for grammar mistakes", shouldTrigger: [] },
  { text: "Write a thank-you note for a job interview", shouldTrigger: [] },

  // Translation / language
  { text: "Translate 'hello world' to French", shouldTrigger: [] },
  { text: "What's the grammatical difference between who and whom?", shouldTrigger: [] },
  { text: "How do you say 'good morning' in Japanese?", shouldTrigger: [] },

  // Timeless knowledge
  { text: "How does photosynthesis work?", shouldTrigger: [] },
  { text: "What is the Pythagorean theorem?", shouldTrigger: [] },
  { text: "Explain how neural networks learn", shouldTrigger: [] },
  { text: "What causes tides in the ocean?", shouldTrigger: [] },
  { text: "How does a CPU execute instructions?", shouldTrigger: [] },

  // Data processing
  { text: "Parse this CSV and give me the totals by category", shouldTrigger: [] },
  { text: "Format this JSON as a markdown table", shouldTrigger: [] },
  { text: "Write a SQL query to find duplicate rows", shouldTrigger: [] },
  { text: "How do I pivot this dataframe in pandas?", shouldTrigger: [] },

  // Conversational
  { text: "Thanks, that was helpful", shouldTrigger: [] },
  { text: "Can you explain that again more simply?", shouldTrigger: [] },
  { text: "What did you mean by that?", shouldTrigger: [] },
  { text: "Go on", shouldTrigger: [] },

  // Personal advice
  { text: "How should I structure my resume for a tech job?", shouldTrigger: [] },
  { text: "Give me tips for a job interview", shouldTrigger: [] },
  { text: "What should I prioritize when learning to code?", shouldTrigger: [] },

  // Edge cases — look like they could be search but aren't
  { text: "What is the speed of light?", shouldTrigger: [] },
  { text: "How many continents are there?", shouldTrigger: [] },
  { text: "What year did World War 2 end?", shouldTrigger: [] },
  { text: "Who wrote Romeo and Juliet?", shouldTrigger: [] },
  { text: "What is the capital of France?", shouldTrigger: [] },
  { text: "How does gravity work?", shouldTrigger: [] },
  { text: "What are the primary colors?", shouldTrigger: [] },
  { text: "Explain the water cycle", shouldTrigger: [] },

  // Edge cases — short / terse but not search-worthy
  { text: "fix this bug", shouldTrigger: [] },
  { text: "make it shorter", shouldTrigger: [] },
  { text: "add types", shouldTrigger: [] },
  { text: "explain this code", shouldTrigger: [] },
  { text: "why does this fail", shouldTrigger: [] },
];

// ── Per-pre-processor stats ──────────────────────────────────────────────────

interface Stats {
  tp: number; // expected trigger, did trigger
  fp: number; // NOT expected to trigger, did trigger
  tn: number; // NOT expected to trigger, did not trigger
  fn: number; // expected to trigger, did not trigger
}

function newStats(): Stats {
  return { tp: 0, fp: 0, tn: 0, fn: 0 };
}

function accuracy(s: Stats): number {
  const total = s.tp + s.fp + s.tn + s.fn;
  return total === 0 ? 0 : (s.tp + s.tn) / total;
}

function precision(s: Stats): number {
  const denom = s.tp + s.fp;
  return denom === 0 ? 1 : s.tp / denom;
}

function recall(s: Stats): number {
  const denom = s.tp + s.fn;
  return denom === 0 ? 1 : s.tp / denom;
}

function f1(s: Stats): number {
  const p = precision(s);
  const r = recall(s);
  return p + r === 0 ? 0 : (2 * p * r) / (p + r);
}

// ── Test runner ──────────────────────────────────────────────────────────────

describe("prompt routing to pre-processors", () => {
  it("triggers the expected pre-processors for each prompt", async () => {
    // Embed every prompt once, up front, then run the per-prompt
    // pre-processor gauntlet in-memory against the cached embeddings.
    const embeddings = await generateEmbeddings(
      PROMPTS.map((p) => p.text),
      { apiKey: config.portalKey, baseUrl: config.baseUrl }
    );

    const stats = new Map<string, Stats>(PRE_PROCESSORS.map((p) => [p.name, newStats()]));
    const mismatches: string[] = [];

    for (let i = 0; i < PROMPTS.length; i++) {
      const { text, shouldTrigger } = PROMPTS[i];
      const embedding = embeddings[i];
      const expectedSet = new Set(shouldTrigger);

      // Run all pre-processors in observer mode against the cached embedding.
      const outcomes = await Promise.all(
        PRE_PROCESSORS.map(async ({ name, makeObserver }) => {
          const { processor, didTrigger } = makeObserver();
          await processor({ prompt: text, embedding });
          return { name, triggered: didTrigger() };
        })
      );

      for (const { name, triggered } of outcomes) {
        const expected = expectedSet.has(name);
        const s = stats.get(name)!;
        if (expected && triggered) s.tp++;
        else if (expected && !triggered) {
          s.fn++;
          mismatches.push(`  [FN] ${name} expected to trigger but didn't: "${text}"`);
        } else if (!expected && triggered) {
          s.fp++;
          mismatches.push(`  [FP] ${name} triggered but shouldn't have: "${text}"`);
        } else s.tn++;
      }
    }

    console.log("\n╔══════════════════════════════════════════════════════════════════╗");
    console.log("║              PROMPT ROUTING REPORT                             ║");
    console.log("╠══════════════════════════════════════════════════════════════════╣");
    for (const { name, minAccuracy } of PRE_PROCESSORS) {
      const s = stats.get(name)!;
      const acc = accuracy(s);
      const gate = acc >= minAccuracy ? "PASS" : "FAIL";
      console.log(
        `║  ${name.padEnd(18)} acc=${(acc * 100).toFixed(1).padStart(5)}%  ` +
          `p=${(precision(s) * 100).toFixed(1).padStart(5)}%  ` +
          `r=${(recall(s) * 100).toFixed(1).padStart(5)}%  ` +
          `f1=${(f1(s) * 100).toFixed(1).padStart(5)}%  ` +
          `[${gate}] (min ${(minAccuracy * 100).toFixed(0)}%)`
      );
      console.log(
        `║    tp=${s.tp}  fp=${s.fp}  tn=${s.tn}  fn=${s.fn}  (${s.tp + s.fp + s.tn + s.fn} prompts)`
      );
    }
    console.log("╚══════════════════════════════════════════════════════════════════╝\n");

    if (mismatches.length > 0) {
      console.log(`── Mismatches (${mismatches.length}) ──`);
      for (const line of mismatches) console.log(line);
    }

    // Per-pre-processor accuracy gate — fails the run if any drops below its
    // minAccuracy threshold. More forgiving than asserting every prompt.
    for (const { name, minAccuracy } of PRE_PROCESSORS) {
      const acc = accuracy(stats.get(name)!);
      expect(
        acc,
        `${name} accuracy ${(acc * 100).toFixed(1)}% is below minimum ${(minAccuracy * 100).toFixed(0)}%`
      ).toBeGreaterThanOrEqual(minAccuracy);
    }
  });
});
