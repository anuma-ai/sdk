/**
 * Dropbox tool factory for the chat system.
 *
 * Mirrors the shape of {@link "./gmail".createGmailTools}: the caller supplies a
 * token getter and an interactive `requestAccess` fallback, and the factory
 * returns a record of `ToolConfig` entries the chat loop can run. The token
 * getter is expected to be one returned by `createConnectorTokenGetter`, but any
 * `() => Promise<string | null>` compatible function works.
 *
 * Dropbox API v2 sends CORS headers, so — unlike X or Slack — these tools call
 * the API DIRECTLY with the minted token; no portal proxy caller is needed.
 *
 * Tool catalogue (all read-only, matches portal scope `connector:dropbox:read`):
 * - `dropbox_list_folders`     — list entries under a folder path
 * - `dropbox_get_file_content` — download a file's content as text
 * - `dropbox_search`           — search files/folders by name/content
 *
 * Error contract: on a connector-level auth failure (401/403, or no usable
 * token) the tool returns the canonical `__anuma_connector_error_v1` JSON shape
 * produced by `buildConnectorErrorResult`. Tool executors never throw on these
 * paths — the LLM is expected to surface the connect URL to the user.
 */

import type { ToolConfig } from "../lib/chat/useChat/types.js";
import { buildConnectorErrorResult } from "../lib/connectors/index.js";

const DROPBOX_PROVIDER = "dropbox";

/** Async getter returned by `createConnectorTokenGetter`. */
export type DropboxTokenGetter = () => Promise<string | null>;
/**
 * Fallback used when no token is currently available. Server agents pass an
 * implementation that throws (no interactive OAuth is possible). Browser
 * surfaces pass a function that drives the connect flow and resolves with a
 * fresh token (or `null` if the user declined).
 */
export type DropboxRequestAccess = () => Promise<string | null>;

interface DropboxListFoldersArgs {
  path?: string;
}

interface DropboxGetFileContentArgs {
  path: string;
}

interface DropboxSearchArgs {
  query: string;
}

interface DropboxEntry {
  name: string;
  path_display?: string;
  tag: "file" | "folder";
  size?: number;
  server_modified?: string;
}

interface DropboxSearchMatch {
  name: string;
  path_display?: string;
  tag: "file" | "folder";
}

interface DropboxRawEntry {
  ".tag"?: string;
  name?: string;
  path_display?: string;
  size?: number;
  server_modified?: string;
}

interface DropboxListFolderResponse {
  entries?: DropboxRawEntry[];
  has_more?: boolean;
}

interface DropboxSearchMatchV2 {
  metadata?: { metadata?: DropboxRawEntry };
}

interface DropboxSearchResponse {
  matches?: DropboxSearchMatchV2[];
  has_more?: boolean;
}

const DROPBOX_API_URL = "https://api.dropboxapi.com/2";
const DROPBOX_CONTENT_URL = "https://content.dropboxapi.com/2";
const FETCH_TIMEOUT_MS = 30_000;
/** Cap file content the same way github.ts caps API responses. */
const MAX_CONTENT_SIZE = 100_000;

/**
 * Bare `fetch` would hang the agent loop indefinitely if Dropbox goes
 * unresponsive — mirror the Gmail tool's pattern and abort at 30s.
 */
async function dropboxFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

function dropboxTimeoutError(operation: string): string {
  return `Error: Dropbox API request timed out after ${FETCH_TIMEOUT_MS / 1000}s while trying to ${operation}.`;
}

/**
 * Convert an upstream Dropbox HTTP status to a connector error string when
 * appropriate, otherwise return null so the caller can surface the raw error.
 */
function maybeConnectorError(status: number): string | null {
  if (status === 401 || status === 403) {
    return buildConnectorErrorResult("connector_not_connected", DROPBOX_PROVIDER);
  }
  return null;
}

/**
 * Resolve a token, attempting the interactive fallback once if needed.
 * Returns either a usable token or a structured connector-error JSON string
 * the caller should return verbatim as the tool result.
 */
async function resolveToken(
  getToken: DropboxTokenGetter,
  requestAccess: DropboxRequestAccess
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
      error: buildConnectorErrorResult("connector_not_connected", DROPBOX_PROVIDER),
    };
  }
  return { token };
}

function normalizeTag(tag: string | undefined): "file" | "folder" {
  return tag === "folder" ? "folder" : "file";
}

function toEntry(raw: DropboxRawEntry): DropboxEntry {
  const entry: DropboxEntry = {
    name: raw.name ?? "",
    tag: normalizeTag(raw[".tag"]),
  };
  if (raw.path_display !== undefined) entry.path_display = raw.path_display;
  if (raw.size !== undefined) entry.size = raw.size;
  if (raw.server_modified !== undefined) entry.server_modified = raw.server_modified;
  return entry;
}

async function listDropboxFolders(
  accessToken: string,
  args: DropboxListFoldersArgs
): Promise<DropboxEntry[] | string> {
  let response: Response;
  try {
    response = await dropboxFetch(`${DROPBOX_API_URL}/files/list_folder`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ path: args.path ?? "", recursive: false, limit: 100 }),
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      return dropboxTimeoutError("list folders");
    }
    throw err;
  }
  if (!response.ok) {
    const connectorError = maybeConnectorError(response.status);
    if (connectorError) return connectorError;
    const body = await response.text();
    return `Error: Failed to list Dropbox folder (${response.status}): ${body}`;
  }
  const data = (await response.json()) as DropboxListFolderResponse;
  const entries = data.entries ?? [];
  if (entries.length === 0) {
    return `No entries found at "${args.path ?? "/"}"`;
  }
  const mapped = entries.map(toEntry);
  // Dropbox paginates: when it flags more entries past our limit, tell the LLM
  // so it doesn't present a partial listing as the whole folder.
  if (data.has_more) {
    return `${JSON.stringify(mapped)}\n\n(Showing the first ${mapped.length} entries; this folder contains more items that are not shown here.)`;
  }
  return mapped;
}

/**
 * A downloaded file that decodes to mostly non-printable bytes is almost
 * certainly binary (image, archive, …). Returning the raw string would just be
 * garbage in the chat, so detect it and surface a short note instead.
 */
function looksBinary(text: string): boolean {
  if (text.length === 0) return false;
  const sample = text.slice(0, 1000);
  let control = 0;
  for (let i = 0; i < sample.length; i++) {
    const code = sample.charCodeAt(i);
    // NUL is a strong binary signal; count other C0 control chars too, but
    // exclude tab (9), LF (10), CR (13) which are normal in text files.
    if (code === 0) return true;
    if (code < 32 && code !== 9 && code !== 10 && code !== 13) control++;
    // U+FFFD (replacement char) means UTF-8 decoding hit invalid bytes.
    if (code === 0xfffd) control++;
  }
  return control / sample.length > 0.1;
}

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen) + `\n\n... (truncated, ${text.length - maxLen} characters omitted)`;
}

async function getDropboxFileContent(
  accessToken: string,
  args: DropboxGetFileContentArgs
): Promise<string> {
  let response: Response;
  try {
    response = await dropboxFetch(`${DROPBOX_CONTENT_URL}/files/download`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        // The request arg travels in a header; the body must be empty, so no
        // JSON Content-Type is set (Dropbox rejects download requests carrying
        // a JSON body).
        "Dropbox-API-Arg": JSON.stringify({ path: args.path }),
      },
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      return dropboxTimeoutError("download file");
    }
    throw err;
  }
  if (!response.ok) {
    const connectorError = maybeConnectorError(response.status);
    if (connectorError) return connectorError;
    const body = await response.text();
    return `Error: Failed to download Dropbox file (${response.status}): ${body}`;
  }
  const text = await response.text();
  if (looksBinary(text)) {
    return `The file at "${args.path}" appears to be binary and cannot be shown as text.`;
  }
  return truncate(text, MAX_CONTENT_SIZE);
}

async function searchDropbox(
  accessToken: string,
  args: DropboxSearchArgs
): Promise<DropboxSearchMatch[] | string> {
  let response: Response;
  try {
    response = await dropboxFetch(`${DROPBOX_API_URL}/files/search_v2`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: args.query, options: { max_results: 20 } }),
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      return dropboxTimeoutError("search files");
    }
    throw err;
  }
  if (!response.ok) {
    const connectorError = maybeConnectorError(response.status);
    if (connectorError) return connectorError;
    const body = await response.text();
    return `Error: Failed to search Dropbox (${response.status}): ${body}`;
  }
  const data = (await response.json()) as DropboxSearchResponse;
  const matches = (data.matches ?? [])
    .map((m) => m.metadata?.metadata)
    .filter((raw): raw is DropboxRawEntry => raw !== undefined);
  if (matches.length === 0) {
    return `No files found matching "${args.query}"`;
  }
  const mapped = matches.map((raw) => {
    const match: DropboxSearchMatch = {
      name: raw.name ?? "",
      tag: normalizeTag(raw[".tag"]),
    };
    if (raw.path_display !== undefined) match.path_display = raw.path_display;
    return match;
  });
  // Same partial-result guard as the folder listing: when search flags more
  // hits past our cap, tell the LLM so it doesn't read a full page as complete.
  if (data.has_more) {
    return `${JSON.stringify(mapped)}\n\n(Showing the first ${mapped.length} matches; more exist. Refine the query to narrow the results.)`;
  }
  return mapped;
}

function createDropboxListFoldersTool(
  getToken: DropboxTokenGetter,
  requestAccess: DropboxRequestAccess
): ToolConfig {
  return {
    type: "function",
    function: {
      name: "dropbox_list_folders",
      description:
        "List the files and folders in the user's Dropbox at a given path. Returns each entry's name, path, type (file or folder), size, and last-modified time. Pass an empty path to list the root.",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description:
              'Folder path to list, e.g. "/Documents". Use "" (empty string) for the Dropbox root. Defaults to the root.',
          },
        },
        required: [],
      },
    },
    executor: async (args: Record<string, unknown>) => {
      const resolved = await resolveToken(getToken, requestAccess);
      if ("error" in resolved) return resolved.error;
      const typed: DropboxListFoldersArgs = {
        path: args.path as string | undefined,
      };
      return listDropboxFolders(resolved.token, typed);
    },
  };
}

function createDropboxGetFileContentTool(
  getToken: DropboxTokenGetter,
  requestAccess: DropboxRequestAccess
): ToolConfig {
  return {
    type: "function",
    function: {
      name: "dropbox_get_file_content",
      description:
        "Download and read the text content of a file in the user's Dropbox. Pass the full file path (as returned by dropbox_list_folders or dropbox_search). Binary files are not returned as text.",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: 'Full path of the file to read, e.g. "/Documents/notes.txt".',
          },
        },
        required: ["path"],
      },
    },
    executor: async (args: Record<string, unknown>) => {
      const resolved = await resolveToken(getToken, requestAccess);
      if ("error" in resolved) return resolved.error;
      const typed: DropboxGetFileContentArgs = {
        path: args.path as string,
      };
      return getDropboxFileContent(resolved.token, typed);
    },
  };
}

function createDropboxSearchTool(
  getToken: DropboxTokenGetter,
  requestAccess: DropboxRequestAccess
): ToolConfig {
  return {
    type: "function",
    function: {
      name: "dropbox_search",
      description:
        "Search the user's Dropbox for files and folders by name or content. Returns up to 20 matching entries with their name, path, and type (file or folder).",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: 'Search terms, e.g. "quarterly report" or "invoice".',
          },
        },
        required: ["query"],
      },
    },
    executor: async (args: Record<string, unknown>) => {
      const resolved = await resolveToken(getToken, requestAccess);
      if ("error" in resolved) return resolved.error;
      const typed: DropboxSearchArgs = {
        query: args.query as string,
      };
      return searchDropbox(resolved.token, typed);
    },
  };
}

/**
 * Build the Dropbox tool set wired to the supplied token getter.
 *
 * The returned record keys (`dropbox_list_folders`, `dropbox_get_file_content`,
 * `dropbox_search`) match the underlying tool names so callers can forward a
 * subset by destructuring.
 *
 * @param getToken     Async getter — typically `createConnectorTokenGetter(portal, "dropbox")`.
 * @param requestAccess Fallback called when `getToken()` returns null.
 *                      Server agents pass `async () => { throw ... }`; browser
 *                      surfaces drive a connect flow and resolve with the fresh
 *                      token (or `null` on user cancel).
 */
export function createDropboxTools(
  getToken: DropboxTokenGetter,
  requestAccess: DropboxRequestAccess
): Record<string, ToolConfig> {
  return {
    dropbox_list_folders: createDropboxListFoldersTool(getToken, requestAccess),
    dropbox_get_file_content: createDropboxGetFileContentTool(getToken, requestAccess),
    dropbox_search: createDropboxSearchTool(getToken, requestAccess),
  };
}
