/**
 * Server-side tools caching module
 *
 * Fetches and caches tools from /api/v1/tools endpoint
 * with configurable expiration and localStorage persistence.
 */

import type { LlmapiChatCompletionTool } from "../../client";
import { APP_BUILDER_PROMPT } from "../../tools/appBuilderPrompt";
import type { ToolConfig } from "../chat/useChat/types";
import { getLogger } from "../logger";
import { chunkText, DEFAULT_CHUNK_SIZE, shouldChunkMessage } from "../memoryEngine/chunking";
import { generateEmbedding, generateEmbeddings } from "../memoryEngine/embeddings";
import { cosineSimilarity } from "../memoryEngine/vector";

/** Tool parameters schema */
interface ToolParameters {
  properties: Record<string, unknown>;
  required: string[];
  type: "object";
}

/** Current API response format (description and parameters at top level) */
interface ServerToolsResponseItemCurrent {
  description: string;
  name: string;
  parameters: ToolParameters;
}

/** New API response format with schema wrapper */
interface ServerToolsResponseItemNew {
  name: string;
  schema: {
    name: string;
    description: string;
    parameters: ToolParameters;
  };
  cost?: number;
  embedding?: number[];
}

/** Response item can be either format */
type ServerToolsResponseItem = ServerToolsResponseItemCurrent | ServerToolsResponseItemNew;

/** Tools object mapping tool names to their definitions */
type ServerToolsMap = {
  [toolName: string]: ServerToolsResponseItem;
};

/**
 * Response format from /api/v1/tools endpoint.
 * New format includes checksum and tools wrapper.
 * Legacy format is just the tools map directly.
 */
export type ServerToolsResponse =
  | {
      checksum: string;
      tools: ServerToolsMap;
    }
  | ServerToolsMap;

/**
 * Server tool definition with parameters field.
 * This is the neutral format stored in cache.
 * Strategies transform this to the correct API format.
 */
export interface ServerTool {
  type: "function";
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, unknown>;
    required: string[];
  };
  /** Optional embedding vector for semantic matching */
  embedding?: number[];
}

/**
 * Cached tools structure stored in localStorage
 */
export interface CachedServerTools {
  tools: ServerTool[];
  timestamp: number;
  version: string;
  /** Checksum from the server for cache invalidation */
  checksum?: string;
}

/**
 * Options for fetching server tools
 */
export interface ServerToolsOptions {
  /** Base URL for the API (defaults to BASE_URL from clientConfig) */
  baseUrl?: string;
  /** Cache expiration time in milliseconds (default: 5 minutes) */
  cacheExpirationMs?: number;
  /** Force refresh even if cache is valid */
  forceRefresh?: boolean;
  /** Authentication token getter (uses Authorization: Bearer header) */
  getToken?: () => Promise<string | null>;
  /** Direct API key for server-side usage (uses X-API-Key header) */
  apiKey?: string;
}

/** Default cache expiration: 1 day */
export const DEFAULT_CACHE_EXPIRATION_MS = 24 * 60 * 60 * 1000;

/** localStorage key for cached tools */
const SERVER_TOOLS_CACHE_KEY = "sdk_server_tools_cache";

/** Cache version - increment to invalidate old caches on format changes */
const CACHE_VERSION = "1.3";

// Selection thresholds — exported so `useChatStorage` (production) and the
// toolSelection e2e suite import the SAME values; hard-coded copies drift
// silently when these are tuned.

/** Minimum prompt length for tool matching. Shorter prompts skip embedding. */
export const MIN_CONTENT_LENGTH_FOR_TOOLS = 5;

/**
 * Max client tools to include after automatic semantic filtering.
 * Set high — CLIENT_TOOLS_RELEVANCE_RATIO does the real trimming; this
 * is just a safety cap to avoid pathological cases.
 */
export const MAX_CLIENT_TOOLS_AFTER_FILTER = 10;

/** Minimum similarity for client tool semantic matching. */
export const CLIENT_TOOLS_MIN_SIMILARITY = 0.53;

/**
 * Client-tool relevance ratio: drop tools scoring below this fraction of the
 * top match. 0.75, not 0.9 — multi-intent prompts ("weather in Tokyo, and
 * chart the temperature trend") embed dominated by one intent, so the second
 * tool lands around 75-80% of the top score; at 0.9 the second intent could
 * NEVER survive, no matter how good its description (measured: display_chart
 * 0.62 vs display_weather 0.81 → ratio 0.77).
 */
export const CLIENT_TOOLS_RELEVANCE_RATIO = 0.75;

/**
 * Type guard to check if tool is in new format (has schema property)
 */
function isNewToolFormat(tool: ServerToolsResponseItem): tool is ServerToolsResponseItemNew {
  return "schema" in tool && tool.schema !== undefined;
}

/**
 * Type guard to check if response is in new format (has checksum and tools wrapper)
 */
function isNewResponseFormat(
  response: ServerToolsResponse
): response is { checksum: string; tools: ServerToolsMap } {
  return (
    "checksum" in response &&
    "tools" in response &&
    typeof (response as { checksum?: string }).checksum === "string"
  );
}

/**
 * Result of parsing server tools response
 */
export interface ParsedServerToolsResponse {
  tools: ServerTool[];
  checksum?: string;
}

/**
 * Convert server API response to ServerTool[] format.
 * Supports both legacy and new API response formats.
 * Returns tools and optional checksum.
 */
function convertServerToolsResponse(response: ServerToolsResponse): ParsedServerToolsResponse {
  // Extract tools map and checksum based on response format
  let toolsMap: ServerToolsMap;
  let checksum: string | undefined;

  if (isNewResponseFormat(response)) {
    toolsMap = response.tools;
    checksum = response.checksum;
  } else {
    toolsMap = response;
  }

  const tools = Object.values(toolsMap).map((tool) => {
    if (isNewToolFormat(tool)) {
      // New format: extract from schema, preserve embedding
      return {
        type: "function" as const,
        name: tool.schema.name,
        description: tool.schema.description,
        parameters: tool.schema.parameters,
        ...(tool.embedding && { embedding: tool.embedding }),
      };
    }
    // Current format: extract from top level
    return {
      type: "function" as const,
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    };
  });

  return { tools, checksum };
}

/**
 * Completions API tool format.
 * OpenAI Chat Completions expects: { type, function: { name, description, parameters } }
 */
interface CompletionsTool {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: {
      type: string;
      properties: Record<string, unknown>;
      required: string[];
    };
  };
}

/**
 * Convert ServerTool to completions API format.
 * Format: { type: "function", function: { name, description, parameters } }
 */
function toCompletionsFormat(tool: ServerTool): CompletionsTool {
  return {
    type: "function",
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  };
}

/**
 * Convert ServerTool to responses API format.
 * Format: { type: "function", name, description, parameters }
 */
function toResponsesFormat(tool: ServerTool): Record<string, unknown> {
  return {
    type: "function",
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters,
  };
}

/**
 * Get cached tools from localStorage
 */
export function getCachedServerTools(): CachedServerTools | null {
  if (typeof window === "undefined") return null;

  try {
    const cached = localStorage.getItem(SERVER_TOOLS_CACHE_KEY);
    if (!cached) return null;

    const parsed = JSON.parse(cached) as CachedServerTools;

    // Validate cache version
    if (parsed.version !== CACHE_VERSION) {
      clearServerToolsCache();
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

/**
 * Check if cached tools are expired
 */
function isCacheExpired(
  cache: CachedServerTools | null,
  expirationMs: number = DEFAULT_CACHE_EXPIRATION_MS
): boolean {
  if (!cache) return true;
  return Date.now() - cache.timestamp > expirationMs;
}

/**
 * Store tools in localStorage cache
 */
function cacheServerTools(tools: ServerTool[], checksum?: string): void {
  if (typeof window === "undefined") return;

  const cacheData: CachedServerTools = {
    tools,
    timestamp: Date.now(),
    version: CACHE_VERSION,
    ...(checksum && { checksum }),
  };

  try {
    localStorage.setItem(SERVER_TOOLS_CACHE_KEY, JSON.stringify(cacheData));
  } catch (error) {
    // localStorage might be full or disabled - log but don't throw

    getLogger().warn("[serverTools] Failed to cache tools:", error);
  }
}

/**
 * Clear the server tools cache
 */
export function clearServerToolsCache(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SERVER_TOOLS_CACHE_KEY);
}

/**
 * Get the checksum of currently cached tools.
 * Returns undefined if no cache or no checksum stored.
 */
export function getToolsChecksum(): string | undefined {
  const cached = getCachedServerTools();
  return cached?.checksum;
}

/**
 * Check if tools should be refreshed based on checksum comparison.
 * Returns true if:
 * - responseChecksum is provided and differs from cached checksum
 * - No cached checksum exists (first time with checksum support)
 *
 * Returns false if:
 * - responseChecksum is not provided (legacy response)
 * - Checksums match
 */
export function shouldRefreshTools(responseChecksum: string | undefined): boolean {
  if (!responseChecksum) {
    // Legacy response without checksum - don't trigger refresh
    return false;
  }

  const cachedChecksum = getToolsChecksum();

  if (!cachedChecksum) {
    // No cached checksum - refresh to get tools with checksum
    return true;
  }

  return cachedChecksum !== responseChecksum;
}

/**
 * Fetch tools from the server API
 */
async function fetchServerToolsFromApi(
  baseUrl: string,
  token: string
): Promise<ParsedServerToolsResponse> {
  const response = await fetch(`${baseUrl}/api/v1/tools`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch server tools: ${response.status}`);
  }

  const data = (await response.json()) as ServerToolsResponse;
  return convertServerToolsResponse(data);
}

/**
 * Get server tools with caching support.
 *
 * Flow:
 * 1. Check localStorage cache
 * 2. If cache valid and not force refresh, return cached tools
 * 3. Otherwise, fetch from API, cache, and return
 * 4. On fetch failure, return cached tools if available (stale-while-error)
 */
export async function getServerTools(options: ServerToolsOptions): Promise<ServerTool[]> {
  const {
    baseUrl,
    cacheExpirationMs = DEFAULT_CACHE_EXPIRATION_MS,
    forceRefresh = false,
    getToken,
    apiKey,
  } = options;

  // Check cache first (unless forcing refresh)
  const cached = getCachedServerTools();
  const cacheValid = !isCacheExpired(cached, cacheExpirationMs);

  if (cached && cacheValid && !forceRefresh) {
    return cached.tools;
  }

  // Try to fetch fresh tools
  try {
    // Import BASE_URL dynamically to avoid circular dependencies
    const { BASE_URL } = await import("../../clientConfig");
    const effectiveBaseUrl = baseUrl ?? BASE_URL;

    if (apiKey) {
      // API key auth: fetch directly with X-API-Key header
      const response = await fetch(`${effectiveBaseUrl}/api/v1/tools`, {
        method: "GET",
        headers: {
          "X-API-Key": apiKey,
          "Content-Type": "application/json",
        },
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch server tools: ${response.status}`);
      }
      const data = (await response.json()) as ServerToolsResponse;
      const { tools, checksum } = convertServerToolsResponse(data);
      cacheServerTools(tools, checksum);
      return tools;
    }

    if (!getToken) {
      getLogger().warn("[serverTools] No auth method available for fetching tools");
      return cached?.tools ?? [];
    }

    const token = await getToken();
    if (!token) {
      // No token available - return cached if available, otherwise empty

      getLogger().warn("[serverTools] No auth token available for fetching tools");
      return cached?.tools ?? [];
    }

    const { tools, checksum } = await fetchServerToolsFromApi(effectiveBaseUrl, token);
    cacheServerTools(tools, checksum);
    return tools;
  } catch (error) {
    getLogger().error("[serverTools] Failed to fetch server tools:", error);

    // Stale-while-error: return cached tools if available
    if (cached?.tools) {
      getLogger().warn("[serverTools] Using stale cached tools due to fetch error");
      return cached.tools;
    }

    // No cache available - return empty (don't block sendMessage)
    return [];
  }
}

/**
 * Filter server tools by name.
 * @param serverTools - All server tools
 * @param includeNames - Names to include (undefined = all, [] = none)
 */
export function filterServerTools(
  serverTools: ServerTool[],
  includeNames?: string[]
): ServerTool[] {
  // undefined means include all
  if (includeNames === undefined) {
    return serverTools;
  }

  // Empty array means include none
  if (includeNames.length === 0) {
    return [];
  }

  // Filter to only included names
  const includeSet = new Set(includeNames);
  return serverTools.filter((tool) => includeSet.has(tool.name));
}

/** Shape of the `function` property on OpenAI-style tool objects. */
interface ToolFunctionDef {
  name?: string;
  description?: string;
  parameters?: Record<string, unknown>;
  arguments?: Record<string, unknown>;
}

/** Helper to safely extract the `function` property from a tool-like object. */
function getToolFunction(tool: LlmapiChatCompletionTool | ToolConfig): ToolFunctionDef | undefined {
  const fn = (tool as Record<string, unknown>).function;
  if (fn && typeof fn === "object") {
    return fn as ToolFunctionDef;
  }
  return undefined;
}

/**
 * Convert client tool to Responses API format.
 * Preserves executor for client-side execution.
 */
function clientToolToResponsesFormat(
  tool: LlmapiChatCompletionTool | ToolConfig
): Record<string, unknown> {
  const toolConfig = tool as ToolConfig;
  const func = getToolFunction(tool);

  if (!func) {
    // Already in responses format or malformed - return as-is
    return tool as Record<string, unknown>;
  }

  return {
    type: "function",
    name: func.name,
    description: func.description,
    // Handle both 'parameters' and 'arguments' field names
    parameters: func.parameters ?? func.arguments,
    // Preserve executor functions for client-side execution
    ...(toolConfig.executor && { executor: toolConfig.executor }),
    ...(toolConfig.skipContinuation !== undefined && {
      skipContinuation: toolConfig.skipContinuation,
    }),
    ...(toolConfig.removeAfterExecution !== undefined && {
      removeAfterExecution: toolConfig.removeAfterExecution,
    }),
    ...(toolConfig.executorTimeout !== undefined && {
      executorTimeout: toolConfig.executorTimeout,
    }),
  };
}

/**
 * Normalize client tool for Completions API format.
 * Ensures 'parameters' field exists (converts from 'arguments' if needed).
 * Preserves executor, skipContinuation, removeAfterExecution, and executorTimeout for client-side execution.
 */
function clientToolToCompletionsFormat(
  tool: LlmapiChatCompletionTool | ToolConfig
): Record<string, unknown> {
  const toolConfig = tool as ToolConfig;
  const func = getToolFunction(tool);

  if (!func) {
    // Malformed tool - return as-is
    return tool as Record<string, unknown>;
  }

  // If 'parameters' already exists, return as-is
  if (func.parameters) {
    return tool as Record<string, unknown>;
  }

  // Convert 'arguments' to 'parameters' for Completions API
  const { arguments: args, ...restFunc } = func;

  return {
    type: "function",
    function: {
      ...restFunc,
      parameters: args ?? { type: "object", properties: {} },
    },
    // Preserve executor functions for client-side execution
    ...(toolConfig.executor && { executor: toolConfig.executor }),
    ...(toolConfig.skipContinuation !== undefined && {
      skipContinuation: toolConfig.skipContinuation,
    }),
    ...(toolConfig.removeAfterExecution !== undefined && {
      removeAfterExecution: toolConfig.removeAfterExecution,
    }),
    ...(toolConfig.executorTimeout !== undefined && {
      executorTimeout: toolConfig.executorTimeout,
    }),
  };
}

/**
 * Merge server tools with client tools.
 * Client tools take precedence (if same name exists).
 * @param serverTools - Server tools (already filtered if needed)
 * @param clientTools - Client tools with optional executors
 * @param apiType - API type to format tools for
 */
export function mergeTools(
  serverTools: ServerTool[],
  clientTools: Array<LlmapiChatCompletionTool | ToolConfig> | undefined,
  apiType: "responses" | "completions" = "responses"
): Array<Record<string, unknown>> {
  // Format server tools based on API type
  const formattedServerTools =
    apiType === "completions"
      ? serverTools.map(toCompletionsFormat)
      : serverTools.map(toResponsesFormat);

  if (!clientTools || clientTools.length === 0) {
    return formattedServerTools as Array<Record<string, unknown>>;
  }

  // Format client tools based on API type
  const formattedClientTools =
    apiType === "responses"
      ? clientTools.map(clientToolToResponsesFormat)
      : clientTools.map(clientToolToCompletionsFormat);

  if (serverTools.length === 0) {
    return formattedClientTools;
  }

  // Get client tool names for deduplication
  const clientToolNames = new Set(
    clientTools
      .map((t) => {
        const fn = getToolFunction(t);
        return fn?.name ?? (t as Record<string, unknown>).name;
      })
      .filter((name): name is string => typeof name === "string" && !!name)
  );

  // Filter server tools that don't conflict with client tools
  const nonConflictingServerTools = formattedServerTools.filter((tool) => {
    let toolName: string | undefined;
    if ("name" in tool && typeof tool.name === "string") {
      toolName = tool.name;
    } else if ("function" in tool && typeof tool.function === "object" && tool.function !== null) {
      toolName = (tool.function as ToolFunctionDef).name;
    }
    return !clientToolNames.has(toolName ?? "");
  });

  // Return merged array: server tools first, then client tools
  return [...nonConflictingServerTools, ...formattedClientTools] as Array<Record<string, unknown>>;
}

/**
 * Result of tool matching with similarity score
 */
export interface ToolMatchResult {
  tool: ServerTool;
  similarity: number;
}

/**
 * Options for findMatchingTools
 */
export interface ToolMatchOptions {
  /** Maximum number of tools to return (default: 5) */
  limit?: number;
  /** Minimum similarity threshold 0-1 (default: 0.3) */
  minSimilarity?: number;
  /**
   * When enabled, returns empty results if the top match doesn't clearly
   * stand out from the runner-up. This filters out generic prompts like
   * "hello" or "tell me a joke" where all tools score similarly low.
   *
   * A match is considered ambiguous when:
   * - The top score is below `ambiguityThreshold` (default: 0.55), AND
   * - The gap between the top score and the runner-up is below `minLead` (default: 0.04)
   */
  filterAmbiguous?: boolean;
  /** Top score must be above this to skip the ambiguity check (default: 0.55) */
  ambiguityThreshold?: number;
  /** Minimum gap between top and runner-up scores (default: 0.04) */
  minLead?: number;
  /**
   * Only keep tools scoring at least this fraction of the top match's score.
   * Filters out the tail of weakly-related tools that fill up the limit.
   * For example, 0.85 means a tool must score within 85% of the top match.
   * Set to 0 to disable. Default: 0 (disabled).
   */
  relevanceRatio?: number;
}

const DEFAULT_TOOL_MATCH_OPTIONS: Required<ToolMatchOptions> = {
  limit: 5,
  minSimilarity: 0.3,
  filterAmbiguous: false,
  ambiguityThreshold: 0.55,
  minLead: 0.04,
  relevanceRatio: 0,
};

/**
 * Find tools that semantically match prompt embedding(s).
 *
 * Accepts either a single embedding or an array of embeddings (e.g., from chunked messages).
 * When multiple embeddings are provided, uses max similarity across all chunks for each tool.
 *
 * @param promptEmbeddings - Single embedding vector or array of embeddings (for chunked messages)
 * @param tools - Array of server tools (with embeddings) to search through
 * @param options - Optional matching configuration
 * @returns Array of matching tools with similarity scores, sorted by relevance
 *
 * @example
 * ```ts
 * // Single embedding
 * const matches = findMatchingTools(embedding, tools, { limit: 5 });
 *
 * // Multiple embeddings (chunked message) - uses max similarity
 * const matches = findMatchingTools(chunkEmbeddings, tools, { limit: 5 });
 * ```
 */
export function findMatchingTools(
  promptEmbeddings: number[] | number[][],
  tools: ServerTool[],
  options?: ToolMatchOptions
): ToolMatchResult[] {
  const { limit, minSimilarity, filterAmbiguous, ambiguityThreshold, minLead, relevanceRatio } = {
    ...DEFAULT_TOOL_MATCH_OPTIONS,
    ...options,
  };

  // Early return for invalid inputs
  if (!promptEmbeddings || promptEmbeddings.length === 0) {
    return [];
  }

  if (!tools || tools.length === 0) {
    return [];
  }

  // Normalize to array of embeddings
  const embeddings: number[][] = Array.isArray(promptEmbeddings[0])
    ? (promptEmbeddings as number[][])
    : [promptEmbeddings as number[]];

  // Calculate similarity for each tool with a valid embedding
  const results: ToolMatchResult[] = [];

  for (const tool of tools) {
    if (!tool.embedding || tool.embedding.length === 0) {
      continue;
    }

    try {
      // Max similarity across all chunk embeddings
      let maxSimilarity = -Infinity;
      for (const embedding of embeddings) {
        const similarity = cosineSimilarity(embedding, tool.embedding);
        if (similarity > maxSimilarity) {
          maxSimilarity = similarity;
        }
      }

      if (maxSimilarity >= minSimilarity) {
        results.push({ tool, similarity: maxSimilarity });
      }
    } catch {
      // Skip tools with dimension mismatch
      continue;
    }
  }

  // Sort by similarity descending and limit results
  let sorted = results.sort((a, b) => b.similarity - a.similarity).slice(0, limit);

  // Ambiguity filter: when the top match is weak and clustered with the runner-up,
  // no tool is a genuine match for this prompt — return empty.
  if (filterAmbiguous && sorted.length > 1) {
    const topScore = sorted[0].similarity;
    const runnerUpScore = sorted[1].similarity;
    if (topScore < ambiguityThreshold && topScore - runnerUpScore < minLead) {
      return [];
    }
  }

  // Relevance dropoff: only keep tools scoring within relevanceRatio of the top match.
  // This trims the tail of loosely-related tools that fill up the limit.
  if (relevanceRatio > 0 && sorted.length > 1) {
    const cutoff = sorted[0].similarity * relevanceRatio;
    sorted = sorted.filter((r) => r.similarity >= cutoff);
  }

  return sorted;
}

/**
 * Compute the raw max similarity for every tool with a valid embedding,
 * without any filtering (no `minSimilarity`, no `relevanceRatio`, no
 * ambiguity check, no limit). Use this when you need true per-tool scores
 * — e.g., to drive `expandToolSetsAdditive`'s anchor activation without
 * letting `findMatchingTools`' relevance cutoff silently drop sub-threshold
 * anchors that should still trigger their set.
 */
export function scoreTools(
  promptEmbeddings: number[] | number[][],
  tools: ServerTool[]
): Map<string, number> {
  const scores = new Map<string, number>();
  if (!promptEmbeddings || (promptEmbeddings as unknown[]).length === 0) return scores;
  if (!tools || tools.length === 0) return scores;

  const embeddings: number[][] = Array.isArray(promptEmbeddings[0])
    ? (promptEmbeddings as number[][])
    : [promptEmbeddings as number[]];

  for (const tool of tools) {
    if (!tool.embedding || tool.embedding.length === 0) continue;
    let maxSimilarity = -Infinity;
    try {
      for (const embedding of embeddings) {
        const similarity = cosineSimilarity(embedding, tool.embedding);
        if (similarity > maxSimilarity) maxSimilarity = similarity;
      }
    } catch {
      continue;
    }
    if (maxSimilarity > -Infinity) scores.set(tool.name, maxSimilarity);
  }

  return scores;
}

// ---------------------------------------------------------------------------
// Tool sets — groups of tools that must be included/excluded together
// ---------------------------------------------------------------------------

/**
 * A tool set defines a group of tools that work together. When any "anchor"
 * tool in the set is matched semantically (with a score at or above
 * `anchorMinSimilarity`), the set is activated and all of its members are
 * pulled into the selection.
 *
 * Two activation strategies consume this interface:
 * - `expandToolSetsAdditive` (used by `useChatStorage` and
 *   `createServerToolsFilter`) keeps all original matches and adds the
 *   set's members on top — non-set tools are never dropped.
 * - `applyToolSets` is exclusive: it keeps only set members plus non-set
 *   tools that scored above `independentThreshold`.
 *
 * Pick `expandToolSetsAdditive` when you want recall over precision
 * (typical), and `applyToolSets` when you specifically want non-set
 * matches stripped on activation.
 */
export interface ToolSet {
  /** Human-readable name for logging/debugging */
  name: string;
  /** All tool names in the set */
  members: string[];
  /**
   * Tools that trigger the set when selected. If any anchor appears in the
   * semantic match results with a score at or above `anchorMinSimilarity`,
   * all members are pulled in.
   */
  anchors: string[];
  /**
   * Minimum similarity an anchor must reach to activate the set.
   * Prevents false activation on prompts where the anchor barely passes
   * the global minSimilarity threshold. Default: 0.60
   */
  anchorMinSimilarity?: number;
  /**
   * System-prompt fragment to APPEND to the base prompt when this set
   * activates. Additive, never a replacement — it composes with the host's
   * persona / memory. Gated on genuine activation (anchor score ≥
   * `anchorMinSimilarity`, or a forced set) via {@link activatedToolSetNames} →
   * {@link toolSetSystemPrompts}, NOT on mere anchor presence — a borderline
   * anchor kept by recall-over-precision must not drag this persona in. Write
   * it to be self-limiting too (condition its behavior on the user actually
   * wanting what the set does), so a borderline activation doesn't bias the turn.
   */
  systemPrompt?: string;
}

/** Built-in tool sets. Consumers can extend this with their own. */
export const BUILT_IN_TOOL_SETS: ToolSet[] = [
  {
    name: "app-generation",
    // Appended to the base prompt (not replacing it) whenever this set
    // activates, so the App Builder guidance — including the window.app.complete
    // runtime-AI contract — rides in with the app-gen tools via the same
    // semantic selection that includes them. Collected by toolSetSystemPrompts.
    systemPrompt: APP_BUILDER_PROMPT,
    // Must stay in sync with APP_FILE_TOOL_NAMES in src/tools/appGeneration.ts.
    // If a new app-gen tool ships there but isn't added here, semantic
    // selection will exclude it on every request — the model literally
    // doesn't see it. The quality tools (audit_design / critique_design /
    // verify_app) are non-obvious to a user prompt ("build me a kanban")
    // and rely entirely on set expansion to reach the model.
    members: [
      "create_file",
      "patch_file",
      "delete_file",
      "read_file",
      "list_files",
      "audit_design",
      "critique_design",
      "verify_app",
    ],
    // Anchors stay limited to the primary entry-point tools. Users phrase
    // app intent as "build / make / fix" → semantic match on create_file
    // or patch_file → full set pulled in. The quality tools fire later in
    // the workflow and don't anchor on their own; including them as
    // anchors would risk pulling the set in on unrelated "audit my code"
    // prompts that have nothing to do with app generation.
    anchors: ["create_file", "patch_file"],
    // 0.55: above the global filter floor (0.53) so a barely-relevant match
    // can't pull in the whole toolkit, but no higher — and we tried higher.
    // create_file scores chitchat ("what's up" ~0.56, "...about programming"
    // ~0.57) in the SAME band as legitimate app-EDIT prompts: "Edit the app to
    // change the background…" measured create_file 0.56 on one e2e run. Raising
    // the floor to 0.575 to exclude the chitchat therefore also stripped the
    // file tools from real edit requests — leaving the model unable to touch the
    // app at all. The bands genuinely overlap; there is no clean cut. So we keep
    // 0.55 (max recall) and rely on two safety nets instead: APP_BUILDER_PROMPT
    // is conditional (it no-ops unless the user is actually asking for an app),
    // and very short greetings ("hey") are filtered out earlier by the
    // MIN_CONTENT_LENGTH_FOR_TOOLS length gate before embeddings even run.
    anchorMinSimilarity: 0.55,
  },
  {
    name: "slides",
    members: ["plan_deck", "add_slide", "read_slides", "patch_slides"],
    anchors: ["plan_deck", "patch_slides"],
    // Match the client-tool floor (0.53). Short colloquial prompts like
    // "make me a powerpoint about X" score plan_deck around 0.535 — above
    // the global floor but inside any anchor gap. plan_deck and patch_slides
    // are specific enough names that 0.53 won't false-positive in practice.
    anchorMinSimilarity: 0.53,
  },
  {
    name: "github",
    members: ["github_get_authenticated_user", "github_api"],
    anchors: ["github_api"],
    anchorMinSimilarity: 0.55,
  },
];

/**
 * Apply tool set logic to a set of semantic match results.
 *
 * For each defined tool set, if any anchor tool appears in `matchedNames`,
 * all set members present in `availableNames` are added and non-member
 * tools are removed (unless they scored above `independentThreshold`).
 *
 * @param matchedNames - Names selected by semantic matching
 * @param availableNames - All tool names available for selection
 * @param scores - Map of tool name → similarity score (from semantic matching)
 * @param toolSets - Tool sets to apply (defaults to BUILT_IN_TOOL_SETS)
 * @param independentThreshold - Non-set tools scoring above this survive (default: 0.65)
 */
export function applyToolSets(
  matchedNames: Set<string>,
  availableNames: Set<string>,
  scores: Map<string, number>,
  toolSets: ToolSet[] = BUILT_IN_TOOL_SETS,
  independentThreshold: number = 0.65
): Set<string> {
  // Collect every tool set whose anchor cleared its similarity floor.
  // Multiple sets can activate on the same prompt (e.g. an app-gen anchor
  // and a slides anchor both clearing 0.53) — expanding only the first
  // would silently drop the others' members.
  const activatedSets: ToolSet[] = [];
  for (const ts of toolSets) {
    const minSim = ts.anchorMinSimilarity ?? 0.6;
    const triggered = ts.anchors.some(
      (anchor) => matchedNames.has(anchor) && (scores.get(anchor) ?? 0) >= minSim
    );
    if (triggered) activatedSets.push(ts);
  }

  if (activatedSets.length === 0) return matchedNames;

  const setMembers = new Set<string>();
  for (const ts of activatedSets) {
    for (const member of ts.members) setMembers.add(member);
  }

  const result = new Set<string>();

  // Include all set members that are available
  for (const member of setMembers) {
    if (availableNames.has(member)) {
      result.add(member);
    }
  }

  // Keep non-set tools only if they scored above the independent threshold
  for (const name of matchedNames) {
    if (setMembers.has(name)) continue;
    const score = scores.get(name) ?? 0;
    if (score >= independentThreshold) {
      result.add(name);
    }
  }

  return result;
}

/**
 * Additively expand tool sets: when any anchor of a set scores at or above
 * its `anchorMinSimilarity`, all set members are added to the result.
 * Original matches are preserved; multiple sets can expand independently.
 *
 * Members of sets that *don't* activate are kept if they were individually
 * matched. We deliberately don't strip orphans: the cost of a single
 * borderline tool slipping into the request is cheap (a few extra bytes,
 * no behavioral impact) but stripping legitimate matches like
 * `create_file 0.55` on prompts where `patch_file` doesn't also clear the
 * anchor threshold would silently break app-creation flows. Recall over
 * precision.
 *
 * Use this for server-side toolkit suites where the LLM needs the full
 * call chain (e.g. fal_list_models → fal_model_schema → fal_queue_submit →
 * fal_queue_status → fal_queue_result). Differs from `applyToolSets`, which
 * replaces non-set matches when a set activates.
 *
 * To express "any member triggers the set" (not specific anchors), pass
 * `anchors: members` when defining the ToolSet.
 *
 * @param matchedNames - Names selected by semantic matching
 * @param availableNames - All tool names available for selection
 * @param scores - Map of tool name → similarity score
 * @param toolSets - Tool sets to evaluate
 * @param activeSetNames - Set names that should expand unconditionally,
 *   bypassing the anchor-similarity check. Use this when conversation state
 *   implies a set should be present regardless of how the current prompt is
 *   phrased (e.g., a slide deck artifact already exists in the conversation).
 * @returns Set including original matches plus members of any activated set
 */
export function expandToolSetsAdditive(
  matchedNames: Set<string>,
  availableNames: Set<string>,
  scores: Map<string, number>,
  toolSets: ToolSet[],
  activeSetNames?: ReadonlySet<string>
): Set<string> {
  const result = new Set(matchedNames);
  for (const ts of toolSets) {
    let triggered = activeSetNames?.has(ts.name) ?? false;
    if (!triggered) {
      const minSim = ts.anchorMinSimilarity ?? 0.6;
      triggered = ts.anchors.some((a) => (scores.get(a) ?? 0) >= minSim);
    }
    if (!triggered) continue;
    for (const member of ts.members) {
      if (availableNames.has(member)) {
        result.add(member);
      }
    }
  }
  return result;
}

/**
 * Names of the tool sets that *activated* for a request — the exact gate
 * {@link expandToolSetsAdditive} uses to pull in members: an anchor whose
 * similarity cleared `anchorMinSimilarity`, or a set the caller forced active
 * via `activeSetNames`. Drives {@link toolSetSystemPrompts} so a set's persona
 * rides in only on genuine activation, not on a borderline anchor that was kept
 * by recall-over-precision (below the activation floor) without the set
 * actually activating.
 *
 * @param scores - Tool name → similarity score (from semantic matching).
 * @param toolSets - Tool sets to evaluate (defaults to {@link BUILT_IN_TOOL_SETS}).
 * @param activeSetNames - Set names forced active regardless of score.
 */
export function activatedToolSetNames(
  scores: ReadonlyMap<string, number>,
  toolSets: ToolSet[] = BUILT_IN_TOOL_SETS,
  activeSetNames?: ReadonlySet<string>
): Set<string> {
  const activated = new Set<string>();
  for (const ts of toolSets) {
    if (activeSetNames?.has(ts.name)) {
      activated.add(ts.name);
      continue;
    }
    const minSim = ts.anchorMinSimilarity ?? 0.6;
    if (ts.anchors.some((a) => (scores.get(a) ?? 0) >= minSim)) {
      activated.add(ts.name);
    }
  }
  return activated;
}

/**
 * Collect the `systemPrompt` of every tool set that activated for a request,
 * for the caller to APPEND to its base system prompt.
 *
 * Pass `activatedSetNames` (from {@link activatedToolSetNames}) to gate on
 * genuine activation — an anchor that cleared `anchorMinSimilarity` or a forced
 * set. This is the correct gate: `expandToolSetsAdditive` keeps borderline
 * anchor matches in the selection even when the set did NOT activate (recall
 * over precision), so gating on mere anchor *presence* would inject a set's
 * persona on prompts it has nothing to do with (e.g. the App Builder prompt on
 * "write a story"). When `activatedSetNames` is omitted, falls back to anchor
 * presence for legacy callers that don't compute scores.
 *
 * Additive by design: append the returned fragments, never replace the base
 * prompt, so persona / memory survive. De-duplicated, order preserved.
 *
 * @param selectedToolNames - Final selected tool names (client + server tools).
 * @param toolSets - Tool sets to consult (defaults to {@link BUILT_IN_TOOL_SETS}).
 * @param activatedSetNames - Set names that genuinely activated (see above).
 * @returns Mode prompts for active sets, in `toolSets` order, deduplicated.
 */
export function toolSetSystemPrompts(
  selectedToolNames: Iterable<string>,
  toolSets: ToolSet[] = BUILT_IN_TOOL_SETS,
  activatedSetNames?: ReadonlySet<string>
): string[] {
  const selected =
    selectedToolNames instanceof Set ? selectedToolNames : new Set(selectedToolNames);
  const prompts: string[] = [];
  const seen = new Set<string>();
  for (const ts of toolSets) {
    const prompt = ts.systemPrompt;
    if (!prompt || seen.has(prompt)) continue;
    const active = activatedSetNames
      ? activatedSetNames.has(ts.name)
      : ts.anchors.some((anchor) => selected.has(anchor));
    if (active) {
      prompts.push(prompt);
      seen.add(prompt);
    }
  }
  return prompts;
}

/**
 * Options for createServerToolsFilter.
 */
export interface CreateServerToolsFilterOptions {
  /**
   * Tool sets to expand additively. When any anchor scores at or above the
   * set's `anchorMinSimilarity`, all members are included alongside the
   * original semantic matches.
   */
  toolSets?: ToolSet[];
  /** Tool names to always drop from results, even when they match. */
  excludeTools?: Iterable<string>;
  /** Options forwarded to `findMatchingTools`. */
  matchOptions?: ToolMatchOptions;
}

/**
 * Build a server-tools filter function for use with `useChatStorage`'s
 * `serverTools` option. Composes `findMatchingTools`, `expandToolSetsAdditive`,
 * and an exclude-list into a single (embeddings, tools) → string[] callback.
 *
 * @example
 * ```ts
 * import { createServerToolsFilter } from "@anuma/sdk/tools";
 *
 * const serverTools = createServerToolsFilter({
 *   toolSets: [
 *     {
 *       name: "fal",
 *       members: ["AnumaFalMCP-fal_run", "AnumaFalMCP-fal_queue_submit", ...],
 *       anchors: ["AnumaFalMCP-fal_run", "AnumaFalMCP-fal_queue_submit", ...],
 *       anchorMinSimilarity: 0.7,
 *     },
 *   ],
 *   excludeTools: ["AnumaFalMCP-fal_billing"],
 *   matchOptions: { limit: 5, minSimilarity: 0.5 },
 * });
 * ```
 */
export function createServerToolsFilter(
  options: CreateServerToolsFilterOptions = {}
): (embeddings: number[] | number[][], tools: ServerTool[]) => string[] {
  const exclude = new Set(options.excludeTools ?? []);
  const sets = options.toolSets ?? [];
  const matchOpts = options.matchOptions;

  return (embeddings, tools) => {
    const matches = findMatchingTools(embeddings, tools, matchOpts);
    if (matches.length === 0) return [];

    const matchedNames = new Set(matches.map((m) => m.tool.name));
    let finalNames: Set<string>;
    if (sets.length > 0) {
      // Dependency expansion is SELECTION-gated: an anchor activates its set
      // only when it was actually picked by `findMatchingTools` (top-N above
      // the floor). Score-only activation — the rescue `useChatStorage` needs
      // client-side because its 0.9 relevanceRatio can drop anchors — is
      // wrong here: server anchors like `fal_generate_video` graze the 0.5
      // floor on completely unrelated prompts, and a score-gated set would
      // ride along on nearly every request (observed live: the Fal queue
      // lifecycle attached to news-search and chitchat prompts). Restricting
      // the score map to selected names makes "anchor in the toolset" the
      // activation condition while keeping `anchorMinSimilarity` semantics.
      const scores = scoreTools(embeddings, tools);
      const selectedScores = new Map([...scores].filter(([name]) => matchedNames.has(name)));
      const availableNames = new Set(tools.map((t) => t.name));
      finalNames = expandToolSetsAdditive(matchedNames, availableNames, selectedScores, sets);
    } else {
      finalNames = matchedNames;
    }

    for (const name of exclude) finalNames.delete(name);
    return [...finalNames];
  };
}

// ── Default server-tools filter ─────────────────────────────────────────────

/**
 * Default exclusions baked into `defaultServerToolsFilter`.
 *
 * - `AnumaVisionMCP-anuma_analyze_image`: modern frontier models have native
 *   vision via image content blocks; routing through a server-side vision
 *   tool just adds a hop.
 * - `OpenMeteoMCP-weather_forecast` + `OpenMeteoMCP-geocoding`: redundant when
 *   the consumer registers `createWeatherTool` (the client-side display tool
 *   handles geocoding internally and renders a card inline). Including the
 *   server-side equivalents causes the model to prefer raw data over the card.
 *   Consumers who don't register `createWeatherTool` should instead build
 *   their own filter via `createServerToolsFilter`.
 */
export const DEFAULT_EXCLUDED_SERVER_TOOLS: readonly string[] = [
  "AnumaVisionMCP-anuma_analyze_image",
  "OpenMeteoMCP-weather_forecast",
  "OpenMeteoMCP-geocoding",
  // Same native-capability argument as the vision tool: modern models reason
  // step-by-step natively (and reasoning-mode models do it structurally), so
  // a server-side sequential-thinking tool is a redundant hop. Its broad
  // description also embeds near virtually every prompt — observed live
  // riding into news-search, scheduling, and chitchat requests.
  "AnumaSequentialThinkingMCP-sequentialthinking",
  // Fal discovery/meta plumbing: generic descriptions that crack the top-5 on
  // unrelated prompts (observed live on news-search and research requests),
  // and useless in a chat turn without prior Fal context — listing workflows
  // or reading platform metadata isn't something a chat user asks for in
  // words that should beat real tools. Consumers building Fal-centric UIs
  // can re-enable via createServerToolsFilter's excludeTools option.
  "AnumaFalMCP-fal_meta",
  "AnumaFalMCP-fal_list_workflows",
  "AnumaFalMCP-fal_workflow_run",
];

/** Default match options for the server-tools filter (limit 5, minSim 0.5). */
export const DEFAULT_SERVER_TOOLS_MATCH_OPTIONS: ToolMatchOptions = {
  limit: 5,
  minSimilarity: 0.5,
};

/**
 * Dependency edges between server tools: when an entry tool (anchor) matches
 * a prompt, its continuation tools ride in even though they can never match
 * the prompt themselves.
 *
 * These exist because semantic selection structurally cannot reach a tool
 * whose job is step 2 of a call-chain. Measured against the live catalog
 * (June 2026): on "research the latest news on X", `search_web` scores 0.64
 * but `parallel_read_url` scores 0.33 and `parallel_search_web` 0.47 — below
 * the 0.5 floor, unreachable at ANY match limit. Likewise a Fal generation
 * prompt scores `fal_generate_video` 0.85 while the queue lifecycle it
 * depends on scores 0.25–0.41. No threshold or limit tuning fixes this; an
 * explicit edge is the only mechanism that does.
 *
 * Deliberately NOT grouped: same-vendor siblings (`extract_pdf`,
 * `search_images`, weather/finance variants, Fal discovery tools…). Those
 * embed near the prompts that need them and survive plain top-5 selection on
 * their own — vendor-wide expansion just dilutes the toolset. Keep this list
 * to genuine call-chains.
 *
 * Tool names are EXACT `/api/v1/tools` catalog matches — all filtering in
 * this module is exact-string, so a stale name silently selects nothing (the
 * May 2026 `Anuma` prefix rename broke every consumer keeping copies of
 * these lists). The toolSelection e2e suite asserts every name below exists
 * in the live catalog.
 */
export const SERVER_TOOL_DEPENDENCY_SETS: ToolSet[] = [
  {
    // search finds links; reading them is always the next step.
    name: "jina-research",
    members: [
      "AnumaJinaMCP-search_web",
      "AnumaJinaMCP-read_url",
      "AnumaJinaMCP-parallel_read_url",
      "AnumaJinaMCP-parallel_search_web",
    ],
    anchors: ["AnumaJinaMCP-search_web"],
    // Activation floor = the selection floor (0.5), not the 0.6 ToolSet
    // default. A dependency edge has different semantics from a persona-style
    // tool set: if the entry tool is plausibly offered at all, the chain must
    // ride along — "Search the web for recent news…" scores search_web in the
    // 0.5–0.6 band, and shipping search without read would dead-end the model.
    anchorMinSimilarity: 0.5,
  },
  {
    // Fal jobs are async: submit returns a job id the model must poll and
    // collect. Without status/result the model submits and dead-ends.
    name: "fal-queue",
    members: [
      "AnumaFalMCP-fal_generate_video",
      "AnumaFalMCP-fal_run",
      "AnumaFalMCP-fal_queue_submit",
      "AnumaFalMCP-fal_queue_status",
      "AnumaFalMCP-fal_queue_result",
    ],
    anchors: [
      "AnumaFalMCP-fal_generate_video",
      "AnumaFalMCP-fal_run",
      "AnumaFalMCP-fal_queue_submit",
    ],
    // 0.6, NOT the 0.5 selection floor: the Fal anchors score ~0.5x on
    // generic "build/create" phrasing ("build me a todo app", chitchat about
    // programming) and were dragging the queue lifecycle into unrelated
    // requests even selection-gated. Genuine Fal prompts measure ~0.85, so
    // 0.6 keeps the chain where it belongs.
    anchorMinSimilarity: 0.6,
  },
  {
    // Every OpenMeteo data tool requires latitude/longitude (verified in the
    // catalog schemas), but users speak in place names — geocoding is the
    // mandatory first hop. Members deliberately contain ONLY the dependency:
    // the anchor that fired is already in the semantic matches, and pulling
    // sibling data tools in would re-create vendor-suite over-inclusion.
    // Consumers that exclude the OpenMeteo weather tools (e.g. web, which
    // renders weather via the client-side display_weather card) are
    // unaffected: exclusions apply after expansion.
    name: "openmeteo-geocode",
    members: ["OpenMeteoMCP-geocoding"],
    anchors: [
      "OpenMeteoMCP-weather_forecast",
      "OpenMeteoMCP-air_quality",
      "OpenMeteoMCP-weather_archive",
      "OpenMeteoMCP-marine_weather",
      "OpenMeteoMCP-flood_forecast",
      "OpenMeteoMCP-climate_projection",
      "OpenMeteoMCP-elevation",
    ],
    anchorMinSimilarity: 0.5,
  },
];

/**
 * Pre-configured server-tools filter ready to drop into `useChatStorage`'s
 * `serverTools` option. Semantic matching against the user prompt with the
 * default exclusion list applied, plus call-chain expansion via
 * {@link SERVER_TOOL_DEPENDENCY_SETS} so continuation tools (read-after-search,
 * Fal queue lifecycle) ride in with their entry tool.
 *
 * @example
 * ```ts
 * import { defaultServerToolsFilter, useChatStorage } from "@anuma/sdk/react";
 *
 * useChatStorage({
 *   ...,
 *   serverTools: defaultServerToolsFilter,
 * });
 * ```
 *
 * If you need to customize (extra excludes, different limits, opt into
 * tool-set expansion), call `createServerToolsFilter` directly.
 */
export const defaultServerToolsFilter = createServerToolsFilter({
  excludeTools: DEFAULT_EXCLUDED_SERVER_TOOLS,
  matchOptions: DEFAULT_SERVER_TOOLS_MATCH_OPTIONS,
  toolSets: SERVER_TOOL_DEPENDENCY_SETS,
});

/**
 * Type for a server-tools filter — a function that takes prompt embeddings
 * and the full server tool catalog and returns the names of tools to keep.
 * Matches `useChatStorage`'s `serverTools` callback signature.
 */
export type ServerToolsFilterFunction = (
  embeddings: number[] | number[][],
  tools: ServerTool[]
) => string[];

/**
 * Options for `selectServerToolsForPrompt`.
 */
export interface SelectServerToolsForPromptOptions {
  /** User prompt to match tools against. */
  prompt: string;
  /**
   * Filter to apply: either a function (called with the prompt embedding +
   * full catalog) or a static list of tool names. Same shape `useChatStorage`
   * accepts on its `serverTools` option. Pass `defaultServerToolsFilter` to
   * mirror the default chat-flow selection.
   */
  serverToolsFilter?: string[] | ServerToolsFilterFunction;
  /** Function that resolves an auth token (Bearer). */
  getToken: () => Promise<string | null>;
  /** Base URL for the API. */
  baseUrl?: string;
  /** Embedding model override. Falls back to the SDK default. */
  embeddingModel?: string;
  /** Cache expiration in ms for the server-tools catalog fetch. */
  cacheExpirationMs?: number;
}

/**
 * Select server-side tools for a prompt using the same path
 * `useChatStorage` runs internally. Use this anywhere outside the chat
 * hook — background-task workers, server scripts, debug tools — that needs
 * the same selection the chat flow would produce.
 *
 * Mirrors the responses-API branch of `sendMessage`: fetch catalog with
 * caching, optionally embed the prompt (only when the filter is a function),
 * apply the filter, return matching `ServerTool[]` (with embeddings and
 * descriptions intact for downstream serialization).
 *
 * Returns `[]` on any of: undefined/empty filter, short prompt for a
 * function filter, failed catalog fetch, or failed embedding.
 *
 * @example
 * ```ts
 * import { defaultServerToolsFilter, selectServerToolsForPrompt } from "@anuma/sdk/server";
 *
 * const tools = await selectServerToolsForPrompt({
 *   prompt: "Generate a slide deck about AI",
 *   serverToolsFilter: defaultServerToolsFilter,
 *   getToken: async () => identityToken,
 *   baseUrl: process.env.API_URL,
 * });
 * ```
 */
export async function selectServerToolsForPrompt(
  options: SelectServerToolsForPromptOptions
): Promise<ServerTool[]> {
  const { prompt, serverToolsFilter, getToken, baseUrl, embeddingModel, cacheExpirationMs } =
    options;

  if (serverToolsFilter === undefined) return [];
  if (Array.isArray(serverToolsFilter) && serverToolsFilter.length === 0) return [];
  if (
    typeof serverToolsFilter === "function" &&
    prompt.trim().length < MIN_CONTENT_LENGTH_FOR_TOOLS
  ) {
    return [];
  }

  let allServerTools: ServerTool[];
  try {
    allServerTools = await getServerTools({ baseUrl, cacheExpirationMs, getToken });
  } catch {
    return [];
  }
  if (allServerTools.length === 0) return [];

  if (typeof serverToolsFilter === "function") {
    if (!prompt.trim()) return [];
    let promptEmbedding: number[];
    try {
      promptEmbedding = await generateEmbedding(prompt, {
        getToken,
        baseUrl,
        model: embeddingModel,
      });
    } catch {
      return [];
    }
    const names = serverToolsFilter(promptEmbedding, allServerTools);
    return filterServerTools(allServerTools, names);
  }

  return filterServerTools(allServerTools, serverToolsFilter);
}

/**
 * Options for selectServerSideTools
 */
export interface SelectServerSideToolsOptions {
  /** The user prompt to match tools against */
  prompt: string;
  /** Function to get auth token (uses Authorization: Bearer header) */
  getToken?: () => Promise<string | null>;
  /** Direct API key for server-side usage (uses X-API-Key header) */
  apiKey?: string;
  /** Base URL for the API */
  baseUrl?: string;
  /** Cache expiration in ms (default: 24h) */
  cacheExpirationMs?: number;
  /** Force refresh tools cache */
  forceRefresh?: boolean;
  /** Embedding model to use */
  embeddingModel?: string;
  /** Max tools to return (default: 10) */
  limit?: number;
  /** Minimum cosine similarity 0-1 (default: 0.3) */
  minSimilarity?: number;
  /** API format for returned tools (default: "responses") */
  apiType?: "responses" | "completions";
}

/**
 * Select server tools that are semantically relevant to a prompt.
 *
 * Fetches available tools (with caching), generates embeddings for the prompt,
 * runs cosine-similarity matching, and returns tool schemas in the requested
 * API format (Responses or Completions).
 *
 * @example
 * ```ts
 * import { selectServerSideTools } from "@anuma/sdk/tools";
 *
 * const tools = await selectServerSideTools({
 *   prompt: "Draw me a cat",
 *   getToken: async () => identityToken,
 * });
 *
 * const response = await postApiV1Responses({
 *   body: {
 *     messages: [{ role: "user", content: [{ type: "text", text: "Draw me a cat" }] }],
 *     model: "fireworks/accounts/fireworks/models/kimi-k2p5",
 *     tools,
 *   },
 *   headers: { Authorization: `Bearer ${identityToken}` },
 * });
 * ```
 */
export async function selectServerSideTools(
  options: SelectServerSideToolsOptions
): Promise<Array<Record<string, unknown>>> {
  const {
    prompt,
    getToken,
    apiKey,
    baseUrl,
    cacheExpirationMs,
    forceRefresh,
    embeddingModel,
    limit,
    minSimilarity,
    apiType = "responses",
  } = options;

  if (!getToken && !apiKey) {
    throw new Error("Either getToken or apiKey must be provided");
  }

  if (!prompt || prompt.trim().length < MIN_CONTENT_LENGTH_FOR_TOOLS) {
    return [];
  }

  // Fetch tools (with caching)
  const tools = await getServerTools({
    getToken,
    apiKey,
    baseUrl,
    cacheExpirationMs,
    forceRefresh,
  });

  if (tools.length === 0) {
    return [];
  }

  // Generate embeddings for the prompt
  const embeddingOptions = {
    getToken,
    apiKey,
    baseUrl,
    model: embeddingModel,
  };

  let promptEmbeddings: number[] | number[][];
  if (shouldChunkMessage(prompt, DEFAULT_CHUNK_SIZE)) {
    const chunks = chunkText(prompt);
    promptEmbeddings = await generateEmbeddings(
      chunks.map((c) => c.text),
      embeddingOptions
    );
  } else {
    promptEmbeddings = await generateEmbedding(prompt, embeddingOptions);
  }

  // Semantic matching (only pass defined values to avoid overriding defaults with undefined)
  const matchOptions: ToolMatchOptions = { filterAmbiguous: true, relevanceRatio: 0.85 };
  if (limit !== undefined) matchOptions.limit = limit;
  if (minSimilarity !== undefined) matchOptions.minSimilarity = minSimilarity;
  const matches = findMatchingTools(promptEmbeddings, tools, matchOptions);

  if (matches.length === 0) {
    return [];
  }

  // Format for the requested API type (strips embeddings)
  const matchedTools = matches.map((m) => m.tool);
  if (apiType === "completions") {
    return matchedTools.map((t) => toCompletionsFormat(t) as unknown as Record<string, unknown>);
  }
  return matchedTools.map(toResponsesFormat);
}
