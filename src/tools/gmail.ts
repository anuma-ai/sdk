/**
 * Gmail tool factory for the chat system.
 *
 * Mirrors the shape of {@link "./googleDrive".createDriveTools}: the caller
 * supplies a token getter and an interactive `requestAccess` fallback,
 * and the factory returns a record of `ToolConfig` entries the chat loop
 * can run. The token getter is expected to be one returned by
 * `createConnectorTokenGetter`, but any `() => Promise<string | null>`
 * compatible function works.
 *
 * Tool catalogue (matches portal scope `connector:gmail:*`):
 * - `gmail_search_messages` — list message IDs + snippets matching a query
 * - `gmail_get_message`     — fetch headers + plaintext body for a single message
 * - `gmail_send_message`    — send a message via the user's mailbox
 *
 * Error contract: when the upstream Gmail API or the portal mint endpoint
 * signals a connector-level failure (412 missing connector, 412 scope not
 * covered, 401 token unusable), the tool returns the canonical
 * `__anuma_connector_error_v1` JSON shape produced by
 * `buildConnectorErrorResult`. The agent-runtime post-loop parser lifts
 * these into `AgentResponse.toolErrors`. Tool executors never throw on
 * these paths — the LLM is expected to surface the connect URL to the user.
 */

import type { ToolConfig } from "../lib/chat/useChat/types.js";
import { buildConnectorErrorResult, type ConnectorMintError } from "../lib/connectors/index.js";

const GMAIL_PROVIDER = "gmail";

/** Async getter returned by `createConnectorTokenGetter`. */
export type GmailTokenGetter = () => Promise<string | null>;
/**
 * Fallback used when no token is currently available. Server agents pass an
 * implementation that throws (no interactive OAuth is possible). Browser
 * surfaces pass a function that drives the connect flow and resolves with a
 * fresh token (or `null` if the user declined).
 */
export type GmailRequestAccess = () => Promise<string | null>;

export interface GmailSearchArgs {
  query: string;
  maxResults?: number;
}

export interface GmailGetMessageArgs {
  messageId: string;
  format?: "metadata" | "full";
}

export interface GmailSendMessageArgs {
  to: string;
  subject: string;
  body: string;
  cc?: string;
  bcc?: string;
}

export interface GmailMessageSummary {
  id: string;
  threadId: string;
  snippet?: string;
}

export interface GmailMessageDetail {
  id: string;
  threadId: string;
  from?: string;
  to?: string;
  subject?: string;
  date?: string;
  snippet?: string;
  body?: string;
}

interface GmailListResponse {
  messages?: { id: string; threadId: string }[];
  resultSizeEstimate?: number;
  error?: { code?: number; message?: string };
}

interface GmailHeader {
  name: string;
  value: string;
}

interface GmailMessagePart {
  mimeType?: string;
  headers?: GmailHeader[];
  body?: { data?: string; size?: number };
  parts?: GmailMessagePart[];
}

interface GmailMessageResponse {
  id?: string;
  threadId?: string;
  snippet?: string;
  payload?: GmailMessagePart;
  error?: { code?: number; message?: string };
}

interface GmailSendResponse {
  id?: string;
  threadId?: string;
  labelIds?: string[];
  error?: { code?: number; message?: string };
}

const GMAIL_BASE_URL = "https://gmail.googleapis.com/gmail/v1/users/me";

function findHeader(headers: GmailHeader[] | undefined, name: string): string | undefined {
  if (!headers) return undefined;
  const match = headers.find((h) => h.name.toLowerCase() === name.toLowerCase());
  return match?.value;
}

function decodeBase64Url(data: string): string {
  // Gmail returns base64url-encoded body parts; pad and translate before decode.
  const padded = data.replace(/-/g, "+").replace(/_/g, "/");
  const padLen = (4 - (padded.length % 4)) % 4;
  const withPad = padded + "=".repeat(padLen);
  if (typeof atob === "function") {
    try {
      return decodeURIComponent(escape(atob(withPad)));
    } catch {
      return atob(withPad);
    }
  }
  // Node fallback for server agents — Buffer is always available there.

  return globalThis.Buffer ? globalThis.Buffer.from(withPad, "base64").toString("utf-8") : withPad;
}

function extractPlainTextBody(part: GmailMessagePart | undefined): string | undefined {
  if (!part) return undefined;
  if (part.mimeType === "text/plain" && part.body?.data) {
    return decodeBase64Url(part.body.data);
  }
  if (part.parts) {
    for (const child of part.parts) {
      const found = extractPlainTextBody(child);
      if (found) return found;
    }
  }
  // Fall back to first body chunk if no text/plain was found.
  if (part.body?.data) {
    return decodeBase64Url(part.body.data);
  }
  return undefined;
}

/**
 * Resolve a token, attempting the interactive fallback once if needed.
 * Returns either a usable token or a structured connector-error JSON string
 * the caller should return verbatim as the tool result.
 */
async function resolveToken(
  getToken: GmailTokenGetter,
  requestAccess: GmailRequestAccess
): Promise<{ token: string } | { error: string }> {
  let token = await getToken();
  if (!token) {
    try {
      token = await requestAccess();
    } catch {
      token = null;
    }
  }
  if (!token) {
    return {
      error: buildConnectorErrorResult("connector_not_connected", GMAIL_PROVIDER),
    };
  }
  return { token };
}

/**
 * Convert an upstream Gmail HTTP status to a connector error string when
 * appropriate, otherwise return null so the caller can surface the raw error.
 */
function maybeConnectorError(status: number): string | null {
  if (status === 401 || status === 403) {
    return buildConnectorErrorResult("connector_not_connected", GMAIL_PROVIDER);
  }
  return null;
}

/**
 * Pull the structured error out of a `ConnectorMintError`. Unused in v1 — the
 * `onNotConnected` opt is the place to translate `ConnectorMintError`. Exported
 * so future tool factories can share the helper without duplicating the
 * code → error-string mapping.
 */
export function connectorMintErrorToToolResult(err: ConnectorMintError): string {
  switch (err.code) {
    case "connector_not_connected":
      return buildConnectorErrorResult("connector_not_connected", err.provider, err.connectUrl);
    case "scope_not_covered":
      return buildConnectorErrorResult("scope_not_covered", err.provider, err.connectUrl);
    case "insufficient_scope":
      return buildConnectorErrorResult("insufficient_scope", GMAIL_PROVIDER);
    case "upstream_unavailable":
      return buildConnectorErrorResult("upstream_unavailable", GMAIL_PROVIDER);
    case "unknown":
    default:
      return buildConnectorErrorResult("upstream_unavailable", GMAIL_PROVIDER);
  }
}

async function searchGmailMessages(
  accessToken: string,
  args: GmailSearchArgs
): Promise<GmailMessageSummary[] | string> {
  const params = new URLSearchParams({
    q: args.query,
    maxResults: String(args.maxResults ?? 10),
  });
  const response = await fetch(`${GMAIL_BASE_URL}/messages?${params.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    const connectorError = maybeConnectorError(response.status);
    if (connectorError) return connectorError;
    const body = await response.text();
    return `Error: Failed to search Gmail (${response.status}): ${body}`;
  }
  const data = (await response.json()) as GmailListResponse;
  if (!data.messages || data.messages.length === 0) {
    return `No messages found matching "${args.query}"`;
  }
  return data.messages.map((msg) => ({
    id: msg.id,
    threadId: msg.threadId,
  }));
}

async function getGmailMessage(
  accessToken: string,
  args: GmailGetMessageArgs
): Promise<GmailMessageDetail | string> {
  const params = new URLSearchParams({ format: args.format ?? "full" });
  const response = await fetch(
    `${GMAIL_BASE_URL}/messages/${encodeURIComponent(args.messageId)}?${params.toString()}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!response.ok) {
    const connectorError = maybeConnectorError(response.status);
    if (connectorError) return connectorError;
    const body = await response.text();
    return `Error: Failed to fetch Gmail message (${response.status}): ${body}`;
  }
  const data = (await response.json()) as GmailMessageResponse;
  const headers = data.payload?.headers;
  return {
    id: data.id ?? args.messageId,
    threadId: data.threadId ?? "",
    from: findHeader(headers, "From"),
    to: findHeader(headers, "To"),
    subject: findHeader(headers, "Subject"),
    date: findHeader(headers, "Date"),
    snippet: data.snippet,
    body: extractPlainTextBody(data.payload),
  };
}

function buildRfc822(args: GmailSendMessageArgs): string {
  const lines = [`To: ${args.to}`];
  if (args.cc) lines.push(`Cc: ${args.cc}`);
  if (args.bcc) lines.push(`Bcc: ${args.bcc}`);
  lines.push(`Subject: ${args.subject}`);
  lines.push("Content-Type: text/plain; charset=UTF-8");
  lines.push("");
  lines.push(args.body);
  return lines.join("\r\n");
}

function encodeBase64Url(input: string): string {
  if (typeof btoa === "function") {
    return btoa(unescape(encodeURIComponent(input)))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  }
  return globalThis.Buffer
    ? globalThis.Buffer.from(input, "utf-8")
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "")
    : input;
}

async function sendGmailMessage(
  accessToken: string,
  args: GmailSendMessageArgs
): Promise<{ id: string; threadId: string } | string> {
  const raw = encodeBase64Url(buildRfc822(args));
  const response = await fetch(`${GMAIL_BASE_URL}/messages/send`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ raw }),
  });
  if (!response.ok) {
    const connectorError = maybeConnectorError(response.status);
    if (connectorError) return connectorError;
    const body = await response.text();
    return `Error: Failed to send Gmail message (${response.status}): ${body}`;
  }
  const data = (await response.json()) as GmailSendResponse;
  return {
    id: data.id ?? "",
    threadId: data.threadId ?? "",
  };
}

function createGmailSearchTool(
  getToken: GmailTokenGetter,
  requestAccess: GmailRequestAccess
): ToolConfig {
  return {
    type: "function",
    function: {
      name: "gmail_search_messages",
      description:
        "Searches the user's Gmail mailbox using Gmail search syntax (the same syntax that works in the Gmail UI). Returns message IDs and thread IDs the model can pass to gmail_get_message.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description:
              'Gmail search query. Examples: "from:billing@example.com newer_than:30d", "subject:invoice", "label:starred".',
          },
          maxResults: {
            type: "number",
            description: "Maximum number of messages to return. Defaults to 10.",
          },
        },
        required: ["query"],
      },
    },
    executor: async (args: Record<string, unknown>) => {
      const resolved = await resolveToken(getToken, requestAccess);
      if ("error" in resolved) return resolved.error;
      const typed: GmailSearchArgs = {
        query: args.query as string,
        maxResults: args.maxResults as number | undefined,
      };
      return searchGmailMessages(resolved.token, typed);
    },
  };
}

function createGmailGetMessageTool(
  getToken: GmailTokenGetter,
  requestAccess: GmailRequestAccess
): ToolConfig {
  return {
    type: "function",
    function: {
      name: "gmail_get_message",
      description:
        "Fetches headers and plaintext body for a single Gmail message by ID. Pass a message ID returned by gmail_search_messages.",
      parameters: {
        type: "object",
        properties: {
          messageId: {
            type: "string",
            description: "The Gmail message ID, as returned by gmail_search_messages.",
          },
          format: {
            type: "string",
            enum: ["metadata", "full"],
            description:
              'Whether to return only headers ("metadata") or include the message body ("full"). Defaults to "full".',
          },
        },
        required: ["messageId"],
      },
    },
    executor: async (args: Record<string, unknown>) => {
      const resolved = await resolveToken(getToken, requestAccess);
      if ("error" in resolved) return resolved.error;
      const typed: GmailGetMessageArgs = {
        messageId: args.messageId as string,
        format: args.format as "metadata" | "full" | undefined,
      };
      return getGmailMessage(resolved.token, typed);
    },
  };
}

function createGmailSendMessageTool(
  getToken: GmailTokenGetter,
  requestAccess: GmailRequestAccess
): ToolConfig {
  return {
    type: "function",
    function: {
      name: "gmail_send_message",
      description:
        "Sends a plaintext email from the user's Gmail account. Use only when the user has explicitly confirmed the recipient, subject, and body.",
      parameters: {
        type: "object",
        properties: {
          to: {
            type: "string",
            description: "Primary recipient email address.",
          },
          subject: {
            type: "string",
            description: "Email subject line.",
          },
          body: {
            type: "string",
            description: "Plaintext message body.",
          },
          cc: {
            type: "string",
            description: "Optional Cc recipients (comma-separated).",
          },
          bcc: {
            type: "string",
            description: "Optional Bcc recipients (comma-separated).",
          },
        },
        required: ["to", "subject", "body"],
      },
    },
    executor: async (args: Record<string, unknown>) => {
      const resolved = await resolveToken(getToken, requestAccess);
      if ("error" in resolved) return resolved.error;
      const typed: GmailSendMessageArgs = {
        to: args.to as string,
        subject: args.subject as string,
        body: args.body as string,
        cc: args.cc as string | undefined,
        bcc: args.bcc as string | undefined,
      };
      return sendGmailMessage(resolved.token, typed);
    },
  };
}

/**
 * Build the Gmail tool set wired to the supplied token getter.
 *
 * The returned record keys (`gmail_search_messages`, `gmail_get_message`,
 * `gmail_send_message`) match the underlying tool names so callers can
 * forward a subset by destructuring.
 *
 * @param getToken     Async getter — typically `createConnectorTokenGetter(portal, "gmail")`.
 * @param requestAccess Fallback called when `getToken()` returns null.
 *                      Server agents pass `async () => { throw ... }`; browser
 *                      surfaces drive a connect flow and resolve with the
 *                      fresh token (or `null` on user cancel).
 */
export function createGmailTools(
  getToken: GmailTokenGetter,
  requestAccess: GmailRequestAccess
): Record<string, ToolConfig> {
  return {
    gmail_search_messages: createGmailSearchTool(getToken, requestAccess),
    gmail_get_message: createGmailGetMessageTool(getToken, requestAccess),
    gmail_send_message: createGmailSendMessageTool(getToken, requestAccess),
  };
}
