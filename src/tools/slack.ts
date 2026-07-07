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
 * Tool catalogue. The Slack Marketplace forbids the message-search scope, so
 * there's no server-side message-search API to call: `slack_search_messages`
 * scans recent history via `conversations.history` instead. Slack throttles
 * conversations.history/.replies to ~1 req/min for distributed apps, so the read
 * tools stay bounded — search fans out across only a handful of channels and
 * reads only recent messages.
 * - `slack_get_me`              -- the authenticated user's profile
 * - `slack_list_channels`       -- channels in the workspace
 * - `slack_search_messages`     -- text-search recent messages across channels
 * - `slack_list_users`          -- workspace members
 * - `slack_get_channel_history` -- recent messages in a channel (rate-limited)
 * - `slack_get_thread_replies`  -- replies in a thread (rate-limited)
 * - `slack_post_message`        -- post a message (WRITE)
 *
 * Error contract: on an auth failure the tool returns the canonical
 * `__anuma_connector_error_v1` JSON shape from `buildConnectorErrorResult`.
 * Tool executors never throw on these paths.
 */

import type { ToolConfig } from "../lib/chat/useChat/types.js";
import { buildConnectorErrorResult } from "../lib/connectors/index.js";

const SLACK_PROVIDER = "slack";

/**
 * Calls the portal Slack proxy with an upstream Slack Web API method path,
 * optional query, and optional body, and resolves to the upstream status +
 * parsed JSON. Consumers wire this to the portal's Slack proxy with the user's
 * Privy bearer; the portal mints the Slack token server-side. Paths are method
 * names (e.g. `/conversations.list`); read params go in `query`. Write methods
 * (e.g. `/chat.postMessage`) pass a `body` — the portal classifies the path as a
 * write and POSTs the body upstream.
 */
export type SlackProxyCaller = (
  path: string,
  query?: Record<string, string | number>,
  body?: unknown
) => Promise<{ status: number; json: unknown }>;

export interface SlackListChannelsArgs {
  limit?: number;
}

export interface SlackSearchMessagesArgs {
  query: string;
  count?: number;
  /** Restrict the search to a single channel (id or name). Omit to fan out across channels. */
  channel?: string;
}

export interface SlackListUsersArgs {
  limit?: number;
}

export interface SlackGetChannelHistoryArgs {
  channel: string;
  limit?: number;
}

export interface SlackGetThreadRepliesArgs {
  channel: string;
  ts: string;
  limit?: number;
}

export interface SlackPostMessageArgs {
  channel: string;
  text: string;
  thread_ts?: string;
}

/** Every Slack Web API response carries `ok`; failures add an `error` code. */
interface SlackBaseResponse {
  ok: boolean;
  error?: string;
  /** On a `missing_scope` error, the scope the called method requires. */
  needed?: string;
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
}

interface SlackConversationsHistoryResponse extends SlackBaseResponse {
  messages?: SlackMessage[];
}

interface SlackPostMessageResponse extends SlackBaseResponse {
  ts?: string;
  channel?: string;
}

/** Slack `error` codes that mean the connection is broken / not authorized. */
const AUTH_ERROR_CODES = new Set([
  "not_authed",
  "invalid_auth",
  "account_inactive",
  "token_revoked",
  "token_expired",
  "no_permission",
  "not_allowed_token_type",
]);

/**
 * Map a Slack response to a connector error string when it signals an auth
 * failure — either via HTTP status (401/403) or via Slack's `ok:false` +
 * auth-shaped `error` code (the Web API returns 200 even when auth failed).
 * Returns null otherwise so the caller can surface the raw error.
 *
 * `missing_scope` is special: the grant is alive but lacks the scope a method
 * needs, so it maps to `insufficient_scope` (reconnecting wouldn't help —
 * the user needs the missing scope granted) and forwards the required scope.
 */
function maybeConnectorError(status: number, body: SlackBaseResponse | null): string | null {
  if (status === 401 || status === 403) {
    return buildConnectorErrorResult("connector_not_connected", SLACK_PROVIDER);
  }
  if (body && body.ok === false && body.error === "missing_scope") {
    return buildConnectorErrorResult("insufficient_scope", SLACK_PROVIDER, undefined, {
      required: body.needed,
    });
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
  query?: Record<string, string | number>,
  requestBody?: unknown
): Promise<T | string> {
  const { status, json } = await callProxy(path, query, requestBody);
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

/** Channels scanned in a workspace-wide search when no channel is given. */
const MAX_SEARCH_CHANNELS = 6;
/** Recent messages pulled per channel — kept small since history is rate-limited. */
const SEARCH_HISTORY_LIMIT = 15;

/**
 * Split a query into lowercased terms. A message matches when its text contains
 * every term as a substring (AND semantics), case-insensitive.
 */
function messageMatchesQuery(text: string, terms: string[]): boolean {
  if (terms.length === 0) return false;
  const haystack = text.toLowerCase();
  return terms.every((term) => haystack.includes(term));
}

/**
 * Text-search recent Slack messages without the (Marketplace-forbidden)
 * server-side message-search API. Reads recent `conversations.history` — a single channel
 * when `args.channel` is set, otherwise a bounded fan-out across the user's
 * channels — and keeps messages whose text contains all query terms.
 *
 * conversations.history is throttled to ~1 req/min for distributed apps, so if a
 * history call comes back rate-limited (HTTP 429 or `ok:false` + `ratelimited`)
 * we stop scanning and return what we have. Return-shape choice: the contract
 * stays `{text,user,ts,channel}[]`; on a rate-limit cutoff we append ONE final
 * synthetic `{ note }` item so the model can relay that results are partial,
 * rather than switching to an object shape that downstream consumers don't expect.
 */
async function searchSlackMessages(
  callProxy: SlackProxyCaller,
  args: SlackSearchMessagesArgs
): Promise<Array<Record<string, unknown>> | string> {
  const count = clampLimit(args.count, 20, 1, 100);
  const terms = args.query.toLowerCase().split(/\s+/).filter(Boolean);

  // conversations.list (not throttled) gives us channel names for the result and
  // the fan-out set. Auth failures surface as the canonical connector error.
  const listRes = await callSlack<SlackConversationsListResponse>(
    callProxy,
    "/conversations.list",
    {
      limit: 100,
      exclude_archived: "true",
      types: "public_channel,private_channel",
    }
  );
  if (typeof listRes === "string") return listRes;
  const allChannels = listRes.channels ?? [];

  let targets: Array<{ id: string; name?: string }>;
  if (args.channel) {
    const found = allChannels.find((c) => c.id === args.channel || c.name === args.channel);
    targets = [{ id: found?.id ?? args.channel, name: found?.name ?? args.channel }];
  } else {
    targets = allChannels.slice(0, MAX_SEARCH_CHANNELS).map((c) => ({ id: c.id, name: c.name }));
  }

  const results: Array<Record<string, unknown>> = [];
  let rateLimited = false;
  for (const channel of targets) {
    if (results.length >= count) break;
    const { status, json } = await callProxy("/conversations.history", {
      channel: channel.id,
      limit: SEARCH_HISTORY_LIMIT,
    });
    const body = (json ?? null) as SlackConversationsHistoryResponse | null;

    if (status === 429 || (body?.ok === false && body.error === "ratelimited")) {
      rateLimited = true;
      break;
    }
    // Auth/scope failures are fatal — surface the canonical connector error.
    const connectorError = maybeConnectorError(status, body);
    if (connectorError) return connectorError;
    // Any other per-channel failure (e.g. not_in_channel) just skips that channel.
    if (status < 200 || status >= 300 || !body || body.ok === false) continue;

    for (const m of body.messages ?? []) {
      if (results.length >= count) break;
      if (messageMatchesQuery(m.text ?? "", terms)) {
        results.push({ text: m.text, user: m.username ?? m.user, ts: m.ts, channel: channel.name });
      }
    }
  }

  if (rateLimited) {
    results.push({
      note: `Slack rate-limited channel history, so this search stopped early — returning ${results.length} match(es) found so far. Try a specific channel or ask again in a minute.`,
    });
  }
  return results;
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

async function getSlackThreadReplies(
  callProxy: SlackProxyCaller,
  args: SlackGetThreadRepliesArgs
): Promise<Array<Record<string, unknown>> | string> {
  const limit = clampLimit(args.limit, 20, 1, 100);
  const res = await callSlack<SlackConversationsHistoryResponse>(
    callProxy,
    "/conversations.replies",
    { channel: args.channel, ts: args.ts, limit }
  );
  if (typeof res === "string") return res;
  return (res.messages ?? []).map((m) => ({
    text: m.text,
    user: m.username ?? m.user,
    ts: m.ts,
  }));
}

async function postSlackMessage(
  callProxy: SlackProxyCaller,
  args: SlackPostMessageArgs
): Promise<Record<string, unknown> | string> {
  const res = await callSlack<SlackPostMessageResponse>(callProxy, "/chat.postMessage", undefined, {
    channel: args.channel,
    text: args.text,
    ...(args.thread_ts ? { thread_ts: args.thread_ts } : {}),
  });
  if (typeof res === "string") return res;
  return { ok: res.ok, ts: res.ts, channel: res.channel };
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
        "Search recent messages for text across the user's Slack channels, or within a single channel when 'channel' is given. Matches messages containing all of the query words. Only recent history is scanned (a bounded set of channels), so this surfaces recent mentions rather than the full archive.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description:
              "Words to look for. A message matches when its text contains all of them (case-insensitive).",
          },
          count: {
            type: "number",
            description: "Max results to return. Between 1 and 100 (clamped). Defaults to 20.",
          },
          channel: {
            type: "string",
            description:
              "Optional channel id or name to search within. Omit to search across your channels.",
          },
        },
        required: ["query"],
      },
    },
    executor: async (args: Record<string, unknown>) =>
      searchSlackMessages(callProxy, {
        query: readString(args.query),
        count: args.count as number | undefined,
        channel: typeof args.channel === "string" ? args.channel : undefined,
      }),
  };
}

function createSlackListUsersTool(callProxy: SlackProxyCaller): ToolConfig {
  return {
    type: "function",
    function: {
      name: "slack_list_users",
      description:
        "List members of the user's Slack workspace. Returns id, username, real name, title, and is_bot. Deactivated/deleted accounts are omitted; bot accounts are included (check is_bot to filter them out).",
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
        "Fetch recent messages from a single Slack channel by id. Best-effort and heavily rate-limited (~1 request per minute for the app), so use it sparingly for a specific channel.",
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

function createSlackGetThreadRepliesTool(callProxy: SlackProxyCaller): ToolConfig {
  return {
    type: "function",
    function: {
      name: "slack_get_thread_replies",
      description:
        "Fetch the replies in a single Slack thread, given the channel id and the thread's root message timestamp (ts). Best-effort and rate-limited like channel history, so use it for a specific thread.",
      parameters: {
        type: "object",
        properties: {
          channel: {
            type: "string",
            description: "The channel id (e.g. 'C0123456789') the thread is in.",
          },
          ts: {
            type: "string",
            description:
              "The timestamp (ts) of the thread's root message, as returned by other Slack tools.",
          },
          limit: {
            type: "number",
            description:
              "Max messages to return (including the root message, which is always first). Between 1 and 100 (clamped). Defaults to 20.",
          },
        },
        required: ["channel", "ts"],
      },
    },
    executor: async (args: Record<string, unknown>) =>
      getSlackThreadReplies(callProxy, {
        channel: readString(args.channel),
        ts: readString(args.ts),
        limit: args.limit as number | undefined,
      }),
  };
}

function createSlackPostMessageTool(callProxy: SlackProxyCaller): ToolConfig {
  return {
    type: "function",
    function: {
      name: "slack_post_message",
      description:
        "Post a message as the user to a Slack channel or DM. Pass the channel id and the message text; optionally pass thread_ts to reply within an existing thread instead of posting a new top-level message.",
      parameters: {
        type: "object",
        properties: {
          channel: {
            type: "string",
            description:
              "The channel or DM id (e.g. 'C0123456789'), as returned by slack_list_channels.",
          },
          text: {
            type: "string",
            description: "The message text to post.",
          },
          thread_ts: {
            type: "string",
            description:
              "Optional. The ts of a thread's root message to reply in that thread instead of posting a new message.",
          },
        },
        required: ["channel", "text"],
      },
    },
    executor: async (args: Record<string, unknown>) =>
      postSlackMessage(callProxy, {
        channel: readString(args.channel),
        text: readString(args.text),
        thread_ts: typeof args.thread_ts === "string" ? args.thread_ts : undefined,
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
    slack_get_thread_replies: createSlackGetThreadRepliesTool(callProxy),
    slack_post_message: createSlackPostMessageTool(callProxy),
  };
}
