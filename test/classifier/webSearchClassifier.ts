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

  // Financial — most pure-data queries route to cryptoPrice/stockPrice, NOT
  // webSearch. Only news / current-data with no dedicated pre-processor stays.
  "What are Ethereum gas fees right now?",

  // Sports
  "Who won the Super Bowl this year?",
  "What are the current NBA playoff standings?",
  "What's the score of the Manchester United match?",
  "When is the next UFC fight?",
  "Who's leading the Tour de France?",

  // (Weather queries route to createWeatherPreProcessor, not webSearch.
  //  See NO_SEARCH_PROMPTS for the negative cases.)

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
  // (Pure "Ethereum price" / "weather tomorrow" route to the dedicated
  //  classifiers and live in NO_SEARCH_PROMPTS below.)
  "election results 2026",
  "flights to Tokyo",
  "Lakers score",

  // Edge cases — questions that look general but need current data
  "Is TikTok banned in the US?",
  "What's the interest rate right now?",
  "How many people have COVID this week?",
  "What's trending on Twitter?",

  // === Imported from the portal classifier test corpus ===
  // Sourced from ai-portal/internal/services/classifier/classifier_test.go via
  // ai-portal/tools/extract-classifier-corpus. Migrated as additional
  // calibration data when the portal classifier is retired.
  "Breaking news today",
  "Did the team win the game?",
  "Is the concert streaming live?",
  "What are the differences? Compare React vs Vue",
  "What are the pros and cons of Kubernetes?",
  "What happened in 2025 today?",
  "What happened today?",
  "What happened with coder today?",
  "What is happening right now?",
  "What news is there about Tesla?",
  "What was the score of the Lakers game?",
  "What's the latest news about AI?",
  "What's the latest news about programming?",
  "What's the latest news on Tesla?",
  "Who won the championship?",
  "analyze the current market trends for AI",
  "climate projection for 2050",
  "coffee shops nearby",
  "comprehensive overview of blockchain technology",
  "find ticker symbol for Apple",
  "hotels in New York City",
  "images of cute cats",
  "latest news update on the election",
  "pasta cooking video tutorial",
  "pictures of mountains",
  "pictures of the Eiffel Tower",
  "recommend a good framework for mobile development",
  "restaurants near me",
  "what's the elevation of Denver",
  "where is the nearest gas station",
  "which is better React or Vue for web development",
  "youtube python tutorials",
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

  // === Imported from the portal classifier test corpus (part 1/2) ===
  // Sourced from ai-portal/internal/services/classifier/classifier_test.go via
  // ai-portal/tools/extract-classifier-corpus.
  "Calculate the derivative of x^2",
  "Debug this code snippet",
  "Explain how neural networks work",
  "Explain local storage in JavaScript",
  "How do I deliver packages efficiently?",
  "How do I resize a window in macOS?",
  "How much is the painting of a sunset worth in terms of the amount I paid for it?",
  "How to configure npm run watch",
  "How to use local variables in Python",
  "I want to know how to cook pasta",
  "I wanted to follow up on our previous conversation about YouTube videos for workplace posture. Can you remind me of the Mayo Clinic video you recommended?",
  "I wanted to follow up on our previous conversation about fracking in the Marcellus Shale region. You mentioned that some states require fracking companies to monitor groundwater quality at nearby wells.",
  "List my calendar events for the next 7 days.",
  'Now say the word "beta"',
  "Translate 'hello' to Spanish",
  "What a wonderful world this is",
  "What happened during World War 2?",
  "What is the current time at the location of IP address 8.8.8.8? First look up where it is, then get the current time for that timezone.",

  // === Imported from the portal classifier test corpus (part 2/2) ===
  "What was life like in the 19th century?",
  "Where is the IP address 8.8.8.8 located?",
  "Who am I and where do I live?",
  "Write a Python function to sort a list",
  "Write a poem about nature",
  "Write a program to sort numbers",
  "You are an answer evaluator. Determine if the generated answer correctly answers the question",
  "create a picture of a forest",
  "draw me a diagram of a tree",
  "draw me an image of a dog",
  "generate an image of a turtle",
  "how to update flutter sdk",
  "illustrate this concept for me",
  "npm update not working",
  "paint a portrait of a woman",
  "sketch a wireframe for me",
  "webpack watch mode not working",
  "where is the bug in my code",
  "where is the error coming from",

  // === Pure crypto-price queries — handled by createCryptoPricePreProcessor ===
  // webSearch must NOT fire on these. The cryptoPrice classifier owns them
  // (see promptRouting.ts). Includes both original SDK and portal-imported.
  "What is Bitcoin's price right now?",
  "Ethereum price",
  "What is the bitcoin price today?",
  "What is the bitcoin price?",
  "What's the current ETH price?",

  // === Pure stock / ETF / index / FX queries — handled by createStockPricePreProcessor ===
  "How is the S&P 500 performing today?",
  "What's the current exchange rate for USD to EUR?",
  "How much is Nvidia stock worth?",
  "What's the market cap of Apple?",
  "OHLCV data for AAPL",
  "What is the current stock price of Apple?",
  "exchange rate USD to EUR",
  "stock price of Apple",

  // === Pure weather queries — handled by createWeatherPreProcessor ===
  "What's the weather in San Francisco today?",
  "Will it rain in New York this weekend?",
  "What's the UV index in Miami right now?",
  "Is there a flood warning in Houston?",
  "weather tomorrow",
  "air quality in Beijing",
  "flood forecast for Houston",
  "historical weather data for 2023",
  "marine weather forecast",
  "temperature forecast for tomorrow",
  "weather in San Francisco",
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
