import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createNotionSearchTool,
  createNotionFetchTool,
  createNotionCreatePagesTool,
  createNotionUpdatePageTool,
  createNotionMovePagesTool,
  createNotionDuplicatePageTool,
  createNotionCreateDatabaseTool,
  createNotionUpdateDataSourceTool,
  createNotionCreateCommentTool,
  createNotionGetCommentsTool,
  createNotionGetUsersTool,
  createNotionGetTeamsTool,
  createNotionTools,
  getMCPEndpoints,
  callNotionMCPTool,
} from "./notion";

// ── Fetch mock ──

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// ── Unique token per test ──
// The module caches sessions by access token, so each test must use
// a unique token to avoid cross-test pollution.

let tokenCounter = 0;
function uniqueToken(): string {
  return `token-${++tokenCounter}-${Date.now()}`;
}

// ── Helpers ──

function jsonResponse(
  body: unknown,
  init?: { status?: number; headers?: Record<string, string> }
) {
  const status = init?.status ?? 200;
  const headers = new Headers({
    "Content-Type": "application/json",
    ...(init?.headers ?? {}),
  });
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? "OK" : "Error",
    headers,
    text: async () => JSON.stringify(body),
    json: async () => body,
  };
}

function sseResponse(
  data: unknown,
  init?: { status?: number; headers?: Record<string, string> }
) {
  const status = init?.status ?? 200;
  const body = `event: message\ndata: ${JSON.stringify(data)}\n\n`;
  const headers = new Headers({
    "Content-Type": "text/event-stream",
    ...(init?.headers ?? {}),
  });
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: "OK",
    headers,
    text: async () => body,
    json: async () => {
      throw new Error("Not JSON");
    },
  };
}

/**
 * Set up fetch mock for a successful MCP session initialization + tool call.
 */
function mockSuccessfulMCPFlow(toolResult: unknown): void {
  const sessionId = `session-${tokenCounter}`;

  // 1st call: initialize session
  mockFetch.mockResolvedValueOnce(
    jsonResponse(
      { jsonrpc: "2.0", id: 1, result: { protocolVersion: "2024-11-05" } },
      { headers: { "Mcp-Session-Id": sessionId } }
    )
  );

  // 2nd call: notifications/initialized (fire-and-forget)
  mockFetch.mockResolvedValueOnce(jsonResponse({}));

  // 3rd call: tools/call
  mockFetch.mockResolvedValueOnce(
    jsonResponse({ jsonrpc: "2.0", id: 2, result: toolResult })
  );
}

// ── Tests ──

describe("Notion MCP Tools", () => {
  const mockGetAccessToken = vi.fn<() => string | null>();
  const mockRequestNotionAccess = vi.fn<() => Promise<string>>();

  beforeEach(() => {
    vi.clearAllMocks();
    // Default: each test gets a unique token
    const token = uniqueToken();
    mockGetAccessToken.mockReturnValue(token);
    mockRequestNotionAccess.mockResolvedValue(token);
  });

  // ── parseSSEResponse / parseResponseBody ──

  describe("SSE response parsing", () => {
    it("handles SSE-formatted initialization response", async () => {
      const sessionId = `sse-session-${tokenCounter}`;
      const initResult = {
        jsonrpc: "2.0",
        id: 1,
        result: { protocolVersion: "2024-11-05" },
      };

      // Init returns SSE
      mockFetch.mockResolvedValueOnce(
        sseResponse(initResult, {
          headers: { "Mcp-Session-Id": sessionId },
        })
      );

      // notifications/initialized
      mockFetch.mockResolvedValueOnce(jsonResponse({}));

      // Tool call returns JSON
      const toolResult = { content: [{ type: "text", text: "result" }] };
      mockFetch.mockResolvedValueOnce(
        jsonResponse({ jsonrpc: "2.0", id: 2, result: toolResult })
      );

      const tool = createNotionSearchTool(
        mockGetAccessToken,
        mockRequestNotionAccess
      );
      const result = await tool.executor!({ query: "test" });

      expect(result).toEqual(toolResult);
    });
  });

  // ── Session management ──

  describe("session management", () => {
    it("initializes a new session and caches it", async () => {
      const toolResult = { content: [{ type: "text", text: "found" }] };
      mockSuccessfulMCPFlow(toolResult);

      const tool = createNotionSearchTool(
        mockGetAccessToken,
        mockRequestNotionAccess
      );
      const result = await tool.executor!({ query: "hello" });

      expect(result).toEqual(toolResult);

      // 3 calls: init, notifications/initialized, tools/call
      expect(mockFetch).toHaveBeenCalledTimes(3);

      // Verify init request
      const initCall = mockFetch.mock.calls[0];
      expect(initCall[0]).toBe("https://mcp.notion.com/mcp");
      const initBody = JSON.parse(initCall[1].body);
      expect(initBody.method).toBe("initialize");
      expect(initBody.params.clientInfo.name).toBe("Reverbia");
    });

    it("reuses cached session for subsequent calls", async () => {
      const result1 = { content: [{ type: "text", text: "first" }] };
      const result2 = { content: [{ type: "text", text: "second" }] };
      mockSuccessfulMCPFlow(result1);

      const tool = createNotionSearchTool(
        mockGetAccessToken,
        mockRequestNotionAccess
      );

      // First call initializes session
      await tool.executor!({ query: "first" });
      expect(mockFetch).toHaveBeenCalledTimes(3);

      // Second call should reuse cached session (only 1 more fetch)
      mockFetch.mockResolvedValueOnce(
        jsonResponse({ jsonrpc: "2.0", id: 3, result: result2 })
      );

      const secondResult = await tool.executor!({ query: "second" });
      expect(secondResult).toEqual(result2);
      expect(mockFetch).toHaveBeenCalledTimes(4);
    });

    it("re-initializes session on 401 response", async () => {
      const sessionId = `initial-session-${tokenCounter}`;
      const newSessionId = `new-session-${tokenCounter}`;

      // First: init session
      mockFetch.mockResolvedValueOnce(
        jsonResponse(
          { jsonrpc: "2.0", id: 1, result: { protocolVersion: "2024-11-05" } },
          { headers: { "Mcp-Session-Id": sessionId } }
        )
      );
      mockFetch.mockResolvedValueOnce(jsonResponse({})); // notifications

      // Tool call returns 401
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        headers: new Headers(),
        text: async () => "Unauthorized",
      });

      // Re-init session
      mockFetch.mockResolvedValueOnce(
        jsonResponse(
          { jsonrpc: "2.0", id: 4, result: { protocolVersion: "2024-11-05" } },
          { headers: { "Mcp-Session-Id": newSessionId } }
        )
      );
      mockFetch.mockResolvedValueOnce(jsonResponse({})); // notifications

      // Retry tool call succeeds
      const toolResult = { content: [{ type: "text", text: "recovered" }] };
      mockFetch.mockResolvedValueOnce(
        jsonResponse({ jsonrpc: "2.0", id: 5, result: toolResult })
      );

      const tool = createNotionSearchTool(
        mockGetAccessToken,
        mockRequestNotionAccess
      );
      const result = await tool.executor!({ query: "test" });

      expect(result).toEqual(toolResult);
    });

    it("returns error when initialization has no session ID", async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse(
          { jsonrpc: "2.0", id: 1, result: {} },
          { headers: {} }
        )
      );

      const tool = createNotionSearchTool(
        mockGetAccessToken,
        mockRequestNotionAccess
      );
      const result = await tool.executor!({ query: "test" });

      expect(result).toContain("Error searching Notion");
    });

    it("returns error on initialization HTTP error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        headers: new Headers(),
        text: async () => "Server error",
      });

      const tool = createNotionSearchTool(
        mockGetAccessToken,
        mockRequestNotionAccess
      );
      const result = await tool.executor!({ query: "test" });

      expect(result).toContain("Error searching Notion");
      expect(result).toContain("500");
    });
  });

  // ── Token acquisition ──

  describe("token acquisition", () => {
    it("uses existing token from getAccessToken", async () => {
      const token = uniqueToken();
      mockGetAccessToken.mockReturnValue(token);
      mockSuccessfulMCPFlow({ content: [] });

      const tool = createNotionSearchTool(
        mockGetAccessToken,
        mockRequestNotionAccess
      );
      await tool.executor!({ query: "test" });

      expect(mockGetAccessToken).toHaveBeenCalled();
      expect(mockRequestNotionAccess).not.toHaveBeenCalled();

      const initCall = mockFetch.mock.calls[0];
      expect(initCall[1].headers.Authorization).toBe(`Bearer ${token}`);
    });

    it("calls requestNotionAccess when token is null", async () => {
      const requestedToken = uniqueToken();
      mockGetAccessToken.mockReturnValue(null);
      mockRequestNotionAccess.mockResolvedValue(requestedToken);
      mockSuccessfulMCPFlow({ content: [] });

      const tool = createNotionSearchTool(
        mockGetAccessToken,
        mockRequestNotionAccess
      );
      await tool.executor!({ query: "test" });

      expect(mockRequestNotionAccess).toHaveBeenCalled();

      const initCall = mockFetch.mock.calls[0];
      expect(initCall[1].headers.Authorization).toBe(
        `Bearer ${requestedToken}`
      );
    });
  });

  // ── JSON-RPC error handling ──

  describe("JSON-RPC error handling", () => {
    it("returns error string when MCP tool returns JSON-RPC error", async () => {
      const sessionId = `err-session-${tokenCounter}`;

      mockFetch.mockResolvedValueOnce(
        jsonResponse(
          { jsonrpc: "2.0", id: 1, result: { protocolVersion: "2024-11-05" } },
          { headers: { "Mcp-Session-Id": sessionId } }
        )
      );
      mockFetch.mockResolvedValueOnce(jsonResponse({})); // notifications

      // Tool call returns JSON-RPC error
      mockFetch.mockResolvedValueOnce(
        jsonResponse({
          jsonrpc: "2.0",
          id: 2,
          error: { code: -32000, message: "Page not found" },
        })
      );

      const tool = createNotionFetchTool(
        mockGetAccessToken,
        mockRequestNotionAccess
      );
      const result = await tool.executor!({ id: "nonexistent-page" });

      expect(result).toContain("Error fetching Notion page");
      expect(result).toContain("Page not found");
    });

    it("handles JSON-RPC error during initialization", async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse(
          {
            jsonrpc: "2.0",
            id: 1,
            error: { code: -32600, message: "Invalid Request" },
          },
          { headers: { "Mcp-Session-Id": `bad-session-${tokenCounter}` } }
        )
      );

      const tool = createNotionSearchTool(
        mockGetAccessToken,
        mockRequestNotionAccess
      );
      const result = await tool.executor!({ query: "test" });

      expect(result).toContain("Error searching Notion");
      expect(result).toContain("Invalid Request");
    });
  });

  // ── Individual tool factories ──

  describe("tool factories", () => {
    const toolFactories = [
      {
        name: "createNotionSearchTool",
        fn: createNotionSearchTool,
        toolName: "notion-search",
        args: { query: "test search" },
        errorPrefix: "Error searching Notion",
      },
      {
        name: "createNotionFetchTool",
        fn: createNotionFetchTool,
        toolName: "notion-fetch",
        args: { id: "page-123" },
        errorPrefix: "Error fetching Notion page",
      },
      {
        name: "createNotionCreatePagesTool",
        fn: createNotionCreatePagesTool,
        toolName: "notion-create-pages",
        args: { pages: [{ properties: { title: "Test" }, content: "Hello" }] },
        errorPrefix: "Error creating Notion page",
      },
      {
        name: "createNotionUpdatePageTool",
        fn: createNotionUpdatePageTool,
        toolName: "notion-update-page",
        args: {
          data: {
            page_id: "page-123",
            command: "replace_content",
            new_str: "Updated",
          },
        },
        errorPrefix: "Error updating Notion page",
      },
      {
        name: "createNotionMovePagesTool",
        fn: createNotionMovePagesTool,
        toolName: "notion-move-pages",
        args: {
          page_or_database_ids: ["page-1"],
          new_parent: { type: "workspace" },
        },
        errorPrefix: "Error moving Notion pages",
      },
      {
        name: "createNotionDuplicatePageTool",
        fn: createNotionDuplicatePageTool,
        toolName: "notion-duplicate-page",
        args: { page_id: "page-123" },
        errorPrefix: "Error duplicating Notion page",
      },
      {
        name: "createNotionCreateDatabaseTool",
        fn: createNotionCreateDatabaseTool,
        toolName: "notion-create-database",
        args: { properties: { Name: { title: {} } } },
        errorPrefix: "Error creating Notion database",
      },
      {
        name: "createNotionUpdateDataSourceTool",
        fn: createNotionUpdateDataSourceTool,
        toolName: "notion-update-data-source",
        args: { data_source_id: "ds-123" },
        errorPrefix: "Error updating Notion data source",
      },
      {
        name: "createNotionCreateCommentTool",
        fn: createNotionCreateCommentTool,
        toolName: "notion-create-comment",
        args: {
          page_id: "page-123",
          rich_text: [{ text: { content: "Nice!" } }],
        },
        errorPrefix: "Error creating Notion comment",
      },
      {
        name: "createNotionGetCommentsTool",
        fn: createNotionGetCommentsTool,
        toolName: "notion-get-comments",
        args: { page_id: "page-123" },
        errorPrefix: "Error retrieving Notion comments",
      },
      {
        name: "createNotionGetUsersTool",
        fn: createNotionGetUsersTool,
        toolName: "notion-get-users",
        args: {},
        errorPrefix: "Error listing Notion users",
      },
      {
        name: "createNotionGetTeamsTool",
        fn: createNotionGetTeamsTool,
        toolName: "notion-get-teams",
        args: {},
        errorPrefix: "Error retrieving Notion teams",
      },
    ];

    for (const { name, fn, toolName, args, errorPrefix } of toolFactories) {
      describe(name, () => {
        it(`creates tool with name "${toolName}" and autoExecute true`, () => {
          const tool = fn(mockGetAccessToken, mockRequestNotionAccess);

          expect(tool.function.name).toBe(toolName);
          expect(tool.autoExecute).toBe(true);
          expect(tool.type).toBe("function");
          expect(tool.executor).toBeTypeOf("function");
        });

        it("calls MCP with correct tool name", async () => {
          // Use a unique token so session cache is fresh
          const token = uniqueToken();
          mockGetAccessToken.mockReturnValue(token);
          mockSuccessfulMCPFlow({ content: [{ type: "text", text: "ok" }] });

          const tool = fn(mockGetAccessToken, mockRequestNotionAccess);
          await tool.executor!(args);

          // 3rd fetch call is the tools/call
          const toolCallBody = JSON.parse(mockFetch.mock.calls[2][1].body);
          expect(toolCallBody.method).toBe("tools/call");
          expect(toolCallBody.params.name).toBe(toolName);
          expect(toolCallBody.params.arguments).toEqual(args);
        });

        it("returns error string on failure", async () => {
          // Use a unique token so session cache is fresh
          const token = uniqueToken();
          mockGetAccessToken.mockReturnValue(token);

          // Init fails
          mockFetch.mockResolvedValueOnce({
            ok: false,
            status: 500,
            statusText: "Internal Server Error",
            headers: new Headers(),
            text: async () => "boom",
          });

          const tool = fn(mockGetAccessToken, mockRequestNotionAccess);
          const result = await tool.executor!(args);

          expect(typeof result).toBe("string");
          expect(result).toContain(errorPrefix);
        });
      });
    }
  });

  // ── createNotionTools factory ──

  describe("createNotionTools", () => {
    it("returns all 12 tools", () => {
      const tools = createNotionTools(
        mockGetAccessToken,
        mockRequestNotionAccess
      );

      expect(tools).toHaveLength(12);

      const names = tools.map((t) => t.function.name);
      expect(names).toEqual([
        "notion-search",
        "notion-fetch",
        "notion-create-pages",
        "notion-update-page",
        "notion-move-pages",
        "notion-duplicate-page",
        "notion-create-database",
        "notion-update-data-source",
        "notion-create-comment",
        "notion-get-comments",
        "notion-get-users",
        "notion-get-teams",
      ]);
    });

    it("all tools have executors and autoExecute", () => {
      const tools = createNotionTools(
        mockGetAccessToken,
        mockRequestNotionAccess
      );

      for (const tool of tools) {
        expect(tool.executor).toBeTypeOf("function");
        expect(tool.autoExecute).toBe(true);
        expect(tool.type).toBe("function");
      }
    });
  });

  // ── Utility exports ──

  describe("getMCPEndpoints", () => {
    it("returns HTTP and SSE endpoint URLs", () => {
      const endpoints = getMCPEndpoints();
      expect(endpoints.http).toBe("https://mcp.notion.com/mcp");
      expect(endpoints.sse).toBe("https://mcp.notion.com/sse");
    });
  });

  describe("callNotionMCPTool", () => {
    it("forwards to internal callMCPTool", async () => {
      const token = uniqueToken();
      const toolResult = { content: [{ type: "text", text: "direct" }] };
      mockSuccessfulMCPFlow(toolResult);

      const result = await callNotionMCPTool(token, "notion-search", {
        query: "direct",
      });

      expect(result).toEqual(toolResult);

      // Verify token was used
      const initCall = mockFetch.mock.calls[0];
      expect(initCall[1].headers.Authorization).toBe(`Bearer ${token}`);
    });
  });
});
