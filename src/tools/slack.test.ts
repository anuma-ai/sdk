import { describe, expect, test, vi } from "vitest";

import { createSlackTools, SLACK_PENDING_APPROVAL_NOTE, type SlackProxyCaller } from "./slack.js";

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

  test("slack_list_channels follows next_cursor so a page-2 channel is returned", async () => {
    // Page 1 fills more than a single Slack page (100) and hands back a cursor;
    // the target channel only appears on page 2. Without pagination it's invisible.
    const page1 = Array.from({ length: 120 }, (_, i) => ({ id: `C${i}`, name: `ch${i}` }));
    const callProxy = vi.fn<SlackProxyCaller>().mockImplementation(async (path, query) => {
      if (path === "/conversations.list") {
        if (query?.cursor === "PAGE2") {
          return proxyResult({ ok: true, channels: [{ id: "C_ANUMA", name: "anuma-all" }] });
        }
        return proxyResult({
          ok: true,
          channels: page1,
          response_metadata: { next_cursor: "PAGE2" },
        });
      }
      return proxyResult({ ok: false }, 400);
    });
    const tools = createSlackTools(callProxy);
    const result = (await runExecutor(tools.slack_list_channels, {})) as Array<
      Record<string, unknown>
    >;
    expect(result.map((c) => c.name)).toContain("anuma-all");
    const listCalls = callProxy.mock.calls.filter((c) => c[0] === "/conversations.list");
    expect(listCalls).toHaveLength(2);
    expect(listCalls[1][1]?.cursor).toBe("PAGE2");
  });

  test("slack_search_messages resolves a page-2 channel name to its id via pagination", async () => {
    const page1 = Array.from({ length: 120 }, (_, i) => ({ id: `C${i}`, name: `ch${i}` }));
    const callProxy = vi.fn<SlackProxyCaller>().mockImplementation(async (path, query) => {
      if (path === "/conversations.list") {
        if (query?.cursor === "PAGE2") {
          return proxyResult({ ok: true, channels: [{ id: "C_ANUMA", name: "anuma-all" }] });
        }
        return proxyResult({
          ok: true,
          channels: page1,
          response_metadata: { next_cursor: "PAGE2" },
        });
      }
      if (path === "/conversations.history") {
        return proxyResult({
          ok: true,
          messages: [{ text: "deploy done", user: "bob", ts: "1.1" }],
        });
      }
      return proxyResult({ ok: false }, 400);
    });
    const tools = createSlackTools(callProxy);
    const result = (await runExecutor(tools.slack_search_messages, {
      query: "deploy",
      channel: "anuma-all",
    })) as Array<Record<string, unknown>>;
    expect(result).toEqual([{ text: "deploy done", user: "bob", ts: "1.1", channel: "anuma-all" }]);
    // history must be scoped to the id resolved from the page-2 channel, not the raw name.
    const historyCalls = callProxy.mock.calls.filter((c) => c[0] === "/conversations.history");
    expect(historyCalls).toHaveLength(1);
    expect(historyCalls[0][1]?.channel).toBe("C_ANUMA");
  });

  test("slack conversations.list pagination is capped at MAX_CONVERSATIONS_PAGES", async () => {
    // A cursor that never empties would loop forever; the page cap must stop it.
    const callProxy = vi.fn<SlackProxyCaller>().mockImplementation(async () =>
      proxyResult({
        ok: true,
        channels: [{ id: "C1", name: "c1" }],
        response_metadata: { next_cursor: "MORE" },
      })
    );
    const tools = createSlackTools(callProxy);
    await runExecutor(tools.slack_list_channels, {});
    const listCalls = callProxy.mock.calls.filter((c) => c[0] === "/conversations.list");
    // MAX_CONVERSATIONS_PAGES = 10 (see slack.ts).
    expect(listCalls).toHaveLength(10);
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
    // DMs are pulled into scope, and one page covers >100-channel workspaces.
    expect(callProxy.mock.calls[0][1]?.types).toBe("public_channel,private_channel,im,mpim");
    expect(callProxy.mock.calls[0][1]?.limit).toBe(1000);
    expect(callProxy.mock.calls[1][0]).toBe("/conversations.history");
    expect(callProxy.mock.calls[1][1]?.channel).toBe("C9");
  });

  test("slack_search_messages returns a DM (im) match with a readable label", async () => {
    const callProxy = vi.fn<SlackProxyCaller>().mockImplementation(async (path) => {
      // conversations.list surfaces a 1:1 DM (no name, other party = U2).
      if (path === "/conversations.list") {
        return proxyResult({ ok: true, channels: [{ id: "D1", is_im: true, user: "U2" }] });
      }
      if (path === "/conversations.history") {
        return proxyResult({
          ok: true,
          messages: [{ text: "deploy done", user: "U2", ts: "1.1" }],
        });
      }
      if (path === "/auth.test") return proxyResult({ ok: true, user_id: "U1" });
      // The other party is named from the shared users directory (users.list).
      if (path === "/users.list") {
        return proxyResult({
          ok: true,
          members: [
            { id: "U2", name: "bobby", real_name: "Bob Example", profile: { display_name: "bob" } },
          ],
        });
      }
      return proxyResult({ ok: false }, 400);
    });
    const tools = createSlackTools(callProxy);
    const result = (await runExecutor(tools.slack_search_messages, { query: "deploy" })) as Array<
      Record<string, unknown>
    >;
    expect(result).toEqual([
      { text: "deploy done", user: "U2", ts: "1.1", channel: "DM with bob" },
    ]);
    // The directory covers the counterparty, so no per-DM users.info is needed.
    expect(callProxy.mock.calls.some((c) => c[0] === "/users.info")).toBe(false);
  });

  test("slack_search_messages names a group DM (mpim) match from the users directory", async () => {
    const callProxy = vi.fn<SlackProxyCaller>().mockImplementation(async (path) => {
      if (path === "/conversations.list") {
        return proxyResult({
          ok: true,
          channels: [{ id: "G1", is_mpim: true, name: "mpdm-alice--bob--carol-1" }],
        });
      }
      if (path === "/conversations.history") {
        return proxyResult({
          ok: true,
          messages: [{ text: "deploy done", user: "U2", ts: "2.1" }],
        });
      }
      if (path === "/auth.test") return proxyResult({ ok: true, user_id: "U1" });
      if (path === "/users.list") {
        return proxyResult({
          ok: true,
          members: [
            { id: "UA", name: "alice", profile: { display_name: "Alice" } },
            { id: "UB", name: "bob", profile: { display_name: "Bob" } },
            { id: "UC", name: "carol", profile: { display_name: "Carol" } },
          ],
        });
      }
      return proxyResult({ ok: false }, 400);
    });
    const tools = createSlackTools(callProxy);
    const result = (await runExecutor(tools.slack_search_messages, { query: "deploy" })) as Array<
      Record<string, unknown>
    >;
    expect(result).toEqual([
      { text: "deploy done", user: "U2", ts: "2.1", channel: "Group DM with Alice, Bob, Carol" },
    ]);
    // Group-DM members come from the directory (users.list), never users.info.
    expect(callProxy.mock.calls.some((c) => c[0] === "/users.info")).toBe(false);
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

  test("slack_search_messages fans out across at most MAX_SEARCH_CHANNELS conversations", async () => {
    const channels = Array.from({ length: 12 }, (_, i) => ({ id: `C${i}`, name: `ch${i}` }));
    const callProxy = vi.fn<SlackProxyCaller>();
    callProxy.mockResolvedValueOnce(proxyResult({ ok: true, channels }));
    callProxy.mockResolvedValue(
      proxyResult({ ok: true, messages: [{ text: "nothing here", user: "u", ts: "1" }] })
    );
    const tools = createSlackTools(callProxy);
    await runExecutor(tools.slack_search_messages, { query: "deploy" });
    const historyCalls = callProxy.mock.calls.filter((c) => c[0] === "/conversations.history");
    expect(historyCalls).toHaveLength(8);
    expect(callProxy).toHaveBeenCalledTimes(9);
  });

  test("slack_search_messages reaches a DM that sorts after the channel cap", async () => {
    // conversations.list returns channels first, then the DM — mirroring Slack's
    // real ordering. With more channels than the cap, a plain slice would never
    // reach D1; interleaving pulls it into the scanned set.
    const channels = Array.from({ length: 10 }, (_, i) => ({ id: `C${i}`, name: `ch${i}` }));
    const dm = { id: "D1", is_im: true, user: "U2" };
    const callProxy = vi.fn<SlackProxyCaller>().mockImplementation(async (path, query) => {
      if (path === "/conversations.list") {
        return proxyResult({ ok: true, channels: [...channels, dm] });
      }
      if (path === "/conversations.history") {
        return query?.channel === "D1"
          ? proxyResult({ ok: true, messages: [{ text: "deploy done", user: "U2", ts: "9.1" }] })
          : proxyResult({ ok: true, messages: [{ text: "nothing here", user: "u", ts: "1" }] });
      }
      if (path === "/auth.test") return proxyResult({ ok: true, user_id: "U1" });
      if (path === "/users.info") {
        return proxyResult({
          ok: true,
          user: { id: "U2", real_name: "Bob Example", profile: { display_name: "bob" } },
        });
      }
      return proxyResult({ ok: false }, 400);
    });
    const tools = createSlackTools(callProxy);
    const result = (await runExecutor(tools.slack_search_messages, { query: "deploy" })) as Array<
      Record<string, unknown>
    >;
    const historyChannels = callProxy.mock.calls
      .filter((c) => c[0] === "/conversations.history")
      .map((c) => c[1]?.channel);
    expect(historyChannels).toContain("D1");
    expect(result).toContainEqual({
      text: "deploy done",
      user: "U2",
      ts: "9.1",
      channel: "DM with bob",
    });
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
    // one real match from C0, then the pending-approval note; C2 is never fetched.
    expect(result[0]).toEqual({ text: "deploy shipped", user: "u", ts: "1", channel: "a" });
    expect(result[result.length - 1].note).toBe(SLACK_PENDING_APPROVAL_NOTE);
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

  test("slack_get_channel_history returns the pending-approval note on a 429", async () => {
    const callProxy = vi
      .fn<SlackProxyCaller>()
      .mockResolvedValueOnce(proxyResult({ ok: false, error: "ratelimited" }, 429));
    const tools = createSlackTools(callProxy);
    const result = (await runExecutor(tools.slack_get_channel_history, {
      channel: "C1",
    })) as unknown;
    expect(result).toBe(SLACK_PENDING_APPROVAL_NOTE);
  });

  test("slack_get_thread_replies returns the pending-approval note on a 429", async () => {
    const callProxy = vi
      .fn<SlackProxyCaller>()
      .mockResolvedValueOnce(proxyResult({ ok: false, error: "ratelimited" }, 429));
    const tools = createSlackTools(callProxy);
    const result = (await runExecutor(tools.slack_get_thread_replies, {
      channel: "C1",
      ts: "1.0",
    })) as unknown;
    expect(result).toBe(SLACK_PENDING_APPROVAL_NOTE);
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

  test("slack_list_dms names group-DM members and resolves 1:1s from the directory", async () => {
    const callProxy = vi.fn<SlackProxyCaller>().mockImplementation(async (path) => {
      if (path === "/conversations.list") {
        return proxyResult({
          ok: true,
          channels: [
            { id: "D1", is_im: true, user: "U2" },
            // self (U1 -> handle "me") is present in the mpdm name and must be dropped.
            { id: "G1", is_mpim: true, name: "mpdm-alice--bob--carol--me-1" },
          ],
        });
      }
      if (path === "/auth.test") return proxyResult({ ok: true, user_id: "U1" });
      if (path === "/conversations.history") {
        return proxyResult({ ok: true, messages: [{ ts: "100" }] });
      }
      if (path === "/users.list") {
        return proxyResult({
          ok: true,
          members: [
            { id: "U1", name: "me", profile: { display_name: "Me" } },
            { id: "U2", name: "bobby", real_name: "Bob Example", profile: { display_name: "bob" } },
            { id: "UA", name: "alice", profile: { display_name: "Alice" } },
            { id: "UB", name: "bob", profile: { display_name: "Bob" } },
            { id: "UC", name: "carol", profile: { display_name: "Carol" } },
          ],
        });
      }
      return proxyResult({ ok: false }, 400);
    });
    const tools = createSlackTools(callProxy);
    const result = (await runExecutor(tools.slack_list_dms, {})) as Array<Record<string, unknown>>;
    expect(result).toEqual([
      { id: "D1", type: "im", name: "DM with bob", user: "U2" },
      { id: "G1", type: "mpim", name: "Group DM with Alice, Bob, Carol" },
    ]);
    // im/mpim are the only conversation types requested.
    expect(callProxy.mock.calls[0][0]).toBe("/conversations.list");
    expect(callProxy.mock.calls[0][1]?.types).toBe("im,mpim");
    // Listing N DMs costs one users.list, never a per-DM users.info.
    expect(callProxy.mock.calls.some((c) => c[0] === "/users.info")).toBe(false);
    expect(callProxy.mock.calls.filter((c) => c[0] === "/users.list")).toHaveLength(1);
  });

  test("slack_list_dms falls back to the raw handle for an unmapped group-DM member", async () => {
    const callProxy = vi.fn<SlackProxyCaller>().mockImplementation(async (path) => {
      if (path === "/conversations.list") {
        return proxyResult({
          ok: true,
          channels: [{ id: "G1", is_mpim: true, name: "mpdm-alice--ghost-1" }],
        });
      }
      if (path === "/auth.test") return proxyResult({ ok: true, user_id: "U1" });
      if (path === "/conversations.history") {
        return proxyResult({ ok: true, messages: [{ ts: "100" }] });
      }
      if (path === "/users.list") {
        return proxyResult({
          ok: true,
          members: [{ id: "UA", name: "alice", profile: { display_name: "Alice" } }],
        });
      }
      return proxyResult({ ok: false }, 400);
    });
    const tools = createSlackTools(callProxy);
    const result = (await runExecutor(tools.slack_list_dms, {})) as Array<Record<string, unknown>>;
    // "ghost" isn't in the directory, so its handle is shown verbatim.
    expect(result).toEqual([{ id: "G1", type: "mpim", name: "Group DM with Alice, ghost" }]);
  });

  test("slack_list_dms uses a non-mpdm group name verbatim", async () => {
    const callProxy = vi.fn<SlackProxyCaller>().mockImplementation(async (path) => {
      if (path === "/conversations.list") {
        return proxyResult({
          ok: true,
          channels: [{ id: "G1", is_mpim: true, name: "release-crew" }],
        });
      }
      if (path === "/auth.test") return proxyResult({ ok: true, user_id: "U1" });
      if (path === "/conversations.history") {
        return proxyResult({ ok: true, messages: [{ ts: "100" }] });
      }
      if (path === "/users.list") return proxyResult({ ok: true, members: [] });
      return proxyResult({ ok: false }, 400);
    });
    const tools = createSlackTools(callProxy);
    const result = (await runExecutor(tools.slack_list_dms, {})) as Array<Record<string, unknown>>;
    expect(result).toEqual([{ id: "G1", type: "mpim", name: "release-crew" }]);
  });

  test("slack_list_dms follows users.list next_cursor so a page-2 member resolves", async () => {
    const page1 = Array.from({ length: 3 }, (_, i) => ({ id: `U${i}`, name: `u${i}` }));
    const callProxy = vi.fn<SlackProxyCaller>().mockImplementation(async (path, query) => {
      if (path === "/conversations.list") {
        return proxyResult({ ok: true, channels: [{ id: "D1", is_im: true, user: "U_PAGE2" }] });
      }
      if (path === "/auth.test") return proxyResult({ ok: true, user_id: "U1" });
      if (path === "/conversations.history") {
        return proxyResult({ ok: true, messages: [{ ts: "100" }] });
      }
      if (path === "/users.list") {
        if (query?.cursor === "PAGE2") {
          return proxyResult({
            ok: true,
            members: [{ id: "U_PAGE2", name: "dana", profile: { display_name: "Dana" } }],
          });
        }
        return proxyResult({
          ok: true,
          members: page1,
          response_metadata: { next_cursor: "PAGE2" },
        });
      }
      return proxyResult({ ok: false }, 400);
    });
    const tools = createSlackTools(callProxy);
    const result = (await runExecutor(tools.slack_list_dms, {})) as Array<Record<string, unknown>>;
    // The counterparty only exists on page 2 — pagination must reach it.
    expect(result).toEqual([{ id: "D1", type: "im", name: "DM with Dana", user: "U_PAGE2" }]);
    const listCalls = callProxy.mock.calls.filter((c) => c[0] === "/users.list");
    expect(listCalls).toHaveLength(2);
    expect(listCalls[1][1]?.cursor).toBe("PAGE2");
  });

  test("slack_list_dms with_user resolves a name and returns only that 1:1 DM", async () => {
    const callProxy = vi.fn<SlackProxyCaller>().mockImplementation(async (path) => {
      if (path === "/conversations.list") {
        return proxyResult({
          ok: true,
          channels: [
            { id: "D1", is_im: true, user: "U2" },
            { id: "D2", is_im: true, user: "U3" },
          ],
        });
      }
      if (path === "/auth.test") return proxyResult({ ok: true, user_id: "U1" });
      if (path === "/users.list") {
        return proxyResult({
          ok: true,
          members: [
            { id: "U2", name: "bob", real_name: "Bob Example", profile: { display_name: "bob" } },
            { id: "U3", name: "amy", real_name: "Amy Example", profile: { display_name: "amy" } },
          ],
        });
      }
      return proxyResult({ ok: false }, 400);
    });
    const tools = createSlackTools(callProxy);
    const result = (await runExecutor(tools.slack_list_dms, { with_user: "bob" })) as Array<
      Record<string, unknown>
    >;
    // Only bob's DM survives; amy's is dropped.
    expect(result).toEqual([{ id: "D1", type: "im", name: "DM with bob", user: "U2" }]);
    // A targeted lookup makes zero history probes.
    expect(callProxy.mock.calls.some((c) => c[0] === "/conversations.history")).toBe(false);
  });

  test("slack_list_dms with_user returns the 1:1 DM even when it has no messages", async () => {
    // The bug: an empty targeted DM used to be probed and dropped, so "show my DMs
    // with Hazim" returned nothing. A targeted lookup must return it regardless.
    const callProxy = vi.fn<SlackProxyCaller>().mockImplementation(async (path) => {
      if (path === "/conversations.list") {
        return proxyResult({ ok: true, channels: [{ id: "D1", is_im: true, user: "U2" }] });
      }
      if (path === "/auth.test") return proxyResult({ ok: true, user_id: "U1" });
      // An empty DM: if this path were still probed, the DM would be dropped.
      if (path === "/conversations.history") return proxyResult({ ok: true, messages: [] });
      if (path === "/users.list") {
        return proxyResult({
          ok: true,
          members: [
            { id: "U2", name: "hazim", real_name: "Hazim", profile: { display_name: "Hazim" } },
          ],
        });
      }
      return proxyResult({ ok: false }, 400);
    });
    const tools = createSlackTools(callProxy);
    const result = (await runExecutor(tools.slack_list_dms, { with_user: "hazim" })) as Array<
      Record<string, unknown>
    >;
    // Not dropped: the DM is returned so the model can read it.
    expect(result).toEqual([{ id: "D1", type: "im", name: "DM with Hazim", user: "U2" }]);
    // And it never touched conversations.history on the with_user path.
    expect(callProxy.mock.calls.some((c) => c[0] === "/conversations.history")).toBe(false);
  });

  test("slack_list_dms with_user matches a group DM the person is a member of", async () => {
    const callProxy = vi.fn<SlackProxyCaller>().mockImplementation(async (path) => {
      if (path === "/conversations.list") {
        return proxyResult({
          ok: true,
          channels: [
            { id: "D1", is_im: true, user: "U2" },
            { id: "G1", is_mpim: true, name: "mpdm-alice--carol--me-1" },
          ],
        });
      }
      if (path === "/auth.test") return proxyResult({ ok: true, user_id: "U1" });
      if (path === "/users.list") {
        return proxyResult({
          ok: true,
          members: [
            { id: "U1", name: "me", profile: { display_name: "Me" } },
            { id: "U2", name: "bob", profile: { display_name: "bob" } },
            { id: "UA", name: "alice", profile: { display_name: "Alice" } },
            { id: "UC", name: "carol", profile: { display_name: "Carol" } },
          ],
        });
      }
      return proxyResult({ ok: false }, 400);
    });
    const tools = createSlackTools(callProxy);
    const result = (await runExecutor(tools.slack_list_dms, { with_user: "carol" })) as Array<
      Record<string, unknown>
    >;
    // The 1:1 with bob is dropped; the group DM carol is in survives.
    expect(result).toEqual([{ id: "G1", type: "mpim", name: "Group DM with Alice, Carol" }]);
    // A targeted lookup makes zero history probes.
    expect(callProxy.mock.calls.some((c) => c[0] === "/conversations.history")).toBe(false);
  });

  test("slack_list_dms with_user that can't be resolved returns the guidance error", async () => {
    const callProxy = vi.fn<SlackProxyCaller>().mockImplementation(async (path) => {
      if (path === "/conversations.list") {
        return proxyResult({ ok: true, channels: [{ id: "D1", is_im: true, user: "U2" }] });
      }
      if (path === "/auth.test") return proxyResult({ ok: true, user_id: "U1" });
      if (path === "/users.list") {
        return proxyResult({
          ok: true,
          members: [{ id: "U2", name: "bob", profile: { display_name: "bob" } }],
        });
      }
      return proxyResult({ ok: false }, 400);
    });
    const tools = createSlackTools(callProxy);
    const result = (await runExecutor(tools.slack_list_dms, { with_user: "nobody" })) as string;
    expect(typeof result).toBe("string");
    expect(result).toContain("nobody");
    // Not the full DM list, and not a connector-error JSON blob.
    const parsed = (() => {
      try {
        return JSON.parse(result) as Record<string, unknown>;
      } catch {
        return null;
      }
    })();
    expect(parsed?.__anuma_connector_error_v1).toBeUndefined();
  });

  test("slack_list_dms orders DMs by most-recent message (newest first)", async () => {
    const lastTs: Record<string, string> = { D1: "100", D2: "300", D3: "200" };
    const callProxy = vi.fn<SlackProxyCaller>().mockImplementation(async (path, query) => {
      if (path === "/conversations.list") {
        return proxyResult({
          ok: true,
          channels: [
            { id: "D1", is_im: true, user: "U1x" },
            { id: "D2", is_im: true, user: "U2x" },
            { id: "D3", is_im: true, user: "U3x" },
          ],
        });
      }
      if (path === "/auth.test") return proxyResult({ ok: true, user_id: "UME" });
      if (path === "/conversations.history") {
        return proxyResult({ ok: true, messages: [{ ts: lastTs[String(query?.channel)] }] });
      }
      if (path === "/users.list") {
        return proxyResult({
          ok: true,
          members: [
            { id: "U1x", name: "u1", profile: { display_name: "One" } },
            { id: "U2x", name: "u2", profile: { display_name: "Two" } },
            { id: "U3x", name: "u3", profile: { display_name: "Three" } },
          ],
        });
      }
      return proxyResult({ ok: false }, 400);
    });
    const tools = createSlackTools(callProxy);
    const result = (await runExecutor(tools.slack_list_dms, {})) as Array<Record<string, unknown>>;
    // ts 300 (D2) > 200 (D3) > 100 (D1).
    expect(result.map((d) => d.id)).toEqual(["D2", "D3", "D1"]);
  });

  test("slack_list_dms drops a DM that has no messages", async () => {
    const callProxy = vi.fn<SlackProxyCaller>().mockImplementation(async (path, query) => {
      if (path === "/conversations.list") {
        return proxyResult({
          ok: true,
          channels: [
            { id: "D1", is_im: true, user: "U2x" },
            // Alyson: a DM we've never actually messaged in.
            { id: "D2", is_im: true, user: "U3x" },
          ],
        });
      }
      if (path === "/auth.test") return proxyResult({ ok: true, user_id: "UME" });
      if (path === "/conversations.history") {
        return proxyResult({
          ok: true,
          messages: String(query?.channel) === "D2" ? [] : [{ ts: "100" }],
        });
      }
      if (path === "/users.list") {
        return proxyResult({
          ok: true,
          members: [
            { id: "U2x", name: "bob", profile: { display_name: "Bob" } },
            { id: "U3x", name: "alyson", profile: { display_name: "Alyson" } },
          ],
        });
      }
      return proxyResult({ ok: false }, 400);
    });
    const tools = createSlackTools(callProxy);
    const result = (await runExecutor(tools.slack_list_dms, {})) as Array<Record<string, unknown>>;
    expect(result).toEqual([{ id: "D1", type: "im", name: "DM with Bob", user: "U2x" }]);
  });

  test("slack_list_dms returns the pending-approval note when a probe is rate-limited", async () => {
    const callProxy = vi.fn<SlackProxyCaller>().mockImplementation(async (path, query) => {
      if (path === "/conversations.list") {
        return proxyResult({
          ok: true,
          channels: [
            { id: "D1", is_im: true, user: "U2x" },
            { id: "D2", is_im: true, user: "U3x" },
          ],
        });
      }
      if (path === "/auth.test") return proxyResult({ ok: true, user_id: "UME" });
      if (path === "/conversations.history") {
        return String(query?.channel) === "D1"
          ? proxyResult({ ok: true, messages: [{ ts: "100" }] })
          : proxyResult({ ok: false, error: "ratelimited" }, 429);
      }
      if (path === "/users.list") {
        return proxyResult({
          ok: true,
          members: [
            { id: "U2x", name: "bob", profile: { display_name: "Bob" } },
            { id: "U3x", name: "amy", profile: { display_name: "Amy" } },
          ],
        });
      }
      return proxyResult({ ok: false }, 400);
    });
    const tools = createSlackTools(callProxy);
    const result = (await runExecutor(tools.slack_list_dms, {})) as unknown;
    // No partial list -- the pending-approval message is returned verbatim.
    expect(result).toBe(SLACK_PENDING_APPROVAL_NOTE);
  });

  test("slack_list_dms returns the pending-approval note when there are more DMs than MAX_DM_PROBES", async () => {
    // 51 DMs exceeds MAX_DM_PROBES (50): we can't order that many under the throttle.
    const channels = Array.from({ length: 51 }, (_, i) => ({
      id: `D${i}`,
      is_im: true,
      user: `U${i}`,
    }));
    const callProxy = vi.fn<SlackProxyCaller>().mockImplementation(async (path) => {
      if (path === "/conversations.list") return proxyResult({ ok: true, channels });
      if (path === "/auth.test") return proxyResult({ ok: true, user_id: "UME" });
      if (path === "/conversations.history") {
        return proxyResult({ ok: true, messages: [{ ts: "100" }] });
      }
      if (path === "/users.list") return proxyResult({ ok: true, members: [] });
      return proxyResult({ ok: false }, 400);
    });
    const tools = createSlackTools(callProxy);
    const result = (await runExecutor(tools.slack_list_dms, {})) as unknown;
    expect(result).toBe(SLACK_PENDING_APPROVAL_NOTE);
    // We bail before probing rather than partially ordering.
    const historyCalls = callProxy.mock.calls.filter((c) => c[0] === "/conversations.history");
    expect(historyCalls).toHaveLength(0);
  });

  test("slack_search_messages from_user resolves a name via users.list and keeps only that author", async () => {
    const callProxy = vi.fn<SlackProxyCaller>().mockImplementation(async (path) => {
      if (path === "/users.list") {
        return proxyResult({
          ok: true,
          members: [
            { id: "U2", name: "bob", real_name: "Bob Example" },
            { id: "U3", name: "amy", real_name: "Amy Example" },
          ],
        });
      }
      if (path === "/conversations.list") {
        return proxyResult({ ok: true, channels: [{ id: "C1", name: "eng" }] });
      }
      if (path === "/conversations.history") {
        return proxyResult({
          ok: true,
          messages: [
            { text: "deploy done", user: "U2", ts: "2.0" },
            { text: "lunch?", user: "U3", ts: "1.0" },
          ],
        });
      }
      return proxyResult({ ok: false }, 400);
    });
    const tools = createSlackTools(callProxy);
    const result = (await runExecutor(tools.slack_search_messages, {
      from_user: "bob",
    })) as Array<Record<string, unknown>>;
    expect(result).toEqual([{ text: "deploy done", user: "U2", ts: "2.0", channel: "eng" }]);
  });

  test("slack_search_messages from_user accepts a bare user id without a users.list lookup", async () => {
    const callProxy = vi.fn<SlackProxyCaller>().mockImplementation(async (path) => {
      if (path === "/conversations.list") {
        return proxyResult({ ok: true, channels: [{ id: "C1", name: "eng" }] });
      }
      if (path === "/conversations.history") {
        return proxyResult({
          ok: true,
          messages: [
            { text: "deploy done", user: "U0000002", ts: "2.0" },
            { text: "hi", user: "U0000003", ts: "1.0" },
          ],
        });
      }
      return proxyResult({ ok: false }, 400);
    });
    const tools = createSlackTools(callProxy);
    const result = (await runExecutor(tools.slack_search_messages, {
      from_user: "U0000002",
    })) as Array<Record<string, unknown>>;
    expect(result).toEqual([{ text: "deploy done", user: "U0000002", ts: "2.0", channel: "eng" }]);
    // A bare id needs no directory lookup.
    expect(callProxy.mock.calls.some((c) => c[0] === "/users.list")).toBe(false);
  });

  test("slack_search_messages mentions keeps messages that @-mention the user (both token forms)", async () => {
    const callProxy = vi.fn<SlackProxyCaller>().mockImplementation(async (path) => {
      if (path === "/conversations.list") {
        return proxyResult({ ok: true, channels: [{ id: "C1", name: "eng" }] });
      }
      if (path === "/conversations.history") {
        return proxyResult({
          ok: true,
          messages: [
            { text: "hey <@U0000009> ship it", user: "U2", ts: "3.0" },
            { text: "cc <@U0000009|dave> please", user: "U3", ts: "2.0" },
            { text: "no mention here", user: "U4", ts: "1.0" },
          ],
        });
      }
      return proxyResult({ ok: false }, 400);
    });
    const tools = createSlackTools(callProxy);
    const result = (await runExecutor(tools.slack_search_messages, {
      mentions: "U0000009",
    })) as Array<Record<string, unknown>>;
    // Both `<@U…>` and `<@U…|handle>` match; the un-mentioned message is dropped.
    expect(result.map((r) => r.ts)).toEqual(["3.0", "2.0"]);
  });

  test("slack_search_messages mentions 'me' resolves the authed user via auth.test", async () => {
    const callProxy = vi.fn<SlackProxyCaller>().mockImplementation(async (path) => {
      if (path === "/auth.test") return proxyResult({ ok: true, user_id: "U0000001" });
      if (path === "/conversations.list") {
        return proxyResult({ ok: true, channels: [{ id: "C1", name: "eng" }] });
      }
      if (path === "/conversations.history") {
        return proxyResult({
          ok: true,
          messages: [
            { text: "ping <@U0000001> look", user: "U2", ts: "2.0" },
            { text: "unrelated", user: "U3", ts: "1.0" },
          ],
        });
      }
      return proxyResult({ ok: false }, 400);
    });
    const tools = createSlackTools(callProxy);
    const result = (await runExecutor(tools.slack_search_messages, { mentions: "me" })) as Array<
      Record<string, unknown>
    >;
    expect(result).toEqual([
      { text: "ping <@U0000001> look", user: "U2", ts: "2.0", channel: "eng" },
    ]);
    expect(callProxy.mock.calls.some((c) => c[0] === "/auth.test")).toBe(true);
  });

  test("slack_search_messages with no query/from_user/mentions returns a guidance error", async () => {
    const callProxy = vi.fn<SlackProxyCaller>();
    const tools = createSlackTools(callProxy);
    const result = (await runExecutor(tools.slack_search_messages, {})) as string;
    expect(typeof result).toBe("string");
    expect(result).toContain("query");
    expect(result).toContain("from_user");
    expect(result).toContain("mentions");
    expect(callProxy).not.toHaveBeenCalled();
  });

  test("slack_search_messages sorts matches by recency before truncating (no eviction by scan order)", async () => {
    // C0 is scanned first but holds the OLDER match; C1 is scanned later with the
    // NEWER one. With count=1, arrival order would keep C0's stale hit — recency
    // sorting must surface C1's instead.
    const callProxy = vi.fn<SlackProxyCaller>().mockImplementation(async (path, query) => {
      if (path === "/conversations.list") {
        return proxyResult({
          ok: true,
          channels: [
            { id: "C0", name: "early" },
            { id: "C1", name: "late" },
          ],
        });
      }
      if (path === "/conversations.history") {
        return query?.channel === "C1"
          ? proxyResult({ ok: true, messages: [{ text: "deploy newer", user: "u", ts: "5.0" }] })
          : proxyResult({ ok: true, messages: [{ text: "deploy older", user: "u", ts: "1.0" }] });
      }
      return proxyResult({ ok: false }, 400);
    });
    const tools = createSlackTools(callProxy);
    const result = (await runExecutor(tools.slack_search_messages, {
      query: "deploy",
      count: 1,
    })) as Array<Record<string, unknown>>;
    expect(result).toEqual([{ text: "deploy newer", user: "u", ts: "5.0", channel: "late" }]);
  });
});
