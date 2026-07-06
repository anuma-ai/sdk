/**
 * X (Twitter) tool factory for the chat system.
 *
 * Unlike the other connector tools, the X tools never call api.x.com directly:
 * api.x.com returns no CORS headers, so a browser can't fetch it. Instead the
 * caller supplies an {@link XProxyCaller} that POSTs to the portal's
 * `POST {portalBaseUrl}/api/v1/connectors/x/proxy` endpoint (authed with the
 * user's Privy bearer, NOT an X token). The portal mints the X token
 * server-side and returns the upstream status + JSON verbatim. The SDK stays
 * transport-agnostic: it builds the same upstream paths + query objects it
 * always has and hands them to the injected caller.
 *
 * Tool catalogue (matches portal scope `connector:x:*`):
 * - `x_get_me`       -- fetch the authenticated user's profile
 * - `x_get_my_posts` -- fetch the authenticated user's recent posts
 *
 * Error contract: when the proxy reports an auth failure (401, 403) the tool
 * returns the canonical `__anuma_connector_error_v1` JSON shape produced by
 * `buildConnectorErrorResult`. Tool executors never throw on these paths.
 */

import type { ToolConfig } from "../lib/chat/useChat/types.js";
import { buildConnectorErrorResult } from "../lib/connectors/index.js";

const X_PROVIDER = "x";

/**
 * Calls the portal X proxy with an upstream X API path and optional query, and
 * resolves to the upstream status + parsed JSON. Consumers wire this to
 * `POST {portalBaseUrl}/api/v1/connectors/x/proxy` with the user's Privy bearer
 * and a JSON body `{ path, query }`; the portal mints the X token server-side.
 */
export type XProxyCaller = (
  path: string,
  query?: Record<string, string | number>
) => Promise<{ status: number; json: unknown }>;

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
 * failure path (auth error, non-ok status, missing data).
 */
type XUserData = NonNullable<XUserResponse["data"]>;

async function resolveMyUserId(
  callProxy: XProxyCaller,
  extraFields?: string[]
): Promise<XUserData | string> {
  const query: Record<string, string | number> = {};
  if (extraFields && extraFields.length > 0) {
    query["user.fields"] = extraFields.join(",");
  }
  const { status, json } = await callProxy(
    "/2/users/me",
    Object.keys(query).length > 0 ? query : undefined
  );
  if (status < 200 || status >= 300) {
    const connectorError = maybeConnectorError(status);
    if (connectorError) return connectorError;
    return `Error: Failed to fetch X profile (${status}): ${JSON.stringify(json)}`;
  }
  const data = json as XUserResponse;
  if (!data.data) {
    return `Error: X API returned no user data`;
  }
  return data.data;
}

async function getXMe(
  callProxy: XProxyCaller,
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

  const userData = await resolveMyUserId(callProxy, extraFields);
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
  callProxy: XProxyCaller,
  args: XGetMyPostsArgs
): Promise<{ id: string; text: string }[] | string> {
  // Resolve the authenticated user's id.
  const userData = await resolveMyUserId(callProxy);
  if (typeof userData === "string") return userData;
  const userId = userData.id;

  // Coerce a numeric string (e.g. the model emits "50") to a number, then guard
  // against NaN from non-numeric input before clamping.
  const rawMax = typeof args.maxResults === "string" ? Number(args.maxResults) : args.maxResults;
  const safeMax = typeof rawMax === "number" && Number.isFinite(rawMax) ? rawMax : 10;
  const maxResults = Math.min(100, Math.max(5, safeMax));

  const { status, json } = await callProxy(`/2/users/${userId}/tweets`, {
    max_results: maxResults,
  });
  if (status < 200 || status >= 300) {
    const connectorError = maybeConnectorError(status);
    if (connectorError) return connectorError;
    return `Error: Failed to fetch X posts (${status}): ${JSON.stringify(json)}`;
  }
  const tweetsData = json as XTweetsResponse;
  if (!tweetsData.data || tweetsData.data.length === 0) {
    return [];
  }
  return tweetsData.data.map((t) => ({ id: t.id, text: t.text }));
}

function createXGetMeTool(callProxy: XProxyCaller): ToolConfig {
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
      const typed: XGetMeArgs = {
        includePublicMetrics: args.includePublicMetrics as boolean | undefined,
      };
      return getXMe(callProxy, typed);
    },
  };
}

function createXGetMyPostsTool(callProxy: XProxyCaller): ToolConfig {
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
      const typed: XGetMyPostsArgs = {
        maxResults: args.maxResults as number | undefined,
      };
      return getXMyPosts(callProxy, typed);
    },
  };
}

/**
 * Build the X tool set wired to the supplied proxy caller.
 *
 * The returned record keys (`x_get_me`, `x_get_my_posts`) match the underlying
 * tool names so callers can forward a subset by destructuring.
 *
 * @param callProxy POSTs an upstream X path + query through the portal X proxy
 *   (`/api/v1/connectors/x/proxy`) and resolves to `{ status, json }`. The X
 *   token never reaches the browser -- the portal mints it server-side.
 */
export function createXTools(callProxy: XProxyCaller): Record<string, ToolConfig> {
  return {
    x_get_me: createXGetMeTool(callProxy),
    x_get_my_posts: createXGetMyPostsTool(callProxy),
  };
}
