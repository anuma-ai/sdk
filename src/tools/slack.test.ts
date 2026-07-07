import { describe, expect, test, vi } from "vitest";

import { createSlackTools, type SlackProxyCaller } from "./slack.js";

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

describe("createSlackTools", () => {
  test("slack_get_me calls auth.test then users.info and returns the profile", async () => {
    const callProxy = vi
      .fn<SlackProxyCaller>()
      .mockResolvedValueOnce(proxyResult({ ok: true, user_id: "U1", team: "T1" }))
      .mockResolvedValueOnce(
        proxyResult({
          ok: true,
          user: {
            id: "U1",
            name: "alice",
            real_name: "Alice Example",
            profile: { display_name: "alice", email: "alice@example.com", title: "Engineer" },
          },
        })
      );
    const tools = createSlackTools(callProxy);
    const result = (await runExecutor(tools.slack_get_me, {})) as Record<string, unknown>;
    expect(result.id).toBe("U1");
    expect(result.team).toBe("T1");
    expect(result.real_name).toBe("Alice Example");
    expect(result.email).toBe("alice@example.com");
    expect(callProxy).toHaveBeenCalledTimes(2);
    expect(callProxy.mock.calls[0][0]).toBe("/auth.test");
    expect(callProxy.mock.calls[1][0]).toBe("/users.info");
    expect(callProxy.mock.calls[1][1]?.user).toBe("U1");
  });

  test("slack_list_channels maps channels and clamps the limit", async () => {
    const callProxy = vi.fn<SlackProxyCaller>().mockResolvedValueOnce(
      proxyResult({
        ok: true,
        channels: [
          { id: "C1", name: "general", num_members: 10, topic: { value: "chat" } },
          { id: "C2", name: "random", is_private: true, purpose: { value: "fun" } },
        ],
      })
    );
    const tools = createSlackTools(callProxy);
    const result = (await runExecutor(tools.slack_list_channels, { limit: 5000 })) as Array<
      Record<string, unknown>
    >;
    expect(result).toEqual([
      {
        id: "C1",
        name: "general",
        is_private: undefined,
        num_members: 10,
        topic: "chat",
        purpose: undefined,
      },
      {
        id: "C2",
        name: "random",
        is_private: true,
        num_members: undefined,
        topic: undefined,
        purpose: "fun",
      },
    ]);
    expect(callProxy.mock.calls[0][0]).toBe("/conversations.list");
    expect(callProxy.mock.calls[0][1]?.limit).toBe(1000);
  });

  test("slack_search_messages (channel-scoped) reads conversations.history and filters by query", async () => {
    const callProxy = vi
      .fn<SlackProxyCaller>()
      .mockResolvedValueOnce(proxyResult({ ok: true, channels: [{ id: "C9", name: "eng" }] }))
      .mockResolvedValueOnce(
        proxyResult({
          ok: true,
          messages: [
            { text: "deploy done", user: "bob", ts: "1.1" },
            { text: "lunch soon?", user: "amy", ts: "1.2" },
          ],
        })
      );
    const tools = createSlackTools(callProxy);
    const result = (await runExecutor(tools.slack_search_messages, {
      query: "deploy",
      channel: "C9",
    })) as Array<Record<string, unknown>>;
    expect(result).toEqual([{ text: "deploy done", user: "bob", ts: "1.1", channel: "eng" }]);
    expect(callProxy.mock.calls[0][0]).toBe("/conversations.list");
    expect(callProxy.mock.calls[1][0]).toBe("/conversations.history");
    expect(callProxy.mock.calls[1][1]?.channel).toBe("C9");
  });

  test("slack_search_messages resolves a channel name to its id before reading history", async () => {
    const callProxy = vi
      .fn<SlackProxyCaller>()
      .mockResolvedValueOnce(proxyResult({ ok: true, channels: [{ id: "C9", name: "eng" }] }))
      .mockResolvedValueOnce(
        proxyResult({ ok: true, messages: [{ text: "deploy done", user: "bob", ts: "1.1" }] })
      );
    const tools = createSlackTools(callProxy);
    const result = (await runExecutor(tools.slack_search_messages, {
      query: "deploy",
      channel: "eng",
    })) as Array<Record<string, unknown>>;
    expect(result).toEqual([{ text: "deploy done", user: "bob", ts: "1.1", channel: "eng" }]);
    // history must be hit with the resolved id, not the name Slack would reject.
    expect(callProxy.mock.calls[1][1]?.channel).toBe("C9");
  });

  test("slack_search_messages fans out across at most 6 channels", async () => {
    const channels = Array.from({ length: 10 }, (_, i) => ({ id: `C${i}`, name: `ch${i}` }));
    const callProxy = vi.fn<SlackProxyCaller>();
    callProxy.mockResolvedValueOnce(proxyResult({ ok: true, channels }));
    callProxy.mockResolvedValue(
      proxyResult({ ok: true, messages: [{ text: "nothing here", user: "u", ts: "1" }] })
    );
    const tools = createSlackTools(callProxy);
    await runExecutor(tools.slack_search_messages, { query: "deploy" });
    const historyCalls = callProxy.mock.calls.filter((c) => c[0] === "/conversations.history");
    expect(historyCalls).toHaveLength(6);
    expect(callProxy).toHaveBeenCalledTimes(7);
  });

  test("slack_search_messages caps results at count", async () => {
    const callProxy = vi
      .fn<SlackProxyCaller>()
      .mockResolvedValueOnce(proxyResult({ ok: true, channels: [{ id: "C0", name: "a" }] }))
      .mockResolvedValueOnce(
        proxyResult({
          ok: true,
          messages: [
            { text: "deploy one", user: "u", ts: "1" },
            { text: "deploy two", user: "u", ts: "2" },
          ],
        })
      );
    const tools = createSlackTools(callProxy);
    const result = (await runExecutor(tools.slack_search_messages, {
      query: "deploy",
      count: 1,
    })) as Array<Record<string, unknown>>;
    expect(result).toHaveLength(1);
  });

  test("slack_search_messages stops on a 429 mid-fan-out and returns partial results", async () => {
    const channels = [
      { id: "C0", name: "a" },
      { id: "C1", name: "b" },
      { id: "C2", name: "c" },
    ];
    const callProxy = vi.fn<SlackProxyCaller>();
    callProxy
      .mockResolvedValueOnce(proxyResult({ ok: true, channels }))
      .mockResolvedValueOnce(
        proxyResult({ ok: true, messages: [{ text: "deploy shipped", user: "u", ts: "1" }] })
      )
      .mockResolvedValueOnce(proxyResult({ ok: false, error: "ratelimited" }, 429));
    const tools = createSlackTools(callProxy);
    const result = (await runExecutor(tools.slack_search_messages, { query: "deploy" })) as Array<
      Record<string, unknown>
    >;
    // one real match from C0, then a synthetic note; C2 is never fetched.
    expect(result[0]).toEqual({ text: "deploy shipped", user: "u", ts: "1", channel: "a" });
    expect(result[result.length - 1].note).toBeDefined();
    expect(callProxy).toHaveBeenCalledTimes(3);
  });

  test("slack_list_users omits deactivated members", async () => {
    const callProxy = vi.fn<SlackProxyCaller>().mockResolvedValueOnce(
      proxyResult({
        ok: true,
        members: [
          { id: "U1", name: "alice", real_name: "Alice" },
          { id: "U2", name: "ghost", deleted: true },
        ],
      })
    );
    const tools = createSlackTools(callProxy);
    const result = (await runExecutor(tools.slack_list_users, {})) as Array<
      Record<string, unknown>
    >;
    expect(result).toEqual([
      { id: "U1", name: "alice", real_name: "Alice", is_bot: undefined, title: undefined },
    ]);
    expect(callProxy.mock.calls[0][0]).toBe("/users.list");
  });

  test("slack_get_channel_history fetches conversations.history for a channel", async () => {
    const callProxy = vi.fn<SlackProxyCaller>().mockResolvedValueOnce(
      proxyResult({
        ok: true,
        messages: [{ text: "hi", user: "U1", ts: "1.0" }],
      })
    );
    const tools = createSlackTools(callProxy);
    const result = (await runExecutor(tools.slack_get_channel_history, {
      channel: "C1",
      limit: 5,
    })) as Array<Record<string, unknown>>;
    expect(result).toEqual([{ text: "hi", user: "U1", ts: "1.0" }]);
    expect(callProxy.mock.calls[0][0]).toBe("/conversations.history");
    expect(callProxy.mock.calls[0][1]?.channel).toBe("C1");
    expect(callProxy.mock.calls[0][1]?.limit).toBe(5);
  });

  test("slack_get_thread_replies fetches conversations.replies for a thread", async () => {
    const callProxy = vi.fn<SlackProxyCaller>().mockResolvedValueOnce(
      proxyResult({
        ok: true,
        messages: [
          { text: "root", user: "U1", ts: "1.0" },
          { text: "reply", username: "bob", ts: "2.0" },
        ],
      })
    );
    const tools = createSlackTools(callProxy);
    const result = (await runExecutor(tools.slack_get_thread_replies, {
      channel: "C1",
      ts: "1.0",
      limit: 5,
    })) as Array<Record<string, unknown>>;
    expect(result).toEqual([
      { text: "root", user: "U1", ts: "1.0" },
      { text: "reply", user: "bob", ts: "2.0" },
    ]);
    expect(callProxy.mock.calls[0][0]).toBe("/conversations.replies");
    expect(callProxy.mock.calls[0][1]?.channel).toBe("C1");
    expect(callProxy.mock.calls[0][1]?.ts).toBe("1.0");
    expect(callProxy.mock.calls[0][1]?.limit).toBe(5);
  });

  test("slack_post_message posts the body to chat.postMessage and returns a compact result", async () => {
    const callProxy = vi
      .fn<SlackProxyCaller>()
      .mockResolvedValueOnce(proxyResult({ ok: true, ts: "9.9", channel: "C1" }));
    const tools = createSlackTools(callProxy);
    const result = (await runExecutor(tools.slack_post_message, {
      channel: "C1",
      text: "hello",
    })) as Record<string, unknown>;
    expect(result).toEqual({ ok: true, ts: "9.9", channel: "C1" });
    expect(callProxy.mock.calls[0][0]).toBe("/chat.postMessage");
    expect(callProxy.mock.calls[0][1]).toBeUndefined();
    expect(callProxy.mock.calls[0][2]).toEqual({ channel: "C1", text: "hello" });
  });

  test("slack_post_message forwards thread_ts when replying in a thread", async () => {
    const callProxy = vi
      .fn<SlackProxyCaller>()
      .mockResolvedValueOnce(proxyResult({ ok: true, ts: "9.9", channel: "C1" }));
    const tools = createSlackTools(callProxy);
    await runExecutor(tools.slack_post_message, {
      channel: "C1",
      text: "in thread",
      thread_ts: "1.0",
    });
    expect(callProxy.mock.calls[0][2]).toEqual({
      channel: "C1",
      text: "in thread",
      thread_ts: "1.0",
    });
  });

  test("slack_post_message to a channel the user isn't in returns a generic failure string", async () => {
    const callProxy = vi
      .fn<SlackProxyCaller>()
      .mockResolvedValueOnce(proxyResult({ ok: false, error: "not_in_channel" }, 200));
    const tools = createSlackTools(callProxy);
    const result = (await runExecutor(tools.slack_post_message, {
      channel: "C1",
      text: "hello",
    })) as string;
    expect(typeof result).toBe("string");
    expect(result).toContain("not_in_channel");
    const parsed = (() => {
      try {
        return JSON.parse(result) as Record<string, unknown>;
      } catch {
        return null;
      }
    })();
    expect(parsed?.__anuma_connector_error_v1).toBeUndefined();
  });

  test("returns connector error when the proxy reports 401", async () => {
    const callProxy = vi.fn<SlackProxyCaller>().mockResolvedValueOnce(proxyResult(null, 401));
    const tools = createSlackTools(callProxy);
    const raw = (await runExecutor(tools.slack_list_channels, {})) as string;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    expect(parsed).toEqual({
      __anuma_connector_error_v1: true,
      code: "connector_not_connected",
      provider: "slack",
    });
  });

  test("maps Slack ok:false invalid_auth (HTTP 200) to a connector error", async () => {
    const callProxy = vi
      .fn<SlackProxyCaller>()
      .mockResolvedValueOnce(proxyResult({ ok: false, error: "invalid_auth" }, 200));
    const tools = createSlackTools(callProxy);
    const raw = (await runExecutor(tools.slack_search_messages, { query: "x" })) as string;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    expect(parsed.__anuma_connector_error_v1).toBe(true);
    expect(parsed.code).toBe("connector_not_connected");
    expect(parsed.provider).toBe("slack");
  });

  test("maps Slack ok:false missing_scope (HTTP 200) to an insufficient_scope error with the required scope", async () => {
    const callProxy = vi
      .fn<SlackProxyCaller>()
      .mockResolvedValueOnce(
        proxyResult({ ok: false, error: "missing_scope", needed: "channels:read" }, 200)
      );
    const tools = createSlackTools(callProxy);
    const raw = (await runExecutor(tools.slack_list_channels, {})) as string;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    expect(parsed.__anuma_connector_error_v1).toBe(true);
    expect(parsed.code).toBe("insufficient_scope");
    expect(parsed.provider).toBe("slack");
    expect(parsed.required).toBe("channels:read");
  });

  test("maps Slack ok:false token_revoked (HTTP 200) to a connector_not_connected error", async () => {
    const callProxy = vi
      .fn<SlackProxyCaller>()
      .mockResolvedValueOnce(proxyResult({ ok: false, error: "token_revoked" }, 200));
    const tools = createSlackTools(callProxy);
    const raw = (await runExecutor(tools.slack_list_users, {})) as string;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    expect(parsed.code).toBe("connector_not_connected");
    expect(parsed.provider).toBe("slack");
  });

  test("non-auth Slack error (HTTP 200) returns a generic failure string", async () => {
    const callProxy = vi
      .fn<SlackProxyCaller>()
      .mockResolvedValueOnce(proxyResult({ ok: false, error: "channel_not_found" }, 200));
    const tools = createSlackTools(callProxy);
    const result = (await runExecutor(tools.slack_get_channel_history, {
      channel: "C0",
    })) as string;
    expect(typeof result).toBe("string");
    expect(result).toContain("channel_not_found");
    const parsed = (() => {
      try {
        return JSON.parse(result) as Record<string, unknown>;
      } catch {
        return null;
      }
    })();
    expect(parsed?.__anuma_connector_error_v1).toBeUndefined();
  });

  test("returns a generic failure string on a non-auth 5xx", async () => {
    const callProxy = vi
      .fn<SlackProxyCaller>()
      .mockResolvedValueOnce(proxyResult({ error: "Internal Server Error" }, 500));
    const tools = createSlackTools(callProxy);
    const result = (await runExecutor(tools.slack_list_users, {})) as string;
    expect(typeof result).toBe("string");
    expect(result).toContain("500");
  });
});
