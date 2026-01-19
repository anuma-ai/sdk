/**
 * Server-side tools caching module
 *
 * Fetches and caches tools from /api/v1/tools endpoint
 * with configurable expiration and localStorage persistence.
 */

import type { LlmapiTool } from "../../client";
import type { ToolConfig } from "../chat/useChat/types";

/**
 * Response format from /api/v1/tools endpoint
 * Maps tool names to their definitions
 */
export interface ServerToolsResponse {
  [toolName: string]: {
    description: string;
    name: string;
    parameters: {
      properties: Record<string, unknown>;
      required: string[];
      type: "object";
    };
  };
}

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
}

/**
 * Cached tools structure stored in localStorage
 */
export interface CachedServerTools {
  tools: ServerTool[];
  timestamp: number;
  version: string;
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
export const SERVER_TOOLS_CACHE_KEY = "sdk_server_tools_cache";

/** Cache version - increment to invalidate old caches on format changes */
export const CACHE_VERSION = "1.1";

/**
 * Convert server API response to ServerTool[] format.
 * Stores in neutral format with parameters field.
 */
export function convertServerToolsResponse(
  response: ServerToolsResponse
): ServerTool[] {
  return Object.values(response).map((tool) => ({
    type: "function" as const,
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters,
  }));
}

/**
 * Completions API tool format.
 * OpenAI Chat Completions expects: { type, function: { name, description, parameters } }
 */
export interface CompletionsTool {
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
export function toCompletionsFormat(tool: ServerTool): CompletionsTool {
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
export function toResponsesFormat(tool: ServerTool): Record<string, unknown> {
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
export function isCacheExpired(
  cache: CachedServerTools | null,
  expirationMs: number = DEFAULT_CACHE_EXPIRATION_MS
): boolean {
  if (!cache) return true;
  return Date.now() - cache.timestamp > expirationMs;
}

/**
 * Store tools in localStorage cache
 */
export function cacheServerTools(tools: ServerTool[]): void {
  if (typeof window === "undefined") return;

  const cacheData: CachedServerTools = {
    tools,
    timestamp: Date.now(),
    version: CACHE_VERSION,
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
 * Fetch tools from the server API
 */
export async function fetchServerToolsFromApi(
  baseUrl: string,
  token: string
): Promise<ServerTool[]> {
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

    const tools = await fetchServerToolsFromApi(effectiveBaseUrl, token);
    cacheServerTools(tools);
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
 * Convert client tool (Completions format) to Responses API format.
 * Preserves executor and autoExecute for client-side execution.
 */
function clientToolToResponsesFormat(
  tool: LlmapiTool | ToolConfig
): Record<string, unknown> {
  const toolConfig = tool as ToolConfig;
  const func = tool.function;

  if (!func) {
    // Already in responses format or malformed - return as-is
    return tool as Record<string, unknown>;
  }

  return {
    type: "function",
    name: func.name,
    description: func.description,
    // Handle both 'parameters' and 'arguments' field names
    parameters: (func as any).parameters || (func as any).arguments,
    // Preserve executor functions for client-side execution
    ...(toolConfig.executor && { executor: toolConfig.executor }),
    ...(toolConfig.autoExecute !== undefined && {
      autoExecute: toolConfig.autoExecute,
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
  clientTools: Array<LlmapiTool | ToolConfig> | undefined,
  apiType: "responses" | "completions" = "responses"
): Array<LlmapiTool | ToolConfig | Record<string, unknown>> {
  // Format server tools based on API type
  const formattedServerTools =
    apiType === "completions"
      ? serverTools.map(toCompletionsFormat)
      : serverTools.map(toResponsesFormat);

  if (!clientTools || clientTools.length === 0) {
    return formattedServerTools;
  }

  // Format client tools based on API type
  const formattedClientTools =
    apiType === "responses"
      ? clientTools.map(clientToolToResponsesFormat)
      : clientTools;

  if (serverTools.length === 0) {
    return formattedClientTools;
  }

  // Get client tool names for deduplication
  const clientToolNames = new Set(
    clientTools
      .map((t) => t.function?.name || (t as any).name)
      .filter((name): name is string => !!name)
  );

  // Filter server tools that don't conflict with client tools
  const nonConflictingServerTools = formattedServerTools.filter((tool) => {
    const name =
      "name" in tool ? (tool.name as string) : (tool as LlmapiTool).function?.name;
    return !clientToolNames.has(name ?? "");
  });

  // Return merged array: server tools first, then client tools
  return [...nonConflictingServerTools, ...formattedClientTools];
}
