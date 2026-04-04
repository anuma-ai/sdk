/**
 * E2E test: client tool selection (full pipeline)
 *
 * Simulates the real tool selection path in useChatStorage:
 *   1. Fetch all server tools (with embeddings) via getServerTools
 *   2. Use findMatchingTools to semantically filter server tools
 *   3. Use findMatchingTools to auto-filter client tools
 *   4. Merge both sets via mergeTools
 *
 * Each test case checks whether the right client-side tools survive
 * the filtering and merging when competing against the full server
 * tool catalog. Failures here mean tool descriptions need rewording
 * or the matching thresholds need tuning.
 */

import "dotenv/config";
import { describe, it, expect, beforeAll } from "vitest";
import {
  findMatchingTools,
  getServerTools,
  mergeTools,
  type ServerTool,
} from "../../src/lib/tools/serverTools.js";
import { generateEmbedding, generateEmbeddings } from "../../src/lib/memoryEngine/embeddings.js";
import { config } from "./setup.js";

const { portalKey: apiKey, baseUrl } = config;

// ── Client tool definitions ──────────────────────────────────────────────────
// Mirrors the tool names and descriptions from src/tools/*.ts.

const CLIENT_TOOLS: { name: string; description: string }[] = [
  {
    name: "display_weather",
    description:
      "Fetches and displays current weather as a visual card in the chat. ALWAYS call this tool when the user asks about weather, even if you already have weather data from another tool. The card displays temperature, conditions, and a 7-day forecast visually — do NOT repeat this data in your text response. Just add a brief conversational comment if appropriate.",
  },
  {
    name: "display_chart",
    description:
      "Render data visualization charts when the user explicitly requests a bar chart, line chart, area chart, or pie chart of their data. Accepts an array of data points and renders the chart inline in the conversation.",
  },
  {
    name: "prompt_user_choice",
    description:
      "Renders an interactive inline menu the user can click to pick from choices. Use when the user's request naturally involves selecting between specific, concrete options — for example picking a restaurant, choosing a travel destination, or selecting a category. Call this tool FIRST before generating any response text. After the user selects, you receive their choice and can respond based on it.",
  },
  {
    name: "prompt_user_form",
    description:
      "Renders an interactive inline form the user can fill out and submit. Use when you need to collect 2 or more specific pieces of structured information from the user — for example trip planning details (destination, dates, budget), booking info, or configuration settings. Supports text inputs, textareas, dropdowns (select), toggles, date pickers, and sliders. Call this tool FIRST before generating any response text. After the user submits, you receive all their answers at once.",
  },
  {
    name: "display_phone_call_offer",
    description:
      "Render a phone call offer for a single business when you know their phone number and a call would help confirm reservation availability or product availability.",
  },
  {
    name: "geolocate_ip",
    description:
      "Look up the geographic location of an IP address. Returns country, city, ISP, coordinates, and timezone.",
  },
  {
    name: "get_current_time",
    description:
      "Get the current date and time for a given IANA timezone (e.g. America/New_York, Europe/London).",
  },
  {
    name: "github_get_authenticated_user",
    description:
      "Get the authenticated GitHub user's profile including username and organizations. Call this first to discover the user's identity before making other GitHub API calls.",
  },
  {
    name: "github_api",
    description:
      'Make an authenticated request to the GitHub REST API (https://api.github.com). You can call any endpoint documented at https://docs.github.com/en/rest. Examples: List PRs: GET /repos/{owner}/{repo}/pulls?state=open, Get file: GET /repos/{owner}/{repo}/contents/{path}, Create issue: POST /repos/{owner}/{repo}/issues with body {"title": "...", "body": "..."}, Search repos: GET /search/repositories?q={query}. IMPORTANT: For write operations (POST, PUT, PATCH, DELETE), always confirm with the user before executing. This includes creating issues, opening PRs, merging, committing files, and submitting reviews.',
  },
];

// Match the constants from useChatStorage.ts
const MAX_CLIENT_TOOLS_AFTER_FILTER = 3;
const CLIENT_TOOLS_MIN_SIMILARITY = 0.4;
const CLIENT_TOOLS_AMBIGUITY_THRESHOLD = 0.55;
const CLIENT_TOOLS_MIN_LEAD = 0.025;

// Server tool matching uses selectServerSideTools defaults
const SERVER_TOOLS_LIMIT = 10;
const SERVER_TOOLS_MIN_SIMILARITY = 0.3;

// ── Shared state ─────────────────────────────────────────────────────────────

const embeddingOptions = { apiKey, baseUrl };

let allServerTools: ServerTool[] = [];
let clientToolEmbeddings: Map<string, number[]> = new Map();

// ── Helpers ──────────────────────────────────────────────────────────────────

function buildClientPseudoServerTools(): ServerTool[] {
  return CLIENT_TOOLS.map((t) => ({
    type: "function" as const,
    name: t.name,
    description: t.description,
    parameters: { type: "object", properties: {}, required: [] },
    embedding: clientToolEmbeddings.get(t.name)!,
  }));
}

/**
 * Simulate the full tool selection pipeline from useChatStorage:
 * 1. Generate embedding for the prompt
 * 2. Filter server tools by semantic match (like selectServerSideTools)
 * 3. Filter client tools by semantic match (like autoFilterClientTools)
 * 4. Merge both sets (like mergeTools)
 */
async function selectTools(prompt: string) {
  const promptEmbedding = await generateEmbedding(prompt, embeddingOptions);

  // Server tool filtering (same as selectServerSideTools)
  const serverMatches = findMatchingTools(promptEmbedding, allServerTools, {
    limit: SERVER_TOOLS_LIMIT,
    minSimilarity: SERVER_TOOLS_MIN_SIMILARITY,
  });
  const filteredServerTools = serverMatches.map((m) => m.tool);

  // Client tool filtering (same as autoFilterClientTools)
  const clientPseudoTools = buildClientPseudoServerTools();
  let clientMatches = findMatchingTools(promptEmbedding, clientPseudoTools, {
    limit: MAX_CLIENT_TOOLS_AFTER_FILTER,
    minSimilarity: CLIENT_TOOLS_MIN_SIMILARITY,
  });

  // Ambiguity check: when the top score is low AND tightly clustered with the
  // runner-up, no tool is a genuine match — skip them all.
  if (clientMatches.length > 0) {
    const topScore = clientMatches[0].similarity;
    const runnerUpScore = clientMatches.length > 1 ? clientMatches[1].similarity : 0;
    if (
      topScore < CLIENT_TOOLS_AMBIGUITY_THRESHOLD &&
      topScore - runnerUpScore < CLIENT_TOOLS_MIN_LEAD
    ) {
      clientMatches = [];
    }
  }

  // Merge (server first, then client — deduped by name)
  const filteredClientToolConfigs = clientMatches.map((m) => ({
    type: "function" as const,
    function: {
      name: m.tool.name,
      description: m.tool.description,
      parameters: m.tool.parameters,
    },
  }));
  const merged = mergeTools(filteredServerTools, filteredClientToolConfigs, "responses");

  // Extract tool names from merged result
  const allToolNames = merged.map((t) => (t.name as string) || "");

  return {
    serverMatches,
    clientMatches,
    allToolNames,
    merged,
  };
}

// ── Test cases ───────────────────────────────────────────────────────────────

interface ToolSelectionCase {
  label: string;
  prompt: string;
  /** Client tool(s) that MUST be in the final merged set */
  clientMustInclude?: string[];
  /** Client tool(s) that MUST NOT be in the final merged set */
  clientMustExclude?: string[];
  /** The top client match must have similarity above this */
  minTopClientSimilarity?: number;
  /** The top client match must have similarity below this (for negative cases) */
  maxTopClientSimilarity?: number;
  /** Expect no client tools to survive filtering */
  expectNoClientTools?: boolean;
}

const cases: ToolSelectionCase[] = [
  // ── Weather ──────────────────────────────────────────────────────────
  {
    label: "weather query includes display_weather",
    prompt: "What's the weather like in Paris today?",
    clientMustInclude: ["display_weather"],
    clientMustExclude: ["display_chart", "github_api"],
  },
  {
    label: "forecast query includes display_weather",
    prompt: "Will it rain this weekend in New York?",
    clientMustInclude: ["display_weather"],
    clientMustExclude: ["display_chart"],
  },
  {
    label: "temperature query includes display_weather",
    prompt: "How hot is it in Dubai right now?",
    clientMustInclude: ["display_weather"],
    clientMustExclude: ["display_chart"],
  },

  // ── Charts ───────────────────────────────────────────────────────────
  {
    label: "chart request includes display_chart",
    prompt: "Show me a bar chart of monthly sales data",
    clientMustInclude: ["display_chart"],
    clientMustExclude: ["display_weather", "github_api"],
  },
  {
    label: "data visualization includes display_chart",
    prompt: "Create a pie chart showing the distribution of expenses",
    clientMustInclude: ["display_chart"],
    clientMustExclude: ["display_weather"],
  },
  {
    label: "line chart includes display_chart",
    prompt: "Plot a line chart of my portfolio performance over the last year",
    clientMustInclude: ["display_chart"],
  },

  // ── Choice ───────────────────────────────────────────────────────────
  {
    label: "choosing between options includes prompt_user_choice",
    prompt: "Help me choose between Italian, Japanese, or Mexican food for dinner",
    clientMustInclude: ["prompt_user_choice"],
  },
  {
    label: "selection request includes prompt_user_choice",
    prompt: "Which of these travel destinations should I visit: Bali, Tokyo, or Paris?",
    clientMustInclude: ["prompt_user_choice"],
  },

  // ── Form ─────────────────────────────────────────────────────────────
  {
    label: "trip planning includes prompt_user_form",
    prompt: "I want to plan a trip — I need to enter my destination, dates, and budget",
    clientMustInclude: ["prompt_user_form"],
  },
  {
    label: "booking details includes prompt_user_form",
    prompt: "Let me fill out my booking details: name, email, dates, and room preferences",
    clientMustInclude: ["prompt_user_form"],
  },

  // ── Phone call offer ─────────────────────────────────────────────────
  {
    label: "calling a business includes display_phone_call_offer",
    prompt: "Can you call this restaurant to check if they have a table tonight?",
    clientMustInclude: ["display_phone_call_offer"],
  },
  {
    label: "phone reservation includes display_phone_call_offer",
    prompt: "I'd like to make a phone call to confirm my reservation at the hotel",
    clientMustInclude: ["display_phone_call_offer"],
  },

  // ── IP Geolocation ───────────────────────────────────────────────────
  {
    label: "IP lookup includes geolocate_ip",
    prompt: "Where is this IP address located: 8.8.8.8?",
    clientMustInclude: ["geolocate_ip"],
  },

  // ── Timezone ─────────────────────────────────────────────────────────
  {
    label: "time query includes get_current_time",
    prompt: "What time is it in Tokyo right now?",
    clientMustInclude: ["get_current_time"],
  },
  {
    label: "timezone conversion includes get_current_time",
    prompt: "What's the current time in Europe/London?",
    clientMustInclude: ["get_current_time"],
  },

  // ── GitHub ───────────────────────────────────────────────────────────
  {
    label: "GitHub PR query includes github tools",
    prompt: "List the open pull requests in my repository",
    clientMustInclude: ["github_api"],
  },
  {
    label: "GitHub issues includes github tools",
    prompt: "Show me the latest issues on the repo",
    clientMustInclude: ["github_api"],
  },

  // ── Negative cases ───────────────────────────────────────────────────
  // For trivial/generic prompts, no client tool should survive the
  // ambiguity filter (low top score + clustered scores = no clear match).
  {
    label: "general chat: no client tools selected",
    prompt: "Tell me a joke about programming",
    expectNoClientTools: true,
  },
  {
    label: "math question: no client tools selected",
    prompt: "What is the square root of 144?",
    expectNoClientTools: true,
  },
  {
    label: "simple greeting: no client tools selected",
    prompt: "Hello, how are you?",
    expectNoClientTools: true,
  },
];

// ── Test runner ──────────────────────────────────────────────────────────────

describe("client tool selection (full pipeline)", () => {
  beforeAll(async () => {
    // Fetch server tools and generate client tool embeddings once
    const [serverTools, clientEmbeddings] = await Promise.all([
      getServerTools({ apiKey, baseUrl, forceRefresh: true }),
      generateEmbeddings(
        CLIENT_TOOLS.map((t) => t.description),
        embeddingOptions
      ),
    ]);

    allServerTools = serverTools;
    for (let i = 0; i < CLIENT_TOOLS.length; i++) {
      clientToolEmbeddings.set(CLIENT_TOOLS[i].name, clientEmbeddings[i]);
    }

    console.log(`  Server tools loaded: ${allServerTools.length}`);
    console.log(`  Client tools: ${CLIENT_TOOLS.length}`);
  }, 30_000);

  for (const tc of cases) {
    it(tc.label, async () => {
      const { serverMatches, clientMatches, allToolNames } = await selectTools(tc.prompt);

      const serverNames = serverMatches.map((m) => `${m.tool.name} (${m.similarity.toFixed(3)})`);
      const clientDetails = clientMatches.map((m) => `${m.tool.name} (${m.similarity.toFixed(3)})`);

      console.log(`  [${tc.label}]`);
      console.log(`    prompt: "${tc.prompt}"`);
      console.log(`    server tools (${serverMatches.length}): [${serverNames.join(", ")}]`);
      console.log(`    client tools (${clientMatches.length}): [${clientDetails.join(", ")}]`);
      console.log(`    merged total: ${allToolNames.length}`);

      const clientNames = clientMatches.map((m) => m.tool.name);

      if (tc.clientMustInclude) {
        for (const required of tc.clientMustInclude) {
          expect(
            clientNames,
            `Expected client tool "${required}" for: "${tc.prompt}" (got: [${clientDetails.join(", ")}])`
          ).toContain(required);
          // Also verify it made it into the final merged set
          expect(
            allToolNames,
            `Client tool "${required}" was filtered but didn't make it into merged tools`
          ).toContain(required);
        }
      }

      if (tc.clientMustExclude) {
        for (const excluded of tc.clientMustExclude) {
          expect(
            clientNames,
            `Client tool "${excluded}" should NOT be selected for: "${tc.prompt}"`
          ).not.toContain(excluded);
        }
      }

      if (tc.expectNoClientTools) {
        expect(
          clientMatches.length,
          `Expected no client tools for: "${tc.prompt}" (got: [${clientDetails.join(", ")}])`
        ).toBe(0);
      }

      if (tc.minTopClientSimilarity !== undefined && clientMatches.length > 0) {
        expect(
          clientMatches[0].similarity,
          `Top client match "${clientMatches[0].tool.name}" (${clientMatches[0].similarity.toFixed(3)}) should be >= ${tc.minTopClientSimilarity}`
        ).toBeGreaterThanOrEqual(tc.minTopClientSimilarity);
      }

      if (tc.maxTopClientSimilarity !== undefined && clientMatches.length > 0) {
        expect(
          clientMatches[0].similarity,
          `Top client match "${clientMatches[0].tool.name}" (${clientMatches[0].similarity.toFixed(3)}) should be < ${tc.maxTopClientSimilarity} for: "${tc.prompt}"`
        ).toBeLessThan(tc.maxTopClientSimilarity);
      }
    });
  }
});
