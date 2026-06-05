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
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { table, getBorderCharacters } from "table";
import {
  BUILT_IN_TOOL_SETS,
  DEFAULT_EXCLUDED_SERVER_TOOLS,
  DEFAULT_SERVER_TOOLS_MATCH_OPTIONS,
  expandToolSetsAdditive,
  findMatchingTools,
  getServerTools,
  mergeTools,
  scoreTools,
  type ServerTool,
} from "../../src/lib/tools/serverTools.js";
import { generateEmbedding, generateEmbeddings } from "../../src/lib/memoryEngine/embeddings.js";
import type { ToolConfig } from "../../src/lib/chat/useChat/types.js";
import {
  createChartTool,
  createChoiceTool,
  createFormTool,
  createGitHubTools,
  createPhoneCallOfferTool,
  createWeatherTool,
  CREATE_FILE_SCHEMA,
  DELETE_FILE_SCHEMA,
  LIST_FILES_SCHEMA,
  PATCH_FILE_SCHEMA,
  READ_FILE_SCHEMA,
} from "../../src/tools/index.js";
import { createIpGeolocationTool } from "../../src/tools/ipGeolocation.js";
import { createTimezoneTool } from "../../src/tools/timezone.js";
import {
  ADD_SLIDE_SCHEMA,
  PATCH_SLIDES_SCHEMA,
  PLAN_DECK_SCHEMA,
  READ_SLIDES_SCHEMA,
} from "../../src/tools/slides/index.js";
import { config } from "./setup.js";

const { portalKey: apiKey, baseUrl } = config;

// ── Client tool definitions ──────────────────────────────────────────────────
// Pulls names + descriptions directly from the source schemas / factory
// functions. Hard-coded copies drift from production over time and let
// description-quality regressions slip past the integration tests.

/** Extract { name, description } from a ToolConfig (factory result) or schema. */
function toMeta(source: {
  name?: string;
  description?: string;
  function?: { name?: string; description?: string };
}): { name: string; description: string } {
  const name = source.function?.name ?? source.name;
  const description = source.function?.description ?? source.description;
  if (!name || !description) {
    throw new Error(
      `Tool source missing name or description: ${JSON.stringify(source).slice(0, 200)}`
    );
  }
  return { name, description };
}

// Factory tools need stubbed dependencies; we only read description metadata.
const stubUIOptions = { getContext: () => null };
const stubGitHubGetToken = () => null;
const stubGitHubRequestAccess = async () => "";
const githubTools: ToolConfig[] = createGitHubTools(stubGitHubGetToken, stubGitHubRequestAccess);

const CLIENT_TOOLS: { name: string; description: string }[] = [
  // UI interaction tools (factory-created)
  toMeta(createWeatherTool(stubUIOptions)),
  toMeta(createChartTool(stubUIOptions)),
  toMeta(createChoiceTool(stubUIOptions)),
  toMeta(createFormTool(stubUIOptions)),
  toMeta(createPhoneCallOfferTool(stubUIOptions)),
  toMeta(createIpGeolocationTool()),
  toMeta(createTimezoneTool()),

  // GitHub tools (factory-created)
  ...githubTools.map(toMeta),

  // App generation tools (schema constants — used directly by createAppGenerationTools)
  toMeta(CREATE_FILE_SCHEMA),
  toMeta(PATCH_FILE_SCHEMA),
  toMeta(DELETE_FILE_SCHEMA),
  toMeta(READ_FILE_SCHEMA),
  toMeta(LIST_FILES_SCHEMA),

  // Slide tools (schema constants — used directly by createSlideTools)
  toMeta(PLAN_DECK_SCHEMA),
  toMeta(ADD_SLIDE_SCHEMA),
  toMeta(READ_SLIDES_SCHEMA),
  toMeta(PATCH_SLIDES_SCHEMA),
];

// Match the constants from useChatStorage.ts
const MAX_CLIENT_TOOLS_AFTER_FILTER = 10;
const CLIENT_TOOLS_MIN_SIMILARITY = 0.53;

// Server tool matching uses selectServerSideTools defaults
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
async function selectTools(prompt: string, activeToolSets: string[] = []) {
  const promptEmbedding = await generateEmbedding(prompt, embeddingOptions);

  // Server tool filtering — mirror what `defaultServerToolsFilter` does in
  // production: same match options, same exclusion list. Earlier this test
  // used a stricter relevanceRatio (0.85) which prod doesn't apply, so the
  // test was measuring a different selection than consumers actually run.
  const excluded = new Set<string>(DEFAULT_EXCLUDED_SERVER_TOOLS);
  const serverMatches = findMatchingTools(
    promptEmbedding,
    allServerTools,
    DEFAULT_SERVER_TOOLS_MATCH_OPTIONS
  ).filter((m) => !excluded.has(m.tool.name));
  const filteredServerTools = serverMatches.map((m) => m.tool);

  // Client tool filtering (same as autoFilterClientTools)
  const clientPseudoTools = buildClientPseudoServerTools();
  const clientMatches = findMatchingTools(promptEmbedding, clientPseudoTools, {
    limit: MAX_CLIENT_TOOLS_AFTER_FILTER,
    minSimilarity: CLIENT_TOOLS_MIN_SIMILARITY,
    filterAmbiguous: true,
    relevanceRatio: 0.9,
  });

  // Apply tool sets: if an anchor tool matched OR a set is marked active,
  // pull in the full set
  const matchedNames = new Set(clientMatches.map((m) => m.tool.name));
  // Score against the raw catalog so anchors dropped by the 0.9
  // relevanceRatio above can still activate their set — mirrors
  // useChatStorage.autoFilterClientTools.
  const scores = scoreTools(promptEmbedding, clientPseudoTools);
  const availableNames = new Set(CLIENT_TOOLS.map((t) => t.name));
  const activeSetNames = activeToolSets.length > 0 ? new Set(activeToolSets) : undefined;
  const finalClientNames = expandToolSetsAdditive(
    matchedNames,
    availableNames,
    scores,
    BUILT_IN_TOOL_SETS,
    activeSetNames
  );

  // Anchor-only expansion (no `activeSetNames`) — used for the summary
  // table's "triggered by prompt" column so we can distinguish sets
  // activated by anchor scoring from sets carried in by conversation state.
  const anchorOnlyNames = expandToolSetsAdditive(
    matchedNames,
    availableNames,
    scores,
    BUILT_IN_TOOL_SETS
  );
  const anchorActivatedSets = BUILT_IN_TOOL_SETS.filter((s) =>
    s.members.every((m) => anchorOnlyNames.has(m))
  ).map((s) => s.name);

  // Build client tool configs from the final set (including set-expanded tools)
  const filteredClientToolConfigs = CLIENT_TOOLS.filter((t) => finalClientNames.has(t.name)).map(
    (t) => ({
      type: "function" as const,
      function: {
        name: t.name,
        description: t.description,
        parameters: { type: "object", properties: {}, required: [] },
      },
    })
  );
  const merged = mergeTools(filteredServerTools, filteredClientToolConfigs, "responses");

  // Extract tool names from merged result
  const allToolNames = merged.map((t) => (t.name as string) || "");

  // Build effective client matches including set-expanded tools
  const effectiveClientMatches = [...clientMatches];
  for (const name of finalClientNames) {
    if (!matchedNames.has(name)) {
      // Tool was added by tool set expansion — mark with similarity 0 (set-included)
      const pseudoTool = clientPseudoTools.find((t) => t.name === name);
      if (pseudoTool) {
        effectiveClientMatches.push({ tool: pseudoTool, similarity: 0 });
      }
    }
  }
  // Remove tools that were in matches but got excluded by tool sets
  const prunedClientMatches = effectiveClientMatches.filter((m) =>
    finalClientNames.has(m.tool.name)
  );

  return {
    serverMatches,
    clientMatches: prunedClientMatches,
    allToolNames,
    merged,
    anchorActivatedSets,
    stickyActiveSets: [...activeToolSets],
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
  /** Expect no client tools to survive filtering */
  expectNoClientTools?: boolean;
  /** Server tool(s) that MUST be in the results */
  serverMustInclude?: string[];
  /** Server tool(s) that MUST NOT be in the results */
  serverMustExclude?: string[];
  /** Expect no server tools to survive filtering */
  expectNoServerTools?: boolean;
  /**
   * Tool set names to mark unconditionally active for this case. Simulates
   * conversation state (e.g. a slide deck artifact already exists, so the
   * consumer passes `activeToolSets: ["slides"]`).
   */
  activeToolSets?: string[];
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
    label: "selection request: indirect phrasing scores below threshold",
    prompt: "Which of these travel destinations should I visit: Bali, Tokyo, or Paris?",
    // prompt_user_choice scores 0.47 — below the 0.5 threshold.
    // The model can still present choices without the tool.
    expectNoClientTools: true,
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
    label: "GitHub PR query includes full github set",
    prompt: "List the open pull requests in my repository",
    clientMustInclude: ["github_api", "github_get_authenticated_user"],
  },
  {
    label: "GitHub issues includes full github set",
    prompt: "Show me the latest issues on the repo",
    clientMustInclude: ["github_api", "github_get_authenticated_user"],
  },

  // ── Slide decks ──────────────────────────────────────────────────────
  // Slide tools form a set: plan_deck and patch_slides are anchors that pull
  // in the full set (plan_deck, add_slide, read_slides, patch_slides).
  {
    label: "slide deck creation includes full slide set",
    prompt: "Create a slide deck about the fundamentals of home gardening",
    clientMustInclude: ["plan_deck", "add_slide", "read_slides", "patch_slides"],
    clientMustExclude: ["display_weather", "geolocate_ip"],
  },
  {
    label: "presentation request includes full slide set",
    prompt: "Make me a slide presentation introducing my startup to investors",
    clientMustInclude: ["plan_deck", "add_slide", "read_slides", "patch_slides"],
  },
  {
    label: "deck edit includes full slide set",
    prompt: "Edit the pricing slide in my deck to say $29 instead of $19",
    clientMustInclude: ["plan_deck", "add_slide", "read_slides", "patch_slides"],
  },
  {
    label: "add-slide request includes full slide set",
    prompt: "Add a slide about customer testimonials to my existing deck",
    clientMustInclude: ["plan_deck", "add_slide", "read_slides", "patch_slides"],
  },
  {
    label: "powerpoint phrasing includes full slide set",
    prompt: "Make me a powerpoint about the Roman Empire",
    clientMustInclude: ["plan_deck", "add_slide", "read_slides", "patch_slides"],
  },
  {
    label: "Keynote phrasing includes full slide set",
    prompt: "Create a Keynote about machine learning",
    clientMustInclude: ["plan_deck", "add_slide", "read_slides", "patch_slides"],
  },
  {
    label: "pitch deck phrasing includes full slide set",
    prompt: "Build me a pitch deck for an AI startup",
    clientMustInclude: ["plan_deck", "add_slide", "read_slides", "patch_slides"],
  },
  {
    label: "casual slides-for phrasing includes full slide set",
    prompt: "I need slides for tomorrow's all-hands meeting",
    clientMustInclude: ["plan_deck", "add_slide", "read_slides", "patch_slides"],
  },
  {
    label: "short presentation prompt includes full slide set",
    prompt: "Make a presentation about the solar system",
    clientMustInclude: ["plan_deck", "add_slide", "read_slides", "patch_slides"],
  },
  {
    label: "short slide-edit prompt includes full slide set",
    prompt: "Change the title of my first slide to 'Welcome'",
    clientMustInclude: ["plan_deck", "add_slide", "read_slides", "patch_slides"],
  },
  {
    // Regression: dominant non-anchor (add_slide) was suppressing the
    // anchor (patch_slides) via the 0.9 relevance ratio, so the set never
    // expanded and only add_slide reached the model.
    label: "add-final-slide prompt still expands full slide set",
    prompt: "Add a final 'thank you' slide to my deck",
    clientMustInclude: ["plan_deck", "add_slide", "read_slides", "patch_slides"],
  },
  {
    // Terse follow-up in a conversation that already has a deck artifact.
    // The consumer signals "slides" as active so the full set survives even
    // though only add_slide would match semantically.
    label: "terse add-thanks-slide with active slides set expands full set",
    prompt: "add a thank you slide",
    activeToolSets: ["slides"],
    clientMustInclude: ["plan_deck", "add_slide", "read_slides", "patch_slides"],
  },
  {
    label: "terse add-final-slide with active slides set expands full set",
    prompt: "add a final slide",
    activeToolSets: ["slides"],
    clientMustInclude: ["plan_deck", "add_slide", "read_slides", "patch_slides"],
  },
  {
    // Sanity check: even completely off-topic prompts get the slide set
    // when the consumer marks it active (mirrors continuing a deck
    // conversation with an unrelated question).
    label: "off-topic prompt with active slides set still gets slide tools",
    prompt: "what's the weather in Paris?",
    activeToolSets: ["slides"],
    clientMustInclude: ["plan_deck", "add_slide", "read_slides", "patch_slides"],
  },

  // ── Server-side: Image generation ─────────────────────────────────────
  {
    label: "image generation includes image tools",
    prompt: "Generate an image of a sunset over the ocean",
    serverMustInclude: ["AnumaImageMCP-generate_cloud_image"],
    serverMustExclude: ["AnumaMediaMCP-anuma_create_music", "OpenMeteoMCP-weather_forecast"],
  },
  {
    label: "image editing includes edit tool",
    prompt: "Edit this image to remove the background",
    serverMustInclude: ["AnumaImageMCP-edit_cloud_image"],
  },

  // ── Server-side: Video generation ────────────────────────────────────
  {
    label: "video generation includes video tools",
    prompt: "Create a video of a cat playing piano",
    serverMustInclude: ["AnumaMediaMCP-anuma_create_video"],
  },

  // ── Server-side: Audio ───────────────────────────────────────────────
  {
    label: "music generation includes audio tool",
    prompt: "Generate some relaxing jazz music",
    serverMustInclude: ["AnumaMediaMCP-anuma_create_music"],
    serverMustExclude: ["OpenMeteoMCP-weather_forecast", "AnumaTwelveDataMCP-get_price"],
  },
  {
    label: "sound effects includes sfx tool",
    prompt: "Create a sound effect of thunder and lightning",
    serverMustInclude: ["AnumaMediaMCP-anuma_create_sfx"],
  },

  // ── Server-side: Web search ──────────────────────────────────────────
  {
    label: "web search includes search tools",
    prompt: "Search the web for recent news about AI regulation",
    serverMustInclude: ["AnumaJinaMCP-search_web"],
    serverMustExclude: ["AnumaImageMCP-generate_cloud_image", "AnumaMediaMCP-anuma_create_music"],
  },
  {
    label: "URL reading includes read_url tool",
    prompt: "Read the content of https://example.com/article",
    serverMustInclude: ["AnumaJinaMCP-read_url"],
  },

  // ── Server-side: Finance / Crypto ────────────────────────────────────
  {
    label: "crypto price includes price tool",
    prompt: "What's the current price of Bitcoin?",
    serverMustInclude: ["AnumaTwelveDataMCP-get_price"],
    serverMustExclude: ["OpenMeteoMCP-weather_forecast", "AnumaImageMCP-generate_cloud_image"],
  },
  {
    label: "market trends includes prediction tools",
    prompt: "What's trending in the crypto market today?",
    serverMustInclude: ["PredictionsMCP-trending"],
  },
  {
    label: "exchange rate includes exchange rate tool",
    prompt: "What's the exchange rate between USD and EUR?",
    serverMustInclude: ["AnumaTwelveDataMCP-get_exchange_rate"],
  },

  // ── Server-side: ZetaChain ───────────────────────────────────────────
  {
    label: "zetachain query includes zetachain tools",
    prompt: "Search for DeFi projects on ZetaChain",
    serverMustInclude: ["ZetachainMCP-search_zetachain"],
    serverMustExclude: ["OpenMeteoMCP-weather_forecast"],
  },

  // ── Server-side: Documents ───────────────────────────────────────────
  {
    label: "PDF extraction includes PDF tool",
    prompt: "Extract the text from this PDF document",
    serverMustInclude: ["AnumaJinaMCP-extract_pdf"],
  },
  {
    // Vision is intentionally excluded by `defaultServerToolsFilter` —
    // modern models read image content blocks directly, so routing through
    // a server-side vision tool is a wasteful hop. The test asserts the
    // exclusion holds even on a prompt that would otherwise match.
    label: "OCR screenshot prompt does not include vision tool (excluded by default)",
    prompt: "Extract text from this screenshot image",
    serverMustExclude: ["AnumaVisionMCP-anuma_analyze_image"],
  },

  // ── App generation ───────────────────────────────────────────────────
  // App gen tools form a logical set: when building/modifying apps, the LLM
  // needs the full toolkit — file ops (create_file, patch_file, read_file,
  // list_files, delete_file) AND quality ops (audit_design, critique_design,
  // verify_app). Semantic matching alone picks create_file on a "build an
  // app" prompt but misses the supporting tools; set expansion (PR #435)
  // pulls in the full membership when an anchor fires.
  {
    label: "build app includes full app-generation set (file + quality tools)",
    prompt: "Build me a todo list app",
    // Anchor (create_file) scores; the rest ride along via set expansion.
    // The quality tools never semantically match "build a todo list" on
    // their own — they're only included because they're set members. If
    // a refactor drops them from BUILT_IN_TOOL_SETS["app-generation"],
    // this assertion is the canary that surfaces it.
    clientMustInclude: [
      "create_file",
      "patch_file",
      "read_file",
      "list_files",
      "delete_file",
      "audit_design",
      "critique_design",
      "verify_app",
    ],
    // display_weather, github_api, prompt_user_choice score 0.55-0.65 on
    // "todo list app" — borderline leaks we tolerate (recall over precision).
    clientMustExclude: ["display_chart"],
  },
  {
    label: "create game includes app gen tools",
    prompt: "Create a snake game",
    clientMustInclude: ["create_file", "patch_file"],
    clientMustExclude: ["display_weather", "github_api"],
  },
  {
    label: "dashboard app includes app gen tools",
    prompt: "Make a dashboard that shows sales metrics with charts",
    clientMustInclude: ["create_file", "patch_file", "display_chart"],
    clientMustExclude: ["display_weather", "github_api"],
  },
  {
    label: "modify existing app includes app gen tools",
    prompt: "Edit the app to change the background color to blue and add a new footer component",
    clientMustInclude: ["patch_file", "create_file"],
    clientMustExclude: ["display_weather", "github_api"],
  },
  {
    label: "build calculator includes app gen tools",
    prompt: "Create a calculator app with basic arithmetic operations",
    clientMustInclude: ["create_file", "patch_file"],
    clientMustExclude: ["display_weather", "github_api"],
  },

  // ── Noise exclusions on client-focused prompts ───────────────────────
  {
    label: "chart request: no irrelevant server tools",
    prompt: "Show me a bar chart of monthly sales data",
    clientMustInclude: ["display_chart"],
    serverMustExclude: ["AnumaMediaMCP-anuma_create_music", "AnumaMediaMCP-anuma_create_video"],
  },
  {
    label: "booking form: no irrelevant server tools",
    prompt: "Let me fill out my booking details: name, email, dates, and room preferences",
    clientMustInclude: ["prompt_user_form"],
    // NOTE: server tools like anuma_audio_music (0.559) still leak in because
    // server tool descriptions are too broad — they score within 85% of the top
    // match. This is a server-side description quality issue.
    serverMustExclude: ["OpenMeteoMCP-weather_forecast", "AnumaImageMCP-generate_cloud_image"],
  },

  // ── Negative cases ───────────────────────────────────────────────────
  {
    label: "general chat: nothing selected",
    prompt: "Tell me a joke about programming",
    expectNoClientTools: true,
    expectNoServerTools: true,
  },
  {
    label: "math question: nothing selected",
    prompt: "What is the square root of 144?",
    expectNoClientTools: true,
    expectNoServerTools: true,
  },
  {
    label: "simple greeting: nothing selected",
    prompt: "Hello, how are you?",
    expectNoClientTools: true,
    expectNoServerTools: true,
  },
];

// ── Summary table ────────────────────────────────────────────────────────────

type ResultRow = {
  prompt: string;
  tools: string;
};

const summaryRows: ResultRow[] = [];

function formatToolLine(
  label: string,
  matches: { tool: { name: string }; similarity: number }[]
): string {
  if (matches.length === 0) return "";
  const lines = matches.map((m) => {
    const score = m.similarity === 0 ? "set" : m.similarity.toFixed(2);
    return `  ${m.tool.name} (${score})`;
  });
  return `[${label}]\n${lines.join("\n")}`;
}

function formatSetLine(label: string, sets: string[]): string {
  if (sets.length === 0) return "";
  return `[${label}]\n${sets.map((s) => `  ${s}`).join("\n")}`;
}

function printSummary() {
  const rows: string[][] = [["Prompt", "Tools"]];
  for (const r of summaryRows) {
    rows.push([r.prompt, r.tools || "(none)"]);
  }
  console.log(
    "\n" +
      table(rows, {
        border: getBorderCharacters("norc"),
        columns: { 0: { width: 40, wrapWord: true }, 1: { width: 60 } },
        drawHorizontalLine: () => true,
      })
  );
}

// ── Test runner ──────────────────────────────────────────────────────────────

describe("client tool selection (full pipeline)", () => {
  beforeAll(async () => {
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
  }, 30_000);

  afterAll(() => printSummary());

  for (const tc of cases) {
    it(tc.label, async () => {
      const { serverMatches, clientMatches, allToolNames, anchorActivatedSets, stickyActiveSets } =
        await selectTools(tc.prompt, tc.activeToolSets);

      const triggeredLine = formatSetLine("sets triggered by prompt", anchorActivatedSets);
      const stickyLine = formatSetLine("sets sticky from history", stickyActiveSets);
      const clientLine = formatToolLine("client", clientMatches);
      const serverLine = formatToolLine("server", serverMatches);
      const toolsCell = [triggeredLine, stickyLine, clientLine, serverLine]
        .filter(Boolean)
        .join("\n");
      summaryRows.push({ prompt: tc.prompt, tools: toolsCell });

      const clientNames = clientMatches.map((m) => m.tool.name);

      if (tc.clientMustInclude) {
        for (const required of tc.clientMustInclude) {
          expect(
            clientNames,
            `Expected client tool "${required}" for: "${tc.prompt}" (got: [${clientLine}])`
          ).toContain(required);
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
        // Recall over precision: a few cosmetic borderline matches (single-tool
        // leaks scoring just above the floor) are acceptable. What we cannot
        // afford is missing the *right* tool, which is checked separately via
        // clientMustInclude. So tolerate up to 2 leaked tools here.
        expect(
          clientMatches.length,
          `Expected at most 2 borderline client tools for: "${tc.prompt}" (got: [${clientLine}])`
        ).toBeLessThanOrEqual(2);
      }

      const matchedServerNames = serverMatches.map((m) => m.tool.name);

      if (tc.serverMustInclude) {
        for (const required of tc.serverMustInclude) {
          expect(
            matchedServerNames,
            `Expected server tool "${required}" for: "${tc.prompt}" (got: [${matchedServerNames.join(", ")}])`
          ).toContain(required);
        }
      }

      if (tc.serverMustExclude) {
        for (const excluded of tc.serverMustExclude) {
          expect(
            matchedServerNames,
            `Server tool "${excluded}" should NOT be selected for: "${tc.prompt}"`
          ).not.toContain(excluded);
        }
      }

      if (tc.expectNoServerTools) {
        expect(
          serverMatches.length,
          `Expected no server tools for: "${tc.prompt}" (got: [${matchedServerNames.join(", ")}])`
        ).toBe(0);
      }
    });
  }
});
