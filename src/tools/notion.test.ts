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
  createNotionProxyTools,
  getMCPEndpoints,
  callNotionMCPTool,
  type NotionCreatePagesArgs,
  type NotionFetchArgs,
  type NotionMcpCaller,
  type NotionMovePagesArgs,
  type NotionUpdatePageArgs,
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

function jsonResponse(body: unknown, init?: { status?: number; headers?: Record<string, string> }) {
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

function sseResponse(data: unknown, init?: { status?: number; headers?: Record<string, string> }) {
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
  mockFetch.mockResolvedValueOnce(jsonResponse({ jsonrpc: "2.0", id: 2, result: toolResult }));
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
      mockFetch.mockResolvedValueOnce(jsonResponse({ jsonrpc: "2.0", id: 2, result: toolResult }));

      const tool = createNotionSearchTool(mockGetAccessToken, mockRequestNotionAccess);
      const result = await tool.executor!({ query: "test" });

      expect(result).toEqual(toolResult);
    });
  });

  // ── Session management ──

  describe("session management", () => {
    it("initializes a new session and caches it", async () => {
      const toolResult = { content: [{ type: "text", text: "found" }] };
      mockSuccessfulMCPFlow(toolResult);

      const tool = createNotionSearchTool(mockGetAccessToken, mockRequestNotionAccess);
      const result = await tool.executor!({ query: "hello" });

      expect(result).toEqual(toolResult);

      // 3 calls: init, notifications/initialized, tools/call
      expect(mockFetch).toHaveBeenCalledTimes(3);

      // Verify init request
      const initCall = mockFetch.mock.calls[0];
      expect(initCall[0]).toBe("https://mcp.notion.com/mcp");
      const initBody = JSON.parse(initCall[1].body);
      expect(initBody.method).toBe("initialize");
      expect(initBody.params.clientInfo.name).toBe("Anuma");
    });

    it("reuses cached session for subsequent calls", async () => {
      const result1 = { content: [{ type: "text", text: "first" }] };
      const result2 = { content: [{ type: "text", text: "second" }] };
      mockSuccessfulMCPFlow(result1);

      const tool = createNotionSearchTool(mockGetAccessToken, mockRequestNotionAccess);

      // First call initializes session
      await tool.executor!({ query: "first" });
      expect(mockFetch).toHaveBeenCalledTimes(3);

      // Second call should reuse cached session (only 1 more fetch)
      mockFetch.mockResolvedValueOnce(jsonResponse({ jsonrpc: "2.0", id: 3, result: result2 }));

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
      mockFetch.mockResolvedValueOnce(jsonResponse({ jsonrpc: "2.0", id: 5, result: toolResult }));

      const tool = createNotionSearchTool(mockGetAccessToken, mockRequestNotionAccess);
      const result = await tool.executor!({ query: "test" });

      expect(result).toEqual(toolResult);
    });

    it("returns error when initialization has no session ID", async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse({ jsonrpc: "2.0", id: 1, result: {} }, { headers: {} })
      );

      const tool = createNotionSearchTool(mockGetAccessToken, mockRequestNotionAccess);
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

      const tool = createNotionSearchTool(mockGetAccessToken, mockRequestNotionAccess);
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

      const tool = createNotionSearchTool(mockGetAccessToken, mockRequestNotionAccess);
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

      const tool = createNotionSearchTool(mockGetAccessToken, mockRequestNotionAccess);
      await tool.executor!({ query: "test" });

      expect(mockRequestNotionAccess).toHaveBeenCalled();

      const initCall = mockFetch.mock.calls[0];
      expect(initCall[1].headers.Authorization).toBe(`Bearer ${requestedToken}`);
    });

    it("returns an error string when requestNotionAccess rejects", async () => {
      mockGetAccessToken.mockReturnValue(null);
      mockRequestNotionAccess.mockRejectedValue(new Error("Notion not connected"));

      const tool = createNotionSearchTool(mockGetAccessToken, mockRequestNotionAccess);
      const result = await tool.executor!({ query: "test" });

      expect(result).toBe("Error searching Notion: Notion not connected");
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("returns an error string when getAccessToken throws", async () => {
      mockGetAccessToken.mockImplementation(() => {
        throw new Error("mint failed");
      });

      const tool = createNotionFetchTool(mockGetAccessToken, mockRequestNotionAccess);
      const result = await tool.executor!({ id: "page-123" });

      expect(result).toBe("Error fetching Notion page: mint failed");
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

      const tool = createNotionFetchTool(mockGetAccessToken, mockRequestNotionAccess);
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

      const tool = createNotionSearchTool(mockGetAccessToken, mockRequestNotionAccess);
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
          page_id: "page-123",
          command: "insert_content",
          content: "Updated",
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
        args: {
          parent: { page_id: "page-123" },
          title: "Tasks",
          schema: 'CREATE TABLE ("Name" TITLE, "Notes" RICH_TEXT)',
        },
        errorPrefix: "Error creating Notion database",
      },
      {
        name: "createNotionUpdateDataSourceTool",
        fn: createNotionUpdateDataSourceTool,
        toolName: "notion-update-data-source",
        args: { data_source_id: "ds-123", statements: 'ADD COLUMN "Owner" RICH_TEXT' },
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
        it(`creates tool with name "${toolName}" and executor`, () => {
          const tool = fn(mockGetAccessToken, mockRequestNotionAccess);

          expect((tool.function as { name: string }).name).toBe(toolName);
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
      const tools = createNotionTools(mockGetAccessToken, mockRequestNotionAccess);

      expect(tools).toHaveLength(12);

      const names = tools.map((t) => (t.function as { name: string }).name);
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

    it("all tools have executors", () => {
      const tools = createNotionTools(mockGetAccessToken, mockRequestNotionAccess);

      for (const tool of tools) {
        expect(tool.executor).toBeTypeOf("function");
        expect(tool.type).toBe("function");
      }
    });
  });

  // ── Argument schemas match Notion's hosted MCP ──

  function schemaOf(toolName: string) {
    const tool = createNotionTools(mockGetAccessToken, mockRequestNotionAccess).find(
      (t) => (t.function as { name: string }).name === toolName
    );
    return (
      tool!.function as {
        arguments: {
          properties: Record<string, { type: string; enum?: string[] }>;
          required: string[];
        };
      }
    ).arguments;
  }

  describe("argument schemas", () => {
    it("notion-update-page takes flat arguments with the live command set", () => {
      const schema = schemaOf("notion-update-page");

      expect(schema.properties).not.toHaveProperty("data");
      expect(schema.required).toEqual(["page_id", "command"]);
      expect(schema.properties.command.enum).toEqual([
        "update_properties",
        "update_content",
        "replace_content",
        "insert_content",
        "apply_template",
        "update_verification",
      ]);
      expect(Object.keys(schema.properties)).toEqual([
        "page_id",
        "command",
        "content",
        "content_updates",
        "new_str",
        "properties",
        "allow_deleting_content",
        "template_id",
        "verification_status",
        "verification_expiry_days",
      ]);
      expect(schema.properties.template_id.type).toBe("string");
      expect(schema.properties.verification_status.enum).toEqual(["verified", "unverified"]);
      expect(schema.properties.verification_expiry_days.type).toBe("number");
    });

    // Each exported arg type is a hand-written copy of its tool's schema. The
    // compiler checks every shape below against its type, and the test checks
    // the same shape against the schema, so neither side can drift on its own.
    // NotionSearchArgs is left out: it types only some of notion-search's
    // optional filters.
    type ArgShape<T> = { [K in keyof T]-?: undefined extends T[K] ? "optional" : "required" };

    it.each([
      [
        "notion-fetch",
        {
          id: "required",
          include_transcript: "optional",
          include_discussions: "optional",
        } satisfies ArgShape<NotionFetchArgs>,
      ],
      [
        "notion-create-pages",
        { pages: "required", parent: "optional" } satisfies ArgShape<NotionCreatePagesArgs>,
      ],
      [
        "notion-update-page",
        {
          page_id: "required",
          command: "required",
          content: "optional",
          content_updates: "optional",
          new_str: "optional",
          properties: "optional",
          allow_deleting_content: "optional",
          template_id: "optional",
          verification_status: "optional",
          verification_expiry_days: "optional",
        } satisfies ArgShape<NotionUpdatePageArgs>,
      ],
      [
        "notion-move-pages",
        {
          page_or_database_ids: "required",
          new_parent: "required",
        } satisfies ArgShape<NotionMovePagesArgs>,
      ],
    ])("%s matches its exported argument type", (toolName, shape) => {
      const schema = schemaOf(toolName);
      const entries = Object.entries(shape);

      expect(Object.keys(schema.properties).sort()).toEqual(entries.map(([key]) => key).sort());
      expect([...schema.required].sort()).toEqual(
        entries
          .filter(([, presence]) => presence === "required")
          .map(([key]) => key)
          .sort()
      );
    });

    it("notion-update-page enums match NotionUpdatePageArgs", () => {
      const commands = {
        update_properties: true,
        update_content: true,
        replace_content: true,
        insert_content: true,
        apply_template: true,
        update_verification: true,
      } satisfies Record<NotionUpdatePageArgs["command"], true>;
      const statuses = {
        verified: true,
        unverified: true,
      } satisfies Record<NonNullable<NotionUpdatePageArgs["verification_status"]>, true>;
      const schema = schemaOf("notion-update-page");

      expect(schema.properties.command.enum).toEqual(Object.keys(commands));
      expect(schema.properties.verification_status.enum).toEqual(Object.keys(statuses));
    });

    it("notion-create-database takes a DDL schema string, not a properties object", () => {
      const schema = schemaOf("notion-create-database");

      expect(schema.properties).not.toHaveProperty("properties");
      expect(schema.properties).not.toHaveProperty("description");
      expect(schema.required).toEqual(["schema"]);
      expect(schema.properties.schema.type).toBe("string");
      expect(schema.properties.title.type).toBe("string");
    });

    it("notion-update-data-source takes DDL statements, not a properties object", () => {
      const schema = schemaOf("notion-update-data-source");

      expect(schema.properties).not.toHaveProperty("properties");
      expect(schema.properties).not.toHaveProperty("description");
      expect(schema.required).toEqual(["data_source_id"]);
      expect(schema.properties.statements.type).toBe("string");
      expect(schema.properties.title.type).toBe("string");
    });
  });

  // ── Response truncation ──

  describe("response truncation", () => {
    it("returns result unchanged when under 50,000 characters", async () => {
      const token = uniqueToken();
      mockGetAccessToken.mockReturnValue(token);

      const smallResult = { content: [{ type: "text", text: "x".repeat(1000) }] };
      mockSuccessfulMCPFlow(smallResult);

      const tool = createNotionSearchTool(mockGetAccessToken, mockRequestNotionAccess);
      const result = await tool.executor!({ query: "test" });

      expect(result).toEqual(smallResult);
    });

    it("truncates result exceeding 50,000 characters", async () => {
      const token = uniqueToken();
      mockGetAccessToken.mockReturnValue(token);

      const largeText = "a".repeat(100_000);
      const largeResult = { content: [{ type: "text", text: largeText }] };
      mockSuccessfulMCPFlow(largeResult);

      const tool = createNotionFetchTool(mockGetAccessToken, mockRequestNotionAccess);
      const result = await tool.executor!({ id: "page-123" });

      expect(typeof result).toBe("string");
      const resultStr = result as string;
      expect(resultStr.length).toBeLessThanOrEqual(50_000 + 200); // 50K + footer
      expect(resultStr).toContain("content truncated, showing first 50000 characters of");
    });

    it("truncates on the session-retry path (401 recovery)", async () => {
      const token = uniqueToken();
      mockGetAccessToken.mockReturnValue(token);

      const sessionId = `trunc-session-${tokenCounter}`;
      const newSessionId = `trunc-new-session-${tokenCounter}`;

      // Init session
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

      // Retry returns large result
      const largeResult = { content: [{ type: "text", text: "b".repeat(80_000) }] };
      mockFetch.mockResolvedValueOnce(jsonResponse({ jsonrpc: "2.0", id: 5, result: largeResult }));

      const tool = createNotionSearchTool(mockGetAccessToken, mockRequestNotionAccess);
      const result = await tool.executor!({ query: "test" });

      expect(typeof result).toBe("string");
      expect(result as string).toContain("content truncated");
    });

    it("preserves string results under the limit", async () => {
      const token = uniqueToken();
      mockGetAccessToken.mockReturnValue(token);

      const stringResult = "Just a plain string result";
      mockSuccessfulMCPFlow(stringResult);

      const tool = createNotionSearchTool(mockGetAccessToken, mockRequestNotionAccess);
      const result = await tool.executor!({ query: "test" });

      expect(result).toBe(stringResult);
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

  // ── Portal proxy path ──

  describe("createNotionProxyTools", () => {
    function proxyTool(callMcp: NotionMcpCaller, name = "notion-search") {
      const tool = createNotionProxyTools(callMcp).find(
        (t) => (t.function as { name: string }).name === name
      );
      if (!tool?.executor) throw new Error(`no executor for ${name}`);
      return tool.executor;
    }

    it("exposes the same 12 tool definitions as createNotionTools", () => {
      const direct = createNotionTools(mockGetAccessToken, mockRequestNotionAccess);
      const proxied = createNotionProxyTools(vi.fn<NotionMcpCaller>());

      expect(proxied.map((t) => t.function)).toEqual(direct.map((t) => t.function));
      expect(proxied).toHaveLength(12);
    });

    it("hands every tool's name and args to the caller without fetching", async () => {
      const callMcp = vi
        .fn<NotionMcpCaller>()
        .mockResolvedValue({ status: 200, json: { result: { content: [] } } });
      const args = { query: "roadmap" };

      for (const tool of createNotionProxyTools(callMcp)) {
        await tool.executor!(args);
      }

      const names = createNotionTools(mockGetAccessToken, mockRequestNotionAccess).map(
        (t) => (t.function as { name: string }).name
      );
      expect(callMcp.mock.calls).toEqual(names.map((name) => [name, args]));
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("returns the MCP result on 200", async () => {
      const result = { content: [{ type: "text", text: "found" }] };
      const callMcp = vi.fn<NotionMcpCaller>().mockResolvedValue({ status: 200, json: { result } });

      expect(await proxyTool(callMcp)({ query: "x" })).toEqual(result);
    });

    it("truncates a 200 result over 50,000 characters", async () => {
      const callMcp = vi
        .fn<NotionMcpCaller>()
        .mockResolvedValue({ status: 200, json: { result: "a".repeat(60000) } });

      const result = (await proxyTool(callMcp)({ query: "x" })) as string;

      expect(result.startsWith("a".repeat(50000))).toBe(true);
      expect(result).toContain("content truncated");
    });

    it.each([401, 403, 412])("returns the connector error on %i", async (status) => {
      const callMcp = vi
        .fn<NotionMcpCaller>()
        .mockResolvedValue({ status, json: { code: "connector_not_connected" } });

      const result = await proxyTool(callMcp)({ query: "x" });

      expect(JSON.parse(result as string)).toEqual({
        __anuma_connector_error_v1: true,
        code: "connector_not_connected",
        provider: "notion",
      });
    });

    it("does not pass a portal connect_url through to the model", async () => {
      const callMcp = vi.fn<NotionMcpCaller>().mockResolvedValue({
        status: 412,
        json: { code: "connector_not_connected", connect_url: "https://portal/connect" },
      });

      const result = await proxyTool(callMcp)({ query: "x" });

      expect(JSON.parse(result as string)).toEqual({
        __anuma_connector_error_v1: true,
        code: "connector_not_connected",
        provider: "notion",
      });
    });

    it("carries scope_not_covered and its missing scopes through", async () => {
      const callMcp = vi.fn<NotionMcpCaller>().mockResolvedValue({
        status: 403,
        json: {
          code: "scope_not_covered",
          connect_url: "https://portal/connect",
          missing_scopes: ["notion.rw"],
        },
      });

      const result = await proxyTool(callMcp)({ query: "x" });

      expect(JSON.parse(result as string)).toEqual({
        __anuma_connector_error_v1: true,
        code: "scope_not_covered",
        provider: "notion",
        missing_scopes: ["notion.rw"],
      });
    });

    it.each([
      [
        403,
        { code: "insufficient_scope", required: "connector:notion:rw" },
        { code: "insufficient_scope", required: "connector:notion:rw" },
      ],
      [
        403,
        { code: "insufficient_scope", error: 'grant lacks "x"' },
        { code: "insufficient_scope" },
      ],
      [412, { code: "upstream_unavailable" }, { code: "upstream_unavailable" }],
      [
        503,
        { code: "upstream_unavailable", error: "upstream unavailable" },
        { code: "upstream_unavailable" },
      ],
      [
        412,
        { code: "invalid_grant", connect_url: "https://portal/connect" },
        { code: "connector_not_connected" },
      ],
      [403, { code: "connector_disabled" }, { code: "connector_not_connected" }],
      [403, { code: "scope_disabled" }, { code: "connector_not_connected" }],
      [401, { error: "unauthorized" }, { code: "connector_not_connected" }],
    ])("maps %i %j to the matching connector error", async (status, json, expected) => {
      const callMcp = vi.fn<NotionMcpCaller>().mockResolvedValue({ status, json });

      const result = await proxyTool(callMcp)({ query: "x" });

      expect(JSON.parse(result as string)).toEqual({
        __anuma_connector_error_v1: true,
        provider: "notion",
        ...expected,
      });
    });

    it.each<NotionUpdatePageArgs>([
      { page_id: "p", command: "insert_content", content: "## Notes" },
      {
        page_id: "p",
        command: "update_content",
        content_updates: [{ old_str: "draft", new_str: "final" }],
      },
      { page_id: "p", command: "replace_content", new_str: "# Fresh start" },
      { page_id: "p", command: "update_properties", properties: { Status: "Done" } },
      { page_id: "p", command: "apply_template", template_id: "template-page-1" },
      {
        page_id: "p",
        command: "update_verification",
        verification_status: "verified",
        verification_expiry_days: 30,
      },
      { page_id: "p", command: "update_verification", verification_status: "unverified" },
    ])("sends update-page $command with declared arguments only", async (args) => {
      const result = { content: [{ type: "text", text: "updated" }] };
      const callMcp = vi.fn<NotionMcpCaller>().mockResolvedValue({ status: 200, json: { result } });
      const declared = Object.keys(schemaOf("notion-update-page").properties);

      expect(Object.keys(args).filter((key) => !declared.includes(key))).toEqual([]);
      expect(await proxyTool(callMcp, "notion-update-page")({ ...args })).toEqual(result);
      expect(callMcp).toHaveBeenCalledWith("notion-update-page", args);
    });

    it("returns an error string when a 200 carries no result", async () => {
      const callMcp = vi.fn<NotionMcpCaller>().mockResolvedValue({ status: 200, json: {} });

      expect(await proxyTool(callMcp)({ query: "x" })).toBe(
        "Error searching Notion: Notion returned no result (200)"
      );
    });

    it.each([
      [400, { error: "tool not allowed" }, "tool not allowed (400)"],
      [422, { error: "page not found", code: "mcp_tool_error" }, "page not found (422)"],
      [502, { error: "bad gateway", code: "upstream_error", status: 500 }, "bad gateway (502)"],
      [503, { error: "service unavailable" }, "service unavailable (503)"],
      [500, null, "null (500)"],
    ])("returns the tool's error string on %i", async (status, json, detail) => {
      const callMcp = vi.fn<NotionMcpCaller>().mockResolvedValue({ status, json });

      const result = await proxyTool(
        callMcp,
        "notion-update-page"
      )({
        page_id: "p",
        command: "insert_content",
        content: "x",
      });

      expect(result).toBe(`Error updating Notion page: ${detail}`);
    });

    it("returns an error string when the caller rejects", async () => {
      const callMcp = vi.fn<NotionMcpCaller>().mockRejectedValue(new Error("network down"));

      expect(await proxyTool(callMcp)({ query: "x" })).toBe("Error searching Notion: network down");
    });
  });
});
