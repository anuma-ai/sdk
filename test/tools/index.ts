#!/usr/bin/env node
/**
 * selectServerSideTools integration test
 *
 * Usage:
 *   tsx test/tools/index.ts "generate an image of a cat"
 *   tsx test/tools/index.ts "swap ETH for BTC" --completions
 *   tsx test/tools/index.ts --limit 3 --min-similarity 0.4
 */

import "dotenv/config";
import { parseArgs } from "node:util";
import { selectServerSideTools } from "../../src/lib/tools/serverTools.js";

const { values: args, positionals } = parseArgs({
  options: {
    completions: { type: "boolean", default: false },
    limit: { type: "string" },
    "min-similarity": { type: "string" },
  },
  allowPositionals: true,
});

const apiKey = process.env.PORTAL_API_KEY;
const baseUrl = process.env.REVERBIA_API_URL || "https://portal.anuma-dev.ai";

if (!apiKey) {
  console.error(
    "PORTAL_API_KEY is required.\n\n" +
      "Add it to your .env file or pass inline:\n" +
      "  PORTAL_API_KEY=your-key tsx test/tools/index.ts\n"
  );
  process.exit(1);
}

const prompt = positionals[0] || "What's the price of ETH?";
const apiType = args.completions ? "completions" : "responses";
const limit = args.limit ? Number(args.limit) : undefined;
const minSimilarity = args["min-similarity"] ? Number(args["min-similarity"]) : undefined;

async function main() {
  console.log(`Base URL: ${baseUrl}`);
  console.log(`Prompt:   "${prompt}"`);
  console.log(`Format:   ${apiType}`);
  if (limit !== undefined) console.log(`Limit:    ${limit}`);
  if (minSimilarity !== undefined) console.log(`Min sim:  ${minSimilarity}`);
  console.log();

  const tools = await selectServerSideTools({
    prompt,
    apiKey,
    baseUrl,
    apiType,
    limit,
    minSimilarity,
  });

  console.log(`Matched ${tools.length} tools:\n`);

  for (const tool of tools) {
    const name =
      apiType === "completions" ? (tool as Record<string, any>).function.name : tool.name;
    console.log(`  ${name}`);
  }
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
