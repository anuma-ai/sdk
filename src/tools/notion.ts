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
// MCP CLIENT
// ============================================================================

let requestIdCounter = 0;

/**
 * Generate a unique request ID for JSON-RPC
 */
function generateRequestId(): number {
  return ++requestIdCounter;
}

/**
 * Call a tool on the Notion MCP server using JSON-RPC 2.0
 *
 * @param accessToken - OAuth access token for authentication
 * @param toolName - Name of the MCP tool to call (e.g., "search-notion")
 * @param args - Arguments to pass to the tool
 */
async function callMCPTool<T>(
  accessToken: string,
  toolName: string,
  args: Record<string, unknown>
): Promise<T> {
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
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(jsonRpcRequest),
  });

  if (!response.ok) {
    // Try to get error details from response
    const errorBody = await response.text().catch(() => "");
    throw new Error(
      `MCP request failed: ${response.status} ${response.statusText}${errorBody ? ` - ${errorBody}` : ""}`
    );
  }

  const jsonRpcResponse = await response.json();

  // Check for JSON-RPC error
  if (jsonRpcResponse.error) {
    throw new Error(
      `MCP tool error: ${jsonRpcResponse.error.message || JSON.stringify(jsonRpcResponse.error)}`
    );
  }

  return jsonRpcResponse.result as T;
}

// ============================================================================
// TOOL TYPES
// ============================================================================

export interface NotionSearchArgs {
  query?: string;
  filter?: {
    property: "object";
    value: "page" | "database";
  };
  page_size?: number;
}

export interface NotionRetrievePageArgs {
  page_id: string;
}

export interface NotionCreatePageArgs {
  parent: {
    page_id?: string;
    database_id?: string;
  };
  properties: Record<string, unknown>;
  children?: Array<Record<string, unknown>>;
}

export interface NotionQueryDataSourceArgs {
  data_source_id: string;
  filter?: Record<string, unknown>;
  sorts?: Array<{ property: string; direction: "ascending" | "descending" }>;
  page_size?: number;
}

export interface NotionGetPageMarkdownArgs {
  page_id: string;
}

export interface NotionAppendBlockArgs {
  block_id: string;
  children: Array<Record<string, unknown>>;
}

// ============================================================================
// SEARCH TOOL
// ============================================================================

/**
 * Create the Notion search tool
 *
 * MCP Tool: search-notion
 * Searches pages and data sources in the user's Notion workspace
 */
export function createNotionSearchTool(
  getAccessToken: () => string | null,
  requestNotionAccess: () => Promise<string>
): ToolConfig {
  return {
    type: "function",
    function: {
      name: "notion_search",
      description:
        "Search for pages and databases in the user's Notion workspace. " +
        "Returns matching pages and databases with their IDs, titles, and URLs.",
      arguments: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Search query to match against page and database titles",
          },
          filter: {
            type: "string",
            enum: ["page", "database"],
            description: "Filter results to only pages or only databases",
          },
          page_size: {
            type: "number",
            description: "Maximum number of results (default: 10, max: 100)",
          },
        },
      },
    },
    executor: async (args: Record<string, unknown>) => {
      let token = getAccessToken();
      if (!token) {
        token = await requestNotionAccess();
      }

      // Convert our simplified args to MCP format
      const mcpArgs: NotionSearchArgs = {
        query: args.query as string | undefined,
        page_size: args.page_size as number | undefined,
      };

      if (args.filter) {
        mcpArgs.filter = {
          property: "object",
          value: args.filter as "page" | "database",
        };
      }

      try {
        return await callMCPTool(token, "search-notion", mcpArgs);
      } catch (error) {
        return `Error searching Notion: ${error instanceof Error ? error.message : String(error)}`;
      }
    },
    autoExecute: true,
  };
}

// ============================================================================
// READ PAGE TOOL
// ============================================================================

/**
 * Create the Notion read page tool
 *
 * MCP Tool: retrieve-a-page (for metadata) + get-a-page-as-markdown (for content)
 */
export function createNotionReadPageTool(
  getAccessToken: () => string | null,
  requestNotionAccess: () => Promise<string>
): ToolConfig {
  return {
    type: "function",
    function: {
      name: "notion_read_page",
      description:
        "Read a page from Notion. Returns the page content as markdown along with metadata.",
      arguments: {
        type: "object",
        properties: {
          page_id: {
            type: "string",
            description: "The ID of the Notion page to read",
          },
          include_content: {
            type: "boolean",
            description: "Whether to include page content as markdown (default: true)",
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

      const pageId = args.page_id as string;
      const includeContent = args.include_content !== false;

      try {
        // Get page metadata
        const metadata = await callMCPTool(token, "retrieve-a-page", {
          page_id: pageId,
        });

        if (includeContent) {
          // Get page content as markdown
          const content = await callMCPTool(token, "get-a-page-as-markdown", {
            page_id: pageId,
          });

          return {
            metadata,
            content,
          };
        }

        return metadata;
      } catch (error) {
        return `Error reading Notion page: ${error instanceof Error ? error.message : String(error)}`;
      }
    },
    autoExecute: true,
  };
}

// ============================================================================
// CREATE PAGE TOOL
// ============================================================================

/**
 * Create the Notion create page tool
 *
 * MCP Tool: create-a-page
 */
export function createNotionCreatePageTool(
  getAccessToken: () => string | null,
  requestNotionAccess: () => Promise<string>
): ToolConfig {
  return {
    type: "function",
    function: {
      name: "notion_create_page",
      description:
        "Create a new page in Notion. Can create a subpage under an existing page " +
        "or a new entry in a database. Supports markdown content.",
      arguments: {
        type: "object",
        properties: {
          parent_page_id: {
            type: "string",
            description: "ID of the parent page (for creating subpages)",
          },
          parent_database_id: {
            type: "string",
            description: "ID of the parent database (for creating database entries)",
          },
          title: {
            type: "string",
            description: "Title of the new page",
          },
          content: {
            type: "string",
            description: "Page content in markdown format",
          },
        },
        required: ["title"],
      },
    },
    executor: async (args: Record<string, unknown>) => {
      let token = getAccessToken();
      if (!token) {
        token = await requestNotionAccess();
      }

      const parentPageId = args.parent_page_id as string | undefined;
      const parentDatabaseId = args.parent_database_id as string | undefined;
      const title = args.title as string;
      const content = args.content as string | undefined;

      if (!parentPageId && !parentDatabaseId) {
        return "Error: Must specify either parent_page_id or parent_database_id";
      }

      try {
        const mcpArgs: Record<string, unknown> = {
          title,
        };

        if (parentPageId) {
          mcpArgs.parent = { page_id: parentPageId };
        } else if (parentDatabaseId) {
          mcpArgs.parent = { database_id: parentDatabaseId };
        }

        if (content) {
          mcpArgs.markdown = content;
        }

        return await callMCPTool(token, "create-a-page", mcpArgs);
      } catch (error) {
        return `Error creating Notion page: ${error instanceof Error ? error.message : String(error)}`;
      }
    },
    autoExecute: true,
  };
}

// ============================================================================
// QUERY DATA SOURCE TOOL
// ============================================================================

/**
 * Create the Notion query data source tool
 *
 * MCP Tool: query-data-source
 * Queries a Notion database (data source) with filters and sorts
 */
export function createNotionQueryDataSourceTool(
  getAccessToken: () => string | null,
  requestNotionAccess: () => Promise<string>
): ToolConfig {
  return {
    type: "function",
    function: {
      name: "notion_query_database",
      description:
        "Query a Notion database (data source) to retrieve entries. " +
        "Supports filtering and sorting by properties.",
      arguments: {
        type: "object",
        properties: {
          data_source_id: {
            type: "string",
            description: "The ID of the Notion database/data source to query",
          },
          filter: {
            type: "object",
            description: "Filter object to narrow results (see Notion API filter docs)",
          },
          sorts: {
            type: "array",
            description: "Array of sort objects: [{property: 'Name', direction: 'ascending'}]",
            items: {
              type: "object",
              properties: {
                property: { type: "string" },
                direction: { type: "string", enum: ["ascending", "descending"] },
              },
            },
          },
          page_size: {
            type: "number",
            description: "Maximum number of results (default: 10, max: 100)",
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
        return await callMCPTool(token, "query-data-source", args);
      } catch (error) {
        return `Error querying Notion database: ${error instanceof Error ? error.message : String(error)}`;
      }
    },
    autoExecute: true,
  };
}

// ============================================================================
// APPEND CONTENT TOOL
// ============================================================================

/**
 * Create the Notion append content tool
 *
 * MCP Tool: append-a-block
 * Appends content blocks to a page
 */
export function createNotionAppendContentTool(
  getAccessToken: () => string | null,
  requestNotionAccess: () => Promise<string>
): ToolConfig {
  return {
    type: "function",
    function: {
      name: "notion_append_content",
      description:
        "Append content to an existing Notion page. Adds new blocks at the end of the page.",
      arguments: {
        type: "object",
        properties: {
          page_id: {
            type: "string",
            description: "The ID of the Notion page to append content to",
          },
          content: {
            type: "string",
            description: "Content to append in markdown format",
          },
        },
        required: ["page_id", "content"],
      },
    },
    executor: async (args: Record<string, unknown>) => {
      let token = getAccessToken();
      if (!token) {
        token = await requestNotionAccess();
      }

      const pageId = args.page_id as string;
      const content = args.content as string;

      try {
        return await callMCPTool(token, "append-a-block", {
          block_id: pageId,
          markdown: content,
        });
      } catch (error) {
        return `Error appending to Notion page: ${error instanceof Error ? error.message : String(error)}`;
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
    createNotionSearchTool(getAccessToken, requestNotionAccess),
    createNotionReadPageTool(getAccessToken, requestNotionAccess),
    createNotionCreatePageTool(getAccessToken, requestNotionAccess),
    createNotionQueryDataSourceTool(getAccessToken, requestNotionAccess),
    createNotionAppendContentTool(getAccessToken, requestNotionAccess),
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
 *
 * This allows calling any of Notion's 22 MCP tools:
 * - search-notion
 * - retrieve-a-page
 * - retrieve-a-database
 * - query-data-source
 * - retrieve-a-data-source
 * - update-a-data-source
 * - create-a-data-source
 * - list-data-source-templates
 * - create-a-page
 * - update-a-page
 * - append-a-block
 * - move-page
 * - get-a-page-as-markdown
 * - retrieve-a-block
 * - retrieve-block-children
 * - retrieve-comments
 * - create-a-comment
 * - retrieve-a-user
 * ... and more
 */
export async function callNotionMCPTool<T>(
  accessToken: string,
  toolName: string,
  args: Record<string, unknown>
): Promise<T> {
  return callMCPTool<T>(accessToken, toolName, args);
}
