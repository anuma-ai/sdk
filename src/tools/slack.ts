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
 * - `slack_list_dms`            -- the user's direct messages + group DMs
 * - `slack_search_messages`     -- search recent messages by text/author/mention
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
  /** Cursor-based paging: the next page's cursor, empty/absent on the last page. */
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
  /** Direct message (1:1). Has `user` (the other party) instead of a name. */
  is_im?: boolean;
  /** Group direct message. Carries an unfriendly `mpdm-…` name. */
  is_mpim?: boolean;
  /** For an `im`, the id of the other party in the conversation. */
  user?: string;
}

interface SlackConversationsListResponse extends SlackBaseResponse {
  channels?: SlackChannel[];
  /** Cursor-based paging: the next page's cursor, empty/absent on the last page. */
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
 * A Slack read hit the ~1/min history/replies throttle -- either an HTTP 429 or a
 * 200 carrying `ok:false` + `ratelimited`. Callers turn this into the
 * {@link SLACK_PENDING_APPROVAL_NOTE} rather than surfacing partial/approximate data.
 */
function isRateLimited(status: number, body: SlackBaseResponse | null): boolean {
  return status === 429 || (body?.ok === false && body.error === "ratelimited");
}

/**
 * Interpret an already-fetched Slack proxy result: the parsed body on success, or
 * a connector error / generic failure string on any failure path (bad HTTP status,
 * or `ok:false`). Split out from {@link callSlack} so tools that inspect the raw
 * `{ status, json }` first (e.g. for a rate-limit check) can reuse the exact same
 * auth-vs-generic-error decision without a second proxy call.
 */
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
  return interpretSlackResult<T>(path, status, json);
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

/**
 * Build a lazy resolver for the authenticated user's id. auth.test is hit at
 * most once per call and the result (or null on failure) is memoized, so DM
 * self-detection and a `mentions: "me"` filter can share a single lookup without
 * refetching. Never throws — an auth failure resolves to null.
 */
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

/**
 * A workspace user directory built from a single `users.list` fetch and shared
 * across a tool call. `members` is the non-deleted set (for name/handle matching
 * in {@link resolveSlackUserId}); `byId` and `byHandle` give O(1) lookups for DM
 * label resolution without a per-DM `users.info` call. `byHandle` is keyed by the
 * lowercased Slack `name` (the handle Slack encodes into `mpdm-…` group-DM names).
 */
interface SlackUsersDirectory {
  members: SlackUser[];
  byId: Map<string, SlackUser>;
  byHandle: Map<string, SlackUser>;
}

/** The name we show for a member: display name, then real name, then handle, then id. */
function displayNameForUser(user: SlackUser): string {
  return user.profile?.display_name || user.real_name || user.name || user.id;
}

/** Hard ceiling on users.list pages we'll follow — mirrors MAX_CONVERSATIONS_PAGES. */
const MAX_USERS_PAGES = 10;

/**
 * Fetch every workspace member by following Slack's cursor pagination, mirroring
 * {@link listAllConversations}: a first-page failure is fatal (propagate the
 * error string), a later-page failure stops paging and returns what we gathered.
 * The portal proxy allowlist covers `users.list` but NOT `conversations.members`,
 * so this is the only way to name a group DM's members.
 */
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

/**
 * Build a lazy resolver for the workspace user directory. users.list is fetched
 * (paginated) at most once per call and memoized, so a search that resolves
 * `from_user`/`mentions` AND labels its matched DMs pays a single users.list.
 * Never throws — a fetch failure resolves to an empty directory so callers
 * degrade to their id/handle fallbacks rather than failing the whole tool.
 */
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

/**
 * Correctness bound on how many DMs we'll recency-probe: each costs one
 * conversations.history call against the ~1/min throttle, so beyond this we can't
 * order the set within the pre-approval limit and return the pending-approval note
 * instead of a partial order.
 */
const MAX_DM_PROBES = 50;

/**
 * The split shape {@link listSlackDms} returns on success: 1:1 DMs and group DMs
 * as two separate lists (rather than one flat array mixing them), so the model can
 * present them as two distinct lists by name. Each entry keeps its conversation
 * `id` for a follow-up `slack_get_channel_history` read, but the id is not meant
 * to be shown to the user (the tool description says so).
 */
interface SlackDmListing {
  /** 1:1 DMs. `name` is the counterparty label ("DM with <name>", or "Direct message" for a self-DM). */
  direct_messages: Array<{ id: string; name: string }>;
  /** Group DMs. `members` is the comma-joined member names (self excluded), no "Group DM with" prefix. */
  group_dms: Array<{ id: string; members: string }>;
}

/**
 * List the user's direct messages and group DMs, split into two lists: `direct_messages`
 * (1:1s, each with the counterparty name) and `group_dms` (each with its member names),
 * ordered like the Slack sidebar (most-recent conversation first) with conversations
 * that have no messages dropped. `slack_list_channels` excludes `im`/`mpim`, so without
 * this there's no way to answer "list my DMs" or to get a DM's id to pass to
 * `slack_get_channel_history`. Reuses the paginating `listAllConversations`, the shared
 * `labelForChannel` resolution for 1:1 names, and {@link groupDmMembers} for group-DM
 * member names. The users directory is built once up front, so listing N DMs costs a
 * single (paginated) users.list rather than N `users.info` calls. Name resolution is
 * best-effort and never throws — it falls back to the id.
 *
 * `with_user` is a targeted lookup, so it takes a different path from listing all
 * DMs. It resolves the ref (id or name) to a user id via the shared directory, then
 * keeps a 1:1 whose counterparty is that user and a group DM whose `mpdm-…` members
 * include that user's handle, splits those matches into the two lists, and returns
 * them directly. It makes NO `conversations.history` calls — no recency probing, no
 * empty-DM drop, no throttle path — so a targeted DM is always returned (letting the
 * model then read it), even one with no messages in the readable window (a person who
 * is only in a group DM yields `direct_messages: []` plus that group). An unresolvable
 * ref returns an error naming the person rather than every DM. A targeted lookup is NOT
 * capped to the list-all default: it returns all matches, honoring an explicit `limit`
 * only when the model passes one.
 *
 * Listing all DMs (no `with_user`) instead orders like the Slack sidebar and hides
 * empty conversations. `conversations.list` carries no last-message timestamp, so
 * each DM's latest message is read via a `limit: 1` `conversations.history` probe.
 * That endpoint is throttled (~1/min) while the app awaits Marketplace approval, so
 * rather than return a partial/approximate order we bail to {@link SLACK_PENDING_APPROVAL_NOTE}
 * (returned as the string result) in two cases: there are more DMs to probe than
 * `MAX_DM_PROBES` (can't order that many under the limit), or any probe comes back
 * rate-limited (429 / `ratelimited`). A probe that returns zero messages marks the
 * DM empty -> drop it; a non-rate-limit probe failure leaves recency unknown -> keep
 * it, ordered after the DMs we could place. `limit` defaults to 5 (the 5 most recent)
 * and is capped at `MAX_DM_PROBES`; it bounds the total DM count after the recency sort
 * and empty-drop, applied before the split into the two lists.
 */
async function listSlackDms(
  callProxy: SlackProxyCaller,
  args: SlackListDmsArgs
): Promise<SlackDmListing | string> {
  const res = await listAllConversations(callProxy, "im,mpim");
  if (typeof res === "string") return res;

  const getAuthUserId = makeGetAuthUserId(callProxy);
  const getUsersDirectory = makeGetUsersDirectory(callProxy);
  const dmNameCache = new Map<string, string>();

  // Split into the two lists, preserving the input (recency) order within each.
  // Resolve names sequentially (not in parallel): the first lookup warms the
  // memoized users directory, so listing N DMs costs one users.list rather than N
  // racing fetches.
  const buildListing = async (convs: SlackChannel[]): Promise<SlackDmListing> => {
    const listing: SlackDmListing = { direct_messages: [], group_dms: [] };
    for (const conv of convs) {
      if (conv.is_mpim) {
        const [directory, selfId] = await Promise.all([getUsersDirectory(), getAuthUserId()]);
        // Fall back to the full label ("release-crew" for a real group name,
        // "Group DM" when only self resolves) when there are no parseable members.
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

  // Targeted lookup: return the person's DM(s) directly, no history probing. A
  // targeted DM must never be dropped for being empty -- the model can read it.
  const withUserRef = (args.with_user ?? "").trim();
  if (withUserRef) {
    const targetId = await resolveSlackUserId(withUserRef, getAuthUserId, getUsersDirectory);
    if (!targetId) return `Error: couldn't find a Slack user matching "${withUserRef}".`;
    const targetHandle = (await getUsersDirectory()).byId.get(targetId)?.name?.toLowerCase();
    const matches = res.filter((conv) => {
      if (conv.is_mpim) {
        return targetHandle
          ? parseMpdmHandles(conv.name).some((h) => h.toLowerCase() === targetHandle)
          : false;
      }
      return conv.user === targetId;
    });
    // A targeted lookup returns every DM with that person -- it is NOT capped to
    // the list-all default. Only apply a cap when the model passes an explicit limit.
    const targetLimit = clampLimit(args.limit, matches.length, 1, matches.length);
    return buildListing(matches.slice(0, targetLimit));
  }

  // Listing all DMs defaults to the 5 most recent; the model raises `limit` to get
  // more. The max is MAX_DM_PROBES -- we can't rank more DMs than we can probe.
  const limit = clampLimit(args.limit, 5, 1, MAX_DM_PROBES);

  // More DMs than we can probe under the ~1/min throttle -> we can't order them,
  // so surface the pending-approval message instead of a partial order.
  if (res.length > MAX_DM_PROBES) return SLACK_PENDING_APPROVAL_NOTE;

  // Probe each DM's latest message to order by recency and drop empty DMs.
  const withTs: Array<{ conv: SlackChannel; lastTs: number }> = [];
  const withoutTs: SlackChannel[] = [];
  for (const conv of res) {
    const { status, json } = await callProxy("/conversations.history", {
      channel: conv.id,
      limit: 1,
    });
    const body = (json ?? null) as SlackConversationsHistoryResponse | null;
    // A rate-limited probe means we can't order reliably -- bail to the pending
    // message rather than return a partial order.
    if (isRateLimited(status, body)) return SLACK_PENDING_APPROVAL_NOTE;
    // A non-rate-limit probe failure leaves recency unknown -- keep the DM but sort
    // it after the placed ones. Only a confirmed-empty DM is dropped.
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

  // Apply the limit to the total DM count before splitting into the two lists.
  return buildListing(ordered.slice(0, limit));
}

/** Conversations scanned in a workspace-wide search when no channel is given. */
const MAX_SEARCH_CHANNELS = 8;
/** Recent messages pulled per channel — kept small since history is rate-limited. */
const SEARCH_HISTORY_LIMIT = 15;
/**
 * Hard ceiling on conversations.list pages we'll follow. Bounds a runaway cursor
 * — 10 pages × 1000 conversations = 10k, well past any real workspace.
 */
const MAX_CONVERSATIONS_PAGES = 10;

/**
 * Fetch every conversation of the given `types` by following Slack's cursor
 * pagination. conversations.list returns one page (default 100) and hands back a
 * `next_cursor`; without walking it, workspaces with more than a page of channels
 * hide the rest — so name resolution ("summarize anuma-all") fails for any
 * channel past page 1. conversations.list is NOT in the punitive ~1 req/min tier
 * (only history/replies are), so paging through it in full is safe.
 *
 * Error handling mirrors best-effort reads: a failure on the FIRST page is fatal
 * (it's the auth/connector error — propagate the string). A failure on a LATER
 * page stops paging and returns whatever we've gathered, so a hiccup deep in a
 * large workspace degrades to a partial list rather than failing the whole call.
 */
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

/**
 * conversations.list returns public/private channels BEFORE DMs, so a naive
 * `slice(0, cap)` in any workspace with more than `cap` channels never reaches
 * the trailing `im`/`mpim` entries — DMs would silently drop out of search.
 * Partition into channels vs DMs and interleave them round-robin (channel, dm,
 * channel, dm, … then the remainder of whichever list is longer) so both are
 * represented once the caller slices down to the cap. A conversation with
 * neither `is_im` nor `is_mpim` is a regular channel.
 */
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

/**
 * Split a query into lowercased terms. A message matches when its text contains
 * every term as a substring (AND semantics), case-insensitive.
 */
function messageMatchesQuery(text: string, terms: string[]): boolean {
  if (terms.length === 0) return false;
  const haystack = text.toLowerCase();
  return terms.every((term) => haystack.includes(term));
}

/** Max member names shown in a group-DM label before the rest collapse to "+N more". */
const MAX_GROUP_DM_NAMES = 5;
/** Slack encodes a group DM's member handles into its name: `mpdm-<h1>--<h2>--…-1`. */
const MPDM_NAME_RE = /^mpdm-(.+)-\d+$/;

/**
 * Pull the member handles Slack packs into a group DM's `mpdm-<h1>--<h2>--…-1`
 * name, in order. Returns [] for an absent name or a real (non-`mpdm`) group name.
 * The single parser shared by {@link formatGroupDmLabel} and the `with_user`
 * filter, so both read the name the same way.
 */
function parseMpdmHandles(mpimName: string | undefined): string[] {
  if (!mpimName) return [];
  const match = MPDM_NAME_RE.exec(mpimName);
  return match ? match[1].split("--") : [];
}

/**
 * The comma-joined member display names of a group DM (e.g. "Alice, Bob, Carol",
 * with the rest collapsed to "+N more"), self excluded. Slack packs the members'
 * handles into the `mpdm-…` name (there's no allowlisted `conversations.members`
 * to call), so we split them out, map each handle → display name (falling back to
 * the raw handle when unmapped), and drop the authed user's own handle. Returns
 * null when there are no member names to show: an absent name, a real non-`mpdm`
 * group name, or a membership that resolves to only the authed user. This is the
 * shared piece behind both {@link formatGroupDmLabel} and the `group_dms` output
 * of {@link listSlackDms}, so the two read the member set the same way. Never throws.
 */
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

/**
 * Turn a group DM's `mpdm-…` name into a readable "Group DM with A, B, C" label
 * using the users directory. Delegates the member-name resolution to
 * {@link groupDmMembers}. A non-`mpdm` name (a real group name) is returned as-is;
 * an absent name (or one that resolves to only the authed user) yields "Group DM".
 * Never throws.
 */
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

/**
 * Best-effort, human-readable label for a conversation, used as the `channel`
 * field on results and the `name` on listed DMs. Regular channels use their name;
 * DMs have no useful name, so:
 *  - `im` (1:1): resolve the other party via the users directory first (→ "DM
 *    with <name>"), falling back to a `users.info` lookup only when the id isn't
 *    in the directory; if the other party is the authed user, "Direct message".
 *  - `mpim` (group DM): {@link formatGroupDmLabel} names the members.
 * Directory-backed resolution means listing/searching DMs pays one users.list
 * instead of a `users.info` per DM; `users.info` fallbacks are de-duped via
 * `dmNameCache`. Never throws — any failure falls back to the conversation id.
 */
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

/** A Slack user id: `U…` for people, `W…` for Enterprise Grid accounts. */
const SLACK_USER_ID_RE = /^[UW][A-Z0-9]{6,}$/;
/** References the model uses for the authenticated user. */
const SELF_REFS = new Set(["me", "myself", "self", "i"]);

/**
 * Resolve a model-supplied person reference to a Slack user id, best-effort.
 * Accepts "me"/"self"/etc. (→ the authed user), a bare id (returned as-is), or a
 * name/handle matched against the shared users directory (a single memoized
 * users.list, also used for DM labels). Matching is case-insensitive across
 * `name`/`real_name`/`display_name`: an exact match wins; otherwise a unique
 * substring match is used. Returns null when nothing matches or the match is
 * ambiguous. Never throws — a users.list failure resolves to null.
 */
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

/**
 * Text-search recent Slack messages without the (Marketplace-forbidden)
 * server-side message-search API. Reads recent `conversations.history` — a single channel
 * when `args.channel` is set, otherwise a bounded fan-out across the user's
 * channels and direct messages — and keeps messages that satisfy every supplied
 * filter: `query` words (all must appear in the text), `from_user` (author), and
 * `mentions` (an `<@Uid>` token in the text). At least one filter is required.
 * `from_user`/`mentions` accept an id or a name; `mentions` also accepts "me".
 *
 * conversations.history is throttled to ~1 req/min for distributed apps, so if a
 * history call comes back rate-limited (HTTP 429 or `ok:false` + `ratelimited`)
 * we stop scanning and return what we have. Matches from every scanned channel
 * are collected, then sorted newest-first by `ts` and sliced to `count`, so the
 * most recent hits survive rather than being evicted by channel scan order.
 * Return-shape choice: the contract stays `{text,user,ts,channel}[]`; the matches
 * found so far are real data so we keep them, and on a rate-limit cutoff we append
 * ONE final synthetic `{ note }` item ({@link SLACK_PENDING_APPROVAL_NOTE}) AFTER
 * slicing, so the model can relay the pending-approval limitation without switching
 * to an object shape that downstream consumers don't expect.
 */
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

  // Shared across the two person filters AND DM label resolution, so auth.test /
  // users.list are each fetched at most once per search.
  const getAuthUserId = makeGetAuthUserId(callProxy);
  const getUsersDirectory = makeGetUsersDirectory(callProxy);

  // A filter that was asked for but can't be resolved is surfaced (not silently
  // dropped) so the model can relay who it couldn't find rather than returning
  // every message.
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
    // Prefix match covers both `<@U123>` and `<@U123|handle>`.
    if (mentionId && !text.includes("<@" + mentionId)) return false;
    return true;
  };

  // conversations.list (not throttled) gives us the fan-out set and the labels
  // for results. `im`/`mpim` types pull DMs into scope so their content is
  // searchable too. Auth failures surface as the canonical connector error.
  const listRes = await listAllConversations(callProxy, "public_channel,private_channel,im,mpim");
  if (typeof listRes === "string") return listRes;
  const allChannels = listRes;

  let targets: SlackChannel[];
  if (args.channel) {
    const found = allChannels.find((c) => c.id === args.channel || c.name === args.channel);
    targets = [found ?? { id: args.channel, name: args.channel }];
  } else {
    targets = interleaveChannelsAndDms(allChannels).slice(0, MAX_SEARCH_CHANNELS);
  }

  const dmNameCache = new Map<string, string>();

  // Collect matches from ALL scanned channels (no per-channel cutoff) so the
  // recency sort below sees every hit before we truncate to `count`.
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
    // Auth/scope failures are fatal — surface the canonical connector error.
    const connectorError = maybeConnectorError(status, body);
    if (connectorError) return connectorError;
    // Any other per-channel failure (e.g. not_in_channel) just skips that channel.
    if (status < 200 || status >= 300 || !body || body.ok === false) continue;

    const matched = (body.messages ?? []).filter(passes);
    if (matched.length === 0) continue;

    // Resolve the label once per matched channel (lazy for DMs).
    const label = await labelForChannel(
      callProxy,
      channel,
      dmNameCache,
      getAuthUserId,
      getUsersDirectory
    );
    for (const m of matched) {
      results.push({ text: m.text, user: m.username ?? m.user, ts: m.ts, channel: label });
    }
  }

  // Newest first, then truncate — so the most recent match is never evicted by a
  // channel that happened to be scanned earlier.
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
  const { status, json } = await callProxy("/conversations.history", {
    channel: args.channel,
    limit,
  });
  const body = (json ?? null) as SlackConversationsHistoryResponse | null;
  // conversations.history is throttled to ~1/min pre-approval; tell the user
  // plainly instead of surfacing the raw `ratelimited` error.
  if (isRateLimited(status, body)) return SLACK_PENDING_APPROVAL_NOTE;
  const res = interpretSlackResult<SlackConversationsHistoryResponse>(
    "/conversations.history",
    status,
    json
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
  const { status, json } = await callProxy("/conversations.replies", {
    channel: args.channel,
    ts: args.ts,
    limit,
  });
  const body = (json ?? null) as SlackConversationsHistoryResponse | null;
  // Same ~1/min throttle as channel history -- surface the pending-approval message.
  if (isRateLimited(status, body)) return SLACK_PENDING_APPROVAL_NOTE;
  const res = interpretSlackResult<SlackConversationsHistoryResponse>(
    "/conversations.replies",
    status,
    json
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
              "Optional. Return only the DM(s) with this person, as a Slack user id or a name/handle. Use this to find and read the DM with a specific person.",
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
