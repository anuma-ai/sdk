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
 *      (e.g. "Bitcoin price" might trigger both `webSearch` and `price`).
 *   3. Add new prompts specific to the new pre-processor.
 *
 * Environment:
 *   PORTAL_API_KEY   (required)  Portal API key
 *   ANUMA_API_URL    (optional)  Portal API base URL override
 */

import "dotenv/config";
import { describe, expect, it } from "vitest";

import { createCryptoPricePreProcessor } from "../../src/lib/chat/cryptoPriceClassifier.js";
import type { PromptPreProcessor } from "../../src/lib/chat/preProcessor.js";
import { createStockPricePreProcessor } from "../../src/lib/chat/stockPriceClassifier.js";
import { createWeatherPreProcessor } from "../../src/lib/chat/weatherClassifier.js";
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
  {
    name: "cryptoPrice",
    minAccuracy: 0.7,
    makeObserver: () => {
      let triggered = false;
      const processor = createCryptoPricePreProcessor({
        fetchCryptoPriceData: async () => {
          triggered = true;
          return "";
        },
      });
      return { processor, didTrigger: () => triggered };
    },
  },
  {
    name: "stockPrice",
    minAccuracy: 0.7,
    makeObserver: () => {
      let triggered = false;
      const processor = createStockPricePreProcessor({
        fetchStockPriceData: async () => {
          triggered = true;
          return "";
        },
      });
      return { processor, didTrigger: () => triggered };
    },
  },
  {
    name: "weather",
    minAccuracy: 0.7,
    makeObserver: () => {
      let triggered = false;
      const processor = createWeatherPreProcessor({
        fetchWeatherData: async () => {
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

  // Financial — pure data queries route only to the dedicated price classifier.
  // Web search would just add noisy news context the user didn't ask for.
  { text: "What is Bitcoin's price right now?", shouldTrigger: ["cryptoPrice"] },
  { text: "How is the S&P 500 performing today?", shouldTrigger: ["stockPrice"] },
  { text: "What's the current exchange rate for USD to EUR?", shouldTrigger: ["stockPrice"] },
  { text: "How much is Nvidia stock worth?", shouldTrigger: ["stockPrice"] },
  { text: "What's the market cap of Apple?", shouldTrigger: ["stockPrice"] },
  // Gas fees are current data the SDK has no dedicated processor for — falls
  // back to webSearch by design. If/when we add an on-chain gas/network-stats
  // pre-processor, relabel this and move the phrase out of webSearch's YES
  // corpus so we stop spending search calls on it. Until then this label
  // documents the known gap rather than a misclassification.
  { text: "What are Ethereum gas fees right now?", shouldTrigger: ["webSearch"] },

  // Sports
  { text: "Who won the Super Bowl this year?", shouldTrigger: ["webSearch"] },
  { text: "What are the current NBA playoff standings?", shouldTrigger: ["webSearch"] },
  { text: "What's the score of the Manchester United match?", shouldTrigger: ["webSearch"] },
  { text: "When is the next UFC fight?", shouldTrigger: ["webSearch"] },
  { text: "Who's leading the Tour de France?", shouldTrigger: ["webSearch"] },

  // Weather — pure data queries route only to the weather classifier.
  { text: "What's the weather in San Francisco today?", shouldTrigger: ["weather"] },
  { text: "Will it rain in New York this weekend?", shouldTrigger: ["weather"] },
  { text: "What's the UV index in Miami right now?", shouldTrigger: ["weather"] },
  { text: "Is there a flood warning in Houston?", shouldTrigger: ["weather"] },

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
  { text: "Ethereum price", shouldTrigger: ["cryptoPrice"] },
  { text: "weather tomorrow", shouldTrigger: ["weather"] },
  { text: "election results 2026", shouldTrigger: ["webSearch"] },
  { text: "flights to Tokyo", shouldTrigger: ["webSearch"] },
  { text: "Lakers score", shouldTrigger: ["webSearch"] },

  // ── Crypto-price-specific (pure data, no webSearch) ─────────
  { text: "What is the ZETA token price?", shouldTrigger: ["cryptoPrice"] },
  { text: "Show me the BTC chart", shouldTrigger: ["cryptoPrice"] },
  { text: "How much is Solana worth in USD?", shouldTrigger: ["cryptoPrice"] },
  { text: "DOGE market cap", shouldTrigger: ["cryptoPrice"] },

  // ── Stock-price-specific (pure data, no webSearch) ─────────
  { text: "Tesla stock price", shouldTrigger: ["stockPrice"] },
  { text: "What is NVDA trading at", shouldTrigger: ["stockPrice"] },
  { text: "USD to JPY exchange rate today", shouldTrigger: ["stockPrice"] },
  { text: "Show me the QQQ ETF price", shouldTrigger: ["stockPrice"] },

  // ── Weather-specific (pure data, no webSearch) ─────────
  { text: "Forecast for Tokyo tomorrow", shouldTrigger: ["weather"] },
  { text: "What's the air quality in Delhi", shouldTrigger: ["weather"] },
  { text: "Will it snow in Aspen this weekend", shouldTrigger: ["weather"] },

  // ── Genuinely-ambiguous asset-class queries.
  // Gold and silver both exist as crypto-pegged tokens (PAXG/XAUT for gold,
  // various PAX Silver / SLVR-style tokens for silver) AND as traditional
  // commodities (XAU/XAG spot, GLD/SLV ETFs). The pure-data query
  // doesn't disambiguate, so both classifiers should fire and the LLM
  // picks the relevant context.
  //
  // Multiple variants here on purpose — a single gold prompt was too
  // brittle (Tanmay's call); regressions need more than one prompt to
  // catch them.
  //
  // Known-flaky on accuracy: these depend on the embedding model + the
  // crypto/stock corpora keeping commodity-adjacent phrases in both YES
  // sets. If a prompt stops triggering one side, the fix is to (a) check
  // whether the embedding model has changed, then (b) add more pegged-
  // token / spot phrases to the relevant generation script and
  // regenerate — not to relax the assertion.
  { text: "What is the price of gold today?", shouldTrigger: ["cryptoPrice", "stockPrice"] },
  { text: "Show me the price of silver", shouldTrigger: ["cryptoPrice", "stockPrice"] },

  // Commodities without notable crypto representation — stock-only.
  // Listed explicitly to document why they're NOT in the ambiguous bucket.
  { text: "Spot price of platinum", shouldTrigger: ["stockPrice"] },
  { text: "Oil price today", shouldTrigger: ["stockPrice"] },

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

  // Crypto-adjacent but NOT price queries — must not false-positive price
  { text: "Explain how Bitcoin mining works", shouldTrigger: [] },
  { text: "How does ZetaChain enable cross-chain transfers?", shouldTrigger: [] },
  { text: "Write a smart contract that mints an ERC-20 token", shouldTrigger: [] },
  { text: "What is the difference between proof-of-stake and proof-of-work?", shouldTrigger: [] },

  // ── Imported from the portal classifier test corpus ─────────────────────
  // Sourced from ai-portal/internal/services/classifier/classifier_test.go.
  // The portal classifier was a single yes/no "needs external data" call,
  // so its `search`-labeled prompts include crypto/stock/weather domain
  // queries that the SDK delegates to the dedicated pre-processors. Labels
  // here reflect the per-classifier routing, not the original binary tag.

  // Portal corpus — cryptoPrice
  { text: "What is the bitcoin price today?", shouldTrigger: ["cryptoPrice"] },
  { text: "What is the bitcoin price?", shouldTrigger: ["cryptoPrice"] },
  { text: "What's the current ETH price?", shouldTrigger: ["cryptoPrice"] },

  // Portal corpus — stockPrice (includes FX)
  { text: "OHLCV data for AAPL", shouldTrigger: ["stockPrice"] },
  { text: "What is the current stock price of Apple?", shouldTrigger: ["stockPrice"] },
  { text: "exchange rate USD to EUR", shouldTrigger: ["stockPrice"] },
  { text: "stock price of Apple", shouldTrigger: ["stockPrice"] },

  // Portal corpus — weather
  { text: "air quality in Beijing", shouldTrigger: ["weather"] },
  { text: "flood forecast for Houston", shouldTrigger: ["weather"] },
  { text: "historical weather data for 2023", shouldTrigger: ["weather"] },
  { text: "marine weather forecast", shouldTrigger: ["weather"] },
  { text: "temperature forecast for tomorrow", shouldTrigger: ["weather"] },
  { text: "weather in San Francisco", shouldTrigger: ["weather"] },

  // Portal corpus — webSearch (news / current events)
  { text: "Breaking news today", shouldTrigger: ["webSearch"] },
  { text: "What happened in 2025 today?", shouldTrigger: ["webSearch"] },
  { text: "What happened today?", shouldTrigger: ["webSearch"] },
  { text: "What happened with coder today?", shouldTrigger: ["webSearch"] },
  { text: "What is happening right now?", shouldTrigger: ["webSearch"] },
  { text: "What news is there about Tesla?", shouldTrigger: ["webSearch"] },
  { text: "What's the latest news about AI?", shouldTrigger: ["webSearch"] },
  { text: "What's the latest news about programming?", shouldTrigger: ["webSearch"] },
  { text: "What's the latest news on Tesla?", shouldTrigger: ["webSearch"] },
  { text: "latest news update on the election", shouldTrigger: ["webSearch"] },

  // Portal corpus — webSearch (sports / events)
  { text: "Did the team win the game?", shouldTrigger: ["webSearch"] },
  { text: "Is the concert streaming live?", shouldTrigger: ["webSearch"] },
  { text: "What was the score of the Lakers game?", shouldTrigger: ["webSearch"] },
  { text: "Who won the championship?", shouldTrigger: ["webSearch"] },

  // Portal corpus — webSearch (research / comparison / recommendations)
  { text: "What are the differences? Compare React vs Vue", shouldTrigger: ["webSearch"] },
  { text: "What are the pros and cons of Kubernetes?", shouldTrigger: ["webSearch"] },
  { text: "analyze the current market trends for AI", shouldTrigger: ["webSearch"] },
  { text: "climate projection for 2050", shouldTrigger: ["webSearch"] },
  { text: "comprehensive overview of blockchain technology", shouldTrigger: ["webSearch"] },
  { text: "recommend a good framework for mobile development", shouldTrigger: ["webSearch"] },
  { text: "which is better React or Vue for web development", shouldTrigger: ["webSearch"] },

  // Portal corpus — webSearch (local / location)
  { text: "coffee shops nearby", shouldTrigger: ["webSearch"] },
  { text: "hotels in New York City", shouldTrigger: ["webSearch"] },
  { text: "restaurants near me", shouldTrigger: ["webSearch"] },
  { text: "where is the nearest gas station", shouldTrigger: ["webSearch"] },

  // Portal corpus — webSearch (lookup / encyclopedic)
  { text: "find ticker symbol for Apple", shouldTrigger: ["webSearch"] },
  { text: "what's the elevation of Denver", shouldTrigger: ["webSearch"] },

  // Portal corpus — webSearch (image / video)
  { text: "images of cute cats", shouldTrigger: ["webSearch"] },
  { text: "pasta cooking video tutorial", shouldTrigger: ["webSearch"] },
  { text: "pictures of mountains", shouldTrigger: ["webSearch"] },
  { text: "pictures of the Eiffel Tower", shouldTrigger: ["webSearch"] },
  { text: "youtube python tutorials", shouldTrigger: ["webSearch"] },

  // ── Portal corpus — no-trigger (code / creative / conversational / personal) ─────
  { text: "Calculate the derivative of x^2", shouldTrigger: [] },
  { text: "Debug this code snippet", shouldTrigger: [] },
  { text: "Explain how neural networks work", shouldTrigger: [] },
  { text: "Explain local storage in JavaScript", shouldTrigger: [] },
  { text: "How do I deliver packages efficiently?", shouldTrigger: [] },
  { text: "How do I resize a window in macOS?", shouldTrigger: [] },
  {
    text: "How much is the painting of a sunset worth in terms of the amount I paid for it?",
    shouldTrigger: [],
  },
  { text: "How to configure npm run watch", shouldTrigger: [] },
  { text: "How to use local variables in Python", shouldTrigger: [] },
  { text: "I want to know how to cook pasta", shouldTrigger: [] },
  {
    text: "I wanted to follow up on our previous conversation about YouTube videos for workplace posture. Can you remind me of the Mayo Clinic video you recommended?",
    shouldTrigger: [],
  },
  {
    text: "I wanted to follow up on our previous conversation about fracking in the Marcellus Shale region. You mentioned that some states require fracking companies to monitor groundwater quality at nearby wells.",
    shouldTrigger: [],
  },
  { text: "List my calendar events for the next 7 days.", shouldTrigger: [] },
  { text: 'Now say the word "beta"', shouldTrigger: [] },
  { text: "Translate 'hello' to Spanish", shouldTrigger: [] },
  { text: "What a wonderful world this is", shouldTrigger: [] },
  { text: "What happened during World War 2?", shouldTrigger: [] },
  {
    text: "What is the current time at the location of IP address 8.8.8.8? First look up where it is, then get the current time for that timezone.",
    shouldTrigger: [],
  },
  { text: "What was life like in the 19th century?", shouldTrigger: [] },
  { text: "Where is the IP address 8.8.8.8 located?", shouldTrigger: [] },
  { text: "Who am I and where do I live?", shouldTrigger: [] },
  { text: "Write a Python function to sort a list", shouldTrigger: [] },
  { text: "Write a poem about nature", shouldTrigger: [] },
  { text: "Write a program to sort numbers", shouldTrigger: [] },
  {
    text: "You are an answer evaluator. Determine if the generated answer correctly answers the question",
    shouldTrigger: [],
  },
  { text: "create a picture of a forest", shouldTrigger: [] },
  { text: "draw me a diagram of a tree", shouldTrigger: [] },
  { text: "draw me an image of a dog", shouldTrigger: [] },
  { text: "generate an image of a turtle", shouldTrigger: [] },
  { text: "how to update flutter sdk", shouldTrigger: [] },
  { text: "illustrate this concept for me", shouldTrigger: [] },
  { text: "npm update not working", shouldTrigger: [] },
  { text: "paint a portrait of a woman", shouldTrigger: [] },
  { text: "sketch a wireframe for me", shouldTrigger: [] },
  { text: "webpack watch mode not working", shouldTrigger: [] },
  { text: "where is the bug in my code", shouldTrigger: [] },
  { text: "where is the error coming from", shouldTrigger: [] },
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
