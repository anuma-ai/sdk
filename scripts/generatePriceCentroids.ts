/**
 * One-time script to generate centroid vectors for the price classifier
 * (covers crypto, stocks, and FX queries).
 *
 * Embeds the reference phrases, averages each class into a single centroid,
 * and writes the result to src/lib/chat/priceCentroids.ts.
 *
 * Usage:
 *   PORTAL_API_KEY=... npx tsx scripts/generatePriceCentroids.ts
 */

import "dotenv/config";
import { writeFileSync } from "fs";
import { resolve } from "path";

import { BASE_URL } from "../src/clientConfig";
import { generateEmbeddings } from "../src/lib/memoryEngine/embeddings";

const PRICE_PHRASES = [
  // Direct price queries — crypto
  "What is the current price of Bitcoin",
  "How much is Ethereum worth right now",
  "Show me the ZETA price",
  "What is BTC trading at",
  "Current Solana price in USD",
  "How much is one Cardano coin",

  // Price + change / movement
  "Is Bitcoin up or down today",
  "How much has Ethereum moved in the last 24 hours",
  "What is the 7-day change for SOL",
  "Show the price chart for ZETA over the last month",
  "Is the crypto market up or down right now",

  // Market data / valuation
  "What is the market cap of Ethereum",
  "Show me Bitcoin market dominance",
  "What is the trading volume for SOL today",
  "What is the circulating supply of ZETA",
  "What is the all-time high for Bitcoin",

  // Token / ticker direct
  "BTC price",
  "ETH USD",
  "ZETA token price",
  "DOGE market cap",
  "Solana valuation",
  "Polygon trading volume",

  // Stocks (also a price query, treat the same way)
  "What is the current Nvidia stock price",
  "How is Apple stock performing today",
  "Show me the S&P 500 right now",
  "What is the Dow Jones at today",
  "Tesla stock price now",
  "MSFT after-hours price",

  // FX
  "What is the current USD to EUR exchange rate",
  "How much is one British pound in dollars",
  "What is the JPY to USD rate today",

  // Mixed phrasings
  "How much does one Bitcoin cost in USD right now",
  "Compare ETH and BTC prices over the last week",
  "What's the dollar value of 100 ZETA",
  "Is now a good time to check the price of Solana",
  "Latest crypto prices",
];

const NO_PRICE_PHRASES = [
  // Crypto adjacent but NOT price
  "Explain how Bitcoin mining works",
  "What is the difference between proof-of-stake and proof-of-work",
  "How does ZetaChain enable cross-chain transfers",
  "Write a smart contract that mints an ERC-20 token",
  "How do I bridge tokens from Ethereum to Solana",
  "What is a rollup and how does it work",
  "Explain MEV and front-running",

  // General programming / engineering
  "Write a Python function that checks if a number is prime",
  "Refactor this code to use async/await",
  "Why is my React component re-rendering",
  "How do I configure a Postgres connection pool",

  // Reasoning / analysis
  "Summarize the article I pasted above",
  "What are the pros and cons of microservices",
  "Explain the differences between TCP and UDP",

  // Creative
  "Write me a short poem about the ocean",
  "Generate 5 startup name ideas",
  "Tell me a joke about programming",

  // Translation / language
  "Translate 'good morning' into Japanese",
  "What is the grammatical structure of this sentence",

  // Math / physics / general knowledge
  "What is the derivative of x squared",
  "Explain how gravity works",
  "What year did World War 2 end",
  "How does photosynthesis work",
  "What is the speed of light",

  // Personal / advice
  "Help me draft a resignation letter",
  "Give me tips for a job interview",
  "How should I structure my resume",

  // Conversational
  "Hello how are you",
  "Thank you for your help",
  "Can you explain that again",

  // News / current events that are NOT price (web-search territory, not crypto-price)
  "What did Elon Musk tweet about today",
  "Who won the Super Bowl this year",
  "What is the weather in Tokyo tomorrow",
  "Find Italian restaurants near me",
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
  console.log("Embedding price phrases...");
  const priceEmbeddings = await generateEmbeddings(PRICE_PHRASES, { apiKey, baseUrl });

  console.log("Embedding no-price phrases...");
  const noPriceEmbeddings = await generateEmbeddings(NO_PRICE_PHRASES, { apiKey, baseUrl });

  const priceCentroid = averageVectors(priceEmbeddings);
  const noPriceCentroid = averageVectors(noPriceEmbeddings);

  console.log(`Dimensions: ${priceCentroid.length}`);

  const output = `/**
 * Pre-computed centroid vectors for the price classifier (crypto, stocks, FX).
 *
 * Generated by: npx tsx scripts/generatePriceCentroids.ts
 *
 * priceCentroid: average embedding of phrases representing "needs price data" intent.
 * noPriceCentroid: average embedding of phrases representing "no price needed" intent.
 *
 * At runtime the classifier only needs to embed the user prompt and compute
 * two cosine similarities — no reference phrase embedding calls needed.
 */

/* eslint-disable no-loss-of-precision -- floats serialized via JSON.stringify
   may exceed JS Number precision in the last digit; that loss is below the
   cosine-similarity noise floor at 4096 dimensions. */

// prettier-ignore
export const priceCentroid: number[] = ${JSON.stringify(priceCentroid)};

// prettier-ignore
export const noPriceCentroid: number[] = ${JSON.stringify(noPriceCentroid)};
`;

  const outPath = resolve(__dirname, "../src/lib/chat/priceCentroids.ts");
  writeFileSync(outPath, output, "utf-8");
  console.log(`Written to ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
