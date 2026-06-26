/**
 * Slack tool factory for the chat system.
 *
 * Like the X tools, the Slack tools never call slack.com directly: the Web API
 * returns no CORS headers, so a browser can't fetch it. The caller supplies a
 * {@link SlackProxyCaller} that GETs the portal's Slack proxy (authed with the
 * user's Privy bearer, NOT a Slack token). The portal mints the Slack token
 * server-side and returns the upstream status + JSON verbatim. The SDK stays
 * transport-agnostic: it builds the same upstream method paths + query objects
 * and hands them to the injected caller.
 *
 * Slack auth quirk: the Web API answers HTTP 200 even on auth failures, putting
 * the real outcome in `{ ok: false, error: "invalid_auth" | ... }`. So we map
 * the auth-shaped `error` codes (and the usual 401/403 statuses) to the
 * canonical connector error, not just the HTTP status.
 *
 * Tool catalogue (search-led; Slack throttles conversations.history/.replies to
 * ~1 req/min for distributed apps, while search.messages is NOT throttled —
 * so search is the primary read path):
 * - `slack_get_me`              -- the authenticated user's profile
 * - `slack_list_channels`       -- channels in the workspace
 * - `slack_search_messages`     -- search messages (THE primary tool)
 * - `slack_list_users`          -- workspace members
 * - `slack_get_channel_history` -- recent messages in a channel (rate-limited)
 *
 * Error contract: on an auth failure the tool returns the canonical
 * `__anuma_connector_error_v1` JSON shape from `buildConnectorErrorResult`.
 * Tool executors never throw on these paths.
 */

import type { ToolConfig } from "../lib/chat/useChat/types.js";
import { buildConnectorErrorResult } from "../lib/connectors/index.js";

const SLACK_PROVIDER = "slack";

/**
 * Calls the portal Slack proxy with an upstream Slack Web API method path and
 * optional query, and resolves to the upstream status + parsed JSON. Consumers
 * wire this to the portal's Slack proxy with the user's Privy bearer; the portal
 * mints the Slack token server-side. Paths are method names (e.g.
 * `/conversations.list`); params go in `query`.
 */
export type SlackProxyCaller = (
  path: string,
  query?: Record<string, string | number>
) => Promise<{ status: number; json: unknown }>;

export interface SlackListChannelsArgs {
  limit?: number;
}

export interface SlackSearchMessagesArgs {
  query: string;
  count?: number;
}

export interface SlackListUsersArgs {
  limit?: number;
}

export interface SlackGetChannelHistoryArgs {
  channel: string;
  limit?: number;
}

/** Every Slack Web API response carries `ok`; failures add an `error` code. */
interface SlackBaseResponse {
  ok: boolean;
  error?: string;
}

interface SlackAuthTestResponse extends SlackBaseResponse {
  user_id?: string;
  user?: string;
  team?: string;
  url?: string;
}

interface SlackUserProfile {
  real_name?: string;
  display_name?: string;
  email?: string;
  title?: string;
}

interface SlackUser {
  id: string;
  name?: string;
  real_name?: string;
  is_bot?: boolean;
  deleted?: boolean;
  profile?: SlackUserProfile;
}

interface SlackUsersInfoResponse extends SlackBaseResponse {
  user?: SlackUser;
}

interface SlackUsersListResponse extends SlackBaseResponse {
  members?: SlackUser[];
}

interface SlackChannel {
  id: string;
  name?: string;
  is_private?: boolean;
  is_archived?: boolean;
  num_members?: number;
  topic?: { value?: string };
  purpose?: { value?: string };
}

interface SlackConversationsListResponse extends SlackBaseResponse {
  channels?: SlackChannel[];
}

interface SlackMessage {
  type?: string;
  user?: string;
  username?: string;
  text?: string;
  ts?: string;
  channel?: { id?: string; name?: string } | string;
}

interface SlackSearchMessagesResponse extends SlackBaseResponse {
  messages?: { matches?: SlackMessage[] };
}

interface SlackConversationsHistoryResponse extends SlackBaseResponse {
  messages?: SlackMessage[];
}

/** Slack `error` codes that mean the connection is broken / not authorized. */
const AUTH_ERROR_CODES = new Set([
  "not_authed",
  "invalid_auth",
  "account_inactive",
  "token_revoked",
  "token_expired",
  "no_permission",
  "missing_scope",
  "not_allowed_token_type",
]);

/**
 * Map a Slack response to a connector error string when it signals an auth
 * failure — either via HTTP status (401/403) or via Slack's `ok:false` +
 * auth-shaped `error` code (the Web API returns 200 even when auth failed).
 * Returns null otherwise so the caller can surface the raw error.
 */
function maybeConnectorError(status: number, body: SlackBaseResponse | null): string | null {
  if (status === 401 || status === 403) {
    return buildConnectorErrorResult("connector_not_connected", SLACK_PROVIDER);
  }
  if (body && body.ok === false && body.error && AUTH_ERROR_CODES.has(body.error)) {
    return buildConnectorErrorResult("connector_not_connected", SLACK_PROVIDER);
  }
  return null;
}

/**
 * Run a Slack proxy call and return the parsed body on success, or a connector
 * error / generic failure string on any failure path (bad HTTP status, or
 * `ok:false`). Centralizes the auth-vs-generic-error decision so each tool just
 * checks `typeof result === "string"`.
 */
async function callSlack<T extends SlackBaseResponse>(
  callProxy: SlackProxyCaller,
  path: string,
  query?: Record<string, string | number>
): Promise<T | string> {
  const { status, json } = await callProxy(path, query);
  const body = (json ?? null) as (T & SlackBaseResponse) | null;
  if (status < 200 || status >= 300) {
    const connectorError = maybeConnectorError(status, body);
    if (connectorError) return connectorError;
    return `Error: Slack ${path} failed (${status}): ${JSON.stringify(json)}`;
  }
  if (!body || body.ok === false) {
    const connectorError = maybeConnectorError(status, body);
    if (connectorError) return connectorError;
    return `Error: Slack ${path} returned an error: ${body?.error ?? "unknown"}`;
  }
  return body;
}

/** Read a model-supplied string arg, returning "" for anything non-string. */
function readString(raw: unknown): string {
  return typeof raw === "string" ? raw : "";
}

/** Coerce a model-supplied limit (number or numeric string) and clamp it. */
function clampLimit(raw: unknown, fallback: number, min: number, max: number): number {
  const num = typeof raw === "string" ? Number(raw) : raw;
  const safe = typeof num === "number" && Number.isFinite(num) ? num : fallback;
  return Math.min(max, Math.max(min, safe));
}

async function getSlackMe(callProxy: SlackProxyCaller): Promise<Record<string, unknown> | string> {
  const auth = await callSlack<SlackAuthTestResponse>(callProxy, "/auth.test");
  if (typeof auth === "string") return auth;
  if (!auth.user_id) {
    return `Error: Slack auth.test returned no user id`;
  }

  const info = await callSlack<SlackUsersInfoResponse>(callProxy, "/users.info", {
    user: auth.user_id,
  });
  if (typeof info === "string") return info;

  const user = info.user;
  return {
    id: auth.user_id,
    team: auth.team,
    name: user?.name,
    real_name: user?.real_name ?? user?.profile?.real_name,
    display_name: user?.profile?.display_name,
    email: user?.profile?.email,
    title: user?.profile?.title,
  };
}

async function listSlackChannels(
  callProxy: SlackProxyCaller,
  args: SlackListChannelsArgs
): Promise<Array<Record<string, unknown>> | string> {
  const limit = clampLimit(args.limit, 100, 1, 1000);
  const res = await callSlack<SlackConversationsListResponse>(callProxy, "/conversations.list", {
    limit,
    exclude_archived: "true",
    types: "public_channel,private_channel",
  });
  if (typeof res === "string") return res;
  return (res.channels ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    is_private: c.is_private,
    num_members: c.num_members,
    topic: c.topic?.value,
    purpose: c.purpose?.value,
  }));
}

async function searchSlackMessages(
  callProxy: SlackProxyCaller,
  args: SlackSearchMessagesArgs
): Promise<Array<Record<string, unknown>> | string> {
  const count = clampLimit(args.count, 20, 1, 100);
  const res = await callSlack<SlackSearchMessagesResponse>(callProxy, "/search.messages", {
    query: args.query,
    count,
  });
  if (typeof res === "string") return res;
  const matches = res.messages?.matches ?? [];
  return matches.map((m) => ({
    text: m.text,
    user: m.username ?? m.user,
    ts: m.ts,
    channel: typeof m.channel === "object" ? m.channel?.name : m.channel,
  }));
}

async function listSlackUsers(
  callProxy: SlackProxyCaller,
  args: SlackListUsersArgs
): Promise<Array<Record<string, unknown>> | string> {
  const limit = clampLimit(args.limit, 100, 1, 1000);
  const res = await callSlack<SlackUsersListResponse>(callProxy, "/users.list", { limit });
  if (typeof res === "string") return res;
  return (res.members ?? [])
    .filter((u) => !u.deleted)
    .map((u) => ({
      id: u.id,
      name: u.name,
      real_name: u.real_name ?? u.profile?.real_name,
      is_bot: u.is_bot,
      title: u.profile?.title,
    }));
}

async function getSlackChannelHistory(
  callProxy: SlackProxyCaller,
  args: SlackGetChannelHistoryArgs
): Promise<Array<Record<string, unknown>> | string> {
  const limit = clampLimit(args.limit, 20, 1, 100);
  const res = await callSlack<SlackConversationsHistoryResponse>(
    callProxy,
    "/conversations.history",
    { channel: args.channel, limit }
  );
  if (typeof res === "string") return res;
  return (res.messages ?? []).map((m) => ({
    text: m.text,
    user: m.username ?? m.user,
    ts: m.ts,
  }));
}

function createSlackGetMeTool(callProxy: SlackProxyCaller): ToolConfig {
  return {
    type: "function",
    function: {
      name: "slack_get_me",
      description:
        "Fetch the authenticated user's Slack profile -- id, name, real name, email, and title.",
      parameters: { type: "object", properties: {}, required: [] },
    },
    executor: async () => getSlackMe(callProxy),
  };
}

function createSlackListChannelsTool(callProxy: SlackProxyCaller): ToolConfig {
  return {
    type: "function",
    function: {
      name: "slack_list_channels",
      description:
        "List channels in the user's Slack workspace (public and private the user is in). Returns id, name, member count, topic, and purpose.",
      parameters: {
        type: "object",
        properties: {
          limit: {
            type: "number",
            description: "Max channels to return. Between 1 and 1000 (clamped). Defaults to 100.",
          },
        },
        required: [],
      },
    },
    executor: async (args: Record<string, unknown>) =>
      listSlackChannels(callProxy, { limit: args.limit as number | undefined }),
  };
}

function createSlackSearchMessagesTool(callProxy: SlackProxyCaller): ToolConfig {
  return {
    type: "function",
    function: {
      name: "slack_search_messages",
      description:
        "Search messages across the user's Slack workspace. This is the primary, fastest way to find Slack content -- prefer it over reading channel history. Supports Slack search operators like in:#channel, from:@user, and before:/after: dates.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description:
              "The search query. May include Slack operators, e.g. 'deploy in:#eng from:@alice'.",
          },
          count: {
            type: "number",
            description: "Max results to return. Between 1 and 100 (clamped). Defaults to 20.",
          },
        },
        required: ["query"],
      },
    },
    executor: async (args: Record<string, unknown>) =>
      searchSlackMessages(callProxy, {
        query: readString(args.query),
        count: args.count as number | undefined,
      }),
  };
}

function createSlackListUsersTool(callProxy: SlackProxyCaller): ToolConfig {
  return {
    type: "function",
    function: {
      name: "slack_list_users",
      description:
        "List members of the user's Slack workspace. Returns id, username, real name, and title. Deactivated accounts are omitted.",
      parameters: {
        type: "object",
        properties: {
          limit: {
            type: "number",
            description: "Max users to return. Between 1 and 1000 (clamped). Defaults to 100.",
          },
        },
        required: [],
      },
    },
    executor: async (args: Record<string, unknown>) =>
      listSlackUsers(callProxy, { limit: args.limit as number | undefined }),
  };
}

function createSlackGetChannelHistoryTool(callProxy: SlackProxyCaller): ToolConfig {
  return {
    type: "function",
    function: {
      name: "slack_get_channel_history",
      description:
        "Fetch recent messages from a single Slack channel by id. Best-effort and heavily rate-limited (~1 request per minute for the app), so use it sparingly for a specific channel -- for general lookups use slack_search_messages instead.",
      parameters: {
        type: "object",
        properties: {
          channel: {
            type: "string",
            description: "The channel id (e.g. 'C0123456789'), as returned by slack_list_channels.",
          },
          limit: {
            type: "number",
            description: "Max messages to return. Between 1 and 100 (clamped). Defaults to 20.",
          },
        },
        required: ["channel"],
      },
    },
    executor: async (args: Record<string, unknown>) =>
      getSlackChannelHistory(callProxy, {
        channel: readString(args.channel),
        limit: args.limit as number | undefined,
      }),
  };
}

/**
 * Build the Slack tool set wired to the supplied proxy caller.
 *
 * The returned record keys match the underlying tool names so callers can
 * forward a subset by destructuring.
 *
 * @param callProxy GETs an upstream Slack method path + query through the portal
 *   Slack proxy and resolves to `{ status, json }`. The Slack token never
 *   reaches the browser -- the portal mints it server-side.
 */
export function createSlackTools(callProxy: SlackProxyCaller): Record<string, ToolConfig> {
  return {
    slack_get_me: createSlackGetMeTool(callProxy),
    slack_list_channels: createSlackListChannelsTool(callProxy),
    slack_search_messages: createSlackSearchMessagesTool(callProxy),
    slack_list_users: createSlackListUsersTool(callProxy),
    slack_get_channel_history: createSlackGetChannelHistoryTool(callProxy),
  };
}
