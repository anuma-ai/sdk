import "dotenv/config";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { table, getBorderCharacters } from "table";
import {
  activatedToolSetNames,
  BUILT_IN_TOOL_SETS,
  CLIENT_TOOLS_MIN_SIMILARITY,
  CLIENT_TOOLS_RELEVANCE_RATIO,
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
import { createIpGeolocationTool } from "./stubs/ipGeolocation.js";
import { createTimezoneTool } from "../../src/tools/timezone.js";
import {
  ADD_SLIDE_SCHEMA,
  PATCH_SLIDES_SCHEMA,
  PLAN_DECK_SCHEMA,
  READ_SLIDES_SCHEMA,
} from "../../src/tools/slides/index.js";
import { config } from "./setup.js";

const { portalKey: apiKey, baseUrl } = config;

function toMeta(source: {
  name?: unknown;
  description?: unknown;
  function?: unknown;
  [key: string]: unknown;
}): { name: string; description: string } {
  const fn = (
    typeof source.function === "object" && source.function !== null ? source.function : {}
  ) as { name?: unknown; description?: unknown };
  const name = typeof fn.name === "string" ? fn.name : source.name;
  const description = typeof fn.description === "string" ? fn.description : source.description;
  if (typeof name !== "string" || !name || typeof description !== "string" || !description) {
    throw new Error(
      `Tool source missing name or description: ${JSON.stringify(source).slice(0, 200)}`
    );
  }
  return { name, description };
}

const stubUIOptions = { getContext: () => null };
const stubGitHubGetToken = () => null;
const stubGitHubRequestAccess = async () => "";
const githubTools: ToolConfig[] = createGitHubTools(stubGitHubGetToken, stubGitHubRequestAccess);

const CLIENT_TOOLS: { name: string; description: string }[] = [
  toMeta(createWeatherTool(stubUIOptions)),
  toMeta(createChartTool(stubUIOptions)),
  toMeta(createChoiceTool(stubUIOptions)),
  toMeta(createFormTool(stubUIOptions)),
  toMeta(createPhoneCallOfferTool(stubUIOptions)),
  toMeta(createIpGeolocationTool()),
  toMeta(createTimezoneTool()),

  ...githubTools.map(toMeta),

  toMeta(CREATE_FILE_SCHEMA),
  toMeta(PATCH_FILE_SCHEMA),
  toMeta(DELETE_FILE_SCHEMA),
  toMeta(READ_FILE_SCHEMA),
  toMeta(LIST_FILES_SCHEMA),
  toMeta(AUDIT_DESIGN_SCHEMA),
  toMeta(CRITIQUE_DESIGN_SCHEMA),
  toMeta(VERIFY_APP_SCHEMA),

  toMeta(PLAN_DECK_SCHEMA),
  toMeta(ADD_SLIDE_SCHEMA),
  toMeta(READ_SLIDES_SCHEMA),
  toMeta(PATCH_SLIDES_SCHEMA),
];

const embeddingOptions = { apiKey, baseUrl };

let allServerTools: ServerTool[] = [];
let clientToolEmbeddings: Map<string, number[]> = new Map();

function buildClientPseudoServerTools() {
  return CLIENT_TOOLS.map((t) => ({
    type: "function" as const,
    name: t.name,
    description: t.description,
    parameters: { type: "object", properties: {}, required: [] },
    embedding: clientToolEmbeddings.get(t.name)!,
  }));
}

async function selectTools(prompt: string, activeToolSets: string[] = []) {
  if (prompt.length < MIN_CONTENT_LENGTH_FOR_TOOLS) {
    const activeSets = BUILT_IN_TOOL_SETS.filter((s) => activeToolSets.includes(s.name));
    const stickyMembers = new Set(activeSets.flatMap((s) => s.members));
    const stickyMatches = CLIENT_TOOLS.filter((t) => stickyMembers.has(t.name)).map((t) => ({
      tool: {
        type: "function" as const,
        name: t.name,
        description: t.description,
        parameters: { type: "object", properties: {}, required: [] },
        embedding: clientToolEmbeddings.get(t.name)!,
      },
      similarity: 0,
    }));
    const activatedSetNames = new Set(activeSets.map((s) => s.name));
    return {
      serverMatches: [],
      clientMatches: stickyMatches,
      allToolNames: stickyMatches.map((m) => m.tool.name),
      merged: [],
      anchorActivatedSets: [],
      activatedSets: [...activatedSetNames],
      guidancePrompts: toolSetSystemPrompts(stickyMembers, BUILT_IN_TOOL_SETS, activatedSetNames),
      stickyActiveSets: [...activeToolSets],
    };
  }

  const promptEmbedding = await generateEmbedding(prompt, embeddingOptions);

  const excluded = new Set<string>(DEFAULT_EXCLUDED_SERVER_TOOLS);
  const semanticServerMatches = findMatchingTools(
    promptEmbedding,
    allServerTools,
    DEFAULT_SERVER_TOOLS_MATCH_OPTIONS
  );
  const matchedServerNameSet = new Set(semanticServerMatches.map((m) => m.tool.name));
  const serverScores = scoreTools(promptEmbedding, allServerTools);
  const selectedServerScores = new Map(
    [...serverScores].filter(([name]) => matchedServerNameSet.has(name) && !excluded.has(name))
  );
  const expandedServerNames = expandToolSetsAdditive(
    matchedServerNameSet,
    new Set(allServerTools.map((t) => t.name)),
    selectedServerScores,
    SERVER_TOOL_DEPENDENCY_SETS
  );
  const serverMatches = [
    ...semanticServerMatches,
    ...[...expandedServerNames]
      .filter((n) => !semanticServerMatches.some((m) => m.tool.name === n))
      .map((n) => ({ tool: allServerTools.find((t) => t.name === n)!, similarity: 0 })),
  ].filter((m) => !excluded.has(m.tool.name));
  const filteredServerTools = serverMatches.map((m) => m.tool);

  const clientPseudoTools = buildClientPseudoServerTools();
  const clientMatches = findMatchingTools(promptEmbedding, clientPseudoTools, {
    limit: MAX_CLIENT_TOOLS_AFTER_FILTER,
    minSimilarity: CLIENT_TOOLS_MIN_SIMILARITY,
    filterAmbiguous: true,
    relevanceRatio: CLIENT_TOOLS_RELEVANCE_RATIO,
  });

  const matchedNames = new Set(clientMatches.map((m) => m.tool.name));
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

  const anchorOnlyNames = expandToolSetsAdditive(
    matchedNames,
    availableNames,
    scores,
    BUILT_IN_TOOL_SETS
  );
  const anchorActivatedSets = BUILT_IN_TOOL_SETS.filter((s) =>
    s.members.every((m) => anchorOnlyNames.has(m))
  ).map((s) => s.name);

  const activatedSetNames = activatedToolSetNames(scores, BUILT_IN_TOOL_SETS, activeSetNames);
  const guidancePrompts = toolSetSystemPrompts(
    finalClientNames,
    BUILT_IN_TOOL_SETS,
    activatedSetNames
  );

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

  const allToolNames = merged.map((t) => (t.name as string) || "");

  const effectiveClientMatches = [...clientMatches];
  for (const name of finalClientNames) {
    if (!matchedNames.has(name)) {
      const pseudoTool = clientPseudoTools.find((t) => t.name === name);
      if (pseudoTool) {
        effectiveClientMatches.push({ tool: pseudoTool, similarity: 0 });
      }
    }
  }
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

interface ToolSelectionCase {
  label: string;
  prompt: string;
  quarantined?: string;
  clientMustInclude?: string[];
  clientMustExclude?: string[];
  expectNoClientTools?: boolean;
  serverMustInclude?: string[];
  serverMustExclude?: string[];
  expectNoServerTools?: boolean;
  activeToolSets?: string[];
  mustActivateSets?: string[];
  mustNotActivateSets?: string[];
}

const cases: ToolSelectionCase[] = [
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

  {
    label: "choosing between options includes prompt_user_choice",
    prompt: "Help me choose between Italian, Japanese, or Mexican food for dinner",
    clientMustInclude: ["prompt_user_choice"],
  },
  {
    label: "selection request: indirect phrasing scores below threshold",
    prompt: "Which of these travel destinations should I visit: Bali, Tokyo, or Paris?",
    expectNoClientTools: true,
  },

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

  {
    label: "IP lookup includes geolocate_ip",
    prompt: "Where is this IP address located: 8.8.8.8?",
    clientMustInclude: ["geolocate_ip"],
  },

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
    label: "add-final-slide prompt still expands full slide set",
    prompt: "Add a final 'thank you' slide to my deck",
    clientMustInclude: ["plan_deck", "add_slide", "read_slides", "patch_slides"],
  },
  {
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
    label: "sub-gate terse prompt with active slides set keeps slide tools",
    prompt: "fix",
    activeToolSets: ["slides"],
    clientMustInclude: ["plan_deck", "add_slide", "read_slides", "patch_slides"],
    mustActivateSets: ["slides"],
  },
  {
    label: "off-topic prompt with active slides set still gets slide tools",
    prompt: "what's the weather in Paris?",
    activeToolSets: ["slides"],
    clientMustInclude: ["plan_deck", "add_slide", "read_slides", "patch_slides"],
  },

  {
    label: "image generation includes image tools",
    prompt: "Generate an image of a sunset over the ocean",
    quarantined: "https://github.com/anuma-ai/sdk/issues/804",
    serverMustInclude: ["AnumaMediaMCP-anuma_create_image"],
    serverMustExclude: ["AnumaMediaMCP-anuma_create_music", "OpenMeteoMCP-weather_forecast"],
  },
  {
    label: "image editing includes the image tool",
    prompt: "Edit this photo to look like a watercolor painting",
    serverMustInclude: ["AnumaMediaMCP-anuma_create_image"],
  },

  {
    label: "video generation includes video tools",
    prompt: "Create a video of a cat playing piano",
    serverMustInclude: ["AnumaMediaMCP-anuma_create_video"],
  },

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

  {
    label: "web search includes search tools",
    prompt: "Search the web for recent news about AI regulation",
    serverMustInclude: [
      "AnumaJinaMCP-search_web",
      "AnumaSearchMCP-anuma_scrape_url",
      "AnumaJinaMCP-parallel_search_web",
    ],
    serverMustExclude: ["AnumaMediaMCP-anuma_create_image", "AnumaMediaMCP-anuma_create_music"],
  },
  {
    label: "URL reading includes the scrape tool",
    prompt: "Read the content of https://example.com/article",
    serverMustInclude: ["AnumaSearchMCP-anuma_scrape_url"],
  },

  {
    label: "crypto price includes price tool",
    prompt: "What's the current price of Bitcoin?",
    serverMustInclude: ["AnumaTwelveDataMCP-get_price"],
    serverMustExclude: ["OpenMeteoMCP-weather_forecast", "AnumaMediaMCP-anuma_create_image"],
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

  {
    label: "PDF extraction includes PDF tool",
    prompt: "Extract the text from this PDF document",
    serverMustInclude: ["AnumaJinaMCP-extract_pdf"],
  },
  {
    label: "OCR screenshot prompt does not include vision tool (excluded by default)",
    prompt: "Extract text from this screenshot image",
    serverMustExclude: ["AnumaVisionMCP-anuma_analyze_image"],
  },

  {
    label: "build app includes full app-generation set (file + quality tools)",
    prompt: "Build me a todo list app",
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

  {
    label: "chart request: display_chart selected (media leak documented)",
    prompt: "Show me a bar chart of monthly sales data",
    clientMustInclude: ["display_chart"],
  },
  {
    label: "booking form: no irrelevant server tools",
    prompt: "Let me fill out my booking details: name, email, dates, and room preferences",
    clientMustInclude: ["prompt_user_form"],
    serverMustExclude: ["OpenMeteoMCP-weather_forecast", "AnumaMediaMCP-anuma_create_image"],
  },

  {
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
    label: "very short greeting skips selection (no app-generation)",
    prompt: "hey",
    mustNotActivateSets: ["app-generation"],
  },
  {
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

  const injected = summaryRows.filter((r) => r.appBuilder).map((r) => r.prompt);
  console.log(
    `\n[APP_BUILDER_PROMPT] injected for ${injected.length}/${summaryRows.length} prompts:`
  );
  for (const r of summaryRows) {
    console.log(`  ${r.appBuilder ? "✓" : "·"}  ${r.prompt}`);
  }
}

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
    (tc.quarantined ? it.skip : it)(tc.label, async () => {
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
