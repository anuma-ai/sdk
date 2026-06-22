/**
 * X (Twitter) tool factory for the chat system.
 *
 * Mirrors the shape of {@link "./gmail".createGmailTools}: the caller supplies
 * a token getter and the factory returns a record of `ToolConfig` entries the
 * chat loop can run. The token getter is expected to be one returned by
 * `createConnectorTokenGetter`, but any `() => Promise<string | null>`
 * compatible function works.
 *
 * Tool catalogue (matches portal scope `connector:x:*`):
 * - `x_get_me`       -- fetch the authenticated user's profile
 * - `x_get_my_posts` -- fetch the authenticated user's recent posts
 *
 * Error contract: when the upstream X API signals an auth failure (401, 403)
 * or the token getter returns null, the tool returns the canonical
 * `__anuma_connector_error_v1` JSON shape produced by
 * `buildConnectorErrorResult`. Tool executors never throw on these paths.
 */

import type { ToolConfig } from "../lib/chat/useChat/types.js";
import { buildConnectorErrorResult } from "../lib/connectors/index.js";

const X_PROVIDER = "x";
const X_BASE_URL = "https://api.x.com/2";
const FETCH_TIMEOUT_MS = 30_000;

export type XTokenGetter = () => Promise<string | null>;

export interface XGetMeArgs {
  includePublicMetrics?: boolean;
}

export interface XGetMyPostsArgs {
  maxResults?: number;
}

interface XUserResponse {
  data?: {
    id: string;
    name: string;
    username: string;
    description?: string;
    public_metrics?: {
      followers_count: number;
      following_count: number;
      tweet_count: number;
    };
  };
  errors?: { detail: string }[];
}

interface XTweetsResponse {
  data?: { id: string; text: string }[];
  errors?: { detail: string }[];
}

/**
 * Bare `fetch` would hang the agent loop indefinitely if X goes
 * unresponsive -- abort at 30s, mirroring the Gmail tool pattern.
 */
async function xFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

function xTimeoutError(operation: string): string {
  return `Error: X API request timed out after ${FETCH_TIMEOUT_MS / 1000}s while trying to ${operation}.`;
}

/**
 * Convert an upstream X HTTP status to a connector error string when
 * appropriate, otherwise return null so the caller can surface the raw error.
 */
function maybeConnectorError(status: number): string | null {
  if (status === 401 || status === 403) {
    return buildConnectorErrorResult("connector_not_connected", X_PROVIDER);
  }
  return null;
}

/**
 * Resolve the authenticated user's id (and optionally full profile) from
 * /users/me. Returns the parsed data on success, or an error string on any
 * failure path (timeout, auth error, non-ok status, missing data).
 */
type XUserData = NonNullable<XUserResponse["data"]>;

async function resolveMyUserId(
  accessToken: string,
  signal?: AbortSignal,
  extraFields?: string[]
): Promise<XUserData | string> {
  const params = new URLSearchParams();
  if (extraFields && extraFields.length > 0) {
    params.set("user.fields", extraFields.join(","));
  }
  const qs = params.toString();
  const url = qs ? `${X_BASE_URL}/users/me?${qs}` : `${X_BASE_URL}/users/me`;
  let response: Response;
  try {
    response = await xFetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      return xTimeoutError("get profile");
    }
    throw err;
  }
  if (!response.ok) {
    const connectorError = maybeConnectorError(response.status);
    if (connectorError) return connectorError;
    const body = await response.text();
    return `Error: Failed to fetch X profile (${response.status}): ${body}`;
  }
  const data = (await response.json()) as XUserResponse;
  if (!data.data) {
    return `Error: X API returned no user data`;
  }
  return data.data;
}

async function getXMe(
  accessToken: string,
  args: XGetMeArgs
): Promise<
  | {
      id: string;
      name: string;
      username: string;
      description?: string;
      public_metrics?: {
        followers_count: number;
        following_count: number;
        tweet_count: number;
      };
    }
  | string
> {
  // Request public_metrics and description so the API actually returns them.
  const extraFields = ["description"];
  if (args.includePublicMetrics !== false) extraFields.push("public_metrics");

  const userData = await resolveMyUserId(accessToken, undefined, extraFields);
  if (typeof userData === "string") return userData;

  const result: {
    id: string;
    name: string;
    username: string;
    description?: string;
    public_metrics?: {
      followers_count: number;
      following_count: number;
      tweet_count: number;
    };
  } = {
    id: userData.id,
    name: userData.name,
    username: userData.username,
  };
  if (userData.description !== undefined) result.description = userData.description;
  if (args.includePublicMetrics !== false && userData.public_metrics !== undefined) {
    result.public_metrics = userData.public_metrics;
  }
  return result;
}

async function getXMyPosts(
  accessToken: string,
  args: XGetMyPostsArgs
): Promise<{ id: string; text: string }[] | string> {
  // Resolve the authenticated user's id.
  const userData = await resolveMyUserId(accessToken);
  if (typeof userData === "string") return userData;
  const userId = userData.id;

  // Guard against NaN from non-numeric model input before clamping.
  const rawMax = args.maxResults;
  const safeMax = typeof rawMax === "number" && Number.isFinite(rawMax) ? rawMax : 10;
  const maxResults = Math.min(100, Math.max(5, safeMax));

  const tweetsParams = new URLSearchParams({ max_results: String(maxResults) });
  let tweetsResponse: Response;
  try {
    tweetsResponse = await xFetch(
      `${X_BASE_URL}/users/${encodeURIComponent(userId)}/tweets?${tweetsParams.toString()}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      return xTimeoutError("fetch posts");
    }
    throw err;
  }
  if (!tweetsResponse.ok) {
    const connectorError = maybeConnectorError(tweetsResponse.status);
    if (connectorError) return connectorError;
    const body = await tweetsResponse.text();
    return `Error: Failed to fetch X posts (${tweetsResponse.status}): ${body}`;
  }
  const tweetsData = (await tweetsResponse.json()) as XTweetsResponse;
  if (!tweetsData.data || tweetsData.data.length === 0) {
    return [];
  }
  return tweetsData.data.map((t) => ({ id: t.id, text: t.text }));
}

function createXGetMeTool(getToken: XTokenGetter): ToolConfig {
  return {
    type: "function",
    function: {
      name: "x_get_me",
      description:
        "Fetch the authenticated user's X (Twitter) profile -- id, name, username, bio, and follower counts.",
      parameters: {
        type: "object",
        properties: {
          includePublicMetrics: {
            type: "boolean",
            description: "Whether to include follower/following/tweet counts. Defaults to true.",
          },
        },
        required: [],
      },
    },
    executor: async (args: Record<string, unknown>) => {
      const token = await getToken();
      if (!token) return buildConnectorErrorResult("connector_not_connected", X_PROVIDER);
      const typed: XGetMeArgs = {
        includePublicMetrics: args.includePublicMetrics as boolean | undefined,
      };
      return getXMe(token, typed);
    },
  };
}

function createXGetMyPostsTool(getToken: XTokenGetter): ToolConfig {
  return {
    type: "function",
    function: {
      name: "x_get_my_posts",
      description:
        "Fetch the authenticated user's recent posts on X (Twitter). Returns an array of post objects with id and text.",
      parameters: {
        type: "object",
        properties: {
          maxResults: {
            type: "number",
            description:
              "Number of posts to return. Must be between 5 and 100 (values outside this range are clamped). Defaults to 10.",
          },
        },
        required: [],
      },
    },
    executor: async (args: Record<string, unknown>) => {
      const token = await getToken();
      if (!token) return buildConnectorErrorResult("connector_not_connected", X_PROVIDER);
      const typed: XGetMyPostsArgs = {
        maxResults: args.maxResults as number | undefined,
      };
      return getXMyPosts(token, typed);
    },
  };
}

/**
 * Build the X tool set wired to the supplied token getter.
 *
 * The returned record keys (`x_get_me`, `x_get_my_posts`) match the underlying
 * tool names so callers can forward a subset by destructuring.
 *
 * @param getToken Async getter -- typically `createConnectorTokenGetter(portal, "x")`.
 */
export function createXTools(getToken: XTokenGetter): Record<string, ToolConfig> {
  return {
    x_get_me: createXGetMeTool(getToken),
    x_get_my_posts: createXGetMyPostsTool(getToken),
  };
}
