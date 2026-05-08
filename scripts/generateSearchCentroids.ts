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

  // Financial
  "What is the current stock price and market trading data",
  "What is the Bitcoin Ethereum cryptocurrency price right now",
  "What are the Dow Jones Nasdaq S&P 500 earnings today",
  "What is the exchange rate for this currency pair",
  "How much is this stock share or token worth now",

  // Weather
  "What is the weather forecast and temperature today",
  "Is it going to rain snow or be sunny this week",
  "What is the air quality UV index and humidity right now",
  "What is the sunrise sunset tide or flood risk",

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
];

function averageVectors(vectors: number[][]): number[] {
  if (vectors.length === 0) {
    throw new Error("averageVectors: received an empty vector list");
  }
  const dim = vectors[0].length;
  for (let i = 1; i < vectors.length; i++) {
    if (vectors[i].length !== dim) {
      throw new Error(
        `averageVectors: dimension mismatch — vectors[0] has ${dim} dims, vectors[${i}] has ${vectors[i].length}`
      );
    }
  }
  const avg = new Array(dim).fill(0);
  for (const v of vectors) {
    for (let i = 0; i < dim; i++) {
      avg[i] += v[i];
    }
  }
  for (let i = 0; i < dim; i++) {
    avg[i] /= vectors.length;
  }
  return avg;
}

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
