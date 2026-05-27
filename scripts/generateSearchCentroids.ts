/**
 * One-time script to generate centroid vectors for the web search classifier.
 *
 * Embeds the reference phrases, averages each class into a single centroid,
 * and writes the result to src/lib/chat/webSearchCentroids.ts.
 *
 * Usage:
 *   PORTAL_API_KEY=... npx tsx scripts/generateSearchCentroids.ts
 */

import "dotenv/config";
import { generateEmbeddings } from "../src/lib/memoryEngine/embeddings";
import { BASE_URL } from "../src/clientConfig";
import { writeFileSync } from "fs";
import { resolve } from "path";
import { averageVectors } from "./lib/centroids";

const SEARCH_PHRASES = [
  // Time-sensitive / current events
  "What is the latest news about this topic today",
  "What happened recently in current events",
  "What was just announced or released today",
  "Is there a live stream or broadcast happening now",

  // News
  "What are the latest news updates and reports about this",
  "Was there an incident or breaking news reported",

  // Political
  "What are the latest election results and who won the vote",
  "What is the current president or government doing about this policy",
  "What legislation or bill is congress debating right now",

  // Sports
  "What are the current scores and standings in the game",
  "Who won the championship tournament or playoffs",
  "What are the latest NFL NBA MLB NHL FIFA rankings",
  "What happened at the Super Bowl World Cup or Olympics",

  // Note: pure price / quote / FX queries are handled by createCryptoPricePreProcessor
  // and createStockPricePreProcessor — they no longer fire webSearch. News *about*
  // financial markets ("Why is the market down today", "Latest news on the Fed
  // rate decision") still belongs here via the News / Current-info sections.

  // Note: pure weather queries are handled by createWeatherPreProcessor and no
  // longer fire webSearch. Weather-flavored news (e.g. "Latest hurricane warnings",
  // "Storm aftermath in Florida") still belongs here via News.

  // Local search
  "Find restaurants hotels stores or businesses near me",
  "What are the directions to this place and where is it located",
  "Where is the nearest shop or business in my area",

  // Image search
  "Show me images pictures or photos of this thing",
  "What does this person place or thing look like",

  // Video search
  "Find a video tutorial or YouTube clip about this",
  "Show me footage or a video of this event",

  // Complex research queries
  "Compare these products which is better and what do reviews say",
  "What are the best recommendations for this category in 2025",
  "Give me a comprehensive analysis and detailed comparison",

  // Current info questions
  "Is it true that this happened and what's going on with it",
  "Where is this person or thing now and what are they doing",
  "How much does this cost or how much is it worth",

  // Technical lookups (docs, versions)
  "What is the latest version of this software or library",
  "What does the official documentation say about this API",
  "What are the current rules regulations or laws about this",

  // Concrete examples mirroring real prompts the test corpus expects to
  // trigger webSearch. Balances the concrete pure-data NO examples below
  // so the YES centroid still recognizes common "What/Find/Show me" forms.
  "What did Elon Musk tweet about today",
  "What did the Supreme Court rule on today",
  "What was just announced at Google IO",
  "Any breaking news right now",
  "Who won the Super Bowl this year",
  "What's the score of the Manchester United match",
  "Lakers score tonight",
  "When is the next UFC fight",
  "Find Italian restaurants near me",
  "Where is the nearest pharmacy open right now",
  "Coffee shops with wifi in downtown Austin",
  "How do I get to JFK airport from Manhattan",
  "Show me pictures of the new Tesla Roadster",
  "Find me a YouTube tutorial on welding",
  "Show me photos of the Northern Lights",
  "Compare iPhone 16 vs Samsung Galaxy S25",
  "Best budget laptop for students this year",
  "Reviews of the Dyson V15 vacuum",
  "What version of React was released most recently",
  "What's new in Python 3.14",
  "What are the current visa requirements for US citizens visiting Japan",
  "What time does Costco close today",
  "Is there a sale going on at Amazon right now",
  "Is the Golden Gate Bridge open to traffic right now",
  "Is TikTok banned in the US",
  "How many people have COVID this week",
  "What's the interest rate right now",
  "What are Ethereum gas fees right now",
  "flights to Tokyo",
  "election results 2026",
];

const NO_SEARCH_PHRASES = [
  // Creative / generative
  "Write me a poem or story about this topic",
  "Help me brainstorm ideas for a creative project",
  "Generate a short fiction narrative about this character",

  // Reasoning / analysis
  "Explain this concept to me step by step",
  "What are the pros and cons of this approach",
  "Summarize this text I have provided",
  "What is the logical conclusion of this argument",
  "Break down this problem into smaller parts",

  // Code generation / programming
  "Write a function that does this specific thing",
  "Refactor this code to be more efficient",
  "Debug this code and explain what is wrong",
  "Convert this code from JavaScript to Python",
  "Write unit tests for this class",

  // Math / logic / science
  "Solve this math problem or equation",
  "Calculate the derivative of this function",
  "Prove this mathematical theorem step by step",

  // Writing / communication
  "Help me write a professional email",
  "Draft a cover letter for this job application",
  "Rewrite this paragraph to be more concise",

  // Personal advice
  "Give me advice on how to handle this situation",
  "Help me plan my schedule for this week",

  // Translation / language
  "Translate this sentence into another language",
  "What is the grammatical structure of this sentence",

  // Conversational
  "Hello how are you doing today",
  "Thank you for your help",
  "Can you repeat what you said",

  // Knowledge (timeless / encyclopedic)
  "What is the theory of relativity about",
  "How does photosynthesis work in plants",
  "Explain the difference between TCP and UDP protocols",

  // Data processing
  "Parse this JSON and extract the relevant fields",
  "Format this data as a markdown table",
  "Clean up and normalize this dataset",

  // Pure crypto price queries — handled by createCryptoPricePreProcessor
  "What is the current price of Bitcoin",
  "How much is Ethereum worth right now",
  "BTC price",
  "$ETH price today",
  "Show me the ZETA token price",
  "DOGE market cap",
  "How much is one Solana coin",
  "What is the all-time high for BTC",

  // Pure stock / ETF / index / FX quotes — handled by createStockPricePreProcessor
  "What is the current Nvidia stock price",
  "Tesla stock price right now",
  "How is Apple stock performing today",
  "S&P 500 today",
  "Dow Jones close today",
  "QQQ ETF price",
  "What is NVDA trading at",
  "USD to EUR exchange rate",
  "EUR/USD live rate",
  "USD to JPY rate today",
  "What's the market cap of Apple",
  "P/E ratio of MSFT",

  // Pure weather queries — handled by createWeatherPreProcessor
  "What is the weather in San Francisco today",
  "Will it rain in New York this weekend",
  "Forecast for Tokyo tomorrow",
  "What is the air quality in Delhi",
  "Will it snow in Aspen this weekend",
  "Temperature in Phoenix right now",
  "UV index in Miami",
  "Is there a flood warning in Houston",
  "Wind speed in Wellington",
];

async function main() {
  const apiKey = process.env.PORTAL_API_KEY;
  const baseUrl = process.env.ANUMA_API_URL || BASE_URL;

  if (!apiKey) {
    console.error("PORTAL_API_KEY is required");
    process.exit(1);
  }

  console.log(`Using baseUrl: ${baseUrl}`);
  console.log("Embedding search phrases...");
  const searchEmbeddings = await generateEmbeddings(SEARCH_PHRASES, { apiKey, baseUrl });

  console.log("Embedding no-search phrases...");
  const noSearchEmbeddings = await generateEmbeddings(NO_SEARCH_PHRASES, { apiKey, baseUrl });

  const searchCentroid = averageVectors(searchEmbeddings);
  const noSearchCentroid = averageVectors(noSearchEmbeddings);

  console.log(`Dimensions: ${searchCentroid.length}`);

  const output = `/**
 * Pre-computed centroid vectors for the web search classifier.
 *
 * Generated by: npx tsx scripts/generateSearchCentroids.ts
 *
 * searchCentroid: average embedding of phrases representing "needs web search" intent.
 * noSearchCentroid: average embedding of phrases representing "no search needed" intent.
 *
 * At runtime the classifier only needs to embed the user prompt and compute
 * two cosine similarities — no reference phrase embedding calls needed.
 */

// prettier-ignore
export const searchCentroid: number[] = ${JSON.stringify(searchCentroid)};

// prettier-ignore
export const noSearchCentroid: number[] = ${JSON.stringify(noSearchCentroid)};
`;

  const outPath = resolve(__dirname, "../src/lib/chat/webSearchCentroids.ts");
  writeFileSync(outPath, output, "utf-8");
  console.log(`Written to ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
