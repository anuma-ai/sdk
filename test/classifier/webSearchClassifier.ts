/**
 * E2E test for the web search classifier.
 *
 * Embeds a list of prompts and classifies each as "needs web search" or not.
 * No LLM calls — only embedding API calls + cosine similarity against centroids.
 *
 * Environment:
 *   PORTAL_API_KEY   (required)  Portal API key
 *   ANUMA_API_URL    (optional)  Portal API base URL override
 */

import "dotenv/config";
import { describe, it, expect } from "vitest";
import { classifyWebSearchBatch } from "../../src/lib/chat/webSearchClassifier.js";

const config = {
  baseUrl: process.env.ANUMA_API_URL || "https://portal.anuma-dev.ai",
  portalKey: process.env.PORTAL_API_KEY || "",
};

if (!config.portalKey) {
  throw new Error("PORTAL_API_KEY is required. Add it to .env or set the environment variable.");
}

/** Prompts that SHOULD trigger a web search. */
const SEARCH_PROMPTS = [
  // Time-sensitive / news
  "What's the latest news about the OpenAI leadership changes?",
  "What did Elon Musk tweet about today?",
  "What was just announced at Google I/O?",
  "What happened in the world today?",
  "Any breaking news right now?",

  // Financial
  "What is Bitcoin's price right now?",
  "How is the S&P 500 performing today?",
  "What's the current exchange rate for USD to EUR?",
  "How much is Nvidia stock worth?",
  "What's the market cap of Apple?",
  "What are Ethereum gas fees right now?",

  // Sports
  "Who won the Super Bowl this year?",
  "What are the current NBA playoff standings?",
  "What's the score of the Manchester United match?",
  "When is the next UFC fight?",
  "Who's leading the Tour de France?",

  // Weather
  "What's the weather in San Francisco today?",
  "Will it rain in New York this weekend?",
  "What's the UV index in Miami right now?",
  "Is there a flood warning in Houston?",

  // Local search
  "Find Italian restaurants near me",
  "Where is the nearest pharmacy open right now?",
  "Coffee shops with wifi in downtown Austin",
  "How do I get to JFK airport from Manhattan?",

  // Image / video
  "Show me pictures of the new Tesla Roadster",
  "Find me a YouTube tutorial on welding",
  "What does the new MacBook Pro look like?",
  "Show me photos of the Northern Lights in Iceland",

  // Product research / comparison
  "What are the best noise-cancelling headphones in 2026?",
  "Compare iPhone 16 vs Samsung Galaxy S25",
  "Best budget laptop for students this year",
  "Reviews of the Dyson V15 vacuum",

  // Technical lookups
  "What version of React was released most recently?",
  "What are the current visa requirements for US citizens visiting Japan?",
  "What's new in Python 3.14?",
  "Did Next.js release a new version this month?",

  // Current info
  "Is the Golden Gate Bridge open to traffic right now?",
  "When is the next Apple keynote event?",
  "What time does Costco close today?",
  "Is there a sale going on at Amazon right now?",

  // Political
  "What legislation did Congress pass this week?",
  "Who is the current prime minister of the UK?",
  "What did the Supreme Court rule on today?",
  "When is the next presidential debate?",

  // Edge cases — short / terse but still search-worthy
  "Ethereum price",
  "weather tomorrow",
  "election results 2026",
  "flights to Tokyo",
  "Lakers score",

  // Edge cases — questions that look general but need current data
  "Is TikTok banned in the US?",
  "What's the interest rate right now?",
  "How many people have COVID this week?",
  "What's trending on Twitter?",
];

/** Prompts that should NOT trigger a web search. */
const NO_SEARCH_PROMPTS = [
  // Creative
  "Write a haiku about autumn leaves",
  "Help me come up with a name for my startup",
  "Write a short horror story set in space",
  "Generate 10 taglines for a coffee brand",

  // Reasoning / analysis
  "Explain the difference between TCP and UDP",
  "What are the pros and cons of microservices?",
  "Summarize the text I pasted above",
  "Why is bubble sort inefficient for large arrays?",
  "What's the difference between REST and GraphQL?",

  // Code
  "Help me refactor this function to use async/await",
  "Write a Python function that checks if a number is prime",
  "Convert this SQL query to a Prisma query",
  "Why is my React component re-rendering infinitely?",
  "Write a regex that matches email addresses",
  "Add error handling to this Express route",

  // Math
  "What is the time complexity of quicksort?",
  "Solve this equation: 2x + 5 = 15",
  "What is the integral of sin(x)dx?",
  "How do you calculate compound interest?",

  // Writing
  "Help me draft a resignation letter",
  "Rewrite this paragraph to sound more professional",
  "Proofread this email for grammar mistakes",
  "Write a thank-you note for a job interview",

  // Translation / language
  "Translate 'hello world' to French",
  "What's the grammatical difference between who and whom?",
  "How do you say 'good morning' in Japanese?",

  // Timeless knowledge
  "How does photosynthesis work?",
  "What is the Pythagorean theorem?",
  "Explain how neural networks learn",
  "What causes tides in the ocean?",
  "How does a CPU execute instructions?",

  // Data processing
  "Parse this CSV and give me the totals by category",
  "Format this JSON as a markdown table",
  "Write a SQL query to find duplicate rows",
  "How do I pivot this dataframe in pandas?",

  // Conversational
  "Thanks, that was helpful",
  "Can you explain that again more simply?",
  "What did you mean by that?",
  "Go on",

  // Personal advice
  "How should I structure my resume for a tech job?",
  "Give me tips for a job interview",
  "What should I prioritize when learning to code?",

  // Edge cases — look like they could be search but aren't
  "What is the speed of light?",
  "How many continents are there?",
  "What year did World War 2 end?",
  "Who wrote Romeo and Juliet?",
  "What is the capital of France?",
  "How does gravity work?",
  "What are the primary colors?",
  "Explain the water cycle",

  // Edge cases — short / terse but not search-worthy
  "fix this bug",
  "make it shorter",
  "add types",
  "explain this code",
  "why does this fail",
];

describe("web search classifier", () => {
  it("classifies prompts as needing web search or not", async () => {
    const allPrompts = [...SEARCH_PROMPTS, ...NO_SEARCH_PROMPTS];

    const results = await classifyWebSearchBatch(allPrompts, {
      apiKey: config.portalKey,
      baseUrl: config.baseUrl,
    });

    console.log("\n╔══════════════════════════════════════════════════════════════════╗");
    console.log("║              WEB SEARCH CLASSIFIER REPORT                      ║");
    console.log("╠══════════════════════════════════════════════════════════════════╣");

    console.log("\n── Should trigger web search ──\n");

    let searchCorrect = 0;
    for (let i = 0; i < SEARCH_PROMPTS.length; i++) {
      const r = results[i];
      const mark = r.needsWebSearch ? "PASS" : "FAIL";
      if (r.needsWebSearch) searchCorrect++;
      console.log(`  [${mark}] "${SEARCH_PROMPTS[i]}"`);
      console.log(
        `        search=${r.searchScore.toFixed(4)}  noSearch=${r.noSearchScore.toFixed(4)}  delta=${(r.searchScore - r.noSearchScore).toFixed(4)}`
      );
    }

    console.log("\n── Should NOT trigger web search ──\n");

    let noSearchCorrect = 0;
    for (let i = 0; i < NO_SEARCH_PROMPTS.length; i++) {
      const r = results[SEARCH_PROMPTS.length + i];
      const mark = !r.needsWebSearch ? "PASS" : "FAIL";
      if (!r.needsWebSearch) noSearchCorrect++;
      console.log(`  [${mark}] "${NO_SEARCH_PROMPTS[i]}"`);
      console.log(
        `        search=${r.searchScore.toFixed(4)}  noSearch=${r.noSearchScore.toFixed(4)}  delta=${(r.searchScore - r.noSearchScore).toFixed(4)}`
      );
    }

    const total = SEARCH_PROMPTS.length + NO_SEARCH_PROMPTS.length;
    const correct = searchCorrect + noSearchCorrect;
    const accuracy = ((correct / total) * 100).toFixed(1);

    console.log("\n╠══════════════════════════════════════════════════════════════════╣");
    console.log(`║  Search prompts:    ${searchCorrect}/${SEARCH_PROMPTS.length} correct`);
    console.log(`║  No-search prompts: ${noSearchCorrect}/${NO_SEARCH_PROMPTS.length} correct`);
    console.log(`║  Overall accuracy:  ${correct}/${total} (${accuracy}%)`);
    console.log("╚══════════════════════════════════════════════════════════════════╝\n");

    expect(correct / total).toBeGreaterThanOrEqual(0.7);
  });
});
