/**
 * One-time script to generate centroid vectors for the weather classifier.
 *
 * Embeds the reference phrases, averages each class into a single centroid,
 * and writes the result to src/lib/chat/weatherCentroids.ts.
 *
 * Usage:
 *   PORTAL_API_KEY=... npx tsx scripts/generateWeatherCentroids.ts
 */

import "dotenv/config";
import { writeFileSync } from "fs";
import { resolve } from "path";

import { BASE_URL } from "../src/clientConfig";
import { generateEmbeddings } from "../src/lib/memoryEngine/embeddings";

const WEATHER_PHRASES = [
  // Forecasts
  "What's the weather in San Francisco today",
  "Will it rain in New York this weekend",
  "Weather forecast for Tokyo tomorrow",
  "Is it going to be sunny in Paris on Saturday",
  "What's the weekly forecast for Berlin",
  "Will there be snow in Denver next week",
  "5-day forecast for Miami",
  "Will it be cold in Chicago tonight",

  // Temperature
  "What's the temperature in Dubai right now",
  "How hot is it in Phoenix",
  "Current temperature in London",
  "Will it freeze tomorrow in Helsinki",
  "What's the high today in Madrid",
  "Heat index in Houston",

  // Precipitation / conditions
  "Is it raining in Seattle right now",
  "Will it snow in Aspen this week",
  "Chance of thunderstorms in Atlanta tomorrow",
  "Cloud cover in Reykjavik",
  "Is it humid in Singapore today",
  "Will there be fog in San Francisco tonight",

  // Wind / sun
  "Wind speed in Wellington",
  "What time is sunrise in Iceland today",
  "Sunset time in Tokyo",
  "UV index in Sydney right now",
  "Is it windy in Chicago today",

  // Air quality
  "What is the air quality in Beijing",
  "AQI in Los Angeles right now",
  "Pollution levels in Delhi today",
  "PM2.5 levels in Shanghai",

  // Marine / flood / specialty
  "Tide times in San Diego today",
  "Wave height at Mavericks",
  "Flood risk in Houston tomorrow",
  "River discharge in the Rhine",
  "Sea temperature off Florida",
  "Marine forecast for the Gulf of Mexico",

  // Climate / historical weather
  "Historical weather in Rome last July",
  "What was the temperature in Cairo last year",
  "Climate projection for Sao Paulo by 2050",

  // Short / conversational
  "weather tomorrow",
  "forecast Paris",
  "rain today",
  "temperature outside",
];

const NO_WEATHER_PHRASES = [
  // Crypto / stock / finance — must NOT trigger weather
  "What is the current price of Bitcoin",
  "How much is Tesla stock worth today",
  "USD to EUR exchange rate",
  "S&P 500 today",
  "Market cap of Ethereum",

  // Weather-adjacent reasoning but NOT a forecast
  "How does the water cycle work",
  "Why does it rain",
  "Explain how hurricanes form",
  "What is the difference between weather and climate",
  "How do weather satellites work",
  "What causes the seasons",
  "Why is the sky blue",

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

  // Math / physics / general knowledge
  "What is the derivative of x squared",
  "Explain how gravity works",
  "What year did World War 2 end",
  "How does photosynthesis work",

  // Personal / advice
  "Help me draft a resignation letter",
  "Give me tips for a job interview",

  // Conversational
  "Hello how are you",
  "Thank you for your help",
  "Can you explain that again",

  // Other current-data web searches
  "What did Elon Musk tweet about today",
  "Who won the Super Bowl this year",
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
  console.log("Embedding weather phrases...");
  const weatherEmbeddings = await generateEmbeddings(WEATHER_PHRASES, { apiKey, baseUrl });

  console.log("Embedding no-weather phrases...");
  const noWeatherEmbeddings = await generateEmbeddings(NO_WEATHER_PHRASES, { apiKey, baseUrl });

  const weatherCentroid = averageVectors(weatherEmbeddings);
  const noWeatherCentroid = averageVectors(noWeatherEmbeddings);

  console.log(`Dimensions: ${weatherCentroid.length}`);

  const output = `/**
 * Pre-computed centroid vectors for the weather classifier.
 *
 * Generated by: npx tsx scripts/generateWeatherCentroids.ts
 *
 * weatherCentroid: average embedding of phrases representing "needs weather data" intent.
 * noWeatherCentroid: average embedding of phrases representing "no weather needed" intent.
 *
 * At runtime the classifier only needs to embed the user prompt and compute
 * two cosine similarities — no reference phrase embedding calls needed.
 */

/* eslint-disable no-loss-of-precision -- floats serialized via JSON.stringify
   may exceed JS Number precision in the last digit; that loss is below the
   cosine-similarity noise floor at 4096 dimensions. */

// prettier-ignore
export const weatherCentroid: number[] = ${JSON.stringify(weatherCentroid)};

// prettier-ignore
export const noWeatherCentroid: number[] = ${JSON.stringify(noWeatherCentroid)};
`;

  const outPath = resolve(__dirname, "../src/lib/chat/weatherCentroids.ts");
  writeFileSync(outPath, output, "utf-8");
  console.log(`Written to ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
