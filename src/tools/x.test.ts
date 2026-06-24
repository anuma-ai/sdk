import { describe, expect, test, vi } from "vitest";

import { createXTools, type XProxyCaller } from "./x.js";

type ToolResult = unknown;

async function runExecutor(
  tool: { executor?: (args: Record<string, unknown>) => Promise<ToolResult> | ToolResult },
  args: Record<string, unknown>
): Promise<ToolResult> {
  if (!tool.executor) throw new Error("tool has no executor");
  return tool.executor(args);
}

function proxyResult(json: unknown, status = 200): { status: number; json: unknown } {
  return { status, json };
}

describe("createXTools", () => {
  test("x_get_me hits the proxy at /2/users/me and returns profile", async () => {
    const callProxy = vi
      .fn<XProxyCaller>()
      .mockResolvedValueOnce(
        proxyResult({ data: { id: "1", name: "Test User", username: "test" } })
      );
    const tools = createXTools(callProxy);
    const result = (await runExecutor(tools.x_get_me, {})) as {
      id: string;
      name: string;
      username: string;
    };
    expect(result.id).toBe("1");
    expect(result.name).toBe("Test User");
    expect(result.username).toBe("test");
    expect(callProxy).toHaveBeenCalledTimes(1);
    const [path] = callProxy.mock.calls[0];
    expect(path).toBe("/2/users/me");
  });

  test("x_get_me requests public_metrics field when includePublicMetrics is true", async () => {
    const callProxy = vi.fn<XProxyCaller>().mockResolvedValueOnce(
      proxyResult({
        data: {
          id: "1",
          name: "Test User",
          username: "test",
          public_metrics: { followers_count: 100, following_count: 50, tweet_count: 200 },
        },
      })
    );
    const tools = createXTools(callProxy);
    const result = (await runExecutor(tools.x_get_me, { includePublicMetrics: true })) as {
      public_metrics?: { followers_count: number };
    };
    expect(result.public_metrics?.followers_count).toBe(100);
    const [, query] = callProxy.mock.calls[0];
    expect(query?.["user.fields"]).toBe("description,public_metrics");
  });

  test("x_get_me does not request public_metrics when includePublicMetrics is false", async () => {
    const callProxy = vi
      .fn<XProxyCaller>()
      .mockResolvedValueOnce(
        proxyResult({ data: { id: "1", name: "Test User", username: "test" } })
      );
    const tools = createXTools(callProxy);
    await runExecutor(tools.x_get_me, { includePublicMetrics: false });
    const [, query] = callProxy.mock.calls[0];
    expect(query?.["user.fields"]).toBe("description");
  });

  test("returns connector error when proxy reports 401", async () => {
    const callProxy = vi.fn<XProxyCaller>().mockResolvedValueOnce(proxyResult(null, 401));
    const tools = createXTools(callProxy);
    const raw = (await runExecutor(tools.x_get_me, {})) as string;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    expect(parsed).toEqual({
      __anuma_connector_error_v1: true,
      code: "connector_not_connected",
      provider: "x",
    });
  });

  test("returns connector error when proxy reports 403", async () => {
    const callProxy = vi.fn<XProxyCaller>().mockResolvedValueOnce(proxyResult(null, 403));
    const tools = createXTools(callProxy);
    const raw = (await runExecutor(tools.x_get_me, {})) as string;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    expect(parsed.__anuma_connector_error_v1).toBe(true);
    expect(parsed.code).toBe("connector_not_connected");
    expect(parsed.provider).toBe("x");
  });

  test("returns generic failure string on non-auth 5xx from x_get_me", async () => {
    const callProxy = vi
      .fn<XProxyCaller>()
      .mockResolvedValueOnce(proxyResult({ error: "Internal Server Error" }, 500));
    const tools = createXTools(callProxy);
    const result = (await runExecutor(tools.x_get_me, {})) as string;
    expect(typeof result).toBe("string");
    expect(result).toContain("500");
    const parsed = (() => {
      try {
        return JSON.parse(result) as Record<string, unknown>;
      } catch {
        return null;
      }
    })();
    // Must NOT be a connector error -- it's a server-side failure, not an auth issue.
    expect(parsed?.__anuma_connector_error_v1).toBeUndefined();
  });

  test("x_get_my_posts resolves user via /2/users/me then fetches tweets", async () => {
    const callProxy = vi
      .fn<XProxyCaller>()
      .mockResolvedValueOnce(
        proxyResult({ data: { id: "42", name: "Test User", username: "test" } })
      )
      .mockResolvedValueOnce(
        proxyResult({
          data: [
            { id: "t1", text: "Hello world" },
            { id: "t2", text: "Second post" },
          ],
        })
      );
    const tools = createXTools(callProxy);
    const result = (await runExecutor(tools.x_get_my_posts, { maxResults: 10 })) as {
      id: string;
      text: string;
    }[];
    expect(result).toEqual([
      { id: "t1", text: "Hello world" },
      { id: "t2", text: "Second post" },
    ]);
    expect(callProxy).toHaveBeenCalledTimes(2);
    expect(callProxy.mock.calls[0][0]).toBe("/2/users/me");
    const [postsPath, postsQuery] = callProxy.mock.calls[1];
    expect(postsPath).toBe("/2/users/42/tweets");
    expect(postsQuery?.max_results).toBe(10);
  });

  test("x_get_my_posts returns empty array when data is empty", async () => {
    const callProxy = vi
      .fn<XProxyCaller>()
      .mockResolvedValueOnce(proxyResult({ data: { id: "5", name: "Test", username: "test" } }))
      .mockResolvedValueOnce(proxyResult({ data: [] }));
    const tools = createXTools(callProxy);
    const result = await runExecutor(tools.x_get_my_posts, {});
    expect(result).toEqual([]);
  });

  test("x_get_my_posts clamps max_results above 100 to 100", async () => {
    const callProxy = vi
      .fn<XProxyCaller>()
      .mockResolvedValueOnce(proxyResult({ data: { id: "7", name: "Test", username: "test" } }))
      .mockResolvedValueOnce(proxyResult({ data: [] }));
    const tools = createXTools(callProxy);
    await runExecutor(tools.x_get_my_posts, { maxResults: 200 });
    expect(callProxy.mock.calls[1][1]?.max_results).toBe(100);
  });

  test("x_get_my_posts clamps max_results below 5 to 5", async () => {
    const callProxy = vi
      .fn<XProxyCaller>()
      .mockResolvedValueOnce(proxyResult({ data: { id: "8", name: "Test", username: "test" } }))
      .mockResolvedValueOnce(proxyResult({ data: [] }));
    const tools = createXTools(callProxy);
    await runExecutor(tools.x_get_my_posts, { maxResults: 1 });
    expect(callProxy.mock.calls[1][1]?.max_results).toBe(5);
  });

  test("x_get_my_posts falls back to default 10 when maxResults is NaN", async () => {
    const callProxy = vi
      .fn<XProxyCaller>()
      .mockResolvedValueOnce(proxyResult({ data: { id: "9", name: "Test", username: "test" } }))
      .mockResolvedValueOnce(proxyResult({ data: [] }));
    const tools = createXTools(callProxy);
    // Simulate model emitting a non-numeric value.
    await runExecutor(tools.x_get_my_posts, { maxResults: NaN });
    expect(callProxy.mock.calls[1][1]?.max_results).toBe(10);
  });

  test('x_get_my_posts honors a numeric string maxResults like "50"', async () => {
    const callProxy = vi
      .fn<XProxyCaller>()
      .mockResolvedValueOnce(proxyResult({ data: { id: "10", name: "Test", username: "test" } }))
      .mockResolvedValueOnce(proxyResult({ data: [] }));
    const tools = createXTools(callProxy);
    // The model may emit maxResults as a numeric string.
    await runExecutor(tools.x_get_my_posts, { maxResults: "50" as unknown as number });
    expect(callProxy.mock.calls[1][1]?.max_results).toBe(50);
  });

  test("x_get_my_posts falls back to default 10 when maxResults is a non-numeric string", async () => {
    const callProxy = vi
      .fn<XProxyCaller>()
      .mockResolvedValueOnce(proxyResult({ data: { id: "11", name: "Test", username: "test" } }))
      .mockResolvedValueOnce(proxyResult({ data: [] }));
    const tools = createXTools(callProxy);
    await runExecutor(tools.x_get_my_posts, { maxResults: "abc" as unknown as number });
    expect(callProxy.mock.calls[1][1]?.max_results).toBe(10);
  });

  test("x_get_my_posts returns connector error when /2/users/me reports 401", async () => {
    const callProxy = vi.fn<XProxyCaller>().mockResolvedValueOnce(proxyResult(null, 401));
    const tools = createXTools(callProxy);
    const raw = (await runExecutor(tools.x_get_my_posts, {})) as string;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    expect(parsed.__anuma_connector_error_v1).toBe(true);
    expect(parsed.code).toBe("connector_not_connected");
  });

  test("x_get_my_posts returns generic failure string on non-auth 5xx", async () => {
    const callProxy = vi
      .fn<XProxyCaller>()
      .mockResolvedValueOnce(proxyResult({ error: "Internal Server Error" }, 500));
    const tools = createXTools(callProxy);
    const result = (await runExecutor(tools.x_get_my_posts, {})) as string;
    expect(typeof result).toBe("string");
    expect(result).toContain("500");
    const parsed = (() => {
      try {
        return JSON.parse(result) as Record<string, unknown>;
      } catch {
        return null;
      }
    })();
    expect(parsed?.__anuma_connector_error_v1).toBeUndefined();
  });
});
