import "dotenv/config";
import { writeFileSync } from "fs";
import { resolve } from "path";

import { BASE_URL } from "../src/clientConfig";
import { generateEmbeddings } from "../src/lib/memoryEngine/embeddings";
import { averageVectors } from "./lib/centroids";
import { GENERIC_NEGATIVE_PHRASES } from "./lib/genericNegatives";

const CRYPTO_PRICE_PHRASES = [
  "What is the current price of Bitcoin",
  "How much is Ethereum worth right now",
  "Show me the ZETA price",
  "What is BTC trading at",
  "Current Solana price in USD",
  "How much is one Cardano coin",
  "What's the price of $BTC",
  "$ETH price today",

  "Is Bitcoin up or down today",
  "How much has Ethereum moved in the last 24 hours",
  "What is the 7-day change for SOL",
  "Show the price chart for ZETA over the last month",
  "Is the crypto market up or down right now",
  "Has BTC pumped today",
  "How much did ETH drop this week",

  "What is the market cap of Ethereum",
  "Show me Bitcoin market dominance",
  "What is the trading volume for SOL today",
  "What is the circulating supply of ZETA",
  "What is the all-time high for Bitcoin",
  "Total Value Locked in DeFi",
  "Fully diluted valuation of Solana",

  "BTC price",
  "ETH USD",
  "ZETA token price",
  "DOGE market cap",
  "Solana valuation",
  "Polygon trading volume",
  "Avalanche price",
  "Polkadot price now",

  "What's the price of L1 tokens today",
  "Show me top L2 token prices",
  "DeFi token prices",
  "Memecoin prices today",

  "PAXG price",
  "PAX Gold price today",
  "Live PAXG price",
  "PAXG market price right now",
  "How much is PAXG worth",
  "What is the PAX Gold token worth",
  "XAUT price today",
  "Tether Gold price",
  "XAUT live price",
  "How much is XAUT trading at",
  "Price of gold-backed tokens",
  "What is the price of gold today",
  "Show me the price of gold",
  "Gold token price",
  "Gold-pegged token price",
  "Price of silver tokens",
  "Silver-backed token price",
  "What is the price of silver today",
  "Show me the price of silver",
  "Silver token price",
  "Silver-pegged token live price",

  "How much does one Bitcoin cost in USD right now",
  "Compare ETH and BTC prices over the last week",
  "What's the dollar value of 100 ZETA",
  "Latest crypto prices",
  "Top movers in crypto today",
];

const NO_CRYPTO_PRICE_PHRASES = [
  "Explain how Bitcoin mining works",
  "What is the difference between proof-of-stake and proof-of-work",
  "How does ZetaChain enable cross-chain transfers",
  "Write a smart contract that mints an ERC-20 token",
  "How do I bridge tokens from Ethereum to Solana",
  "What is a rollup and how does it work",
  "Explain MEV and front-running",
  "What is account abstraction",

  "What is the current Nvidia stock price",
  "How is Apple stock performing today",
  "Show me the S&P 500 right now",
  "What is the Dow Jones at today",
  "Tesla stock price now",
  "MSFT after-hours price",
  "USD to EUR exchange rate",
  "How much is one British pound in dollars",
  "What is NVDA trading at",
  "What is the current price of Tesla shares",
  "How much is one share of Apple worth",
  "Show me the AMZN chart",
  "What's the 7-day change for GOOGL",
  "Is Nvidia up or down today",
  "Market cap of Microsoft",
  "Trading volume for SPY today",
  "All-time high for Apple stock",
  "Tesla stock chart over the last month",
  "What's the price of $NVDA",
  "$AAPL price today",
  "QQQ ETF price",
  "Latest stock prices",
  "Top movers in the stock market",
  "USD to JPY rate today",
  "EUR/USD live rate",
  "Spot price of silver",
  "Oil price right now",
  "Dividend yield of MSFT",
  "P/E ratio of NVDA",
  "S&P 500 close yesterday",
  "Pre-market movers",

  ...GENERIC_NEGATIVE_PHRASES,

  "What did Elon Musk tweet about today",
  "Who won the Super Bowl this year",
  "What is the weather in Tokyo tomorrow",
  "Find Italian restaurants near me",

  "Oil price today",
  "Spot price of platinum",
  "Spot price of copper",
  "Wheat futures price right now",
  "Spot price of crude oil",
  "Platinum spot price per ounce",
  "Industrial platinum demand and pricing",
  "Platinum NYMEX futures contract",
  "Platinum bullion market price",
  "Spot platinum commodity index",

  "What are Ethereum gas fees right now",
  "Current gas price in gwei",
  "Network fees on Ethereum today",
];

async function main() {
  const apiKey = process.env.PORTAL_API_KEY;
  const baseUrl = process.env.ANUMA_API_URL || BASE_URL;

  if (!apiKey) {
    console.error("PORTAL_API_KEY is required");
    process.exit(1);
  }

  console.log(`Using baseUrl: ${baseUrl}`);
  console.log("Embedding crypto-price phrases...");
  const priceEmbeddings = await generateEmbeddings(CRYPTO_PRICE_PHRASES, { apiKey, baseUrl });

  console.log("Embedding no-crypto-price phrases...");
  const noPriceEmbeddings = await generateEmbeddings(NO_CRYPTO_PRICE_PHRASES, { apiKey, baseUrl });

  const cryptoPriceCentroid = averageVectors(priceEmbeddings);
  const noCryptoPriceCentroid = averageVectors(noPriceEmbeddings);

  console.log(`Dimensions: ${cryptoPriceCentroid.length}`);

  const output = `/**
 * Pre-computed centroid vectors for the crypto-price classifier.
 *
 * Generated by: npx tsx scripts/generateCryptoPriceCentroids.ts
 *
 * cryptoPriceCentroid: average embedding of phrases representing "needs crypto price data" intent.
 * noCryptoPriceCentroid: average embedding of phrases representing "no crypto price needed" intent.
 *
 * At runtime the classifier only needs to embed the user prompt and compute
 * two cosine similarities — no reference phrase embedding calls needed.
 *
 * Note: depending on which floats land in this regen, ESLint's
 * \`no-loss-of-precision\` rule may fire on the literal array below. If lint
 * complains, add \`/* eslint-disable no-loss-of-precision *\\/\` above the
 * \`export const\` line — but don't add it pre-emptively, because the
 * \`reportUnusedDisableDirectives\` check will then fail when the regen happens
 * to produce safe floats.
 */

// prettier-ignore
export const cryptoPriceCentroid: number[] = ${JSON.stringify(cryptoPriceCentroid)};

// prettier-ignore
export const noCryptoPriceCentroid: number[] = ${JSON.stringify(noCryptoPriceCentroid)};
`;

  const outPath = resolve(__dirname, "../src/lib/chat/cryptoPriceCentroids.ts");
  writeFileSync(outPath, output, "utf-8");
  console.log(`Written to ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
