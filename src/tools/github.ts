/**
 * GitHub MCP tool definitions for the chat system.
 *
 * These tools communicate with GitHub's hosted MCP server using the
 * Model Context Protocol (JSON-RPC 2.0). The MCP server handles all
 * GitHub API interactions - we just forward tool calls to it.
 *
 * MCP Server: https://api.githubcopilot.com/mcp/ (Streamable HTTP)
 *
 * @see https://modelcontextprotocol.io
 */

import type { ToolConfig } from "./googleCalendar";

// MCP Server configuration
const MCP_HTTP_ENDPOINT = "https://api.githubcopilot.com/mcp/";

// ============================================================================
// MCP CLIENT WITH SESSION MANAGEMENT
// ============================================================================

let requestIdCounter = Math.floor(Math.random() * 1000000);

// Session cache: hashed token -> sessionId
const sessionCache = new Map<string, string>();

async function hashToken(token: string): Promise<string> {
  const data = new TextEncoder().encode(token);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2, "0")).join("");
}

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
        name: "Anuma",
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
  const jsonRpcResponse = (await parseResponseBody(response)) as Record<
    string,
    unknown
  >;
  if (jsonRpcResponse.error) {
    const err = jsonRpcResponse.error as Record<string, unknown>;
    throw new Error(
      `MCP initialization error: ${err.message || JSON.stringify(err)}`
    );
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
  sessionCache.set(await hashToken(accessToken), sessionId);

  return sessionId;
}

/**
 * Get or create an MCP session for the given access token
 */
async function ensureMCPSession(accessToken: string): Promise<string> {
  const cached = sessionCache.get(await hashToken(accessToken));
  if (cached) {
    return cached;
  }
  return initializeMCPSession(accessToken);
}

/**
 * Call a tool on the GitHub MCP server using JSON-RPC 2.0
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
      sessionCache.delete(await hashToken(accessToken));
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

      const retryJsonRpcResponse = (await parseResponseBody(
        retryResponse
      )) as Record<string, unknown>;
      if (retryJsonRpcResponse.error) {
        const err = retryJsonRpcResponse.error as Record<string, unknown>;
        throw new Error(
          `MCP tool error: ${err.message || JSON.stringify(err)}`
        );
      }

      return retryJsonRpcResponse.result as T;
    }

    // Try to get error details from response
    const errorBody = await response.text().catch(() => "");
    throw new Error(
      `MCP request failed: ${response.status} ${response.statusText}${errorBody ? ` - ${errorBody}` : ""}`
    );
  }

  const jsonRpcResponse = (await parseResponseBody(response)) as Record<
    string,
    unknown
  >;

  // Check for JSON-RPC error
  if (jsonRpcResponse.error) {
    const err = jsonRpcResponse.error as Record<string, unknown>;
    throw new Error(`MCP tool error: ${err.message || JSON.stringify(err)}`);
  }

  return jsonRpcResponse.result as T;
}

// ============================================================================
// CONTEXT TOOLS
// ============================================================================

/**
 * MCP Tool: get_me
 * Get details of the authenticated GitHub user
 */
export function createGitHubGetMeTool(
  getAccessToken: () => string | null,
  requestGitHubAccess: () => Promise<string>
): ToolConfig {
  return {
    type: "function",
    function: {
      name: "github_get_me",
      description:
        "Get details of the authenticated GitHub user including username, email, bio, and account info.",
      arguments: {
        type: "object",
        properties: {},
      },
    },
    executor: async (args: Record<string, unknown>) => {
      let token = getAccessToken();
      if (!token) {
        token = await requestGitHubAccess();
      }
      try {
        return await callMCPTool(token, "get_me", args);
      } catch (error) {
        return `Error getting GitHub user: ${error instanceof Error ? error.message : String(error)}`;
      }
    },
    autoExecute: true,
  };
}

// ============================================================================
// REPOSITORY TOOLS
// ============================================================================

/**
 * MCP Tool: search_repositories
 * Search for GitHub repositories
 */
export function createGitHubSearchRepositoriesTool(
  getAccessToken: () => string | null,
  requestGitHubAccess: () => Promise<string>
): ToolConfig {
  return {
    type: "function",
    function: {
      name: "github_search_repositories",
      description:
        "Search for GitHub repositories by keyword, language, topic, or other criteria.",
      arguments: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description:
              "Search query using GitHub search syntax (e.g., 'language:typescript stars:>100').",
          },
          page: {
            type: "number",
            description: "Page number for pagination (default: 1).",
          },
          perPage: {
            type: "number",
            description: "Results per page (default: 30, max: 100).",
          },
        },
        required: ["query"],
      },
    },
    executor: async (args: Record<string, unknown>) => {
      let token = getAccessToken();
      if (!token) {
        token = await requestGitHubAccess();
      }
      try {
        return await callMCPTool(token, "search_repositories", args);
      } catch (error) {
        return `Error searching repositories: ${error instanceof Error ? error.message : String(error)}`;
      }
    },
    autoExecute: true,
  };
}

/**
 * MCP Tool: get_file_contents
 * Get the contents of a file or directory from a GitHub repository
 */
export function createGitHubGetFileContentsTool(
  getAccessToken: () => string | null,
  requestGitHubAccess: () => Promise<string>
): ToolConfig {
  return {
    type: "function",
    function: {
      name: "github_get_file_contents",
      description:
        "Get the contents of a file or directory from a GitHub repository. Returns file content for files and directory listing for directories.",
      arguments: {
        type: "object",
        properties: {
          owner: {
            type: "string",
            description: "Repository owner (user or organization).",
          },
          repo: {
            type: "string",
            description: "Repository name.",
          },
          path: {
            type: "string",
            description: "Path to the file or directory within the repository.",
          },
          branch: {
            type: "string",
            description: "Branch name (defaults to the repository's default branch).",
          },
        },
        required: ["owner", "repo", "path"],
      },
    },
    executor: async (args: Record<string, unknown>) => {
      let token = getAccessToken();
      if (!token) {
        token = await requestGitHubAccess();
      }
      try {
        return await callMCPTool(token, "get_file_contents", args);
      } catch (error) {
        return `Error getting file contents: ${error instanceof Error ? error.message : String(error)}`;
      }
    },
    autoExecute: true,
  };
}

/**
 * MCP Tool: create_or_update_file
 * Create or update a single file in a GitHub repository
 */
export function createGitHubCreateOrUpdateFileTool(
  getAccessToken: () => string | null,
  requestGitHubAccess: () => Promise<string>
): ToolConfig {
  return {
    type: "function",
    function: {
      name: "github_create_or_update_file",
      description:
        "Create or update a single file in a GitHub repository. To update an existing file, provide the current SHA of the file.",
      arguments: {
        type: "object",
        properties: {
          owner: {
            type: "string",
            description: "Repository owner (user or organization).",
          },
          repo: {
            type: "string",
            description: "Repository name.",
          },
          path: {
            type: "string",
            description: "Path to the file within the repository.",
          },
          content: {
            type: "string",
            description: "The file content (will be Base64-encoded by the server).",
          },
          message: {
            type: "string",
            description: "Commit message for the file change.",
          },
          branch: {
            type: "string",
            description: "Branch name (defaults to the repository's default branch).",
          },
          sha: {
            type: "string",
            description: "SHA of the file being replaced (required for updates).",
          },
        },
        required: ["owner", "repo", "path", "content", "message"],
      },
    },
    executor: async (args: Record<string, unknown>) => {
      let token = getAccessToken();
      if (!token) {
        token = await requestGitHubAccess();
      }
      try {
        return await callMCPTool(token, "create_or_update_file", args);
      } catch (error) {
        return `Error creating/updating file: ${error instanceof Error ? error.message : String(error)}`;
      }
    },
    autoExecute: false,
  };
}

/**
 * MCP Tool: push_files
 * Push multiple files to a GitHub repository in a single commit
 */
export function createGitHubPushFilesTool(
  getAccessToken: () => string | null,
  requestGitHubAccess: () => Promise<string>
): ToolConfig {
  return {
    type: "function",
    function: {
      name: "github_push_files",
      description:
        "Push multiple files to a GitHub repository in a single commit. Useful for batch file operations.",
      arguments: {
        type: "object",
        properties: {
          owner: {
            type: "string",
            description: "Repository owner (user or organization).",
          },
          repo: {
            type: "string",
            description: "Repository name.",
          },
          branch: {
            type: "string",
            description: "Branch to push to.",
          },
          message: {
            type: "string",
            description: "Commit message for the push.",
          },
          files: {
            type: "array",
            description: "Array of files to push.",
            items: {
              type: "object",
              properties: {
                path: {
                  type: "string",
                  description: "File path within the repository.",
                },
                content: {
                  type: "string",
                  description: "File content.",
                },
              },
              required: ["path", "content"],
            },
          },
        },
        required: ["owner", "repo", "branch", "message", "files"],
      },
    },
    executor: async (args: Record<string, unknown>) => {
      let token = getAccessToken();
      if (!token) {
        token = await requestGitHubAccess();
      }
      try {
        return await callMCPTool(token, "push_files", args);
      } catch (error) {
        return `Error pushing files: ${error instanceof Error ? error.message : String(error)}`;
      }
    },
    autoExecute: false,
  };
}

/**
 * MCP Tool: create_repository
 * Create a new GitHub repository
 */
export function createGitHubCreateRepositoryTool(
  getAccessToken: () => string | null,
  requestGitHubAccess: () => Promise<string>
): ToolConfig {
  return {
    type: "function",
    function: {
      name: "github_create_repository",
      description:
        "Create a new GitHub repository for the authenticated user or an organization.",
      arguments: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "Repository name.",
          },
          description: {
            type: "string",
            description: "Repository description.",
          },
          private: {
            type: "boolean",
            description: "Whether the repository is private (default: false).",
          },
          autoInit: {
            type: "boolean",
            description: "Initialize with a README (default: false).",
          },
        },
        required: ["name"],
      },
    },
    executor: async (args: Record<string, unknown>) => {
      let token = getAccessToken();
      if (!token) {
        token = await requestGitHubAccess();
      }
      try {
        return await callMCPTool(token, "create_repository", args);
      } catch (error) {
        return `Error creating repository: ${error instanceof Error ? error.message : String(error)}`;
      }
    },
    autoExecute: false,
  };
}

/**
 * MCP Tool: fork_repository
 * Fork a GitHub repository
 */
export function createGitHubForkRepositoryTool(
  getAccessToken: () => string | null,
  requestGitHubAccess: () => Promise<string>
): ToolConfig {
  return {
    type: "function",
    function: {
      name: "github_fork_repository",
      description:
        "Fork a GitHub repository to your account or a specified organization.",
      arguments: {
        type: "object",
        properties: {
          owner: {
            type: "string",
            description: "Repository owner (user or organization).",
          },
          repo: {
            type: "string",
            description: "Repository name.",
          },
          organization: {
            type: "string",
            description: "Organization to fork to (defaults to authenticated user).",
          },
        },
        required: ["owner", "repo"],
      },
    },
    executor: async (args: Record<string, unknown>) => {
      let token = getAccessToken();
      if (!token) {
        token = await requestGitHubAccess();
      }
      try {
        return await callMCPTool(token, "fork_repository", args);
      } catch (error) {
        return `Error forking repository: ${error instanceof Error ? error.message : String(error)}`;
      }
    },
    autoExecute: false,
  };
}

/**
 * MCP Tool: create_branch
 * Create a new branch in a GitHub repository
 */
export function createGitHubCreateBranchTool(
  getAccessToken: () => string | null,
  requestGitHubAccess: () => Promise<string>
): ToolConfig {
  return {
    type: "function",
    function: {
      name: "github_create_branch",
      description:
        "Create a new branch in a GitHub repository from an existing branch or the default branch.",
      arguments: {
        type: "object",
        properties: {
          owner: {
            type: "string",
            description: "Repository owner (user or organization).",
          },
          repo: {
            type: "string",
            description: "Repository name.",
          },
          branch: {
            type: "string",
            description: "Name of the new branch to create.",
          },
          from_branch: {
            type: "string",
            description: "Branch to create from (defaults to the repository's default branch).",
          },
        },
        required: ["owner", "repo", "branch"],
      },
    },
    executor: async (args: Record<string, unknown>) => {
      let token = getAccessToken();
      if (!token) {
        token = await requestGitHubAccess();
      }
      try {
        return await callMCPTool(token, "create_branch", args);
      } catch (error) {
        return `Error creating branch: ${error instanceof Error ? error.message : String(error)}`;
      }
    },
    autoExecute: false,
  };
}

/**
 * MCP Tool: list_branches
 * List branches in a GitHub repository
 */
export function createGitHubListBranchesTool(
  getAccessToken: () => string | null,
  requestGitHubAccess: () => Promise<string>
): ToolConfig {
  return {
    type: "function",
    function: {
      name: "github_list_branches",
      description:
        "List branches in a GitHub repository with pagination support.",
      arguments: {
        type: "object",
        properties: {
          owner: {
            type: "string",
            description: "Repository owner (user or organization).",
          },
          repo: {
            type: "string",
            description: "Repository name.",
          },
          page: {
            type: "number",
            description: "Page number for pagination (default: 1).",
          },
          perPage: {
            type: "number",
            description: "Results per page (default: 30, max: 100).",
          },
        },
        required: ["owner", "repo"],
      },
    },
    executor: async (args: Record<string, unknown>) => {
      let token = getAccessToken();
      if (!token) {
        token = await requestGitHubAccess();
      }
      try {
        return await callMCPTool(token, "list_branches", args);
      } catch (error) {
        return `Error listing branches: ${error instanceof Error ? error.message : String(error)}`;
      }
    },
    autoExecute: true,
  };
}

/**
 * MCP Tool: list_commits
 * List commits in a GitHub repository
 */
export function createGitHubListCommitsTool(
  getAccessToken: () => string | null,
  requestGitHubAccess: () => Promise<string>
): ToolConfig {
  return {
    type: "function",
    function: {
      name: "github_list_commits",
      description:
        "List commits in a GitHub repository, optionally filtered by branch/SHA.",
      arguments: {
        type: "object",
        properties: {
          owner: {
            type: "string",
            description: "Repository owner (user or organization).",
          },
          repo: {
            type: "string",
            description: "Repository name.",
          },
          sha: {
            type: "string",
            description: "Branch name or commit SHA to list commits from.",
          },
          page: {
            type: "number",
            description: "Page number for pagination (default: 1).",
          },
          perPage: {
            type: "number",
            description: "Results per page (default: 30, max: 100).",
          },
        },
        required: ["owner", "repo"],
      },
    },
    executor: async (args: Record<string, unknown>) => {
      let token = getAccessToken();
      if (!token) {
        token = await requestGitHubAccess();
      }
      try {
        return await callMCPTool(token, "list_commits", args);
      } catch (error) {
        return `Error listing commits: ${error instanceof Error ? error.message : String(error)}`;
      }
    },
    autoExecute: true,
  };
}

/**
 * MCP Tool: get_commit
 * Get details of a specific commit
 */
export function createGitHubGetCommitTool(
  getAccessToken: () => string | null,
  requestGitHubAccess: () => Promise<string>
): ToolConfig {
  return {
    type: "function",
    function: {
      name: "github_get_commit",
      description:
        "Get details of a specific commit in a GitHub repository including diff and file changes.",
      arguments: {
        type: "object",
        properties: {
          owner: {
            type: "string",
            description: "Repository owner (user or organization).",
          },
          repo: {
            type: "string",
            description: "Repository name.",
          },
          ref: {
            type: "string",
            description: "Commit SHA, branch name, or tag name.",
          },
        },
        required: ["owner", "repo", "ref"],
      },
    },
    executor: async (args: Record<string, unknown>) => {
      let token = getAccessToken();
      if (!token) {
        token = await requestGitHubAccess();
      }
      try {
        return await callMCPTool(token, "get_commit", args);
      } catch (error) {
        return `Error getting commit: ${error instanceof Error ? error.message : String(error)}`;
      }
    },
    autoExecute: true,
  };
}

/**
 * MCP Tool: list_tags
 * List tags in a GitHub repository
 */
export function createGitHubListTagsTool(
  getAccessToken: () => string | null,
  requestGitHubAccess: () => Promise<string>
): ToolConfig {
  return {
    type: "function",
    function: {
      name: "github_list_tags",
      description:
        "List tags in a GitHub repository with pagination support.",
      arguments: {
        type: "object",
        properties: {
          owner: {
            type: "string",
            description: "Repository owner (user or organization).",
          },
          repo: {
            type: "string",
            description: "Repository name.",
          },
          page: {
            type: "number",
            description: "Page number for pagination (default: 1).",
          },
          perPage: {
            type: "number",
            description: "Results per page (default: 30, max: 100).",
          },
        },
        required: ["owner", "repo"],
      },
    },
    executor: async (args: Record<string, unknown>) => {
      let token = getAccessToken();
      if (!token) {
        token = await requestGitHubAccess();
      }
      try {
        return await callMCPTool(token, "list_tags", args);
      } catch (error) {
        return `Error listing tags: ${error instanceof Error ? error.message : String(error)}`;
      }
    },
    autoExecute: true,
  };
}

/**
 * MCP Tool: list_releases
 * List releases in a GitHub repository
 */
export function createGitHubListReleasesTool(
  getAccessToken: () => string | null,
  requestGitHubAccess: () => Promise<string>
): ToolConfig {
  return {
    type: "function",
    function: {
      name: "github_list_releases",
      description:
        "List releases in a GitHub repository with pagination support.",
      arguments: {
        type: "object",
        properties: {
          owner: {
            type: "string",
            description: "Repository owner (user or organization).",
          },
          repo: {
            type: "string",
            description: "Repository name.",
          },
          page: {
            type: "number",
            description: "Page number for pagination (default: 1).",
          },
          perPage: {
            type: "number",
            description: "Results per page (default: 30, max: 100).",
          },
        },
        required: ["owner", "repo"],
      },
    },
    executor: async (args: Record<string, unknown>) => {
      let token = getAccessToken();
      if (!token) {
        token = await requestGitHubAccess();
      }
      try {
        return await callMCPTool(token, "list_releases", args);
      } catch (error) {
        return `Error listing releases: ${error instanceof Error ? error.message : String(error)}`;
      }
    },
    autoExecute: true,
  };
}

// ============================================================================
// ISSUE TOOLS
// ============================================================================

/**
 * MCP Tool: get_issue
 * Get details of a specific issue
 */
export function createGitHubGetIssueTool(
  getAccessToken: () => string | null,
  requestGitHubAccess: () => Promise<string>
): ToolConfig {
  return {
    type: "function",
    function: {
      name: "github_get_issue",
      description:
        "Get details of a specific issue in a GitHub repository including title, body, labels, assignees, and status.",
      arguments: {
        type: "object",
        properties: {
          owner: {
            type: "string",
            description: "Repository owner (user or organization).",
          },
          repo: {
            type: "string",
            description: "Repository name.",
          },
          issue_number: {
            type: "number",
            description: "Issue number.",
          },
        },
        required: ["owner", "repo", "issue_number"],
      },
    },
    executor: async (args: Record<string, unknown>) => {
      let token = getAccessToken();
      if (!token) {
        token = await requestGitHubAccess();
      }
      try {
        return await callMCPTool(token, "get_issue", args);
      } catch (error) {
        return `Error getting issue: ${error instanceof Error ? error.message : String(error)}`;
      }
    },
    autoExecute: true,
  };
}

/**
 * MCP Tool: create_issue
 * Create a new issue in a GitHub repository
 */
export function createGitHubCreateIssueTool(
  getAccessToken: () => string | null,
  requestGitHubAccess: () => Promise<string>
): ToolConfig {
  return {
    type: "function",
    function: {
      name: "github_create_issue",
      description:
        "Create a new issue in a GitHub repository with optional labels and assignees.",
      arguments: {
        type: "object",
        properties: {
          owner: {
            type: "string",
            description: "Repository owner (user or organization).",
          },
          repo: {
            type: "string",
            description: "Repository name.",
          },
          title: {
            type: "string",
            description: "Issue title.",
          },
          body: {
            type: "string",
            description: "Issue body content (Markdown supported).",
          },
          labels: {
            type: "array",
            description: "Array of label names to apply.",
            items: { type: "string" },
          },
          assignees: {
            type: "array",
            description: "Array of usernames to assign.",
            items: { type: "string" },
          },
        },
        required: ["owner", "repo", "title"],
      },
    },
    executor: async (args: Record<string, unknown>) => {
      let token = getAccessToken();
      if (!token) {
        token = await requestGitHubAccess();
      }
      try {
        return await callMCPTool(token, "create_issue", args);
      } catch (error) {
        return `Error creating issue: ${error instanceof Error ? error.message : String(error)}`;
      }
    },
    autoExecute: false,
  };
}

/**
 * MCP Tool: list_issues
 * List issues in a GitHub repository
 */
export function createGitHubListIssuesTool(
  getAccessToken: () => string | null,
  requestGitHubAccess: () => Promise<string>
): ToolConfig {
  return {
    type: "function",
    function: {
      name: "github_list_issues",
      description:
        "List issues in a GitHub repository with filtering and pagination support.",
      arguments: {
        type: "object",
        properties: {
          owner: {
            type: "string",
            description: "Repository owner (user or organization).",
          },
          repo: {
            type: "string",
            description: "Repository name.",
          },
          state: {
            type: "string",
            description: "Filter by state: 'open', 'closed', or 'all' (default: 'open').",
          },
          labels: {
            type: "string",
            description: "Comma-separated list of label names to filter by.",
          },
          sort: {
            type: "string",
            description: "Sort by: 'created', 'updated', or 'comments' (default: 'created').",
          },
          direction: {
            type: "string",
            description: "Sort direction: 'asc' or 'desc' (default: 'desc').",
          },
          page: {
            type: "number",
            description: "Page number for pagination (default: 1).",
          },
          perPage: {
            type: "number",
            description: "Results per page (default: 30, max: 100).",
          },
        },
        required: ["owner", "repo"],
      },
    },
    executor: async (args: Record<string, unknown>) => {
      let token = getAccessToken();
      if (!token) {
        token = await requestGitHubAccess();
      }
      try {
        return await callMCPTool(token, "list_issues", args);
      } catch (error) {
        return `Error listing issues: ${error instanceof Error ? error.message : String(error)}`;
      }
    },
    autoExecute: true,
  };
}

/**
 * MCP Tool: search_issues
 * Search for issues across GitHub
 */
export function createGitHubSearchIssuesTool(
  getAccessToken: () => string | null,
  requestGitHubAccess: () => Promise<string>
): ToolConfig {
  return {
    type: "function",
    function: {
      name: "github_search_issues",
      description:
        "Search for issues across GitHub repositories using GitHub search syntax (e.g., 'repo:owner/name is:open label:bug').",
      arguments: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description:
              "Search query using GitHub search syntax for issues.",
          },
          page: {
            type: "number",
            description: "Page number for pagination (default: 1).",
          },
          perPage: {
            type: "number",
            description: "Results per page (default: 30, max: 100).",
          },
        },
        required: ["query"],
      },
    },
    executor: async (args: Record<string, unknown>) => {
      let token = getAccessToken();
      if (!token) {
        token = await requestGitHubAccess();
      }
      try {
        return await callMCPTool(token, "search_issues", args);
      } catch (error) {
        return `Error searching issues: ${error instanceof Error ? error.message : String(error)}`;
      }
    },
    autoExecute: true,
  };
}

/**
 * MCP Tool: add_issue_comment
 * Add a comment to an issue or pull request
 */
export function createGitHubAddIssueCommentTool(
  getAccessToken: () => string | null,
  requestGitHubAccess: () => Promise<string>
): ToolConfig {
  return {
    type: "function",
    function: {
      name: "github_add_issue_comment",
      description:
        "Add a comment to an existing issue or pull request in a GitHub repository.",
      arguments: {
        type: "object",
        properties: {
          owner: {
            type: "string",
            description: "Repository owner (user or organization).",
          },
          repo: {
            type: "string",
            description: "Repository name.",
          },
          issue_number: {
            type: "number",
            description: "Issue or pull request number.",
          },
          body: {
            type: "string",
            description: "Comment body content (Markdown supported).",
          },
        },
        required: ["owner", "repo", "issue_number", "body"],
      },
    },
    executor: async (args: Record<string, unknown>) => {
      let token = getAccessToken();
      if (!token) {
        token = await requestGitHubAccess();
      }
      try {
        return await callMCPTool(token, "add_issue_comment", args);
      } catch (error) {
        return `Error adding issue comment: ${error instanceof Error ? error.message : String(error)}`;
      }
    },
    autoExecute: false,
  };
}

// ============================================================================
// PULL REQUEST TOOLS
// ============================================================================

/**
 * MCP Tool: get_pull_request
 * Get details of a specific pull request
 */
export function createGitHubGetPullRequestTool(
  getAccessToken: () => string | null,
  requestGitHubAccess: () => Promise<string>
): ToolConfig {
  return {
    type: "function",
    function: {
      name: "github_get_pull_request",
      description:
        "Get details of a specific pull request including title, body, diff stats, review status, and merge status.",
      arguments: {
        type: "object",
        properties: {
          owner: {
            type: "string",
            description: "Repository owner (user or organization).",
          },
          repo: {
            type: "string",
            description: "Repository name.",
          },
          pull_number: {
            type: "number",
            description: "Pull request number.",
          },
        },
        required: ["owner", "repo", "pull_number"],
      },
    },
    executor: async (args: Record<string, unknown>) => {
      let token = getAccessToken();
      if (!token) {
        token = await requestGitHubAccess();
      }
      try {
        return await callMCPTool(token, "get_pull_request", args);
      } catch (error) {
        return `Error getting pull request: ${error instanceof Error ? error.message : String(error)}`;
      }
    },
    autoExecute: true,
  };
}

/**
 * MCP Tool: create_pull_request
 * Create a new pull request
 */
export function createGitHubCreatePullRequestTool(
  getAccessToken: () => string | null,
  requestGitHubAccess: () => Promise<string>
): ToolConfig {
  return {
    type: "function",
    function: {
      name: "github_create_pull_request",
      description:
        "Create a new pull request in a GitHub repository to merge changes from one branch to another.",
      arguments: {
        type: "object",
        properties: {
          owner: {
            type: "string",
            description: "Repository owner (user or organization).",
          },
          repo: {
            type: "string",
            description: "Repository name.",
          },
          title: {
            type: "string",
            description: "Pull request title.",
          },
          head: {
            type: "string",
            description: "The branch containing the changes (source branch).",
          },
          base: {
            type: "string",
            description: "The branch to merge into (target branch).",
          },
          body: {
            type: "string",
            description: "Pull request body content (Markdown supported).",
          },
          draft: {
            type: "boolean",
            description: "Create as a draft pull request (default: false).",
          },
        },
        required: ["owner", "repo", "title", "head", "base"],
      },
    },
    executor: async (args: Record<string, unknown>) => {
      let token = getAccessToken();
      if (!token) {
        token = await requestGitHubAccess();
      }
      try {
        return await callMCPTool(token, "create_pull_request", args);
      } catch (error) {
        return `Error creating pull request: ${error instanceof Error ? error.message : String(error)}`;
      }
    },
    autoExecute: false,
  };
}

/**
 * MCP Tool: update_pull_request
 * Update an existing pull request
 */
export function createGitHubUpdatePullRequestTool(
  getAccessToken: () => string | null,
  requestGitHubAccess: () => Promise<string>
): ToolConfig {
  return {
    type: "function",
    function: {
      name: "github_update_pull_request",
      description:
        "Update an existing pull request's title, body, or state in a GitHub repository.",
      arguments: {
        type: "object",
        properties: {
          owner: {
            type: "string",
            description: "Repository owner (user or organization).",
          },
          repo: {
            type: "string",
            description: "Repository name.",
          },
          pull_number: {
            type: "number",
            description: "Pull request number.",
          },
          title: {
            type: "string",
            description: "New pull request title.",
          },
          body: {
            type: "string",
            description: "New pull request body content (Markdown supported).",
          },
          state: {
            type: "string",
            description: "New state: 'open' or 'closed'.",
          },
        },
        required: ["owner", "repo", "pull_number"],
      },
    },
    executor: async (args: Record<string, unknown>) => {
      let token = getAccessToken();
      if (!token) {
        token = await requestGitHubAccess();
      }
      try {
        return await callMCPTool(token, "update_pull_request", args);
      } catch (error) {
        return `Error updating pull request: ${error instanceof Error ? error.message : String(error)}`;
      }
    },
    autoExecute: false,
  };
}

/**
 * MCP Tool: list_pull_requests
 * List pull requests in a GitHub repository
 */
export function createGitHubListPullRequestsTool(
  getAccessToken: () => string | null,
  requestGitHubAccess: () => Promise<string>
): ToolConfig {
  return {
    type: "function",
    function: {
      name: "github_list_pull_requests",
      description:
        "List pull requests in a GitHub repository with filtering and pagination support.",
      arguments: {
        type: "object",
        properties: {
          owner: {
            type: "string",
            description: "Repository owner (user or organization).",
          },
          repo: {
            type: "string",
            description: "Repository name.",
          },
          state: {
            type: "string",
            description: "Filter by state: 'open', 'closed', or 'all' (default: 'open').",
          },
          sort: {
            type: "string",
            description: "Sort by: 'created', 'updated', 'popularity', or 'long-running' (default: 'created').",
          },
          direction: {
            type: "string",
            description: "Sort direction: 'asc' or 'desc' (default: 'desc').",
          },
          page: {
            type: "number",
            description: "Page number for pagination (default: 1).",
          },
          perPage: {
            type: "number",
            description: "Results per page (default: 30, max: 100).",
          },
        },
        required: ["owner", "repo"],
      },
    },
    executor: async (args: Record<string, unknown>) => {
      let token = getAccessToken();
      if (!token) {
        token = await requestGitHubAccess();
      }
      try {
        return await callMCPTool(token, "list_pull_requests", args);
      } catch (error) {
        return `Error listing pull requests: ${error instanceof Error ? error.message : String(error)}`;
      }
    },
    autoExecute: true,
  };
}

/**
 * MCP Tool: search_pull_requests
 * Search for pull requests across GitHub (uses search_issues with type:pr)
 */
export function createGitHubSearchPullRequestsTool(
  getAccessToken: () => string | null,
  requestGitHubAccess: () => Promise<string>
): ToolConfig {
  return {
    type: "function",
    function: {
      name: "github_search_pull_requests",
      description:
        "Search for pull requests across GitHub repositories. Uses the issues search endpoint with 'type:pr' qualifier. " +
        "Include 'type:pr' in your query or it will be added automatically.",
      arguments: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description:
              "Search query using GitHub search syntax for pull requests (e.g., 'repo:owner/name is:open type:pr').",
          },
          page: {
            type: "number",
            description: "Page number for pagination (default: 1).",
          },
          perPage: {
            type: "number",
            description: "Results per page (default: 30, max: 100).",
          },
        },
        required: ["query"],
      },
    },
    executor: async (args: Record<string, unknown>) => {
      let token = getAccessToken();
      if (!token) {
        token = await requestGitHubAccess();
      }
      try {
        return await callMCPTool(token, "search_pull_requests", args);
      } catch (error) {
        return `Error searching pull requests: ${error instanceof Error ? error.message : String(error)}`;
      }
    },
    autoExecute: true,
  };
}

/**
 * MCP Tool: merge_pull_request
 * Merge a pull request
 */
export function createGitHubMergePullRequestTool(
  getAccessToken: () => string | null,
  requestGitHubAccess: () => Promise<string>
): ToolConfig {
  return {
    type: "function",
    function: {
      name: "github_merge_pull_request",
      description:
        "Merge a pull request in a GitHub repository with optional merge method selection.",
      arguments: {
        type: "object",
        properties: {
          owner: {
            type: "string",
            description: "Repository owner (user or organization).",
          },
          repo: {
            type: "string",
            description: "Repository name.",
          },
          pull_number: {
            type: "number",
            description: "Pull request number.",
          },
          commit_title: {
            type: "string",
            description: "Custom commit title for the merge commit.",
          },
          commit_message: {
            type: "string",
            description: "Custom commit message for the merge commit.",
          },
          merge_method: {
            type: "string",
            description: "Merge method: 'merge', 'squash', or 'rebase' (default: 'merge').",
          },
        },
        required: ["owner", "repo", "pull_number"],
      },
    },
    executor: async (args: Record<string, unknown>) => {
      let token = getAccessToken();
      if (!token) {
        token = await requestGitHubAccess();
      }
      try {
        return await callMCPTool(token, "merge_pull_request", args);
      } catch (error) {
        return `Error merging pull request: ${error instanceof Error ? error.message : String(error)}`;
      }
    },
    autoExecute: false,
  };
}

// ============================================================================
// USER TOOLS
// ============================================================================

/**
 * MCP Tool: search_users
 * Search for GitHub users
 */
export function createGitHubSearchUsersTool(
  getAccessToken: () => string | null,
  requestGitHubAccess: () => Promise<string>
): ToolConfig {
  return {
    type: "function",
    function: {
      name: "github_search_users",
      description:
        "Search for GitHub users by username, name, email, or other criteria.",
      arguments: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description:
              "Search query using GitHub user search syntax (e.g., 'fullname:John language:typescript').",
          },
          page: {
            type: "number",
            description: "Page number for pagination (default: 1).",
          },
          perPage: {
            type: "number",
            description: "Results per page (default: 30, max: 100).",
          },
        },
        required: ["query"],
      },
    },
    executor: async (args: Record<string, unknown>) => {
      let token = getAccessToken();
      if (!token) {
        token = await requestGitHubAccess();
      }
      try {
        return await callMCPTool(token, "search_users", args);
      } catch (error) {
        return `Error searching users: ${error instanceof Error ? error.message : String(error)}`;
      }
    },
    autoExecute: true,
  };
}

/**
 * MCP Tool: search_orgs
 * Search for GitHub organizations (uses search_users with type:org)
 */
export function createGitHubSearchOrgsTool(
  getAccessToken: () => string | null,
  requestGitHubAccess: () => Promise<string>
): ToolConfig {
  return {
    type: "function",
    function: {
      name: "github_search_orgs",
      description:
        "Search for GitHub organizations. Uses the users search endpoint with 'type:org' qualifier. " +
        "Include 'type:org' in your query or it will be added automatically.",
      arguments: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description:
              "Search query using GitHub search syntax for organizations (e.g., 'type:org language:python').",
          },
          page: {
            type: "number",
            description: "Page number for pagination (default: 1).",
          },
          perPage: {
            type: "number",
            description: "Results per page (default: 30, max: 100).",
          },
        },
        required: ["query"],
      },
    },
    executor: async (args: Record<string, unknown>) => {
      let token = getAccessToken();
      if (!token) {
        token = await requestGitHubAccess();
      }
      try {
        return await callMCPTool(token, "search_orgs", args);
      } catch (error) {
        return `Error searching organizations: ${error instanceof Error ? error.message : String(error)}`;
      }
    },
    autoExecute: true,
  };
}

// ============================================================================
// CODE SEARCH TOOLS
// ============================================================================

/**
 * MCP Tool: search_code
 * Search for code across GitHub repositories
 */
export function createGitHubSearchCodeTool(
  getAccessToken: () => string | null,
  requestGitHubAccess: () => Promise<string>
): ToolConfig {
  return {
    type: "function",
    function: {
      name: "github_search_code",
      description:
        "Search for code across GitHub repositories using GitHub code search syntax (e.g., 'repo:owner/name language:typescript function').",
      arguments: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description:
              "Search query using GitHub code search syntax.",
          },
          page: {
            type: "number",
            description: "Page number for pagination (default: 1).",
          },
          perPage: {
            type: "number",
            description: "Results per page (default: 30, max: 100).",
          },
        },
        required: ["query"],
      },
    },
    executor: async (args: Record<string, unknown>) => {
      let token = getAccessToken();
      if (!token) {
        token = await requestGitHubAccess();
      }
      try {
        return await callMCPTool(token, "search_code", args);
      } catch (error) {
        return `Error searching code: ${error instanceof Error ? error.message : String(error)}`;
      }
    },
    autoExecute: true,
  };
}

// ============================================================================
// ACTIONS TOOLS
// ============================================================================

/**
 * MCP Tool: list_workflow_runs
 * List workflow runs for a repository
 */
export function createGitHubListWorkflowRunsTool(
  getAccessToken: () => string | null,
  requestGitHubAccess: () => Promise<string>
): ToolConfig {
  return {
    type: "function",
    function: {
      name: "github_list_workflow_runs",
      description:
        "List workflow runs for a GitHub repository, optionally filtered by workflow ID and status.",
      arguments: {
        type: "object",
        properties: {
          owner: {
            type: "string",
            description: "Repository owner (user or organization).",
          },
          repo: {
            type: "string",
            description: "Repository name.",
          },
          workflow_id: {
            type: "string",
            description: "Workflow ID or filename to filter by (e.g., 'ci.yml').",
          },
          status: {
            type: "string",
            description:
              "Filter by status: 'completed', 'action_required', 'cancelled', 'failure', 'neutral', 'skipped', 'stale', 'success', 'timed_out', 'in_progress', 'queued', 'requested', 'waiting', 'pending'.",
          },
          page: {
            type: "number",
            description: "Page number for pagination (default: 1).",
          },
          perPage: {
            type: "number",
            description: "Results per page (default: 30, max: 100).",
          },
        },
        required: ["owner", "repo"],
      },
    },
    executor: async (args: Record<string, unknown>) => {
      let token = getAccessToken();
      if (!token) {
        token = await requestGitHubAccess();
      }
      try {
        return await callMCPTool(token, "list_workflow_runs", args);
      } catch (error) {
        return `Error listing workflow runs: ${error instanceof Error ? error.message : String(error)}`;
      }
    },
    autoExecute: true,
  };
}

/**
 * MCP Tool: get_workflow_run
 * Get details of a specific workflow run
 */
export function createGitHubGetWorkflowRunTool(
  getAccessToken: () => string | null,
  requestGitHubAccess: () => Promise<string>
): ToolConfig {
  return {
    type: "function",
    function: {
      name: "github_get_workflow_run",
      description:
        "Get details of a specific GitHub Actions workflow run including status, conclusion, and timing.",
      arguments: {
        type: "object",
        properties: {
          owner: {
            type: "string",
            description: "Repository owner (user or organization).",
          },
          repo: {
            type: "string",
            description: "Repository name.",
          },
          run_id: {
            type: "number",
            description: "Workflow run ID.",
          },
        },
        required: ["owner", "repo", "run_id"],
      },
    },
    executor: async (args: Record<string, unknown>) => {
      let token = getAccessToken();
      if (!token) {
        token = await requestGitHubAccess();
      }
      try {
        return await callMCPTool(token, "get_workflow_run", args);
      } catch (error) {
        return `Error getting workflow run: ${error instanceof Error ? error.message : String(error)}`;
      }
    },
    autoExecute: true,
  };
}

/**
 * MCP Tool: get_job_logs
 * Get logs for a specific job in a workflow run
 */
export function createGitHubGetJobLogsTool(
  getAccessToken: () => string | null,
  requestGitHubAccess: () => Promise<string>
): ToolConfig {
  return {
    type: "function",
    function: {
      name: "github_get_job_logs",
      description:
        "Get logs for a specific job in a GitHub Actions workflow run. Useful for debugging failed jobs.",
      arguments: {
        type: "object",
        properties: {
          owner: {
            type: "string",
            description: "Repository owner (user or organization).",
          },
          repo: {
            type: "string",
            description: "Repository name.",
          },
          job_id: {
            type: "number",
            description: "Job ID within the workflow run.",
          },
        },
        required: ["owner", "repo", "job_id"],
      },
    },
    executor: async (args: Record<string, unknown>) => {
      let token = getAccessToken();
      if (!token) {
        token = await requestGitHubAccess();
      }
      try {
        return await callMCPTool(token, "get_job_logs", args);
      } catch (error) {
        return `Error getting job logs: ${error instanceof Error ? error.message : String(error)}`;
      }
    },
    autoExecute: true,
  };
}

// ============================================================================
// TOOL FACTORY
// ============================================================================

/**
 * Create all GitHub MCP tools
 *
 * Returns tools that communicate with GitHub's hosted MCP server.
 * The MCP server handles all GitHub API interactions.
 */
export function createGitHubTools(
  getAccessToken: () => string | null,
  requestGitHubAccess: () => Promise<string>
): ToolConfig[] {
  return [
    // Context
    createGitHubGetMeTool(getAccessToken, requestGitHubAccess),

    // Repos
    createGitHubSearchRepositoriesTool(getAccessToken, requestGitHubAccess),
    createGitHubGetFileContentsTool(getAccessToken, requestGitHubAccess),
    createGitHubCreateOrUpdateFileTool(getAccessToken, requestGitHubAccess),
    createGitHubPushFilesTool(getAccessToken, requestGitHubAccess),
    createGitHubCreateRepositoryTool(getAccessToken, requestGitHubAccess),
    createGitHubForkRepositoryTool(getAccessToken, requestGitHubAccess),
    createGitHubCreateBranchTool(getAccessToken, requestGitHubAccess),
    createGitHubListBranchesTool(getAccessToken, requestGitHubAccess),
    createGitHubListCommitsTool(getAccessToken, requestGitHubAccess),
    createGitHubGetCommitTool(getAccessToken, requestGitHubAccess),
    createGitHubListTagsTool(getAccessToken, requestGitHubAccess),
    createGitHubListReleasesTool(getAccessToken, requestGitHubAccess),

    // Issues
    createGitHubGetIssueTool(getAccessToken, requestGitHubAccess),
    createGitHubCreateIssueTool(getAccessToken, requestGitHubAccess),
    createGitHubListIssuesTool(getAccessToken, requestGitHubAccess),
    createGitHubSearchIssuesTool(getAccessToken, requestGitHubAccess),
    createGitHubAddIssueCommentTool(getAccessToken, requestGitHubAccess),

    // Pull Requests
    createGitHubGetPullRequestTool(getAccessToken, requestGitHubAccess),
    createGitHubCreatePullRequestTool(getAccessToken, requestGitHubAccess),
    createGitHubUpdatePullRequestTool(getAccessToken, requestGitHubAccess),
    createGitHubListPullRequestsTool(getAccessToken, requestGitHubAccess),
    createGitHubSearchPullRequestsTool(getAccessToken, requestGitHubAccess),
    createGitHubMergePullRequestTool(getAccessToken, requestGitHubAccess),

    // Users
    createGitHubSearchUsersTool(getAccessToken, requestGitHubAccess),
    createGitHubSearchOrgsTool(getAccessToken, requestGitHubAccess),

    // Code Search
    createGitHubSearchCodeTool(getAccessToken, requestGitHubAccess),

    // Actions
    createGitHubListWorkflowRunsTool(getAccessToken, requestGitHubAccess),
    createGitHubGetWorkflowRunTool(getAccessToken, requestGitHubAccess),
    createGitHubGetJobLogsTool(getAccessToken, requestGitHubAccess),
  ];
}

// ============================================================================
// MCP CLIENT UTILITIES (for advanced use)
// ============================================================================

/**
 * Get the MCP endpoints for direct access
 */
export function getGitHubMCPEndpoints() {
  return {
    http: MCP_HTTP_ENDPOINT,
  };
}

/**
 * Call any GitHub MCP tool directly (for advanced use cases)
 */
export async function callGitHubMCPTool<T>(
  accessToken: string,
  toolName: string,
  args: Record<string, unknown>
): Promise<T> {
  return callMCPTool<T>(accessToken, toolName, args);
}
