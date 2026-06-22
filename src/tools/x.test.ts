import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { createXTools } from "./x.js";

type ToolResult = unknown;

async function runExecutor(
  tool: { executor?: (args: Record<string, unknown>) => Promise<ToolResult> | ToolResult },
  args: Record<string, unknown>
): Promise<ToolResult> {
  if (!tool.executor) throw new Error("tool has no executor");
  return tool.executor(args);
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function textResponse(text: string, status: number): Response {
  return new Response(text, { status });
}

describe("createXTools", () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    fetchMock = vi.fn();
    globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  test("x_get_me returns profile on success", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        data: { id: "1", name: "Test User", username: "test" },
      })
    );
    const tools = createXTools(async () => "good-token");
    const result = (await runExecutor(tools.x_get_me, {})) as {
      id: string;
      name: string;
      username: string;
    };
    expect(result.id).toBe("1");
    expect(result.name).toBe("Test User");
    expect(result.username).toBe("test");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/2/users/me");
    expect((init.headers as Record<string, string>)["Authorization"]).toBe("Bearer good-token");
  });

  test("returns canonical connector error when token is null", async () => {
    const tools = createXTools(async () => null);
    const raw = (await runExecutor(tools.x_get_me, {})) as string;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    expect(parsed).toEqual({
      __anuma_connector_error_v1: true,
      code: "connector_not_connected",
      provider: "x",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("returns connector error when X API responds 401", async () => {
    fetchMock.mockResolvedValueOnce(textResponse("unauthorized", 401));
    const tools = createXTools(async () => "stale-token");
    const raw = (await runExecutor(tools.x_get_me, {})) as string;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    expect(parsed.__anuma_connector_error_v1).toBe(true);
    expect(parsed.code).toBe("connector_not_connected");
    expect(parsed.provider).toBe("x");
  });

  test("x_get_my_posts returns tweets on success", async () => {
    // First fetch: users/me to resolve user id.
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ data: { id: "42", name: "Test User", username: "test" } })
    );
    // Second fetch: tweets for user id 42.
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        data: [
          { id: "t1", text: "Hello world" },
          { id: "t2", text: "Second post" },
        ],
      })
    );
    const tools = createXTools(async () => "good-token");
    const result = (await runExecutor(tools.x_get_my_posts, { maxResults: 10 })) as {
      id: string;
      text: string;
    }[];
    expect(result).toEqual([
      { id: "t1", text: "Hello world" },
      { id: "t2", text: "Second post" },
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [tweetsUrl] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(tweetsUrl).toContain("/users/42/tweets");
  });

  test("x_get_my_posts clamps max_results above 100 to 100", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ data: { id: "7", name: "Test", username: "test" } })
    );
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: [] }));
    const tools = createXTools(async () => "good-token");
    await runExecutor(tools.x_get_my_posts, { maxResults: 200 });
    const [tweetsUrl] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(tweetsUrl).toContain("max_results=100");
  });

  test("x_get_my_posts clamps max_results below 5 to 5", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ data: { id: "8", name: "Test", username: "test" } })
    );
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: [] }));
    const tools = createXTools(async () => "good-token");
    await runExecutor(tools.x_get_my_posts, { maxResults: 1 });
    const [tweetsUrl] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(tweetsUrl).toContain("max_results=5");
  });
});
