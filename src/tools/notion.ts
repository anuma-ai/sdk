/**
 * Notion MCP tool definitions for the chat system.
 *
 * These tools communicate with Notion's hosted MCP server using the
 * Model Context Protocol (JSON-RPC 2.0). The MCP server handles all
 * Notion API interactions - we just forward tool calls to it.
 *
 * MCP Server: https://mcp.notion.com/mcp (Streamable HTTP)
 * Fallback: https://mcp.notion.com/sse (Server-Sent Events)
 *
 * @see https://developers.notion.com/guides/mcp/build-mcp-client
 * @see https://modelcontextprotocol.io
 */

import type { ToolConfig } from "./googleCalendar";

// MCP Server configuration
const MCP_HTTP_ENDPOINT = "https://mcp.notion.com/mcp";
const MCP_SSE_ENDPOINT = "https://mcp.notion.com/sse";

// ============================================================================
// MCP CLIENT WITH SESSION MANAGEMENT
// ============================================================================

let requestIdCounter = Math.floor(Math.random() * 1000000);

// Session cache: token -> sessionId
const sessionCache = new Map<string, string>();

/**
 * Generate a unique request ID for JSON-RPC
 */
function generateRequestId(): number {
  return ++requestIdCounter;
}

/**
 * Parse SSE (Server-Sent Events) response to extract JSON-RPC data
 */
function parseSSEResponse(text: string): unknown {
  // Split into individual SSE events (separated by blank lines)
  const events = text.split(/\n\n+/);
  // Use the last non-empty event (MCP sends one JSON-RPC response per request)
  let lastEventData = "";

  for (const event of events) {
    const dataLines: string[] = [];
    for (const line of event.split("\n")) {
      if (line.startsWith("data: ")) {
        dataLines.push(line.slice(6));
      } else if (line.startsWith("data:")) {
        dataLines.push(line.slice(5));
      }
    }
    if (dataLines.length > 0) {
      // Per SSE spec, multiple data fields within one event are joined with \n
      lastEventData = dataLines.join("\n");
    }
  }

  if (!lastEventData) {
    throw new Error("No data found in SSE response");
  }

  return JSON.parse(lastEventData);
}

/**
 * Parse response body - handles both JSON and SSE formats
 */
async function parseResponseBody(response: Response): Promise<unknown> {
  const contentType = response.headers.get("Content-Type") || "";
  const text = await response.text();

  // If it's SSE format, parse it
  if (
    contentType.includes("text/event-stream") ||
    text.startsWith("event:") ||
    text.startsWith("data:")
  ) {
    return parseSSEResponse(text);
  }

  // Otherwise parse as JSON
  return JSON.parse(text);
}

/**
 * Initialize an MCP session and get a session ID
 */
async function initializeMCPSession(accessToken: string): Promise<string> {
  const requestId = generateRequestId();

  const initRequest = {
    jsonrpc: "2.0",
    id: requestId,
    method: "initialize",
    params: {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: {
        name: "Reverbia",
        version: "1.0.0",
      },
    },
  };

  const response = await fetch(MCP_HTTP_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(initRequest),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    throw new Error(
      `MCP initialization failed: ${response.status} ${response.statusText}${errorBody ? ` - ${errorBody}` : ""}`
    );
  }

  // Get session ID from response header
  const sessionId = response.headers.get("Mcp-Session-Id");
  if (!sessionId) {
    throw new Error("No Mcp-Session-Id returned from initialization");
  }

  // Parse and validate response before caching (handles both JSON and SSE)
  const jsonRpcResponse = (await parseResponseBody(response)) as Record<string, unknown>;
  if (jsonRpcResponse.error) {
    const err = jsonRpcResponse.error as Record<string, unknown>;
    throw new Error(`MCP initialization error: ${err.message || JSON.stringify(err)}`);
  }

  // Send required notifications/initialized to complete the MCP handshake
  await fetch(MCP_HTTP_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      "Mcp-Session-Id": sessionId,
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "notifications/initialized",
    }),
  });

  // Cache only after successful validation
  sessionCache.set(accessToken, sessionId);

  return sessionId;
}

/**
 * Get or create an MCP session for the given access token
 */
async function ensureMCPSession(accessToken: string): Promise<string> {
  const cached = sessionCache.get(accessToken);
  if (cached) {
    return cached;
  }
  return initializeMCPSession(accessToken);
}

/**
 * Call a tool on the Notion MCP server using JSON-RPC 2.0
 *
 * @param accessToken - OAuth access token for authentication
 * @param toolName - Name of the MCP tool to call
 * @param args - Arguments to pass to the tool
 */
async function callMCPTool<T>(
  accessToken: string,
  toolName: string,
  args: Record<string, unknown>
): Promise<T> {
  // Ensure we have a session
  const sessionId = await ensureMCPSession(accessToken);

  const requestId = generateRequestId();

  const jsonRpcRequest = {
    jsonrpc: "2.0",
    id: requestId,
    method: "tools/call",
    params: {
      name: toolName,
      arguments: args,
    },
  };

  const response = await fetch(MCP_HTTP_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      Authorization: `Bearer ${accessToken}`,
      "Mcp-Session-Id": sessionId,
    },
    body: JSON.stringify(jsonRpcRequest),
  });

  if (!response.ok) {
    // If session expired, try to re-initialize
    if (response.status === 400 || response.status === 401) {
      sessionCache.delete(accessToken);
      // Retry with new session
      const newSessionId = await initializeMCPSession(accessToken);

      const retryResponse = await fetch(MCP_HTTP_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json, text/event-stream",
          Authorization: `Bearer ${accessToken}`,
          "Mcp-Session-Id": newSessionId,
        },
        body: JSON.stringify(jsonRpcRequest),
      });

      if (!retryResponse.ok) {
        const errorBody = await retryResponse.text().catch(() => "");
        throw new Error(
          `MCP request failed: ${retryResponse.status} ${retryResponse.statusText}${errorBody ? ` - ${errorBody}` : ""}`
        );
      }

      const retryJsonRpcResponse = (await parseResponseBody(retryResponse)) as Record<
        string,
        unknown
      >;
      if (retryJsonRpcResponse.error) {
        const err = retryJsonRpcResponse.error as Record<string, unknown>;
        throw new Error(`MCP tool error: ${err.message || JSON.stringify(err)}`);
      }

      return retryJsonRpcResponse.result as T;
    }

    // Try to get error details from response
    const errorBody = await response.text().catch(() => "");
    throw new Error(
      `MCP request failed: ${response.status} ${response.statusText}${errorBody ? ` - ${errorBody}` : ""}`
    );
  }

  const jsonRpcResponse = (await parseResponseBody(response)) as Record<string, unknown>;

  // Check for JSON-RPC error
  if (jsonRpcResponse.error) {
    const err = jsonRpcResponse.error as Record<string, unknown>;
    throw new Error(`MCP tool error: ${err.message || JSON.stringify(err)}`);
  }

  return jsonRpcResponse.result as T;
}

// ============================================================================
// TOOL TYPES
// ============================================================================

export interface NotionSearchArgs {
  query: string;
  query_type?: "internal" | "user";
  filters?: Record<string, unknown>;
}

export interface NotionFetchArgs {
  id: string;
  include_transcript?: boolean;
  include_discussions?: boolean;
}

export interface NotionCreatePagesArgs {
  pages: Array<{
    properties: Record<string, unknown>;
    content: string;
  }>;
  parent?: Record<string, unknown>;
}

export interface NotionUpdatePageArgs {
  data: {
    page_id: string;
    command: string;
    properties?: Record<string, unknown>;
    new_str?: string;
    selection_with_ellipsis?: string;
    allow_deleting_content?: boolean;
  };
}

export interface NotionMovePagesArgs {
  page_or_database_ids: string[];
  new_parent: Record<string, unknown>;
}

// ============================================================================
// SEARCH TOOL
// ============================================================================

/**
 * MCP Tool: notion-search
 * Semantic search over Notion workspace and connected sources, or user search
 */
export function createNotionSearchTool(
  getAccessToken: () => string | null,
  requestNotionAccess: () => Promise<string>
): ToolConfig {
  return {
    type: "function",
    function: {
      name: "notion-search",
      description:
        "Semantic search over Notion workspace and connected sources (Slack, Google Drive, Github, Jira, etc). Can also search for users by name or email.",
      arguments: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description:
              "Semantic search query over workspace and connected sources. For user search, a substring to match against name or email.",
          },
          query_type: {
            type: "string",
            enum: ["internal", "user"],
            description:
              "Type of search: 'internal' for workspace/content search, 'user' for user search",
          },
          content_search_mode: {
            type: "string",
            enum: ["workspace_search", "ai_search"],
            description: "Override auto-selection of AI search vs workspace search",
          },
          data_source_url: {
            type: "string",
            description: "URL of a data source to search within",
          },
          page_url: {
            type: "string",
            description: "URL or ID of a page to search within",
          },
          teamspace_id: {
            type: "string",
            description: "ID of a teamspace to restrict search results to",
          },
          filters: {
            type: "object",
            description:
              "Filters for search results (only for query_type 'internal'). Supports created_date_range {start_date, end_date} and created_by_user_ids array.",
          },
        },
        required: ["query"],
      },
    },
    executor: async (args: Record<string, unknown>) => {
      let token = getAccessToken();
      if (!token) {
        token = await requestNotionAccess();
      }

      try {
        return await callMCPTool(token, "notion-search", args);
      } catch (error) {
        return `Error searching Notion: ${error instanceof Error ? error.message : String(error)}`;
      }
    },
    autoExecute: true,
  };
}

// ============================================================================
// FETCH PAGE TOOL
// ============================================================================

/**
 * MCP Tool: notion-fetch
 * Retrieves details about a Notion entity (page or database) by URL or ID
 */
export function createNotionFetchTool(
  getAccessToken: () => string | null,
  requestNotionAccess: () => Promise<string>
): ToolConfig {
  return {
    type: "function",
    function: {
      name: "notion-fetch",
      description:
        "Retrieve a Notion page or database by URL or ID. Pages return enhanced Markdown. Databases return all data sources.",
      arguments: {
        type: "object",
        properties: {
          id: {
            type: "string",
            description:
              "The ID or URL of the Notion page/database. Supports notion.so URLs, Notion Sites URLs (*.notion.site), and raw UUIDs.",
          },
          include_transcript: {
            type: "boolean",
            description: "Include transcript if available",
          },
          include_discussions: {
            type: "boolean",
            description: "Include discussion counts and inline discussion markers",
          },
        },
        required: ["id"],
      },
    },
    executor: async (args: Record<string, unknown>) => {
      let token = getAccessToken();
      if (!token) {
        token = await requestNotionAccess();
      }

      try {
        return await callMCPTool(token, "notion-fetch", args);
      } catch (error) {
        return `Error fetching Notion page: ${error instanceof Error ? error.message : String(error)}`;
      }
    },
    autoExecute: true,
  };
}

// ============================================================================
// CREATE PAGES TOOL
// ============================================================================

/**
 * MCP Tool: notion-create-pages
 * Creates one or more Notion pages with properties and content
 */
export function createNotionCreatePagesTool(
  getAccessToken: () => string | null,
  requestNotionAccess: () => Promise<string>
): ToolConfig {
  return {
    type: "function",
    function: {
      name: "notion-create-pages",
      description:
        "Create one or more Notion pages. All pages in a single call share the same parent. " +
        "Properties use simplified format: title is a string, dates use date:{prop}:start format, " +
        "checkboxes use __YES__/__NO__. Content is Notion-flavored Markdown.",
      arguments: {
        type: "object",
        properties: {
          pages: {
            type: "array",
            description: "Array of page objects to create (max 100)",
            items: {
              type: "object",
              properties: {
                properties: {
                  type: "object",
                  description:
                    "JSON map of property names to values. Title is a string, numbers are JS numbers, " +
                    "checkboxes use __YES__/__NO__, dates use date:{prop}:start/end/is_datetime format.",
                },
                content: {
                  type: "string",
                  description: "Page content in Notion-flavored Markdown format",
                },
              },
              required: ["properties", "content"],
            },
          },
          parent: {
            type: "object",
            description:
              "Parent for all pages. Use {type:'page_id', page_id:'...'}, {type:'database_id', database_id:'...'}, " +
              "or {type:'data_source_id', data_source_id:'...'}. Do NOT pass this field to create standalone private pages.",
          },
        },
        required: ["pages"],
      },
    },
    executor: async (args: Record<string, unknown>) => {
      let token = getAccessToken();
      if (!token) {
        token = await requestNotionAccess();
      }

      try {
        return await callMCPTool(token, "notion-create-pages", args);
      } catch (error) {
        return `Error creating Notion page: ${error instanceof Error ? error.message : String(error)}`;
      }
    },
    autoExecute: true,
  };
}

// ============================================================================
// UPDATE PAGE TOOL
// ============================================================================

/**
 * MCP Tool: notion-update-page
 * Update a page's properties or content using command-based operations
 */
export function createNotionUpdatePageTool(
  getAccessToken: () => string | null,
  requestNotionAccess: () => Promise<string>
): ToolConfig {
  return {
    type: "function",
    function: {
      name: "notion-update-page",
      description:
        "Update a Notion page's properties or content. Uses command-based operations: " +
        "'update_properties' to change properties, 'replace_content' to replace all content, " +
        "'replace_content_range' to replace specific text, 'insert_content_after' to insert after text.",
      arguments: {
        type: "object",
        properties: {
          data: {
            type: "object",
            description: "Update data containing page_id and a command",
            properties: {
              page_id: {
                type: "string",
                description: "The ID of the page to update (with or without dashes)",
              },
              command: {
                type: "string",
                enum: [
                  "update_properties",
                  "replace_content",
                  "replace_content_range",
                  "insert_content_after",
                ],
                description: "The update command to execute",
              },
              properties: {
                type: "object",
                description:
                  "For update_properties: JSON map of property names to values. Use null to remove a value.",
              },
              new_str: {
                type: "string",
                description:
                  "For replace_content/replace_content_range/insert_content_after: the new content string",
              },
              selection_with_ellipsis: {
                type: "string",
                description:
                  "For replace_content_range/insert_content_after: unique start and end snippet (~10 chars each with ellipsis)",
              },
              allow_deleting_content: {
                type: "boolean",
                description:
                  "For replace_content/replace_content_range: allow deletion of child pages/databases",
              },
            },
            required: ["page_id", "command"],
          },
        },
        required: ["data"],
      },
    },
    executor: async (args: Record<string, unknown>) => {
      let token = getAccessToken();
      if (!token) {
        token = await requestNotionAccess();
      }

      try {
        return await callMCPTool(token, "notion-update-page", args);
      } catch (error) {
        return `Error updating Notion page: ${error instanceof Error ? error.message : String(error)}`;
      }
    },
    autoExecute: true,
  };
}

// ============================================================================
// MOVE PAGES TOOL
// ============================================================================

/**
 * MCP Tool: notion-move-pages
 * Move one or more pages/databases to a new parent
 */
export function createNotionMovePagesTool(
  getAccessToken: () => string | null,
  requestNotionAccess: () => Promise<string>
): ToolConfig {
  return {
    type: "function",
    function: {
      name: "notion-move-pages",
      description: "Move one or more Notion pages or databases to a new parent.",
      arguments: {
        type: "object",
        properties: {
          page_or_database_ids: {
            type: "array",
            description: "Array of page or database IDs to move (UUIDs, max 100)",
            items: { type: "string" },
          },
          new_parent: {
            type: "object",
            description:
              "New parent: {type:'page_id', page_id:'...'}, {type:'database_id', database_id:'...'}, " +
              "{type:'data_source_id', data_source_id:'...'}, or {type:'workspace'} for private pages.",
          },
        },
        required: ["page_or_database_ids", "new_parent"],
      },
    },
    executor: async (args: Record<string, unknown>) => {
      let token = getAccessToken();
      if (!token) {
        token = await requestNotionAccess();
      }

      try {
        return await callMCPTool(token, "notion-move-pages", args);
      } catch (error) {
        return `Error moving Notion pages: ${error instanceof Error ? error.message : String(error)}`;
      }
    },
    autoExecute: true,
  };
}

// ============================================================================
// DUPLICATE PAGE TOOL
// ============================================================================

/**
 * MCP Tool: notion-duplicate-page
 * Duplicate a Notion page (completes asynchronously)
 */
export function createNotionDuplicatePageTool(
  getAccessToken: () => string | null,
  requestNotionAccess: () => Promise<string>
): ToolConfig {
  return {
    type: "function",
    function: {
      name: "notion-duplicate-page",
      description: "Duplicate a Notion page. The duplication completes asynchronously.",
      arguments: {
        type: "object",
        properties: {
          page_id: {
            type: "string",
            description: "The ID of the page to duplicate (UUID with or without dashes)",
          },
        },
        required: ["page_id"],
      },
    },
    executor: async (args: Record<string, unknown>) => {
      let token = getAccessToken();
      if (!token) {
        token = await requestNotionAccess();
      }

      try {
        return await callMCPTool(token, "notion-duplicate-page", args);
      } catch (error) {
        return `Error duplicating Notion page: ${error instanceof Error ? error.message : String(error)}`;
      }
    },
    autoExecute: true,
  };
}

// ============================================================================
// CREATE DATABASE TOOL
// ============================================================================

/**
 * MCP Tool: notion-create-database
 * Create a new Notion database with a properties schema
 */
export function createNotionCreateDatabaseTool(
  getAccessToken: () => string | null,
  requestNotionAccess: () => Promise<string>
): ToolConfig {
  return {
    type: "function",
    function: {
      name: "notion-create-database",
      description:
        "Create a new Notion database with a properties schema. If no title property is provided, 'Name' is auto-added. " +
        "Supports property types: title, rich_text, number, select, multi_select, date, people, checkbox, url, email, " +
        "phone_number, formula, relation, rollup, status, unique_id, etc.",
      arguments: {
        type: "object",
        properties: {
          properties: {
            type: "object",
            description:
              "Property schema for the database. Each key is a property name, value defines the type.",
          },
          parent: {
            type: "object",
            description:
              "Parent page: {type:'page_id', page_id:'...'}. Omit for private workspace-level database.",
          },
          title: {
            type: "array",
            description: "Title of the database as rich text array (max 100)",
            items: { type: "object" },
          },
          description: {
            type: "array",
            description: "Description of the database as rich text array (max 100)",
            items: { type: "object" },
          },
        },
        required: ["properties"],
      },
    },
    executor: async (args: Record<string, unknown>) => {
      let token = getAccessToken();
      if (!token) {
        token = await requestNotionAccess();
      }

      try {
        return await callMCPTool(token, "notion-create-database", args);
      } catch (error) {
        return `Error creating Notion database: ${error instanceof Error ? error.message : String(error)}`;
      }
    },
    autoExecute: true,
  };
}

// ============================================================================
// UPDATE DATA SOURCE TOOL
// ============================================================================

/**
 * MCP Tool: notion-update-data-source
 * Update a data source's properties, name, or other attributes
 */
export function createNotionUpdateDataSourceTool(
  getAccessToken: () => string | null,
  requestNotionAccess: () => Promise<string>
): ToolConfig {
  return {
    type: "function",
    function: {
      name: "notion-update-data-source",
      description:
        "Update a Notion data source's title, description, property schema, or other attributes. " +
        "Use null to remove a property. Provide only 'name' to rename a property.",
      arguments: {
        type: "object",
        properties: {
          data_source_id: {
            type: "string",
            description:
              "The ID of the data source to update (UUID). Can be a data source ID or database ID.",
          },
          title: {
            type: "array",
            description: "New title as rich text array (max 100)",
            items: { type: "object" },
          },
          description: {
            type: "array",
            description: "New description as rich text array (max 100)",
            items: { type: "object" },
          },
          properties: {
            type: "object",
            description:
              "Property schema updates. Use null to remove, {name:'...'} to rename, or full definition to add/update.",
          },
          is_inline: {
            type: "boolean",
            description: "Whether the database is inline",
          },
          in_trash: {
            type: "boolean",
            description: "Trash the data source (requires Notion UI to undo)",
          },
        },
        required: ["data_source_id"],
      },
    },
    executor: async (args: Record<string, unknown>) => {
      let token = getAccessToken();
      if (!token) {
        token = await requestNotionAccess();
      }

      try {
        return await callMCPTool(token, "notion-update-data-source", args);
      } catch (error) {
        return `Error updating Notion data source: ${error instanceof Error ? error.message : String(error)}`;
      }
    },
    autoExecute: true,
  };
}

// ============================================================================
// CREATE COMMENT TOOL
// ============================================================================

/**
 * MCP Tool: notion-create-comment
 * Add a comment to a page, specific content, or reply to a discussion
 */
export function createNotionCreateCommentTool(
  getAccessToken: () => string | null,
  requestNotionAccess: () => Promise<string>
): ToolConfig {
  return {
    type: "function",
    function: {
      name: "notion-create-comment",
      description:
        "Add a comment to a Notion page. Supports page-level comments, content-specific comments " +
        "(using selection_with_ellipsis), or replies to existing discussions (using discussion_id).",
      arguments: {
        type: "object",
        properties: {
          page_id: {
            type: "string",
            description: "The ID of the page to comment on (with or without dashes)",
          },
          rich_text: {
            type: "array",
            description:
              "Comment content as rich text array (max 100). Objects can be text, mention, or equation.",
            items: {
              type: "object",
              properties: {
                text: {
                  type: "object",
                  properties: {
                    content: { type: "string" },
                  },
                  required: ["content"],
                },
              },
              required: ["text"],
            },
          },
          discussion_id: {
            type: "string",
            description: "ID or URL of an existing discussion to reply to",
          },
          selection_with_ellipsis: {
            type: "string",
            description:
              "Unique start and end snippet (~10 chars each with ellipsis) of content to comment on",
          },
        },
        required: ["page_id", "rich_text"],
      },
    },
    executor: async (args: Record<string, unknown>) => {
      let token = getAccessToken();
      if (!token) {
        token = await requestNotionAccess();
      }

      try {
        return await callMCPTool(token, "notion-create-comment", args);
      } catch (error) {
        return `Error creating Notion comment: ${error instanceof Error ? error.message : String(error)}`;
      }
    },
    autoExecute: true,
  };
}

// ============================================================================
// GET COMMENTS TOOL
// ============================================================================

/**
 * MCP Tool: notion-get-comments
 * Get comments and discussions from a Notion page
 */
export function createNotionGetCommentsTool(
  getAccessToken: () => string | null,
  requestNotionAccess: () => Promise<string>
): ToolConfig {
  return {
    type: "function",
    function: {
      name: "notion-get-comments",
      description:
        "Get comments and discussions from a Notion page. Returns discussions with full comment content.",
      arguments: {
        type: "object",
        properties: {
          page_id: {
            type: "string",
            description: "Identifier for the Notion page",
          },
          include_all_blocks: {
            type: "boolean",
            description: "Include discussions on child blocks (default: false)",
          },
          include_resolved: {
            type: "boolean",
            description: "Include resolved discussions (default: false)",
          },
          discussion_id: {
            type: "string",
            description:
              "Fetch a specific discussion by ID or URL (e.g., discussion://pageId/blockId/discussionId)",
          },
        },
        required: ["page_id"],
      },
    },
    executor: async (args: Record<string, unknown>) => {
      let token = getAccessToken();
      if (!token) {
        token = await requestNotionAccess();
      }

      try {
        return await callMCPTool(token, "notion-get-comments", args);
      } catch (error) {
        return `Error retrieving Notion comments: ${error instanceof Error ? error.message : String(error)}`;
      }
    },
    autoExecute: true,
  };
}

// ============================================================================
// GET USERS TOOL
// ============================================================================

/**
 * MCP Tool: notion-get-users
 * List users in the workspace, get a specific user, or get self
 */
export function createNotionGetUsersTool(
  getAccessToken: () => string | null,
  requestNotionAccess: () => Promise<string>
): ToolConfig {
  return {
    type: "function",
    function: {
      name: "notion-get-users",
      description:
        "List users in the Notion workspace. Supports filtering by name/email, pagination, " +
        "fetching a specific user by ID, or fetching the current bot user (user_id: 'self').",
      arguments: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description:
              "Search query to filter users by name or email (case-insensitive, max 100 chars)",
          },
          start_cursor: {
            type: "string",
            description: "Cursor for pagination from previous response",
          },
          page_size: {
            type: "integer",
            description: "Number of users per page (1-100, default 100)",
          },
          user_id: {
            type: "string",
            description:
              "Return only the user matching this ID. Pass 'self' to fetch the current bot user.",
          },
        },
      },
    },
    executor: async (args: Record<string, unknown>) => {
      let token = getAccessToken();
      if (!token) {
        token = await requestNotionAccess();
      }

      try {
        return await callMCPTool(token, "notion-get-users", args);
      } catch (error) {
        return `Error listing Notion users: ${error instanceof Error ? error.message : String(error)}`;
      }
    },
    autoExecute: true,
  };
}

// ============================================================================
// GET TEAMS TOOL
// ============================================================================

/**
 * MCP Tool: notion-get-teams
 * Retrieve teams (teamspaces) in the workspace
 */
export function createNotionGetTeamsTool(
  getAccessToken: () => string | null,
  requestNotionAccess: () => Promise<string>
): ToolConfig {
  return {
    type: "function",
    function: {
      name: "notion-get-teams",
      description:
        "Retrieve teams (teamspaces) in the Notion workspace. Shows team names, IDs, membership status, and roles.",
      arguments: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Search query to filter teams by name (case-insensitive, max 100 chars)",
          },
        },
      },
    },
    executor: async (args: Record<string, unknown>) => {
      let token = getAccessToken();
      if (!token) {
        token = await requestNotionAccess();
      }

      try {
        return await callMCPTool(token, "notion-get-teams", args);
      } catch (error) {
        return `Error retrieving Notion teams: ${error instanceof Error ? error.message : String(error)}`;
      }
    },
    autoExecute: true,
  };
}

// ============================================================================
// TOOL FACTORY
// ============================================================================

/**
 * Create all Notion MCP tools
 *
 * Returns tools that communicate with Notion's hosted MCP server.
 * The MCP server handles all Notion API interactions.
 */
export function createNotionTools(
  getAccessToken: () => string | null,
  requestNotionAccess: () => Promise<string>
): ToolConfig[] {
  return [
    // Search
    createNotionSearchTool(getAccessToken, requestNotionAccess),

    // Pages
    createNotionFetchTool(getAccessToken, requestNotionAccess),
    createNotionCreatePagesTool(getAccessToken, requestNotionAccess),
    createNotionUpdatePageTool(getAccessToken, requestNotionAccess),
    createNotionMovePagesTool(getAccessToken, requestNotionAccess),
    createNotionDuplicatePageTool(getAccessToken, requestNotionAccess),

    // Data Sources (Databases)

    createNotionCreateDatabaseTool(getAccessToken, requestNotionAccess),
    createNotionUpdateDataSourceTool(getAccessToken, requestNotionAccess),

    // Comments
    createNotionCreateCommentTool(getAccessToken, requestNotionAccess),
    createNotionGetCommentsTool(getAccessToken, requestNotionAccess),

    // Users & Teams
    createNotionGetUsersTool(getAccessToken, requestNotionAccess),
    createNotionGetTeamsTool(getAccessToken, requestNotionAccess),
  ];
}

// ============================================================================
// MCP CLIENT UTILITIES (for advanced use)
// ============================================================================

/**
 * Get the MCP endpoints for direct access
 */
export function getMCPEndpoints() {
  return {
    http: MCP_HTTP_ENDPOINT,
    sse: MCP_SSE_ENDPOINT,
  };
}

/**
 * Call any MCP tool directly (for advanced use cases)
 */
export async function callNotionMCPTool<T>(
  accessToken: string,
  toolName: string,
  args: Record<string, unknown>
): Promise<T> {
  return callMCPTool<T>(accessToken, toolName, args);
}
