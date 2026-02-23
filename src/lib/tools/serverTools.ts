/**
 * Server-side tools caching module
 *
 * Fetches and caches tools from /api/v1/tools endpoint
 * with configurable expiration and localStorage persistence.
 */

import type { LlmapiChatCompletionTool } from "../../client";
import type { ToolConfig } from "../chat/useChat/types";
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
type ServerToolsResponseItem =
  | ServerToolsResponseItemCurrent
  | ServerToolsResponseItemNew;

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
  /** Authentication token getter */
  getToken: () => Promise<string | null>;
}

/** Default cache expiration: 1 day */
export const DEFAULT_CACHE_EXPIRATION_MS = 24 * 60 * 60 * 1000;

/** localStorage key for cached tools */
const SERVER_TOOLS_CACHE_KEY = "sdk_server_tools_cache";

/** Cache version - increment to invalidate old caches on format changes */
const CACHE_VERSION = "1.3";

/**
 * Type guard to check if tool is in new format (has schema property)
 */
function isNewToolFormat(
  tool: ServerToolsResponseItem
): tool is ServerToolsResponseItemNew {
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
function convertServerToolsResponse(
  response: ServerToolsResponse
): ParsedServerToolsResponse {
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
    // eslint-disable-next-line no-console
    console.warn("[serverTools] Failed to cache tools:", error);
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
export async function getServerTools(
  options: ServerToolsOptions
): Promise<ServerTool[]> {
  const {
    baseUrl,
    cacheExpirationMs = DEFAULT_CACHE_EXPIRATION_MS,
    forceRefresh = false,
    getToken,
  } = options;

  // Check cache first (unless forcing refresh)
  const cached = getCachedServerTools();
  const cacheValid = !isCacheExpired(cached, cacheExpirationMs);

  if (cached && cacheValid && !forceRefresh) {
    return cached.tools;
  }

  // Try to fetch fresh tools
  try {
    const token = await getToken();
    if (!token) {
      // No token available - return cached if available, otherwise empty
      // eslint-disable-next-line no-console
      console.warn("[serverTools] No auth token available for fetching tools");
      return cached?.tools ?? [];
    }

    // Import BASE_URL dynamically to avoid circular dependencies
    const { BASE_URL } = await import("../../clientConfig");
    const effectiveBaseUrl = baseUrl ?? BASE_URL;

    const { tools, checksum } = await fetchServerToolsFromApi(effectiveBaseUrl, token);
    cacheServerTools(tools, checksum);
    return tools;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[serverTools] Failed to fetch server tools:", error);

    // Stale-while-error: return cached tools if available
    if (cached?.tools) {
      // eslint-disable-next-line no-console
      console.warn("[serverTools] Using stale cached tools due to fetch error");
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

/**
 * Convert client tool to Responses API format.
 * Preserves executor and autoExecute for client-side execution.
 */
function clientToolToResponsesFormat(
  tool: LlmapiChatCompletionTool | ToolConfig
): Record<string, unknown> {
  const toolConfig = tool as ToolConfig;
  const func = (tool as any).function;

  if (!func) {
    // Already in responses format or malformed - return as-is
    return tool as Record<string, unknown>;
  }

  return {
    type: "function",
    name: func.name,
    description: func.description,
    // Handle both 'parameters' and 'arguments' field names
    parameters: func.parameters || func.arguments,
    // Preserve executor functions for client-side execution
    ...(toolConfig.executor && { executor: toolConfig.executor }),
    ...(toolConfig.autoExecute !== undefined && {
      autoExecute: toolConfig.autoExecute,
    }),
    ...(toolConfig.skipContinuation !== undefined && {
      skipContinuation: toolConfig.skipContinuation,
    }),
    ...(toolConfig.removeAfterExecution !== undefined && {
      removeAfterExecution: toolConfig.removeAfterExecution,
    }),
  };
}

/**
 * Normalize client tool for Completions API format.
 * Ensures 'parameters' field exists (converts from 'arguments' if needed).
 * Preserves executor, autoExecute, skipContinuation, and removeAfterExecution for client-side execution.
 */
function clientToolToCompletionsFormat(
  tool: LlmapiChatCompletionTool | ToolConfig
): Record<string, unknown> {
  const toolConfig = tool as ToolConfig;
  const func = (tool as any).function;

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
      parameters: args || { type: "object", properties: {} },
    },
    // Preserve executor functions for client-side execution
    ...(toolConfig.executor && { executor: toolConfig.executor }),
    ...(toolConfig.autoExecute !== undefined && {
      autoExecute: toolConfig.autoExecute,
    }),
    ...(toolConfig.skipContinuation !== undefined && {
      skipContinuation: toolConfig.skipContinuation,
    }),
    ...(toolConfig.removeAfterExecution !== undefined && {
      removeAfterExecution: toolConfig.removeAfterExecution,
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
      .map((t) => (t as any).function?.name || (t as any).name)
      .filter((name): name is string => !!name)
  );

  // Filter server tools that don't conflict with client tools
  const nonConflictingServerTools = formattedServerTools.filter((tool) => {
    const name =
      "name" in tool ? (tool.name as string) : (tool as any).function?.name;
    return !clientToolNames.has(name ?? "");
  });

  // Return merged array: server tools first, then client tools
  return [...nonConflictingServerTools, ...formattedClientTools] as Array<Record<string, unknown>>;
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error("Vectors must have the same length");
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) {
    return 0;
  }

  return dotProduct / denominator;
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
  /** Maximum number of tools to return (default: 10) */
  limit?: number;
  /** Minimum similarity threshold 0-1 (default: 0.3) */
  minSimilarity?: number;
}

const DEFAULT_TOOL_MATCH_OPTIONS: Required<ToolMatchOptions> = {
  limit: 10,
  minSimilarity: 0.3,
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
  const { limit, minSimilarity } = {
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
  return results
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);
}
