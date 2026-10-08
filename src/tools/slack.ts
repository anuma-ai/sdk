import type { ToolConfig } from "../lib/chat/useChat/types.js";
import { buildConnectorErrorResult } from "../lib/connectors/index.js";

const SLACK_PROVIDER = "slack";

/**
 * Shown to the user (verbatim) when a Slack read is blocked by the pre-Marketplace
 * rate limit. Slack throttles the distributed app to ~1 req/min until it clears
 * Marketplace review, so we surface this plain message instead of returning
 * capped/partial/approximate data that could mislead. Kept em-dash-free on purpose.
 */
export const SLACK_PENDING_APPROVAL_NOTE =
  "This Slack request couldn't be completed because Slack rate-limited the app. The Slack app is still pending Slack Marketplace approval, so these reads aren't available yet. Tell the user this is a temporary limitation until the app is approved; do not attempt a workaround.";

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

export interface SlackListDmsArgs {
  limit?: number;
  /** Return only the DM(s) involving this person (a Slack user id or a name/handle). */
  with_user?: string;
}

export interface SlackSearchMessagesArgs {
  /** Words to match in the message text. Optional if `from_user`/`mentions` is set. */
  query?: string;
  count?: number;
  /** Restrict the search to a single channel (id or name). Omit to fan out across channels. */
  channel?: string;
  /** Keep only messages authored by this user (id or name). */
  from_user?: string;
  /** Keep only messages that @-mention this user (id, name, or "me"). */
  mentions?: string;
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

interface SlackBaseResponse {
  ok: boolean;
  error?: string;
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
  response_metadata?: { next_cursor?: string };
}

interface SlackChannel {
  id: string;
  name?: string;
  is_private?: boolean;
  is_archived?: boolean;
  num_members?: number;
  topic?: { value?: string };
  purpose?: { value?: string };
  is_im?: boolean;
  is_mpim?: boolean;
  user?: string;
}

interface SlackConversationsListResponse extends SlackBaseResponse {
  channels?: SlackChannel[];
  response_metadata?: { next_cursor?: string };
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

interface SlackConversationsOpenResponse extends SlackBaseResponse {
  channel?: { id?: string };
}

const AUTH_ERROR_CODES = new Set([
  "not_authed",
  "invalid_auth",
  "account_inactive",
  "token_revoked",
  "token_expired",
  "no_permission",
  "not_allowed_token_type",
]);

function maybeConnectorError(status: number, body: SlackBaseResponse | null): string | null {
  if (status === 401 || status === 403) {
    return buildConnectorErrorResult("connector_not_connected", SLACK_PROVIDER);
  }
  if (body && body.ok === false && body.error === "missing_scope") {
    return buildConnectorErrorResult("insufficient_scope", SLACK_PROVIDER, {
      required: body.needed,
    });
  }
  if (body && body.ok === false && body.error && AUTH_ERROR_CODES.has(body.error)) {
    return buildConnectorErrorResult("connector_not_connected", SLACK_PROVIDER);
  }
  return null;
}

function isRateLimited(status: number, body: SlackBaseResponse | null): boolean {
  return status === 429 || (body?.ok === false && body.error === "ratelimited");
}

function interpretSlackResult<T extends SlackBaseResponse>(
  path: string,
  status: number,
  json: unknown
): T | string {
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

async function callSlack<T extends SlackBaseResponse>(
  callProxy: SlackProxyCaller,
  path: string,
  query?: Record<string, string | number>,
  requestBody?: unknown
): Promise<T | string> {
  const { status, json } = await callProxy(path, query, requestBody);
  return interpretSlackResult<T>(path, status, json);
}

function readString(raw: unknown): string {
  return typeof raw === "string" ? raw : "";
}

function clampLimit(raw: unknown, fallback: number, min: number, max: number): number {
  const num = typeof raw === "string" ? Number(raw) : raw;
  const safe = typeof num === "number" && Number.isFinite(num) ? num : fallback;
  return Math.min(max, Math.max(min, safe));
}

function makeGetAuthUserId(callProxy: SlackProxyCaller): () => Promise<string | null> {
  let cached: string | null | undefined;
  return async () => {
    if (cached === undefined) {
      const auth = await callSlack<SlackAuthTestResponse>(callProxy, "/auth.test");
      cached = typeof auth === "string" ? null : (auth.user_id ?? null);
    }
    return cached;
  };
}

interface SlackUsersDirectory {
  members: SlackUser[];
  byId: Map<string, SlackUser>;
  byHandle: Map<string, SlackUser>;
}

function displayNameForUser(user: SlackUser): string {
  return user.profile?.display_name || user.real_name || user.name || user.id;
}

function authorName(m: SlackMessage, directory: SlackUsersDirectory): string {
  const known = m.user ? directory.byId.get(m.user) : undefined;
  return (known && displayNameForUser(known)) || m.username || m.user || "";
}

const USER_MENTION_RE = /<@([UW][A-Z0-9]+)(?:\|([^>]+))?>/g;
const CHANNEL_MENTION_RE = /<#(C[A-Z0-9]+)(?:\|([^>]+))?>/g;

function humanizeSlackText(text: string, directory: SlackUsersDirectory): string {
  return text
    .replace(USER_MENTION_RE, (_match, id: string, handle: string | undefined) => {
      const known = directory.byId.get(id);
      return `@${(known && displayNameForUser(known)) || handle || id}`;
    })
    .replace(CHANNEL_MENTION_RE, (match, _id: string, name: string | undefined) =>
      name ? `#${name}` : match
    );
}

const MAX_USERS_PAGES = 10;

async function listAllUsers(callProxy: SlackProxyCaller): Promise<SlackUser[] | string> {
  const all: SlackUser[] = [];
  let cursor = "";
  for (let page = 0; page < MAX_USERS_PAGES; page++) {
    const query: Record<string, string | number> = { limit: 1000 };
    if (cursor) query.cursor = cursor;

    const res = await callSlack<SlackUsersListResponse>(callProxy, "/users.list", query);
    if (typeof res === "string") {
      if (page === 0) return res;
      break;
    }
    all.push(...(res.members ?? []));

    const next = res.response_metadata?.next_cursor;
    if (!next) break;
    cursor = next;
  }
  return all;
}

function makeGetUsersDirectory(callProxy: SlackProxyCaller): () => Promise<SlackUsersDirectory> {
  let cached: SlackUsersDirectory | undefined;
  return async () => {
    if (cached === undefined) {
      const res = await listAllUsers(callProxy);
      const members = (typeof res === "string" ? [] : res).filter((u) => !u.deleted);
      const byId = new Map<string, SlackUser>();
      const byHandle = new Map<string, SlackUser>();
      for (const user of members) {
        byId.set(user.id, user);
        if (user.name) byHandle.set(user.name.toLowerCase(), user);
      }
      cached = { members, byId, byHandle };
    }
    return cached;
  };
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
  const limit = clampLimit(args.limit, 1000, 1, 5000);
  const res = await listAllConversations(callProxy, "public_channel,private_channel");
  if (typeof res === "string") return res;
  return res.slice(0, limit).map((c) => ({
    id: c.id,
    name: c.name,
    is_private: c.is_private,
    num_members: c.num_members,
    topic: c.topic?.value,
    purpose: c.purpose?.value,
  }));
}

const MAX_DM_PROBES = 50;

interface SlackDmListing {
  direct_messages: Array<{ id: string; name: string }>;
  group_dms: Array<{ id: string; members: string }>;
}

async function openSlackDm(callProxy: SlackProxyCaller, userId: string): Promise<string | null> {
  const res = await callSlack<SlackConversationsOpenResponse>(
    callProxy,
    "/conversations.open",
    undefined,
    { users: userId }
  );
  if (typeof res === "string") return null;
  return res.channel?.id ?? null;
}

async function dmHasMessages(callProxy: SlackProxyCaller, channelId: string): Promise<boolean> {
  const { status, json } = await callProxy("/conversations.history", {
    channel: channelId,
    limit: 1,
  });
  const body = (json ?? null) as SlackConversationsHistoryResponse | null;
  if (isRateLimited(status, body)) return true;
  const res = interpretSlackResult<SlackConversationsHistoryResponse>(
    "/conversations.history",
    status,
    json
  );
  if (typeof res === "string") return true;
  return (res.messages ?? []).length > 0;
}

async function listSlackDms(
  callProxy: SlackProxyCaller,
  args: SlackListDmsArgs
): Promise<SlackDmListing | string> {
  const res = await listAllConversations(callProxy, "im,mpim");
  if (typeof res === "string") return res;

  const getAuthUserId = makeGetAuthUserId(callProxy);
  const getUsersDirectory = makeGetUsersDirectory(callProxy);
  const dmNameCache = new Map<string, string>();

  const buildListing = async (convs: SlackChannel[]): Promise<SlackDmListing> => {
    const listing: SlackDmListing = { direct_messages: [], group_dms: [] };
    for (const conv of convs) {
      if (conv.is_mpim) {
        const [directory, selfId] = await Promise.all([getUsersDirectory(), getAuthUserId()]);
        const members =
          groupDmMembers(conv.name, directory, selfId) ??
          formatGroupDmLabel(conv.name, directory, selfId);
        listing.group_dms.push({ id: conv.id, members });
        continue;
      }
      const name = await labelForChannel(
        callProxy,
        conv,
        dmNameCache,
        getAuthUserId,
        getUsersDirectory
      );
      listing.direct_messages.push({ id: conv.id, name });
    }
    return listing;
  };

  const withUserRef = (args.with_user ?? "").trim();
  if (withUserRef) {
    const targetId = await resolveSlackUserId(withUserRef, getAuthUserId, getUsersDirectory);
    if (!targetId) return `Error: couldn't find a Slack user matching "${withUserRef}".`;
    const directory = await getUsersDirectory();
    const targetHandle = directory.byId.get(targetId)?.name?.toLowerCase();
    const matches = res.filter((conv) => {
      if (conv.is_mpim) {
        return targetHandle
          ? parseMpdmHandles(conv.name).some((h) => h.toLowerCase() === targetHandle)
          : false;
      }
      return conv.user === targetId;
    });
    const targetLimit = clampLimit(args.limit, matches.length, 1, matches.length);
    const listing = await buildListing(matches.slice(0, targetLimit));

    if (listing.direct_messages.length === 0) {
      const openedId = await openSlackDm(callProxy, targetId);
      if (openedId) {
        const surface =
          listing.group_dms.length === 0 || (await dmHasMessages(callProxy, openedId));
        if (surface) {
          const counterparty = directory.byId.get(targetId);
          listing.direct_messages.push({
            id: openedId,
            name: counterparty ? displayNameForUser(counterparty) : targetId,
          });
        }
      }
    }
    return listing;
  }

  const limit = clampLimit(args.limit, 5, 1, MAX_DM_PROBES);

  if (res.length > MAX_DM_PROBES) return SLACK_PENDING_APPROVAL_NOTE;

  const withTs: Array<{ conv: SlackChannel; lastTs: number }> = [];
  const withoutTs: SlackChannel[] = [];
  for (const conv of res) {
    const { status, json } = await callProxy("/conversations.history", {
      channel: conv.id,
      limit: 1,
    });
    const body = (json ?? null) as SlackConversationsHistoryResponse | null;
    if (isRateLimited(status, body)) return SLACK_PENDING_APPROVAL_NOTE;
    if (status < 200 || status >= 300 || !body || body.ok === false) {
      withoutTs.push(conv);
      continue;
    }
    const messages = body.messages ?? [];
    if (messages.length === 0) continue;
    withTs.push({ conv, lastTs: Number(messages[0].ts) });
  }

  withTs.sort((a, b) => b.lastTs - a.lastTs);
  const ordered = [...withTs.map((x) => x.conv), ...withoutTs];

  return buildListing(ordered.slice(0, limit));
}

const MAX_SEARCH_CHANNELS = 8;
const SEARCH_HISTORY_LIMIT = 15;
const MAX_CONVERSATIONS_PAGES = 10;

async function listAllConversations(
  callProxy: SlackProxyCaller,
  types: string
): Promise<SlackChannel[] | string> {
  const all: SlackChannel[] = [];
  let cursor = "";
  for (let page = 0; page < MAX_CONVERSATIONS_PAGES; page++) {
    const query: Record<string, string | number> = {
      limit: 1000,
      exclude_archived: "true",
      types,
    };
    if (cursor) query.cursor = cursor;

    const res = await callSlack<SlackConversationsListResponse>(
      callProxy,
      "/conversations.list",
      query
    );
    if (typeof res === "string") {
      if (page === 0) return res;
      break;
    }
    all.push(...(res.channels ?? []));

    const next = res.response_metadata?.next_cursor;
    if (!next) break;
    cursor = next;
  }
  return all;
}

async function resolveChannelId(
  callProxy: SlackProxyCaller,
  ref: string
): Promise<{ id: string } | string> {
  const trimmed = ref.trim().replace(/^#/, "");
  if (SLACK_CHANNEL_ID_RE.test(trimmed)) return { id: trimmed };
  const channels = await listAllConversations(callProxy, "public_channel,private_channel");
  if (typeof channels === "string") return channels;
  const match = channels.find((c) => c.name?.toLowerCase() === trimmed.toLowerCase());
  if (!match) {
    return `Error: no Slack channel named "${ref}" in this workspace (checked the channels you're a member of).`;
  }
  return { id: match.id };
}

function interleaveChannelsAndDms(conversations: SlackChannel[]): SlackChannel[] {
  const channels = conversations.filter((c) => !c.is_im && !c.is_mpim);
  const dms = conversations.filter((c) => c.is_im || c.is_mpim);
  const interleaved: SlackChannel[] = [];
  for (let i = 0; i < Math.max(channels.length, dms.length); i++) {
    if (i < channels.length) interleaved.push(channels[i]);
    if (i < dms.length) interleaved.push(dms[i]);
  }
  return interleaved;
}

function messageMatchesQuery(text: string, terms: string[]): boolean {
  if (terms.length === 0) return false;
  const haystack = text.toLowerCase();
  return terms.every((term) => haystack.includes(term));
}

const MAX_GROUP_DM_NAMES = 5;
const MPDM_NAME_RE = /^mpdm-(.+)-\d+$/;

function parseMpdmHandles(mpimName: string | undefined): string[] {
  if (!mpimName) return [];
  const match = MPDM_NAME_RE.exec(mpimName);
  return match ? match[1].split("--") : [];
}

function groupDmMembers(
  mpimName: string | undefined,
  directory: SlackUsersDirectory,
  selfId: string | null
): string | null {
  const handles = parseMpdmHandles(mpimName);
  if (handles.length === 0) return null;

  const selfHandle = selfId ? directory.byId.get(selfId)?.name?.toLowerCase() : undefined;
  const names: string[] = [];
  for (const handle of handles) {
    const key = handle.toLowerCase();
    if (selfHandle && key === selfHandle) continue;
    const member = directory.byHandle.get(key);
    names.push(member ? displayNameForUser(member) : handle);
  }
  if (names.length === 0) return null;

  const shown = names.slice(0, MAX_GROUP_DM_NAMES);
  const extra = names.length - shown.length;
  return `${shown.join(", ")}${extra > 0 ? `, +${extra} more` : ""}`;
}

function formatGroupDmLabel(
  mpimName: string | undefined,
  directory: SlackUsersDirectory,
  selfId: string | null
): string {
  if (!mpimName) return "Group DM";
  if (parseMpdmHandles(mpimName).length === 0) return mpimName;
  const members = groupDmMembers(mpimName, directory, selfId);
  return members === null ? "Group DM" : `Group DM with ${members}`;
}

async function labelForChannel(
  callProxy: SlackProxyCaller,
  channel: SlackChannel,
  dmNameCache: Map<string, string>,
  getAuthUserId: () => Promise<string | null>,
  getUsersDirectory: () => Promise<SlackUsersDirectory>
): Promise<string> {
  if (channel.is_mpim) {
    const [directory, selfId] = await Promise.all([getUsersDirectory(), getAuthUserId()]);
    return formatGroupDmLabel(channel.name, directory, selfId);
  }
  if (!channel.is_im) return channel.name ?? channel.id;

  const otherId = channel.user;
  if (!otherId) return channel.id;

  const authUserId = await getAuthUserId();
  if (authUserId && otherId === authUserId) return "Direct message";

  const cached = dmNameCache.get(otherId);
  if (cached) return `DM with ${cached}`;

  const directory = await getUsersDirectory();
  const known = directory.byId.get(otherId);
  if (known) {
    const name = displayNameForUser(known);
    dmNameCache.set(otherId, name);
    return `DM with ${name}`;
  }

  const info = await callSlack<SlackUsersInfoResponse>(callProxy, "/users.info", { user: otherId });
  if (typeof info === "string" || !info.user) return channel.id;
  const name = info.user.profile?.display_name || info.user.real_name || info.user.name || otherId;
  dmNameCache.set(otherId, name);
  return `DM with ${name}`;
}

const SLACK_USER_ID_RE = /^[UW][A-Z0-9]{6,}$/;
const SLACK_CHANNEL_ID_RE = /^[CDG][A-Z0-9]{6,}$/;
const SELF_REFS = new Set(["me", "myself", "self", "i"]);

async function resolveSlackUserId(
  ref: string,
  getAuthUserId: () => Promise<string | null>,
  getUsersDirectory: () => Promise<SlackUsersDirectory>
): Promise<string | null> {
  const trimmed = ref.trim();
  if (!trimmed) return null;
  if (SELF_REFS.has(trimmed.toLowerCase())) return getAuthUserId();
  if (SLACK_USER_ID_RE.test(trimmed)) return trimmed;

  const needle = trimmed.replace(/^@/, "").toLowerCase();
  if (!needle) return null;

  const { members } = await getUsersDirectory();
  const fieldsOf = (u: SlackUser): string[] =>
    [u.name, u.real_name, u.profile?.display_name].filter((f): f is string => Boolean(f));
  const matching = (pred: (field: string) => boolean): SlackUser[] =>
    members.filter((u) => fieldsOf(u).some((f) => pred(f.toLowerCase())));

  const exact = matching((f) => f === needle);
  if (exact.length === 1) return exact[0].id;
  if (exact.length > 1) return null;

  const partial = matching((f) => f.includes(needle));
  return partial.length === 1 ? partial[0].id : null;
}

async function searchSlackMessages(
  callProxy: SlackProxyCaller,
  args: SlackSearchMessagesArgs
): Promise<Array<Record<string, unknown>> | string> {
  const query = (args.query ?? "").trim();
  const fromUserRef = (args.from_user ?? "").trim();
  const mentionsRef = (args.mentions ?? "").trim();
  if (!query && !fromUserRef && !mentionsRef) {
    return "Error: provide a query, from_user, or mentions to search Slack messages.";
  }

  const count = clampLimit(args.count, 20, 1, 100);
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);

  const getAuthUserId = makeGetAuthUserId(callProxy);
  const getUsersDirectory = makeGetUsersDirectory(callProxy);

  let fromId: string | null = null;
  if (fromUserRef) {
    fromId = await resolveSlackUserId(fromUserRef, getAuthUserId, getUsersDirectory);
    if (!fromId)
      return `Error: couldn't find a Slack user matching "${fromUserRef}" for from_user.`;
  }
  let mentionId: string | null = null;
  if (mentionsRef) {
    mentionId = await resolveSlackUserId(mentionsRef, getAuthUserId, getUsersDirectory);
    if (!mentionId) {
      return `Error: couldn't find a Slack user matching "${mentionsRef}" for mentions.`;
    }
  }

  const passes = (m: SlackMessage): boolean => {
    const text = m.text ?? "";
    if (terms.length > 0 && !messageMatchesQuery(text, terms)) return false;
    if (fromId && m.user !== fromId) return false;
    if (mentionId && !text.includes("<@" + mentionId)) return false;
    return true;
  };

  const listRes = await listAllConversations(callProxy, "public_channel,private_channel,im,mpim");
  if (typeof listRes === "string") return listRes;
  const allChannels = listRes;

  let targets: SlackChannel[];
  if (args.channel) {
    const raw = args.channel.trim();
    const bare = raw.replace(/^#/, "");
    const found = allChannels.find(
      (c) => c.id === raw || c.name?.toLowerCase() === bare.toLowerCase()
    );
    if (found) {
      targets = [found];
    } else if (SLACK_CHANNEL_ID_RE.test(bare)) {
      targets = [{ id: bare, name: bare }];
    } else {
      return `Error: no Slack channel named "${args.channel}" in this workspace.`;
    }
  } else {
    targets = interleaveChannelsAndDms(allChannels).slice(0, MAX_SEARCH_CHANNELS);
  }

  const dmNameCache = new Map<string, string>();

  const results: Array<Record<string, unknown>> = [];
  let rateLimited = false;
  for (const channel of targets) {
    const { status, json } = await callProxy("/conversations.history", {
      channel: channel.id,
      limit: SEARCH_HISTORY_LIMIT,
    });
    const body = (json ?? null) as SlackConversationsHistoryResponse | null;

    if (isRateLimited(status, body)) {
      rateLimited = true;
      break;
    }
    const connectorError = maybeConnectorError(status, body);
    if (connectorError) return connectorError;
    if (status < 200 || status >= 300 || !body || body.ok === false) continue;

    const matched = (body.messages ?? []).filter(passes);
    if (matched.length === 0) continue;

    const label = await labelForChannel(
      callProxy,
      channel,
      dmNameCache,
      getAuthUserId,
      getUsersDirectory
    );
    const directory = await getUsersDirectory();
    for (const m of matched) {
      results.push({
        text: humanizeSlackText(m.text ?? "", directory),
        user: authorName(m, directory),
        ts: m.ts,
        channel: label,
      });
    }
  }

  results.sort((a, b) => Number(b.ts) - Number(a.ts));
  const sliced = results.slice(0, count);

  if (rateLimited) {
    sliced.push({ note: SLACK_PENDING_APPROVAL_NOTE });
  }
  return sliced;
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
  const resolved = await resolveChannelId(callProxy, args.channel);
  if (typeof resolved === "string") return resolved;
  const { status, json } = await callProxy("/conversations.history", {
    channel: resolved.id,
    limit,
  });
  const body = (json ?? null) as SlackConversationsHistoryResponse | null;
  if (isRateLimited(status, body)) return SLACK_PENDING_APPROVAL_NOTE;
  const res = interpretSlackResult<SlackConversationsHistoryResponse>(
    "/conversations.history",
    status,
    json
  );
  if (typeof res === "string") return res;
  const directory = await makeGetUsersDirectory(callProxy)();
  return (res.messages ?? []).map((m) => ({
    text: humanizeSlackText(m.text ?? "", directory),
    user: authorName(m, directory),
    ts: m.ts,
  }));
}

async function getSlackThreadReplies(
  callProxy: SlackProxyCaller,
  args: SlackGetThreadRepliesArgs
): Promise<Array<Record<string, unknown>> | string> {
  const limit = clampLimit(args.limit, 20, 1, 100);
  const { status, json } = await callProxy("/conversations.replies", {
    channel: args.channel,
    ts: args.ts,
    limit,
  });
  const body = (json ?? null) as SlackConversationsHistoryResponse | null;
  if (isRateLimited(status, body)) return SLACK_PENDING_APPROVAL_NOTE;
  const res = interpretSlackResult<SlackConversationsHistoryResponse>(
    "/conversations.replies",
    status,
    json
  );
  if (typeof res === "string") return res;
  const directory = await makeGetUsersDirectory(callProxy)();
  return (res.messages ?? []).map((m) => ({
    text: humanizeSlackText(m.text ?? "", directory),
    user: authorName(m, directory),
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
            description: "Max channels to return. Between 1 and 5000 (clamped). Defaults to 1000.",
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
        "Search recent messages across the user's Slack channels and direct messages, or within a single channel when 'channel' is given. Filter by any combination of 'query' (words the text must contain), 'from_user' (the author), and 'mentions' (who the message @-mentions) -- at least one is required. Only recent history is scanned (a bounded set of conversations), so this surfaces recent messages rather than the full archive. Use this to find messages by KEYWORD or TOPIC across conversations. Do NOT use it to read the latest/last message from a specific person or channel, or to read a specific conversation you already know: for the last message from a person, call slack_list_dms with with_user to get the DM id then slack_get_channel_history on it; for a channel, call slack_get_channel_history directly. Search fans out across many conversations and is heavily rate-limited, so a single targeted read is faster and more reliable.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description:
              "Optional. Words to look for; a message matches when its text contains all of them (case-insensitive). Provide this, from_user, or mentions.",
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
          from_user: {
            type: "string",
            description:
              "Optional. The message author to filter by, as a Slack user id or a name/handle.",
          },
          mentions: {
            type: "string",
            description:
              'Optional. Keep only messages that @-mention this person, as a user id, a name/handle, or "me" for yourself.',
          },
        },
        required: [],
      },
    },
    executor: async (args: Record<string, unknown>) =>
      searchSlackMessages(callProxy, {
        query: readString(args.query),
        count: args.count as number | undefined,
        channel: typeof args.channel === "string" ? args.channel : undefined,
        from_user: typeof args.from_user === "string" ? args.from_user : undefined,
        mentions: typeof args.mentions === "string" ? args.mentions : undefined,
      }),
  };
}

function createSlackListDmsTool(callProxy: SlackProxyCaller): ToolConfig {
  return {
    type: "function",
    function: {
      name: "slack_list_dms",
      description:
        "List the user's Slack direct messages and group DMs, or find the DM with a specific person. Returns two separate lists: 'direct_messages' (1:1 conversations, each with 'name' = the other person) and 'group_dms' (group conversations, each with 'members' = the member names). When showing these to the user, present them as TWO separate bulleted lists -- a 'Direct messages' list (by the other person's name) and a 'Group DMs' list (by the member names) -- by name only, and never show the conversation ids. To show or read the conversation with one person, call this with with_user=<name or id> to get that conversation's id, then call slack_get_channel_history with that id to read the messages. For the latest message or recent messages from a specific person, the flow is: call this with with_user, take the returned id, then call slack_get_channel_history on it (use limit: 1 for just the last message). Do NOT use slack_search_messages to find a person's DM conversation or to read their latest message -- use with_user here instead. Listing all DMs (no with_user) returns the 5 MOST RECENT by default (most recent first, like the Slack sidebar, with empty conversations excluded), split across 'direct_messages' and 'group_dms'; pass a larger 'limit' to get more. The conversation id is only for passing to slack_get_channel_history to read a conversation.",
      parameters: {
        type: "object",
        properties: {
          limit: {
            type: "number",
            description: "Max DMs to return, default 5, up to 50.",
          },
          with_user: {
            type: "string",
            description:
              "Optional. Return only the DM(s) with this person, as a Slack user id or a name/handle. Use this to find and read the DM with a specific person. Works even for a DM that isn't currently open -- it will open/resume the conversation to read it.",
          },
        },
        required: [],
      },
    },
    executor: async (args: Record<string, unknown>) =>
      listSlackDms(callProxy, {
        limit: args.limit as number | undefined,
        with_user: typeof args.with_user === "string" ? args.with_user : undefined,
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
        "Fetch recent messages from a single Slack channel by id. Best-effort and heavily rate-limited (~1 request per minute for the app), so use it sparingly for a specific channel. This is the right tool to read the most recent messages (including just the latest one with limit: 1) from a known channel or DM id, and should be PREFERRED over slack_search_messages whenever the conversation to read is already known or identified.",
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
    slack_list_dms: createSlackListDmsTool(callProxy),
    slack_search_messages: createSlackSearchMessagesTool(callProxy),
    slack_list_users: createSlackListUsersTool(callProxy),
    slack_get_channel_history: createSlackGetChannelHistoryTool(callProxy),
    slack_get_thread_replies: createSlackGetThreadRepliesTool(callProxy),
    slack_post_message: createSlackPostMessageTool(callProxy),
  };
}
