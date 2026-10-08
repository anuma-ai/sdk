import type { LlmapiChatCompletionTool } from "../../client";
import { APP_BUILDER_PROMPT } from "../../tools/appBuilderPrompt";
import { DOCUMENT_BUILDER_PROMPT } from "../../tools/document/documentBuilderPrompt";
import type { ToolConfig } from "../chat/useChat/types";
import { getLogger } from "../logger";
import { chunkText, DEFAULT_CHUNK_SIZE, shouldChunkMessage } from "../memoryEngine/chunking";
import { generateEmbedding, generateEmbeddings } from "../memoryEngine/generate";
import { cosineSimilarity } from "../memoryEngine/vector";

interface ToolParameters {
  properties: Record<string, unknown>;
  required: string[];
  type: "object";
}

interface ServerToolsResponseItemCurrent {
  description: string;
  name: string;
  parameters: ToolParameters;
}

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

type ServerToolsResponseItem = ServerToolsResponseItemCurrent | ServerToolsResponseItemNew;

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
 * Pluggable persistence for the fetched server-tools list.
 *
 * The default backend ({@link localStorageToolsCache}) writes to browser
 * `localStorage` and is a silent no-op where `localStorage` is undefined
 * (Node, React Native). Pass a custom backend to `getServerTools` to cache
 * somewhere that survives on those platforms — e.g. an AsyncStorage/MMKV
 * adapter on RN, or an in-memory `Map` on a server. Methods may be sync or
 * async; `getServerTools` awaits them either way.
 *
 * The stored payload carries a `version`; `getServerTools` discards any entry
 * whose version does not match the current cache format, so a stale custom
 * backend can never feed an incompatible shape back into selection.
 */
export interface ToolsCacheBackend {
  /** Return the cached payload, or null when absent/unreadable. */
  get(): CachedServerTools | null | Promise<CachedServerTools | null>;
  /** Persist the payload. Implementations should swallow write failures. */
  set(value: CachedServerTools): void | Promise<void>;
  /**
   * Remove the cached payload. Optional — a read/write-only backend may omit it,
   * in which case `clearServerToolsCache` (and the version-mismatch
   * invalidation) is a no-op for that backend. The default
   * {@link localStorageToolsCache} implements it.
   */
  clear?(): void | Promise<void>;
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
  /**
   * Where to read/write the cached tools list. Defaults to
   * {@link localStorageToolsCache} (browser `localStorage`; no-op elsewhere).
   * Provide a backend to enable caching on Node / React Native.
   */
  cache?: ToolsCacheBackend;
}

/** Default cache expiration: 1 day */
export const DEFAULT_CACHE_EXPIRATION_MS = 24 * 60 * 60 * 1000;

const SERVER_TOOLS_CACHE_KEY = "sdk_server_tools_cache";

const CACHE_VERSION = "1.3";

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

function isNewToolFormat(tool: ServerToolsResponseItem): tool is ServerToolsResponseItemNew {
  return "schema" in tool && tool.schema !== undefined;
}

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

function convertServerToolsResponse(response: ServerToolsResponse): ParsedServerToolsResponse {
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
      return {
        type: "function" as const,
        name: tool.schema.name,
        description: tool.schema.description,
        parameters: tool.schema.parameters,
        ...(tool.embedding && { embedding: tool.embedding }),
      };
    }
    return {
      type: "function" as const,
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    };
  });

  return { tools, checksum };
}

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
  if (typeof localStorage === "undefined") return null;

  try {
    const cached = localStorage.getItem(SERVER_TOOLS_CACHE_KEY);
    if (!cached) return null;

    const parsed = JSON.parse(cached) as CachedServerTools;

    if (parsed.version !== CACHE_VERSION) {
      removeLocalStorageCache();
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function isCacheExpired(
  cache: CachedServerTools | null,
  expirationMs: number = DEFAULT_CACHE_EXPIRATION_MS
): boolean {
  if (!cache) return true;
  return Date.now() - cache.timestamp > expirationMs;
}

function buildCacheEntry(tools: ServerTool[], checksum?: string): CachedServerTools {
  return {
    tools,
    timestamp: Date.now(),
    version: CACHE_VERSION,
    ...(checksum && { checksum }),
  };
}

function writeLocalStorageCache(entry: CachedServerTools): void {
  if (typeof localStorage === "undefined") return;

  try {
    localStorage.setItem(SERVER_TOOLS_CACHE_KEY, JSON.stringify(entry));
  } catch (error) {
    getLogger().warn("[serverTools] Failed to cache tools:", error);
  }
}

function removeLocalStorageCache(): void {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(SERVER_TOOLS_CACHE_KEY);
}

export const localStorageToolsCache: ToolsCacheBackend = {
  get: getCachedServerTools,
  set: writeLocalStorageCache,
  clear: removeLocalStorageCache,
};

/**
 * Clear the cached server tools. Defaults to the browser-`localStorage` backend;
 * pass the SAME {@link ToolsCacheBackend} you gave `getServerTools` to invalidate
 * a custom backend (a no-op when that backend defines no `clear`). Returns the
 * backend's clear result, which may be async.
 */
export function clearServerToolsCache(): void;
export function clearServerToolsCache(cache: ToolsCacheBackend): void | Promise<void>;
export function clearServerToolsCache(
  cache: ToolsCacheBackend = localStorageToolsCache
): void | Promise<void> {
  return cache.clear?.();
}

/**
 * Get the checksum of the currently cached tools, or undefined when there is no
 * cache / no stored checksum. Defaults to the browser-`localStorage` backend;
 * pass the SAME backend you gave `getServerTools` to read a custom backend's
 * checksum (an async backend yields a promise).
 */
export function getToolsChecksum(): string | undefined;
export function getToolsChecksum(
  cache: ToolsCacheBackend
): string | undefined | Promise<string | undefined>;
export function getToolsChecksum(
  cache: ToolsCacheBackend = localStorageToolsCache
): string | undefined | Promise<string | undefined> {
  const cached = cache.get();
  return cached instanceof Promise ? cached.then((c) => c?.checksum) : cached?.checksum;
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
export function shouldRefreshTools(responseChecksum: string | undefined): boolean;
export function shouldRefreshTools(
  responseChecksum: string | undefined,
  cache: ToolsCacheBackend | undefined
): boolean | Promise<boolean>;
export function shouldRefreshTools(
  responseChecksum: string | undefined,
  cache: ToolsCacheBackend = localStorageToolsCache
): boolean | Promise<boolean> {
  if (!responseChecksum) {
    return false;
  }

  const decide = (cachedChecksum: string | undefined): boolean =>
    !cachedChecksum || cachedChecksum !== responseChecksum;

  const cachedChecksum = getToolsChecksum(cache);
  return cachedChecksum instanceof Promise ? cachedChecksum.then(decide) : decide(cachedChecksum);
}

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
 * 1. Check the cache backend (localStorage by default; override via `cache`)
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
    cache = localStorageToolsCache,
  } = options;

  const persistCache = async (entry: ReturnType<typeof buildCacheEntry>): Promise<void> => {
    try {
      await cache.set(entry);
    } catch (error) {
      getLogger().warn("[serverTools] Cache write failed (non-fatal):", error);
    }
  };

  let rawCached: Awaited<ReturnType<typeof cache.get>> = null;
  try {
    rawCached = await cache.get();
  } catch (error) {
    getLogger().warn("[serverTools] Cache read failed; falling through to server fetch:", error);
  }
  const cached = rawCached && rawCached.version === CACHE_VERSION ? rawCached : null;
  const cacheValid = !isCacheExpired(cached, cacheExpirationMs);

  if (cached && cacheValid && !forceRefresh) {
    return cached.tools;
  }

  try {
    const { BASE_URL } = await import("../../clientConfig");
    const effectiveBaseUrl = baseUrl ?? BASE_URL;

    if (apiKey) {
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
      await persistCache(buildCacheEntry(tools, checksum));
      return tools;
    }

    if (!getToken) {
      getLogger().warn("[serverTools] No auth method available for fetching tools");
      return cached?.tools ?? [];
    }

    const token = await getToken();
    if (!token) {
      getLogger().warn("[serverTools] No auth token available for fetching tools");
      return cached?.tools ?? [];
    }

    const { tools, checksum } = await fetchServerToolsFromApi(effectiveBaseUrl, token);
    await persistCache(buildCacheEntry(tools, checksum));
    return tools;
  } catch (error) {
    getLogger().error("[serverTools] Failed to fetch server tools:", error);

    if (cached?.tools) {
      getLogger().warn("[serverTools] Using stale cached tools due to fetch error");
      return cached.tools;
    }

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
  if (includeNames === undefined) {
    return serverTools;
  }

  if (includeNames.length === 0) {
    return [];
  }

  const includeSet = new Set(includeNames);
  return serverTools.filter((tool) => includeSet.has(tool.name));
}

interface ToolFunctionDef {
  name?: string;
  description?: string;
  parameters?: Record<string, unknown>;
  arguments?: Record<string, unknown>;
}

function getToolFunction(tool: LlmapiChatCompletionTool | ToolConfig): ToolFunctionDef | undefined {
  const fn = (tool as Record<string, unknown>).function;
  if (fn && typeof fn === "object") {
    return fn as ToolFunctionDef;
  }
  return undefined;
}

function clientToolToResponsesFormat(
  tool: LlmapiChatCompletionTool | ToolConfig
): Record<string, unknown> {
  const toolConfig = tool as ToolConfig;
  const func = getToolFunction(tool);

  if (!func) {
    return tool as Record<string, unknown>;
  }

  return {
    type: "function",
    name: func.name,
    description: func.description,
    parameters: func.parameters ?? func.arguments,
    ...(toolConfig.executor && { executor: toolConfig.executor }),
    ...(toolConfig.skipContinuation !== undefined && {
      skipContinuation: toolConfig.skipContinuation,
    }),
    ...(toolConfig.removeAfterExecution !== undefined && {
      removeAfterExecution: toolConfig.removeAfterExecution,
    }),
    ...(toolConfig.removeAfterResult !== undefined && {
      removeAfterResult: toolConfig.removeAfterResult,
    }),
    ...(toolConfig.executorTimeout !== undefined && {
      executorTimeout: toolConfig.executorTimeout,
    }),
    ...(toolConfig.dependsOn !== undefined && { dependsOn: toolConfig.dependsOn }),
    ...(toolConfig.deAnonymizeArgs !== undefined && {
      deAnonymizeArgs: toolConfig.deAnonymizeArgs,
    }),
  };
}

function clientToolToCompletionsFormat(
  tool: LlmapiChatCompletionTool | ToolConfig
): Record<string, unknown> {
  const toolConfig = tool as ToolConfig;
  const func = getToolFunction(tool);

  if (!func) {
    return tool as Record<string, unknown>;
  }

  if (func.parameters) {
    return tool as Record<string, unknown>;
  }

  const { arguments: args, ...restFunc } = func;

  return {
    type: "function",
    function: {
      ...restFunc,
      parameters: args ?? { type: "object", properties: {} },
    },
    ...(toolConfig.executor && { executor: toolConfig.executor }),
    ...(toolConfig.skipContinuation !== undefined && {
      skipContinuation: toolConfig.skipContinuation,
    }),
    ...(toolConfig.removeAfterExecution !== undefined && {
      removeAfterExecution: toolConfig.removeAfterExecution,
    }),
    ...(toolConfig.removeAfterResult !== undefined && {
      removeAfterResult: toolConfig.removeAfterResult,
    }),
    ...(toolConfig.executorTimeout !== undefined && {
      executorTimeout: toolConfig.executorTimeout,
    }),
    ...(toolConfig.dependsOn !== undefined && { dependsOn: toolConfig.dependsOn }),
    ...(toolConfig.deAnonymizeArgs !== undefined && {
      deAnonymizeArgs: toolConfig.deAnonymizeArgs,
    }),
  };
}

const TOOL_SEARCH_TOOL_TYPE = "tool_search_tool_regex_20251119";
/** The tool-search tool's `name` must match the variant exactly — Anthropic rejects anything else
 * ("Input should be 'tool_search_tool_regex'", confirmed via docs + a direct Messages API test).
 * Bound to the regex variant alongside the type above; a future bm25 variant pairs
 * `tool_search_tool_bm25_*` with name `tool_search_tool_bm25`. (Was "tool_search", which Anthropic 400s.) */
export const TOOL_SEARCH_TOOL_NAME = "tool_search_tool_regex";

/**
 * Opt-in defer-loading config for {@link mergeTools}. OFF by default — when absent or `enabled:false`,
 * tools are emitted exactly as today (no ordering change, no defer flags, no search tool). When ON, the
 * server tools are emitted as the full catalog in a deterministic, byte-stable order every turn:
 * `[tool-search] → [hot, in hotToolNames order] → [deferred, name-sorted]`, with `defer_loading:true` on
 * every tool that is neither hot nor the search tool. Deferred tools keep their FULL definition (so
 * Anthropic's matcher can index them); they are not reduced to names. This stabilizes the leading `tools`
 * prefix so Anthropic prompt caching can hit across turns.
 */
export interface DeferLoadingConfig {
  enabled: boolean;
  /** Server-tool names to keep non-deferred (besides the tool-search tool), in priority order. */
  hotToolNames: readonly string[];
  /**
   * Server-tool names to drop entirely while defer-loading is on.
   *
   * Defer widens the per-turn selection to the whole catalog, which also bypasses the `excludeTools`
   * baked into a caller's semantic filter. A filter built by {@link createServerToolsFilter} tags itself
   * with its own exclusions and those are honoured automatically — so most callers need nothing here.
   *
   * Set this when the filter's tag can't be seen: a hand-written filter, a filter wrapped in a plain
   * closure (the wrapper drops the tag), or a static-array `serverToolsFilter`. Anything excluded
   * UNCONDITIONALLY (a tool the app replaces with its own UI, a capability the model already has
   * natively) belongs in one of the two places, or defer quietly hands it back to the model.
   *
   * This list is UNIONED with the filter's own tag, never a replacement for it — so adding one name
   * here cannot re-admit the tools the filter already excludes.
   */
  excludeTools?: readonly string[];
}

/**
 * The server-tool set defer-loading should format for one turn.
 *
 * Defer changes how tools are SENT (full definitions + `defer_loading` + a tool-search tool, for a
 * byte-stable cacheable prefix). It must not change WHICH tools the caller allowed, so two things
 * survive that a plain "just use the whole catalog" discards:
 *
 * 1. **an explicit static array** — `serverToolsFilter: ['x']` is a deliberate scoping, and callers
 *    commonly pair it with `tool_choice:'required'`. Replacing it with the catalog turns "you must
 *    call x" into "you must call something, here is everything". Defer still applies, within the array.
 * 2. **unconditional exclusions** — see {@link DeferLoadingConfig.excludeTools}.
 *
 * A filter FUNCTION is deliberately NOT consulted: it is per-prompt semantic narrowing, and skipping it
 * is the whole point of defer (the model reaches everything else through tool-search). Only the
 * caller's unconditional constraints survive.
 */
export function resolveDeferredServerTools(
  allServerTools: ServerTool[],
  serverToolsFilter: readonly string[] | ServerToolsFilterFunction | undefined,
  config: DeferLoadingConfig
): ServerTool[] {
  const allowed =
    serverToolsFilter === undefined || typeof serverToolsFilter === "function"
      ? allServerTools
      : filterServerTools(allServerTools, [...serverToolsFilter]);

  const excluded = new Set(config.excludeTools ?? []);
  if (typeof serverToolsFilter === "function") {
    for (const name of serverToolsFilter.excludeTools ?? []) excluded.add(name);
  }

  if (excluded.size === 0) return allowed;
  return allowed.filter((tool) => !excluded.has(tool.name));
}

/**
 * The defer config {@link mergeTools} should FORMAT this request with — `undefined` when defer
 * formatting must be skipped even though defer-loading is enabled.
 *
 * Scoping the selection to a caller's explicit static array (see {@link resolveDeferredServerTools})
 * is only half the job. `formatServerToolsWithDefer` still marks every non-hot tool `defer_loading`
 * and prepends the tool-search tool, so for a one-tool array whose tool isn't hot — every creation
 * mode: video, music, sfx, image, slides — the search tool becomes the ONLY directly callable entry
 * in the request. Callers pair those arrays with `tool_choice:'required'`, so "you must call the video
 * generator" silently degrades to "you must call tool-search", and a caller scanning tool-call events
 * for the generator's name never sees it.
 *
 * An explicit array is a closed set the caller already narrowed: there is nothing left to discover, so
 * defer has no work to do and its formatting is pure downside. Sending those tools normally is exactly
 * today's (defer-off) behavior for that request.
 *
 * Note this is NOT the same as treating the array as `hotToolNames`: hot tools are non-deferred, but
 * `formatServerToolsWithDefer` prepends the tool-search tool unconditionally, so a `required` turn
 * could still satisfy the constraint by calling it. Skipping the formatting is what actually fixes it.
 *
 * The catalog path (a filter function, or no filter) is untouched — full tool-search + hot + deferred.
 */
export function deferFormattingConfig(
  serverToolsFilter: readonly string[] | ServerToolsFilterFunction | undefined,
  config: DeferLoadingConfig | undefined
): DeferLoadingConfig | undefined {
  if (!config?.enabled) return config;
  const isExplicitList = serverToolsFilter !== undefined && typeof serverToolsFilter !== "function";
  return isExplicitList ? undefined : config;
}

function byNameAscending(a: ServerTool, b: ServerTool): number {
  if (a.name < b.name) return -1;
  if (a.name > b.name) return 1;
  return 0;
}

function formatServerToolsWithDefer(
  serverTools: ServerTool[],
  config: DeferLoadingConfig,
  apiType: "responses" | "completions"
): Array<Record<string, unknown>> {
  if (serverTools.length === 0) {
    return [];
  }
  const fmt = apiType === "completions" ? toCompletionsFormat : toResponsesFormat;
  const hotSet = new Set(config.hotToolNames);
  const hot = [...hotSet]
    .map((name) => serverTools.find((t) => t.name === name))
    .filter((t): t is ServerTool => t !== undefined);
  const deferred = serverTools.filter((t) => !hotSet.has(t.name)).sort(byNameAscending);
  const searchTool: Record<string, unknown> = {
    type: TOOL_SEARCH_TOOL_TYPE,
    name: TOOL_SEARCH_TOOL_NAME,
  };
  return [
    searchTool,
    ...hot.map((t) => fmt(t) as Record<string, unknown>),
    ...deferred.map((t) => ({ ...(fmt(t) as Record<string, unknown>), defer_loading: true })),
  ];
}

export function mergeTools(
  serverTools: ServerTool[],
  clientTools: Array<LlmapiChatCompletionTool | ToolConfig> | undefined,
  apiType: "responses" | "completions" = "responses",
  deferConfig?: DeferLoadingConfig
): Array<Record<string, unknown>> {
  const useDefer = deferConfig?.enabled === true && apiType === "responses";
  const formattedServerTools = useDefer
    ? formatServerToolsWithDefer(serverTools, deferConfig, apiType)
    : apiType === "completions"
      ? serverTools.map(toCompletionsFormat)
      : serverTools.map(toResponsesFormat);

  if (!clientTools || clientTools.length === 0) {
    return formattedServerTools as Array<Record<string, unknown>>;
  }

  const formattedClientTools =
    apiType === "responses"
      ? clientTools.map(clientToolToResponsesFormat)
      : clientTools.map(clientToolToCompletionsFormat);

  if (formattedServerTools.length === 0) {
    return formattedClientTools;
  }

  const clientToolNames = new Set(
    clientTools
      .map((t) => {
        const fn = getToolFunction(t);
        return fn?.name ?? (t as Record<string, unknown>).name;
      })
      .filter((name): name is string => typeof name === "string" && !!name)
  );

  const nonConflictingServerTools = formattedServerTools.filter((tool) => {
    let toolName: string | undefined;
    if ("name" in tool && typeof tool.name === "string") {
      toolName = tool.name;
    } else if ("function" in tool && typeof tool.function === "object" && tool.function !== null) {
      toolName = (tool.function as ToolFunctionDef).name;
    }
    return !clientToolNames.has(toolName ?? "");
  });

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

  if (!promptEmbeddings || promptEmbeddings.length === 0) {
    return [];
  }

  if (!tools || tools.length === 0) {
    return [];
  }

  const embeddings: number[][] = Array.isArray(promptEmbeddings[0])
    ? (promptEmbeddings as number[][])
    : [promptEmbeddings as number[]];

  const results: ToolMatchResult[] = [];

  for (const tool of tools) {
    if (!tool.embedding || tool.embedding.length === 0) {
      continue;
    }

    try {
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
      continue;
    }
  }

  let sorted = results.sort((a, b) => b.similarity - a.similarity).slice(0, limit);

  if (filterAmbiguous && sorted.length > 1) {
    const topScore = sorted[0].similarity;
    const runnerUpScore = sorted[1].similarity;
    if (topScore < ambiguityThreshold && topScore - runnerUpScore < minLead) {
      return [];
    }
  }

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
    systemPrompt: APP_BUILDER_PROMPT,
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
    anchors: ["create_file", "patch_file"],
    anchorMinSimilarity: 0.55,
  },
  {
    name: "slides",
    members: ["plan_deck", "add_slide", "read_slides", "patch_slides"],
    anchors: ["plan_deck", "patch_slides"],
    anchorMinSimilarity: 0.53,
  },
  {
    name: "documents",
    systemPrompt: DOCUMENT_BUILDER_PROMPT,
    members: ["create_document", "read_document", "patch_document"],
    anchors: ["create_document", "patch_document"],
    anchorMinSimilarity: 0.53,
  },
  {
    name: "github",
    members: ["github_get_authenticated_user", "github_api"],
    anchors: ["github_api"],
    anchorMinSimilarity: 0.55,
  },
  {
    name: "gmail",
    members: [
      "gmail_search_messages",
      "gmail_get_message",
      "gmail_create_draft",
      "gmail_send_message",
    ],
    anchors: ["gmail_search_messages", "gmail_send_message"],
    anchorMinSimilarity: 0.53,
  },
  {
    name: "google-calendar",
    members: [
      "google_calendar_list_events",
      "google_calendar_create_event",
      "google_calendar_update_event",
    ],
    anchors: ["google_calendar_list_events", "google_calendar_create_event"],
    anchorMinSimilarity: 0.53,
  },
  {
    name: "google-drive",
    members: [
      "google_drive_search",
      "google_drive_list_recent",
      "google_drive_get_content",
      "google_drive_create_file",
      "google_drive_update_file",
    ],
    anchors: ["google_drive_search", "google_drive_get_content", "google_drive_create_file"],
    anchorMinSimilarity: 0.53,
  },
  {
    name: "notion",
    members: ["notion-search", "notion-fetch", "notion-create-pages", "notion-update-page"],
    anchors: ["notion-search", "notion-create-pages"],
    anchorMinSimilarity: 0.53,
  },
  {
    name: "x",
    members: ["x_get_me", "x_get_my_posts"],
    anchors: ["x_get_me", "x_get_my_posts"],
    anchorMinSimilarity: 0.53,
  },
  {
    name: "slack",
    members: [
      "slack_get_me",
      "slack_list_channels",
      "slack_search_messages",
      "slack_list_users",
      "slack_get_channel_history",
      "slack_get_thread_replies",
      "slack_post_message",
    ],
    anchors: ["slack_search_messages", "slack_list_channels", "slack_post_message"],
    anchorMinSimilarity: 0.53,
  },
  {
    name: "dropbox",
    members: ["dropbox_list_folders", "dropbox_get_file_content", "dropbox_search"],
    anchors: ["dropbox_list_folders", "dropbox_search"],
    anchorMinSimilarity: 0.53,
  },
  {
    name: "restaurant-booking",
    members: [
      "AnumaPaymentsMCP-anuma_find_restaurant",
      "AnumaPaymentsMCP-anuma_check_restaurant_availability",
      "AnumaPaymentsMCP-anuma_book_restaurant",
      "AnumaPaymentsMCP-anuma_list_reservations",
      "AnumaPaymentsMCP-anuma_cancel_reservation",
      "AnumaPaymentsMCP-anuma_discover_restaurants",
    ],
    anchors: [],
  },
  {
    name: "restaurant-book",
    members: [
      "AnumaPaymentsMCP-anuma_find_restaurant",
      "AnumaPaymentsMCP-anuma_check_restaurant_availability",
      "AnumaPaymentsMCP-anuma_book_restaurant",
    ],
    anchors: [],
  },
  {
    name: "restaurant-cancel",
    members: [
      "AnumaPaymentsMCP-anuma_list_reservations",
      "AnumaPaymentsMCP-anuma_cancel_reservation",
    ],
    anchors: [],
  },
];

/**
 * Confirm-card actions (lowercase) whose approval narrows the rest of the turn
 * to one of {@link BUILT_IN_TOOL_SETS}. The keys are every spelling the portal
 * accepts for the booking and cancel actions.
 */
export const CONFIRMED_ACTION_TOOL_SETS: ReadonlyMap<string, string> = new Map([
  ["book_restaurant", "restaurant-book"],
  ["anuma_book_restaurant", "restaurant-book"],
  ["anumapaymentsmcp-anuma_book_restaurant", "restaurant-book"],
  ["cancel_reservation", "restaurant-cancel"],
  ["anuma_cancel_reservation", "restaurant-cancel"],
  ["anumapaymentsmcp-anuma_cancel_reservation", "restaurant-cancel"],
]);

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

  for (const member of setMembers) {
    if (availableNames.has(member)) {
      result.add(member);
    }
  }

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
 * call chain (e.g. search_web → anuma_scrape_url, or
 * geocoding before the OpenMeteo data tools). Differs from `applyToolSets`,
 * which replaces non-set matches when a set activates.
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
 * Add the server-tool members of every set named in `activeToolSets` to a
 * semantic server-tool selection.
 *
 * A semantic filter ranks only the latest prompt, so a terse follow-up inside a
 * flow ("okay", "retry") drops the flow's server tools. This is the server-side
 * half of what `autoFilterClientTools` does for client tools: an active set's
 * members that are in the catalog are kept whatever the prompt scored, even
 * below the short-prompt gate, where `selected` is empty. Exclusions tagged on
 * the filter still win.
 *
 * @param selected - What the semantic filter picked (`[]` when it did not run).
 * @param allServerTools - The full server-tool catalog.
 * @param serverToolsFilter - The filter function, read only for its `excludeTools` tag.
 * @param activeToolSets - Set names that are sticky for this conversation.
 * @param extraToolSets - The caller's sets beyond {@link BUILT_IN_TOOL_SETS}.
 * @returns `selected`, followed by any active-set members it was missing.
 */
export function withActiveToolSetServerTools(
  selected: ServerTool[],
  allServerTools: ServerTool[],
  serverToolsFilter: ServerToolsFilterFunction,
  activeToolSets: readonly string[] = [],
  extraToolSets: readonly ToolSet[] = []
): ServerTool[] {
  if (activeToolSets.length === 0) return selected;
  const sticky = new Set(
    [...BUILT_IN_TOOL_SETS, ...extraToolSets]
      .filter((ts) => activeToolSets.includes(ts.name))
      .flatMap((ts) => ts.members)
  );
  for (const name of serverToolsFilter.excludeTools ?? []) sticky.delete(name);
  for (const tool of selected) sticky.delete(tool.name);
  const added = allServerTools.filter((tool) => sticky.has(tool.name));
  return added.length > 0 ? [...selected, ...added] : selected;
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
 *       name: "research",
 *       members: ["AnumaJinaMCP-search_web", "AnumaSearchMCP-anuma_scrape_url", ...],
 *       anchors: ["AnumaJinaMCP-search_web"],
 *       anchorMinSimilarity: 0.7,
 *     },
 *   ],
 *   excludeTools: ["OpenMeteoMCP-weather_forecast"],
 *   matchOptions: { limit: 5, minSimilarity: 0.5 },
 * });
 * ```
 */
export function createServerToolsFilter(
  options: CreateServerToolsFilterOptions = {}
): ServerToolsFilterFunction {
  const exclude = new Set(options.excludeTools ?? []);
  const sets = options.toolSets ?? [];
  const matchOpts = options.matchOptions;

  const filter = (embeddings: number[] | number[][], tools: ServerTool[]): string[] => {
    const matches = findMatchingTools(embeddings, tools, matchOpts);
    if (matches.length === 0) return [];

    const matchedNames = new Set(matches.map((m) => m.tool.name));
    let finalNames: Set<string>;
    if (sets.length > 0) {
      const scores = scoreTools(embeddings, tools);
      const selectedScores = new Map(
        [...scores].filter(([name]) => matchedNames.has(name) && !exclude.has(name))
      );
      const availableNames = new Set(tools.map((t) => t.name));
      finalNames = expandToolSetsAdditive(matchedNames, availableNames, selectedScores, sets);
    } else {
      finalNames = matchedNames;
    }

    for (const name of exclude) finalNames.delete(name);
    return [...finalNames];
  };

  return Object.defineProperty(filter, "excludeTools", {
    value: Object.freeze([...exclude]),
    enumerable: false,
  }) as ServerToolsFilterFunction;
}

/**
 * Default exclusions baked into `defaultServerToolsFilter`.
 *
 * - `AnumaVisionMCP-anuma_analyze_image`: modern frontier models have native
 *   vision via image content blocks; routing through a server-side vision
 *   tool just adds a hop.
 * - `OpenMeteoMCP-weather_forecast`: redundant when the consumer registers
 *   `createWeatherTool` (the client-side display tool handles geocoding
 *   internally and renders a card inline). Including the server-side
 *   equivalent causes the model to prefer raw data over the card. Consumers
 *   who don't register `createWeatherTool` should instead build their own
 *   filter via `createServerToolsFilter`. NOTE: `OpenMeteoMCP-geocoding` is
 *   deliberately NOT excluded — the non-weather OpenMeteo data tools
 *   (air_quality, marine_weather, …) require lat/lon and depend on it via the
 *   openmeteo-geocode set; excluding it stranded them. Bare geocoding doesn't
 *   compete with the weather card (it returns coordinates, not weather).
 */
export const DEFAULT_EXCLUDED_SERVER_TOOLS: readonly string[] = [
  "AnumaVisionMCP-anuma_analyze_image",
  "OpenMeteoMCP-weather_forecast",
  "AnumaSequentialThinkingMCP-sequentialthinking",
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
 * but the readers score 0.33 and `parallel_search_web` 0.47 — below
 * the 0.5 floor, unreachable at ANY match limit. No threshold or limit tuning
 * fixes this; an explicit edge is the only mechanism that does.
 *
 * Deliberately NOT grouped: same-vendor siblings (`extract_pdf`,
 * `search_images`, weather/finance variants…). Those
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
    name: "web-research",
    members: [
      "AnumaJinaMCP-search_web",
      "AnumaSearchMCP-anuma_scrape_url",
      "AnumaJinaMCP-parallel_search_web",
    ],
    anchors: ["AnumaJinaMCP-search_web"],
    anchorMinSimilarity: 0.5,
  },
  {
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
  {
    name: "restaurant-cancel-lookup",
    members: ["AnumaPaymentsMCP-anuma_list_reservations"],
    anchors: ["AnumaPaymentsMCP-anuma_cancel_reservation"],
    anchorMinSimilarity: 0.5,
  },
];

/**
 * Pre-configured server-tools filter ready to drop into `useChatStorage`'s
 * `serverTools` option. Semantic matching against the user prompt with the
 * default exclusion list applied, plus call-chain expansion via
 * {@link SERVER_TOOL_DEPENDENCY_SETS} so continuation tools (read-after-search,
 * geocode-before-weather) ride in with their entry tool.
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
export type ServerToolsFilterFunction = ((
  embeddings: number[] | number[][],
  tools: ServerTool[]
) => string[]) & {
  /**
   * The unconditional exclusions this filter applies, exposed by
   * {@link createServerToolsFilter} so defer-loading can honour them without the caller
   * repeating the list — see {@link resolveDeferredServerTools}. Absent on a hand-written
   * filter, or on one wrapped in a plain closure.
   */
  readonly excludeTools?: readonly string[];
};

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
  /**
   * Where to read/write the cached catalog. Defaults to browser `localStorage`
   * (a no-op on Node/RN); pass a backend to persist on those platforms.
   */
  cache?: ToolsCacheBackend;
  /**
   * Phase 3 defer-loading. When `enabled`, this helper skips SEMANTIC filtering to mirror
   * useChatStorage's responses send path, which hands the catalog to mergeTools + tool-search. The
   * caller's unconditional constraints still apply — an explicit static array, and exclusions (see
   * {@link resolveDeferredServerTools}). Omit/disabled → today's filtered selection.
   */
  deferLoading?: DeferLoadingConfig;
  /**
   * Tool-set names that are sticky for this conversation — the same list you
   * pass to `useChatStorage`'s `activeToolSets`, e.g. from
   * `deriveActiveToolSets`. With a filter function, the server-tool members of
   * these sets are selected whatever the prompt scored, even on a prompt too
   * short to embed. Omit for selection from the prompt alone.
   */
  activeToolSets?: string[];
  /**
   * The caller's sets beyond {@link BUILT_IN_TOOL_SETS} — the same list you pass
   * to `useChatStorage`'s `extraToolSets` — so a custom set named in
   * `activeToolSets` stays sticky here too.
   */
  extraToolSets?: ToolSet[];
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
 * Returns `[]` on any of: undefined/empty filter, empty prompt for a
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
  const {
    prompt,
    serverToolsFilter,
    getToken,
    baseUrl,
    embeddingModel,
    cacheExpirationMs,
    cache,
    deferLoading,
    activeToolSets,
    extraToolSets,
  } = options;

  if (serverToolsFilter === undefined) return [];
  if (Array.isArray(serverToolsFilter) && serverToolsFilter.length === 0) return [];

  let allServerTools: ServerTool[];
  try {
    allServerTools = await getServerTools({ baseUrl, cacheExpirationMs, getToken, cache });
  } catch {
    return [];
  }
  if (allServerTools.length === 0) return [];

  if (deferLoading?.enabled)
    return resolveDeferredServerTools(allServerTools, serverToolsFilter, deferLoading);

  if (typeof serverToolsFilter === "function") {
    const withSticky = (selected: ServerTool[]) =>
      withActiveToolSetServerTools(
        selected,
        allServerTools,
        serverToolsFilter,
        activeToolSets,
        extraToolSets
      );
    if (prompt.length < MIN_CONTENT_LENGTH_FOR_TOOLS) return withSticky([]);
    let promptEmbedding: number[];
    try {
      promptEmbedding = await generateEmbedding(prompt, {
        getToken,
        baseUrl,
        model: embeddingModel,
      });
    } catch {
      return withSticky([]);
    }
    const names = serverToolsFilter(promptEmbedding, allServerTools);
    return withSticky(filterServerTools(allServerTools, names));
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

  const matchOptions: ToolMatchOptions = { filterAmbiguous: true, relevanceRatio: 0.85 };
  if (limit !== undefined) matchOptions.limit = limit;
  if (minSimilarity !== undefined) matchOptions.minSimilarity = minSimilarity;
  const matches = findMatchingTools(promptEmbeddings, tools, matchOptions);

  if (matches.length === 0) {
    return [];
  }

  const matchedTools = matches.map((m) => m.tool);
  if (apiType === "completions") {
    return matchedTools.map((t) => toCompletionsFormat(t) as unknown as Record<string, unknown>);
  }
  return matchedTools.map(toResponsesFormat);
}
