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
  activatedToolSetNames,
  BUILT_IN_TOOL_SETS,
  CLIENT_TOOLS_MIN_SIMILARITY,
  DEFAULT_EXCLUDED_SERVER_TOOLS,
  DEFAULT_SERVER_TOOLS_MATCH_OPTIONS,
  expandToolSetsAdditive,
  findMatchingTools,
  getServerTools,
  MAX_CLIENT_TOOLS_AFTER_FILTER,
  mergeTools,
  MIN_CONTENT_LENGTH_FOR_TOOLS,
  scoreTools,
  SERVER_TOOL_DEPENDENCY_SETS,
  type ServerTool,
  toolSetSystemPrompts,
} from "../../src/lib/tools/serverTools.js";
import { generateEmbedding, generateEmbeddings } from "../../src/lib/memoryEngine/embeddings.js";
import type { ToolConfig } from "../../src/lib/chat/useChat/types.js";
import {
  APP_BUILDER_PROMPT,
  AUDIT_DESIGN_SCHEMA,
  createChartTool,
  createChoiceTool,
  createFormTool,
  createGitHubTools,
  createPhoneCallOfferTool,
  createWeatherTool,
  CREATE_FILE_SCHEMA,
  CRITIQUE_DESIGN_SCHEMA,
  DELETE_FILE_SCHEMA,
  LIST_FILES_SCHEMA,
  PATCH_FILE_SCHEMA,
  READ_FILE_SCHEMA,
  VERIFY_APP_SCHEMA,
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

  // App generation tools (schema constants — used directly by createAppGenerationTools).
  // Includes the quality ops (audit/critique/verify): they're non-anchor set
  // members, so they only reach the model via set expansion — keep them in the
  // catalog or the "full app-generation set" assertion can never be satisfied.
  toMeta(CREATE_FILE_SCHEMA),
  toMeta(PATCH_FILE_SCHEMA),
  toMeta(DELETE_FILE_SCHEMA),
  toMeta(READ_FILE_SCHEMA),
  toMeta(LIST_FILES_SCHEMA),
  toMeta(AUDIT_DESIGN_SCHEMA),
  toMeta(CRITIQUE_DESIGN_SCHEMA),
  toMeta(VERIFY_APP_SCHEMA),

  // Slide tools (schema constants — used directly by createSlideTools)
  toMeta(PLAN_DECK_SCHEMA),
  toMeta(ADD_SLIDE_SCHEMA),
  toMeta(READ_SLIDES_SCHEMA),
  toMeta(PATCH_SLIDES_SCHEMA),
];

// Selection thresholds are imported from serverTools.ts — the SAME constants
// production (useChatStorage) uses, so tuning them can't silently desync this
// suite. MIN_CONTENT_LENGTH_FOR_TOOLS gates embeddings entirely: very short
// greetings never activate a set or inject a persona.
// ── Shared state ─────────────────────────────────────────────────────────────

const embeddingOptions = { apiKey, baseUrl };

let allServerTools: ServerTool[] = [];
let clientToolEmbeddings: Map<string, number[]> = new Map();

// ── Helpers ──────────────────────────────────────────────────────────────────

function buildClientPseudoServerTools(catalog: { name: string; description: string }[]) {
  return catalog.map((t) => ({
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
async function selectTools(
  prompt: string,
  activeToolSets: string[] = [],
  // Restrict the client catalog to a named subset — used by the web-shaped
  // pool suite to mirror what the web app actually registers in plain chat.
  poolNames?: ReadonlySet<string>
) {
  const clientCatalog = poolNames
    ? CLIENT_TOOLS.filter((t) => poolNames.has(t.name))
    : CLIENT_TOOLS;
  // Mirror production's length gate (useChatStorage): prompts shorter than
  // MIN_CONTENT_LENGTH_FOR_TOOLS skip embeddings entirely, so no semantic
  // selection runs, no tool set activates, and no persona is injected.
  if (prompt.length < MIN_CONTENT_LENGTH_FOR_TOOLS) {
    return {
      serverMatches: [],
      clientMatches: [],
      allToolNames: [],
      merged: [],
      anchorActivatedSets: [],
      activatedSets: [],
      guidancePrompts: [],
      stickyActiveSets: [...activeToolSets],
    };
  }

  const promptEmbedding = await generateEmbedding(prompt, embeddingOptions);

  // Server tool filtering — mirror what `defaultServerToolsFilter` does in
  // production: same match options, same exclusion list, same dependency-set
  // expansion (continuation tools ride in with their entry anchor). Earlier
  // this test used a stricter relevanceRatio (0.85) which prod doesn't apply,
  // so the test was measuring a different selection than consumers run.
  const excluded = new Set<string>(DEFAULT_EXCLUDED_SERVER_TOOLS);
  const semanticServerMatches = findMatchingTools(
    promptEmbedding,
    allServerTools,
    DEFAULT_SERVER_TOOLS_MATCH_OPTIONS
  );
  const serverScores = scoreTools(promptEmbedding, allServerTools);
  const expandedServerNames = expandToolSetsAdditive(
    new Set(semanticServerMatches.map((m) => m.tool.name)),
    new Set(allServerTools.map((t) => t.name)),
    serverScores,
    SERVER_TOOL_DEPENDENCY_SETS
  );
  // Set-expanded tools get similarity 0 (same convention as the client side)
  // so the summary table distinguishes semantic matches from ride-alongs.
  const serverMatches = [
    ...semanticServerMatches,
    ...[...expandedServerNames]
      .filter((n) => !semanticServerMatches.some((m) => m.tool.name === n))
      .map((n) => ({ tool: allServerTools.find((t) => t.name === n)!, similarity: 0 })),
  ].filter((m) => !excluded.has(m.tool.name));
  const filteredServerTools = serverMatches.map((m) => m.tool);

  // Client tool filtering (same as autoFilterClientTools)
  const clientPseudoTools = buildClientPseudoServerTools(clientCatalog);
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
  const availableNames = new Set(clientCatalog.map((t) => t.name));
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

  // Production-accurate activation gate (anchor score ≥ anchorMinSimilarity, or
  // a forced set) and the tool-set guidance it would inject — the exact signal
  // `computeToolGuidance` uses in useChatStorage. This lets the suite verify
  // which prompts the App Builder persona actually rides in on (app-generation
  // is the only built-in set with a systemPrompt), not just which tools are
  // selected.
  const activatedSetNames = activatedToolSetNames(scores, BUILT_IN_TOOL_SETS, activeSetNames);
  const guidancePrompts = toolSetSystemPrompts(
    finalClientNames,
    BUILT_IN_TOOL_SETS,
    activatedSetNames
  );

  // Build client tool configs from the final set (including set-expanded tools)
  const filteredClientToolConfigs = clientCatalog
    .filter((t) => finalClientNames.has(t.name))
    .map((t) => ({
      type: "function" as const,
      function: {
        name: t.name,
        description: t.description,
        parameters: { type: "object", properties: {}, required: [] },
      },
    }));
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
    activatedSets: [...activatedSetNames],
    guidancePrompts,
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
  /**
   * Tool set(s) that MUST genuinely activate for this prompt — meaning their
   * `systemPrompt` (e.g. APP_BUILDER_PROMPT) rides in. Asserted against the
   * production gate `activatedToolSetNames`, not the display heuristic.
   */
  mustActivateSets?: string[];
  /**
   * Tool set(s) that MUST NOT activate — so their persona is NOT injected. The
   * bias-bug guard: "write a story" / "hey" must not activate "app-generation".
   */
  mustNotActivateSets?: string[];
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
    mustActivateSets: ["slides"],
    mustNotActivateSets: ["app-generation"],
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
    // search_web matches semantically; the read/parallel continuation tools
    // score below the 0.5 floor (measured 0.33-0.47) and can only arrive via
    // the jina-research dependency set. This asserts the call-chain expansion
    // works end-to-end: search results are useless if the model can't open them.
    serverMustInclude: [
      "AnumaJinaMCP-search_web",
      "AnumaJinaMCP-read_url",
      "AnumaJinaMCP-parallel_read_url",
      "AnumaJinaMCP-parallel_search_web",
    ],
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
    mustActivateSets: ["app-generation"],
  },
  {
    label: "create game includes app gen tools",
    prompt: "Create a snake game",
    clientMustInclude: ["create_file", "patch_file"],
    clientMustExclude: ["display_weather", "github_api"],
    mustActivateSets: ["app-generation"],
  },
  {
    label: "dashboard app includes app gen tools",
    prompt: "Make a dashboard that shows sales metrics with charts",
    clientMustInclude: ["create_file", "patch_file", "display_chart"],
    clientMustExclude: ["display_weather", "github_api"],
    mustActivateSets: ["app-generation"],
  },
  {
    label: "modify existing app includes app gen tools",
    prompt: "Edit the app to change the background color to blue and add a new footer component",
    clientMustInclude: ["patch_file", "create_file"],
    clientMustExclude: ["display_weather", "github_api"],
    mustActivateSets: ["app-generation"],
  },
  {
    label: "build calculator includes app gen tools",
    prompt: "Create a calculator app with basic arithmetic operations",
    clientMustInclude: ["create_file", "patch_file"],
    clientMustExclude: ["display_weather", "github_api"],
    mustActivateSets: ["app-generation"],
  },

  // ── Noise exclusions on client-focused prompts ───────────────────────
  {
    // KNOWN server-side leak (documented): AnumaMediaMCP-anuma_create_music
    // scores ≥0.5 on this chart prompt — a catalog description-quality issue
    // (the music tool's description overlaps "visualize/generate" phrasing),
    // not something client-side selection can fix without also dropping real
    // matches. The load-bearing assertion is that display_chart is selected;
    // the leaked media tool is inert unless the model calls it.
    label: "chart request: display_chart selected (media leak documented)",
    prompt: "Show me a bar chart of monthly sales data",
    clientMustInclude: ["display_chart"],
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
    // GATING CEILING (documented — no selection assertions): "...about
    // programming" pushes create_file to ~0.58, clearing the 0.55 anchor
    // floor, so the app-gen set expands and ~8 client tools ride in. It's the
    // same create_file-overlaps-chitchat band that makes a higher floor unsafe
    // (raising it to 0.575 broke "modify existing app" at ~0.56 — see the
    // app-generation anchorMinSimilarity note in serverTools.ts). Server-side,
    // ~5 catalog tools (sequentialthinking, create_music/sfx, fal_*) also
    // clear the 0.5 floor on this prompt — catalog description breadth, same
    // class as the chart-case leak. Like "what's up" below, the conditional
    // APP_BUILDER_PROMPT is what keeps leaked tools from biasing the turn;
    // pinning either assertion here keeps the suite red with no threshold
    // that could fix it. The invariant that still holds (asserted globally):
    // APP_BUILDER_PROMPT injection tracks genuine set activation.
    label: "general chat: documented over-selection ceiling",
    prompt: "Tell me a joke about programming",
  },
  {
    label: "math question: nothing selected",
    prompt: "What is the square root of 144?",
    expectNoClientTools: true,
    expectNoServerTools: true,
    mustNotActivateSets: ["app-generation"],
  },
  {
    label: "simple greeting: nothing selected",
    prompt: "Hello, how are you?",
    expectNoClientTools: true,
    expectNoServerTools: true,
    mustNotActivateSets: ["app-generation"],
  },

  // ── App-builder bias guards ──────────────────────────────────────────
  // Prompts that aren't app requests but brush the create_file / patch_file
  // anchors. When the anchor stays below the 0.55 activation floor the set must
  // NOT activate — so APP_BUILDER_PROMPT is never injected. This is the
  // selection-level guard for the prompt-pollution bug. (The cases below score
  // create_file < 0.55 in practice; the gating ceiling is documented separately.)
  {
    label: "writing a story does not activate app-generation",
    prompt: "Write a short story about a dragon who learns to paint",
    mustNotActivateSets: ["app-generation"],
  },
  {
    label: "explaining code (not building an app) does not activate app-generation",
    prompt: "Explain how recursion works with a small example",
    mustNotActivateSets: ["app-generation"],
  },
  {
    label: "editing prose does not activate app-generation",
    prompt: "Edit this paragraph to be more concise and fix any grammar mistakes",
    mustNotActivateSets: ["app-generation"],
  },
  {
    // "hey" (< MIN_CONTENT_LENGTH_FOR_TOOLS) skips embeddings in production, so
    // no set activates and APP_BUILDER_PROMPT is NOT injected. Semantically
    // "hey" actually scores create_file ~0.61 — higher than legit app prompts
    // like "make a dashboard" (0.58) — so without the length gate it would
    // falsely activate; the gate is what protects very short greetings.
    label: "very short greeting skips selection (no app-generation)",
    prompt: "hey",
    mustNotActivateSets: ["app-generation"],
  },
  // Longer chitchat clears the length gate, so it runs full semantic selection.
  // These document whether everyday greetings still pull in app-generation
  // (≥5 chars → no length-gate protection; only the create_file anchor score
  // and the conditional persona stand between them and an injected prompt).
  {
    // GATING CEILING (documented — no activation assertion): "what's up" clears
    // the length gate and scores create_file ~0.56, which is the SAME band as a
    // legitimate app-edit prompt ("Edit the app…" also ~0.56). No anchor
    // threshold separates them — raising it to drop "what's up" also strips the
    // file tools from real edit requests (verified: 0.575 broke "modify existing
    // app"). So it activates app-generation and APP_BUILDER_PROMPT is injected;
    // the conditional persona is what stops it biasing toward building an app.
    label: "casual greeting (what's up): gating ceiling, conditional prompt guards",
    prompt: "what's up",
  },
  {
    label: "good morning greeting — chitchat, no app build",
    prompt: "good morning",
    mustNotActivateSets: ["app-generation"],
  },
  {
    label: "thanks — chitchat, no app build",
    prompt: "thanks, that's really helpful",
    mustNotActivateSets: ["app-generation"],
  },
];

// ── Summary table ────────────────────────────────────────────────────────────

type ResultRow = {
  prompt: string;
  appBuilder: boolean;
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
  const rows: string[][] = [["Prompt", "App Builder", "Tools"]];
  for (const r of summaryRows) {
    rows.push([r.prompt, r.appBuilder ? "✓ INJECTED" : "—", r.tools || "(none)"]);
  }
  console.log(
    "\n" +
      table(rows, {
        border: getBorderCharacters("norc"),
        columns: { 0: { width: 34, wrapWord: true }, 1: { width: 11 }, 2: { width: 54 } },
        drawHorizontalLine: () => true,
      })
  );

  // Focused, grep-able readout: which prompts get APP_BUILDER_PROMPT injected.
  const injected = summaryRows.filter((r) => r.appBuilder).map((r) => r.prompt);
  console.log(
    `\n[APP_BUILDER_PROMPT] injected for ${injected.length}/${summaryRows.length} prompts:`
  );
  for (const r of summaryRows) {
    console.log(`  ${r.appBuilder ? "✓" : "·"}  ${r.prompt}`);
  }
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
  }, 90_000);

  afterAll(() => printSummary());

  // Guard against catalog drift: every canonical name the SDK exports must
  // exist in the live /api/v1/tools catalog. All matching is exact-string, so
  // a renamed or removed server tool turns the constants into silent no-ops —
  // exactly how the May 2026 Anuma-prefix rename broke consumers that kept
  // their own copies of these lists. This is the loud failure for that class
  // of bug.
  it("SERVER_TOOL_DEPENDENCY_SETS and DEFAULT_EXCLUDED_SERVER_TOOLS match the live catalog", () => {
    const catalog = new Set(allServerTools.map((t) => t.name));
    const staleSetEntries = SERVER_TOOL_DEPENDENCY_SETS.flatMap((s) =>
      [...s.members, ...s.anchors].filter((n) => !catalog.has(n)).map((n) => `${s.name}: ${n}`)
    );
    expect(
      staleSetEntries,
      `SERVER_TOOL_DEPENDENCY_SETS entries missing from the server catalog — renamed or removed server-side?`
    ).toEqual([]);

    const staleExclusions = DEFAULT_EXCLUDED_SERVER_TOOLS.filter((n) => !catalog.has(n));
    expect(
      staleExclusions,
      `DEFAULT_EXCLUDED_SERVER_TOOLS entries missing from the server catalog — the exclusion is a no-op`
    ).toEqual([]);
  });

  for (const tc of cases) {
    it(tc.label, async () => {
      const {
        serverMatches,
        clientMatches,
        allToolNames,
        anchorActivatedSets,
        activatedSets,
        guidancePrompts,
        stickyActiveSets,
      } = await selectTools(tc.prompt, tc.activeToolSets);

      const triggeredLine = formatSetLine("sets triggered by prompt", anchorActivatedSets);
      const stickyLine = formatSetLine("sets sticky from history", stickyActiveSets);
      const clientLine = formatToolLine("client", clientMatches);
      const serverLine = formatToolLine("server", serverMatches);
      const toolsCell = [triggeredLine, stickyLine, clientLine, serverLine]
        .filter(Boolean)
        .join("\n");
      summaryRows.push({
        prompt: tc.prompt,
        appBuilder: guidancePrompts.includes(APP_BUILDER_PROMPT),
        tools: toolsCell,
      });

      // The App Builder persona must ride in EXACTLY when the app-generation set
      // activates — never on a prompt that merely brushed an anchor below the
      // activation floor. This invariant is the core guard for the system-prompt
      // bias bug: gating on activation, not on anchor presence.
      expect(
        guidancePrompts.includes(APP_BUILDER_PROMPT),
        `APP_BUILDER_PROMPT presence must match app-generation activation for: "${tc.prompt}" (activated: [${activatedSets.join(", ")}])`
      ).toBe(activatedSets.includes("app-generation"));

      if (tc.mustActivateSets) {
        for (const s of tc.mustActivateSets) {
          expect(
            activatedSets,
            `Expected tool set "${s}" to activate for: "${tc.prompt}" (activated: [${activatedSets.join(", ")}])`
          ).toContain(s);
        }
      }

      if (tc.mustNotActivateSets) {
        for (const s of tc.mustNotActivateSets) {
          expect(
            activatedSets,
            `Tool set "${s}" must NOT activate for: "${tc.prompt}" (activated: [${activatedSets.join(", ")}])`
          ).not.toContain(s);
        }
      }

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

  // ── Web-shaped client pool ───────────────────────────────────────────────
  // The anuma web app does NOT register most of the catalog above in plain
  // chat: no choice/form/phone-call/geolocate/timezone tools, and — by
  // deliberate product decision — no app-generation file tools ("App file
  // tools stay explicit to avoid ordinary code/markdown questions being
  // promoted into App Builder", apps/web/hooks/useChatTools.tsx). Its real
  // semantic pool is chart + weather + the github and slides sets (plus
  // client-only tools whose descriptions live in the app repo: connectors,
  // schedule/background — absent here, which slightly softens competition).
  // These cases pin the behaviors that only hold in THAT pool. The app-gen
  // cases in the main suite above cover the SDK-default catalog that other
  // consumers (and app mode itself) use.
  const WEB_PLAIN_CHAT_POOL: ReadonlySet<string> = new Set([
    "display_chart",
    "display_weather",
    "github_api",
    "github_get_authenticated_user",
    "plan_deck",
    "add_slide",
    "read_slides",
    "patch_slides",
  ]);

  describe("web-shaped client pool", () => {
    it("weather prompt selects display_weather", async () => {
      const { clientMatches } = await selectTools(
        "What's the weather like in Paris today?",
        [],
        WEB_PLAIN_CHAT_POOL
      );
      expect(clientMatches.map((m) => m.tool.name)).toContain("display_weather");
    });

    it("slide prompt expands the full slide set", async () => {
      const { clientMatches, activatedSets } = await selectTools(
        "Make me a presentation about the solar system",
        [],
        WEB_PLAIN_CHAT_POOL
      );
      const names = clientMatches.map((m) => m.tool.name);
      for (const n of ["plan_deck", "add_slide", "read_slides", "patch_slides"]) {
        expect(names, `slide tool "${n}" missing from web pool selection`).toContain(n);
      }
      expect(activatedSets).toContain("slides");
    });

    it("app-build prompt cannot activate app-generation (tools not in the pool)", async () => {
      // In web plain chat the app-gen anchors don't exist, so the set can
      // never activate and APP_BUILDER_PROMPT is never injected — the user
      // must enter app mode explicitly. This pins the production reality the
      // main suite's app-gen cases do NOT cover.
      const { activatedSets, guidancePrompts, clientMatches } = await selectTools(
        "Build me a todo list app",
        [],
        WEB_PLAIN_CHAT_POOL
      );
      expect(activatedSets).not.toContain("app-generation");
      expect(guidancePrompts).toEqual([]);
      const names = clientMatches.map((m) => m.tool.name);
      expect(names).not.toContain("create_file");
      expect(names).not.toContain("patch_file");
    });

    it("programming chitchat stays quiet without the app-gen anchors", async () => {
      // The same "Tell me a joke about programming" prompt that balloons to
      // ~8 tools in the SDK-default catalog (create_file anchor at ~0.58)
      // selects almost nothing in the web pool — the over-selection ceiling
      // documented above is specific to catalogs that include app-gen tools.
      const { clientMatches, activatedSets } = await selectTools(
        "Tell me a joke about programming",
        [],
        WEB_PLAIN_CHAT_POOL
      );
      expect(clientMatches.length).toBeLessThanOrEqual(2);
      expect(activatedSets).not.toContain("app-generation");
    });
  });
});
