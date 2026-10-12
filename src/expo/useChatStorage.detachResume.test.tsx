// @vitest-environment happy-dom

import { Database } from "@nozbe/watermelondb";
import LokiJSAdapter from "@nozbe/watermelondb/adapters/lokijs";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, type MockInstance, vi } from "vitest";

import { sdkMigrations, sdkModelClasses, sdkSchema } from "../lib/db/schema";
import {
  Conversation,
  createConversationOp,
  getMessagesOp,
  type StorageOperationsContext,
  upsertMessageOp,
} from "../lib/db/chat";

vi.mock("../lib/chat/toolLoop", async (importOriginal) => {
  const orig = await importOriginal<typeof import("../lib/chat/toolLoop")>();
  return { ...orig, runToolLoop: vi.fn() };
});
vi.mock("../lib/chat/resumeStream", async (importOriginal) => {
  const orig = await importOriginal<typeof import("../lib/chat/resumeStream")>();
  return { ...orig, resumeStream: vi.fn() };
});

import { MCP_R2_DOMAIN } from "../clientConfig";
import { runToolLoop } from "../lib/chat/toolLoop";
import { resumeStream as libResumeStream, StreamExpiredError } from "../lib/chat/resumeStream";
import { streamCancelPath } from "../lib/chat/resumeStream";
import {
  clearAllEncryptionKeys,
  hasEncryptionKey,
  requestEncryptionKey,
} from "../react/useEncryption";
import { useChatStorage } from "./useChatStorage";

const mockRunToolLoop = vi.mocked(runToolLoop);
const mockResumeStream = vi.mocked(libResumeStream);

function makeDatabase(): Database {
  const adapter = new LokiJSAdapter({
    schema: sdkSchema,
    migrations: sdkMigrations,
    useWebWorker: false,
    useIncrementalIndexedDB: false,
    dbName: `detach-resume-test-${Math.random().toString(36).slice(2)}`,
  });
  return new Database({ adapter, modelClasses: sdkModelClasses });
}

function makeCtx(db: Database): StorageOperationsContext {
  return {
    database: db,
    messagesCollection: db.get("history"),
    conversationsCollection: db.get<Conversation>("conversations"),
  };
}

function responsesShape(text: string) {
  return {
    id: `resp-${Math.random().toString(36).slice(2)}`,
    model: "test-model",
    object: "response",
    output: [
      {
        type: "message",
        role: "assistant",
        content: [{ type: "output_text", text }],
        status: "completed",
      },
    ],
    usage: undefined,
  };
}

describe("upsertMessageOp single-row reconciliation", () => {
  let db: Database;
  let ctx: StorageOperationsContext;

  beforeEach(() => {
    db = makeDatabase();
    ctx = makeCtx(db);
  });

  it("creates the row on first call, updates it in place on the second", async () => {
    await createConversationOp(ctx, { conversationId: "conv_a" });

    const partial = await upsertMessageOp(ctx, {
      conversationId: "conv_a",
      role: "assistant",
      content: "partial",
      uniqueId: "assistant-1",
    });
    expect(partial.uniqueId).toBe("assistant-1");
    expect(partial.content).toBe("partial");

    const completed = await upsertMessageOp(ctx, {
      conversationId: "conv_a",
      role: "assistant",
      content: "partial then the rest, complete",
      uniqueId: "assistant-1",
    });

    expect(completed.uniqueId).toBe("assistant-1");
    expect(completed.content).toBe("partial then the rest, complete");

    const all = await getMessagesOp(ctx, "conv_a");
    const assistantRows = all.filter((m) => m.role === "assistant");
    expect(assistantRows).toHaveLength(1);
    expect(assistantRows[0].uniqueId).toBe("assistant-1");
    expect(assistantRows[0].content).toBe("partial then the rest, complete");
  });

  it("preserves the conversation ordinal (message_id) across the update", async () => {
    await createConversationOp(ctx, { conversationId: "conv_b" });
    await upsertMessageOp(ctx, {
      conversationId: "conv_b",
      role: "user",
      content: "hi",
      uniqueId: "user-1",
    });
    const first = await upsertMessageOp(ctx, {
      conversationId: "conv_b",
      role: "assistant",
      content: "a",
      uniqueId: "assistant-2",
    });
    const second = await upsertMessageOp(ctx, {
      conversationId: "conv_b",
      role: "assistant",
      content: "a-updated",
      uniqueId: "assistant-2",
    });
    expect(second.messageId).toBe(first.messageId);
    const all = await getMessagesOp(ctx, "conv_b");
    expect(all.filter((m) => m.role === "assistant")).toHaveLength(1);
  });

  it("clears a prior wasStopped:true when the update passes wasStopped:false", async () => {
    await createConversationOp(ctx, { conversationId: "conv_clear_stopped" });
    const stopped = await upsertMessageOp(ctx, {
      conversationId: "conv_clear_stopped",
      role: "assistant",
      content: "partial",
      uniqueId: "assistant-cs",
      wasStopped: true,
    });
    expect(stopped.wasStopped).toBe(true);

    const resumed = await upsertMessageOp(ctx, {
      conversationId: "conv_clear_stopped",
      role: "assistant",
      content: "partial then complete",
      uniqueId: "assistant-cs",
      wasStopped: false,
    });
    expect(resumed.wasStopped).toBeFalsy();

    const rows = (await getMessagesOp(ctx, "conv_clear_stopped")).filter(
      (m) => m.role === "assistant"
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].wasStopped).toBeFalsy();
  });
});

describe("useChatStorage detach → resume reconciliation", () => {
  let db: Database;

  beforeEach(() => {
    vi.clearAllMocks();
    db = makeDatabase();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  async function detachSend(
    result: { current: ReturnType<typeof useChatStorage> },
    convId: string,
    partialText: string,
    inferenceId: string
  ) {
    mockRunToolLoop.mockResolvedValueOnce({
      data: responsesShape(partialText),
      error: "Request detached",
      detached: true,
      resume: { inferenceId, apiType: "responses", model: "test-model", conversationId: convId },
    } as never);

    let sendResult: Awaited<ReturnType<typeof result.current.sendMessage>>;
    await act(async () => {
      sendResult = await result.current.sendMessage({
        messages: [{ role: "user", content: [{ type: "text", text: "question" }] }],
        model: "test-model",
        serverTools: [],
      });
    });
    return sendResult! as Extract<
      Awaited<ReturnType<typeof result.current.sendMessage>>,
      {
        detached: true;
      }
    >;
  }

  it("persists NOTHING on detach (no wasStopped row, no errored user message)", async () => {
    const { result } = renderHook(() =>
      useChatStorage({
        database: db,
        conversationId: "conv_nopersist",
        getToken: async () => "tok",
        resumable: true,
      })
    );

    const detached = await detachSend(result, "conv_nopersist", "partial answer", "inf-np");

    expect(detached.error).toBe("Request detached");
    expect(detached.detached).toBe(true);
    expect(detached.resume?.inferenceId).toBe("inf-np");
    expect(detached.assistantUniqueId).toBeTruthy();

    const ctx = makeCtx(db);
    const rows = await getMessagesOp(ctx, "conv_nopersist");
    expect(rows.filter((m) => m.role === "assistant")).toHaveLength(0);
    expect(rows.filter((m) => m.role === "user" && m.error)).toHaveLength(0);
  });

  it("persists ONE assistant row across a detached send and a successful resume", async () => {
    const { result } = renderHook(() =>
      useChatStorage({
        database: db,
        conversationId: "conv_resume",
        getToken: async () => "tok",
        resumable: true,
      })
    );

    const detached = await detachSend(result, "conv_resume", "partial answer", "inf-1");
    const rowId = detached.assistantUniqueId;

    mockResumeStream.mockResolvedValueOnce({
      data: responsesShape("partial answer, now fully complete"),
      error: null,
      interrupted: false,
    } as never);

    let resumeResult: Awaited<ReturnType<typeof result.current.resumeStream>>;
    await act(async () => {
      resumeResult = await result.current.resumeStream();
    });

    expect(resumeResult!.error).toBeNull();
    expect(resumeResult!.assistantMessage?.uniqueId).toBe(rowId);

    const ctx = makeCtx(db);
    const assistantRows = (await getMessagesOp(ctx, "conv_resume")).filter(
      (m) => m.role === "assistant"
    );
    expect(assistantRows).toHaveLength(1);
    expect(assistantRows[0].uniqueId).toBe(rowId);
    expect(assistantRows[0].content).toBe("partial answer, now fully complete");
    expect(assistantRows[0].wasStopped).toBeFalsy();
  });

  it("snapshots getThoughtProcess() at detach so resumed rows keep streamed activity phases", async () => {
    const { result } = renderHook(() =>
      useChatStorage({
        database: db,
        conversationId: "conv_thought",
        getToken: async () => "tok",
        resumable: true,
      })
    );

    const phases = [
      { id: "p1", label: "Searching", timestamp: 1, status: "completed" as const },
      { id: "p2", label: "Writing", timestamp: 2, status: "active" as const },
    ];

    mockRunToolLoop.mockResolvedValueOnce({
      data: responsesShape("partial answer"),
      error: "Request detached",
      detached: true,
      resume: {
        inferenceId: "inf-thought",
        apiType: "responses",
        model: "test-model",
        conversationId: "conv_thought",
      },
    } as never);

    let detached: Awaited<ReturnType<typeof result.current.sendMessage>>;
    await act(async () => {
      detached = await result.current.sendMessage({
        messages: [{ role: "user", content: [{ type: "text", text: "question" }] }],
        model: "test-model",
        getThoughtProcess: () => phases,
      });
    });
    const rowId = (detached! as Extract<typeof detached, { detached: true }>).assistantUniqueId;

    mockResumeStream.mockResolvedValueOnce({
      data: responsesShape("partial answer, now complete"),
      error: null,
      interrupted: false,
    } as never);

    await act(async () => {
      await result.current.resumeStream();
    });

    const ctx = makeCtx(db);
    const assistantRows = (await getMessagesOp(ctx, "conv_thought")).filter(
      (m) => m.role === "assistant"
    );
    expect(assistantRows).toHaveLength(1);
    expect(assistantRows[0].uniqueId).toBe(rowId);
    expect(assistantRows[0].thoughtProcess?.map((p) => p.label)).toEqual(["Searching", "Writing"]);
    expect(assistantRows[0].thoughtProcess?.map((p) => p.status)).toEqual([
      "completed",
      "completed",
    ]);
  });

  it("reconciles citation sources from tool_call_events on a resumed completion (#639)", async () => {
    const { result } = renderHook(() =>
      useChatStorage({
        database: db,
        conversationId: "conv_resume_sources",
        getToken: async () => "tok",
        resumable: true,
      })
    );

    await detachSend(result, "conv_resume_sources", "searching…", "inf-sources");

    mockResumeStream.mockResolvedValueOnce({
      data: {
        ...responsesShape("here is what I found"),
        tool_call_events: [
          {
            id: "evt_search",
            name: "AnumaSearchMCP-text_search",
            output: JSON.stringify({
              results: [
                { title: "Anuma Docs", url: "https://docs.anuma.ai/memory" },
                { title: "Generated image", url: `https://${MCP_R2_DOMAIN}/cat.png` },
              ],
            }),
          },
        ],
      },
      error: null,
      interrupted: false,
    } as never);

    await act(async () => {
      await result.current.resumeStream();
    });

    const ctx = makeCtx(db);
    const assistantRows = (await getMessagesOp(ctx, "conv_resume_sources")).filter(
      (m) => m.role === "assistant"
    );
    expect(assistantRows).toHaveLength(1);
    const urls = (assistantRows[0].sources ?? []).map((s) => s.url);
    expect(urls).toContain("https://docs.anuma.ai/memory");
    expect(urls.some((u) => u?.includes(MCP_R2_DOMAIN))).toBe(false);
  });

  it("finalizes the stowed partial as stopped on a 410 (StreamExpiredError) and clears the handle", async () => {
    const { result } = renderHook(() =>
      useChatStorage({
        database: db,
        conversationId: "conv_expired",
        getToken: async () => "tok",
        resumable: true,
      })
    );

    const detached = await detachSend(result, "conv_expired", "the partial", "inf-2");
    const rowId = detached.assistantUniqueId;

    mockResumeStream.mockRejectedValueOnce(new StreamExpiredError("inf-2"));

    let resumeResult: Awaited<ReturnType<typeof result.current.resumeStream>>;
    await act(async () => {
      resumeResult = await result.current.resumeStream();
    });

    expect(resumeResult!.expired).toBe(true);
    expect(resumeResult!.error).toBeNull();

    const ctx = makeCtx(db);
    const assistantRows = (await getMessagesOp(ctx, "conv_expired")).filter(
      (m) => m.role === "assistant"
    );
    expect(assistantRows).toHaveLength(1);
    expect(assistantRows[0].uniqueId).toBe(rowId);
    expect(assistantRows[0].content).toBe("the partial");
    expect(assistantRows[0].wasStopped).toBe(true);

    let second: Awaited<ReturnType<typeof result.current.resumeStream>>;
    await act(async () => {
      second = await result.current.resumeStream();
    });
    expect(second!.error).toBe("No resumable stream");
  });

  it("finalizes the stowed PARTIAL as stopped when a clean resume replays ZERO content (empty-replay guard)", async () => {
    const { result } = renderHook(() =>
      useChatStorage({
        database: db,
        conversationId: "conv_empty_replay",
        getToken: async () => "tok",
        resumable: true,
      })
    );

    const detached = await detachSend(result, "conv_empty_replay", "the visible partial", "inf-e1");
    const rowId = detached.assistantUniqueId;

    mockResumeStream.mockResolvedValueOnce({
      data: responsesShape(""),
      error: null,
      interrupted: false,
      empty: true,
    } as never);

    let resumeResult: Awaited<ReturnType<typeof result.current.resumeStream>>;
    await act(async () => {
      resumeResult = await result.current.resumeStream();
    });

    expect(resumeResult!.error).toBeNull();
    expect(resumeResult!.empty).toBe(true);
    expect(resumeResult!.assistantMessage?.uniqueId).toBe(rowId);

    const ctx = makeCtx(db);
    const assistantRows = (await getMessagesOp(ctx, "conv_empty_replay")).filter(
      (m) => m.role === "assistant"
    );
    expect(assistantRows).toHaveLength(1);
    expect(assistantRows[0].uniqueId).toBe(rowId);
    expect(assistantRows[0].content).toBe("the visible partial");
    expect(assistantRows[0].wasStopped).toBe(true);

    let second: Awaited<ReturnType<typeof result.current.resumeStream>>;
    await act(async () => {
      second = await result.current.resumeStream();
    });
    expect(second!.error).toBe("No resumable stream");
  });

  it("finalizes an events-only stowed partial as stopped on a clean empty replay (citations count as output)", async () => {
    const { result } = renderHook(() =>
      useChatStorage({
        database: db,
        conversationId: "conv_empty_events_partial",
        getToken: async () => "tok",
        resumable: true,
      })
    );

    const eventsOnlyPartial = {
      ...responsesShape(""),
      tool_call_events: [
        {
          id: "evt-p1",
          name: "AnumaSearchMCP_text_search",
          status: "completed",
          output: JSON.stringify({ results: [{ url: "https://example.org", title: "Partial" }] }),
        },
      ],
    };
    mockRunToolLoop.mockResolvedValueOnce({
      data: eventsOnlyPartial,
      error: "Request detached",
      detached: true,
      resume: {
        inferenceId: "inf-evp",
        apiType: "responses",
        model: "test-model",
        conversationId: "conv_empty_events_partial",
      },
    } as never);

    let detached: Awaited<ReturnType<typeof result.current.sendMessage>>;
    await act(async () => {
      detached = await result.current.sendMessage({
        messages: [{ role: "user", content: [{ type: "text", text: "question" }] }],
        model: "test-model",
      });
    });
    const rowId = (detached! as Extract<typeof detached, { detached: true }>).assistantUniqueId;

    mockResumeStream.mockResolvedValueOnce({
      data: responsesShape(""),
      error: null,
      interrupted: false,
      empty: true,
    } as never);

    let resumeResult: Awaited<ReturnType<typeof result.current.resumeStream>>;
    await act(async () => {
      resumeResult = await result.current.resumeStream();
    });

    expect(resumeResult!.empty).toBe(true);
    expect(resumeResult!.assistantMessage?.uniqueId).toBe(rowId);

    const ctx = makeCtx(db);
    const assistantRows = (await getMessagesOp(ctx, "conv_empty_events_partial")).filter(
      (m) => m.role === "assistant"
    );
    expect(assistantRows).toHaveLength(1);
    expect(assistantRows[0].wasStopped).toBe(true);
    expect(assistantRows[0].sources?.map((s) => s.url)).toContain("https://example.org");
  });

  it("persists NO row when a clean resume replays zero content and there is no stowed partial", async () => {
    const { result } = renderHook(() =>
      useChatStorage({
        database: db,
        conversationId: "conv_empty_nopartial",
        getToken: async () => "tok",
        resumable: true,
      })
    );

    const detached = await detachSend(result, "conv_empty_nopartial", "", "inf-e2");
    expect(detached.detached).toBe(true);

    mockResumeStream.mockResolvedValueOnce({
      data: responsesShape(""),
      error: null,
      interrupted: false,
      empty: true,
    } as never);

    let resumeResult: Awaited<ReturnType<typeof result.current.resumeStream>>;
    await act(async () => {
      resumeResult = await result.current.resumeStream();
    });

    expect(resumeResult!.error).toBeNull();
    expect(resumeResult!.empty).toBe(true);
    expect(resumeResult!.assistantMessage).toBeNull();

    const ctx = makeCtx(db);
    const assistantRows = (await getMessagesOp(ctx, "conv_empty_nopartial")).filter(
      (m) => m.role === "assistant"
    );
    expect(assistantRows).toHaveLength(0);

    let second: Awaited<ReturnType<typeof result.current.resumeStream>>;
    await act(async () => {
      second = await result.current.resumeStream();
    });
    expect(second!.error).toBe("No resumable stream");
  });

  it("finalizes the stowed PARTIAL as stopped when an INTERRUPTED replay carried no output", async () => {
    const { result } = renderHook(() =>
      useChatStorage({
        database: db,
        conversationId: "conv_int_empty",
        getToken: async () => "tok",
        resumable: true,
      })
    );

    const detached = await detachSend(result, "conv_int_empty", "the visible partial", "inf-ie1");
    const rowId = detached.assistantUniqueId;

    mockResumeStream.mockResolvedValueOnce({
      data: responsesShape(""),
      error: "[stream_interrupted] stream went silent",
      interrupted: true,
    } as never);

    let resumeResult: Awaited<ReturnType<typeof result.current.resumeStream>>;
    await act(async () => {
      resumeResult = await result.current.resumeStream();
    });

    expect(resumeResult!.interrupted).toBe(true);
    const ctx = makeCtx(db);
    const assistantRows = (await getMessagesOp(ctx, "conv_int_empty")).filter(
      (m) => m.role === "assistant"
    );
    expect(assistantRows).toHaveLength(1);
    expect(assistantRows[0].uniqueId).toBe(rowId);
    expect(assistantRows[0].content).toBe("the visible partial");
    expect(assistantRows[0].wasStopped).toBe(true);
  });

  it("persists NO row when an interrupted replay carried no output and there is no stowed partial", async () => {
    const { result } = renderHook(() =>
      useChatStorage({
        database: db,
        conversationId: "conv_int_nopartial",
        getToken: async () => "tok",
        resumable: true,
      })
    );

    await detachSend(result, "conv_int_nopartial", "", "inf-ie2");

    mockResumeStream.mockResolvedValueOnce({
      data: responsesShape(""),
      error: "[stream_interrupted] stream went silent",
      interrupted: true,
    } as never);

    await act(async () => {
      await result.current.resumeStream();
    });

    const ctx = makeCtx(db);
    const assistantRows = (await getMessagesOp(ctx, "conv_int_nopartial")).filter(
      (m) => m.role === "assistant"
    );
    expect(assistantRows).toHaveLength(0);
  });

  it("treats a clean completion carrying only tool_call_events as a REAL completion (not empty)", async () => {
    const { result } = renderHook(() =>
      useChatStorage({
        database: db,
        conversationId: "conv_events_only",
        getToken: async () => "tok",
        resumable: true,
      })
    );

    const detached = await detachSend(result, "conv_events_only", "stale partial", "inf-ev1");
    const rowId = detached.assistantUniqueId;

    const eventsOnly = {
      ...responsesShape(""),
      tool_call_events: [
        {
          id: "evt-1",
          name: "AnumaSearchMCP_text_search",
          status: "completed",
          output: JSON.stringify({ results: [{ url: "https://example.com", title: "Example" }] }),
        },
      ],
    };
    mockResumeStream.mockResolvedValueOnce({
      data: eventsOnly,
      error: null,
      interrupted: false,
      empty: false,
    } as never);

    let resumeResult: Awaited<ReturnType<typeof result.current.resumeStream>>;
    await act(async () => {
      resumeResult = await result.current.resumeStream();
    });

    expect(resumeResult!.error).toBeNull();
    expect(resumeResult!.empty).toBeUndefined();
    expect(resumeResult!.assistantMessage?.uniqueId).toBe(rowId);

    const ctx = makeCtx(db);
    const assistantRows = (await getMessagesOp(ctx, "conv_events_only")).filter(
      (m) => m.role === "assistant"
    );
    expect(assistantRows).toHaveLength(1);
    expect(assistantRows[0].wasStopped).toBeFalsy();
    expect(assistantRows[0].sources?.map((s) => s.url)).toContain("https://example.com");
  });

  it("finalizes the REPLAYED content as stopped on an interrupted terminal", async () => {
    const { result } = renderHook(() =>
      useChatStorage({
        database: db,
        conversationId: "conv_interrupt",
        getToken: async () => "tok",
        resumable: true,
      })
    );

    const detached = await detachSend(result, "conv_interrupt", "short partial", "inf-3");
    const rowId = detached.assistantUniqueId;

    mockResumeStream.mockResolvedValueOnce({
      data: responsesShape("short partial plus more replayed text"),
      error: "[stream_interrupted] deadline exceeded",
      interrupted: true,
    } as never);

    let resumeResult: Awaited<ReturnType<typeof result.current.resumeStream>>;
    await act(async () => {
      resumeResult = await result.current.resumeStream();
    });

    expect(resumeResult!.interrupted).toBe(true);
    const ctx = makeCtx(db);
    const assistantRows = (await getMessagesOp(ctx, "conv_interrupt")).filter(
      (m) => m.role === "assistant"
    );
    expect(assistantRows).toHaveLength(1);
    expect(assistantRows[0].uniqueId).toBe(rowId);
    expect(assistantRows[0].content).toBe("short partial plus more replayed text");
    expect(assistantRows[0].wasStopped).toBe(true);
  });

  it("persists NOTHING and KEEPS the handle on a transient (401) resume", async () => {
    const { result } = renderHook(() =>
      useChatStorage({
        database: db,
        conversationId: "conv_transient",
        getToken: async () => "tok",
        resumable: true,
      })
    );

    await detachSend(result, "conv_transient", "partial", "inf-4");

    mockResumeStream.mockResolvedValueOnce({
      data: responsesShape("partial"),
      error: "SSE failed: 401 Unauthorized",
      interrupted: false,
      statusCode: 401,
    } as never);

    let resumeResult: Awaited<ReturnType<typeof result.current.resumeStream>>;
    await act(async () => {
      resumeResult = await result.current.resumeStream();
    });

    expect(resumeResult!.statusCode).toBe(401);
    expect(resumeResult!.assistantMessage).toBeNull();
    const ctx = makeCtx(db);
    expect(
      (await getMessagesOp(ctx, "conv_transient")).filter((m) => m.role === "assistant")
    ).toHaveLength(0);

    mockResumeStream.mockResolvedValueOnce({
      data: responsesShape("partial then complete"),
      error: null,
      interrupted: false,
    } as never);
    let retry: Awaited<ReturnType<typeof result.current.resumeStream>>;
    await act(async () => {
      retry = await result.current.resumeStream();
    });
    expect(retry!.error).toBeNull();
    expect(
      (await getMessagesOp(ctx, "conv_transient")).filter((m) => m.role === "assistant")
    ).toHaveLength(1);
  });

  it("cold-launch resume (handleOverride, no pending ref) lands as ONE row with a stable id", async () => {
    const { result } = renderHook(() =>
      useChatStorage({
        database: db,
        conversationId: "conv_cold",
        getToken: async () => "tok",
        resumable: true,
      })
    );

    const override = {
      inferenceId: "inf-cold",
      apiType: "responses" as const,
      model: "test-model",
      conversationId: "conv_cold",
    };

    mockResumeStream.mockResolvedValueOnce({
      data: responsesShape("cold replay complete"),
      error: null,
      interrupted: false,
    } as never);

    let first: Awaited<ReturnType<typeof result.current.resumeStream>>;
    await act(async () => {
      first = await result.current.resumeStream(override);
    });
    expect(first!.error).toBeNull();
    const rowId = first!.assistantMessage?.uniqueId;
    expect(rowId).toBeTruthy();

    const ctx = makeCtx(db);
    const assistantRows = (await getMessagesOp(ctx, "conv_cold")).filter(
      (m) => m.role === "assistant"
    );
    expect(assistantRows).toHaveLength(1);
    expect(assistantRows[0].uniqueId).toBe(rowId);
    expect(assistantRows[0].content).toBe("cold replay complete");
  });

  it("cold-launch resume files the row under the HANDLE's conversation, not the active one", async () => {
    const { result } = renderHook(() =>
      useChatStorage({
        database: db,
        conversationId: "conv_active",
        getToken: async () => "tok",
        resumable: true,
      })
    );

    const override = {
      inferenceId: "inf-cross-thread",
      apiType: "responses" as const,
      model: "test-model",
      conversationId: "conv_origin",
    };

    mockResumeStream.mockResolvedValueOnce({
      data: responsesShape("answer for the origin thread"),
      error: null,
      interrupted: false,
    } as never);

    await act(async () => {
      await result.current.resumeStream(override);
    });

    const ctx = makeCtx(db);
    const originRows = (await getMessagesOp(ctx, "conv_origin")).filter(
      (m) => m.role === "assistant"
    );
    const activeRows = (await getMessagesOp(ctx, "conv_active")).filter(
      (m) => m.role === "assistant"
    );
    expect(originRows).toHaveLength(1);
    expect(originRows[0].content).toBe("answer for the origin thread");
    expect(activeRows).toHaveLength(0);
  });

  it("cold-launch: a transient resume then a bare retry reconcile onto ONE row (stable id)", async () => {
    const { result } = renderHook(() =>
      useChatStorage({
        database: db,
        conversationId: "conv_cold_retry",
        getToken: async () => "tok",
        resumable: true,
      })
    );

    const override = {
      inferenceId: "inf-cold-retry",
      apiType: "responses" as const,
      model: "test-model",
      conversationId: "conv_cold_retry",
    };

    mockResumeStream.mockResolvedValueOnce({
      data: responsesShape("cold partial"),
      error: "SSE failed: 401 Unauthorized",
      interrupted: false,
      statusCode: 401,
    } as never);

    let first: Awaited<ReturnType<typeof result.current.resumeStream>>;
    await act(async () => {
      first = await result.current.resumeStream(override);
    });
    expect(first!.statusCode).toBe(401);
    expect(first!.assistantMessage).toBeNull();

    const ctx = makeCtx(db);
    expect(
      (await getMessagesOp(ctx, "conv_cold_retry")).filter((m) => m.role === "assistant")
    ).toHaveLength(0);

    mockResumeStream.mockResolvedValueOnce({
      data: responsesShape("cold replay finally complete"),
      error: null,
      interrupted: false,
    } as never);

    let retry: Awaited<ReturnType<typeof result.current.resumeStream>>;
    await act(async () => {
      retry = await result.current.resumeStream(override);
    });
    expect(retry!.error).toBeNull();

    const assistantRows = (await getMessagesOp(ctx, "conv_cold_retry")).filter(
      (m) => m.role === "assistant"
    );
    expect(assistantRows).toHaveLength(1);
    expect(assistantRows[0].uniqueId).toBe(retry!.assistantMessage?.uniqueId);
    expect(assistantRows[0].content).toBe("cold replay finally complete");
  });

  it("cold-launch recovery into a multi-turn conversation parents the recovered row under the last stored message", async () => {
    const db2ctx = makeCtx(db);
    await createConversationOp(db2ctx, { conversationId: "conv_multiturn" });
    await upsertMessageOp(db2ctx, {
      conversationId: "conv_multiturn",
      role: "user",
      content: "first question",
      uniqueId: "user-t1",
    });
    await upsertMessageOp(db2ctx, {
      conversationId: "conv_multiturn",
      role: "assistant",
      content: "first answer",
      uniqueId: "assistant-t1",
      parentMessageId: "user-t1",
    });
    await upsertMessageOp(db2ctx, {
      conversationId: "conv_multiturn",
      role: "user",
      content: "second question (app killed mid-answer)",
      uniqueId: "user-t2",
      parentMessageId: "assistant-t1",
    });

    const { result } = renderHook(() =>
      useChatStorage({
        database: db,
        conversationId: "conv_multiturn",
        getToken: async () => "tok",
        resumable: true,
      })
    );

    mockResumeStream.mockResolvedValueOnce({
      data: responsesShape("the recovered answer"),
      error: null,
      interrupted: false,
    } as never);

    await act(async () => {
      await result.current.resumeStream({
        inferenceId: "inf-multiturn",
        apiType: "responses",
        model: "test-model",
        conversationId: "conv_multiturn",
      });
    });

    const rows = await getMessagesOp(db2ctx, "conv_multiturn");
    const recovered = rows.find((m) => m.uniqueId === "msg_resume_inf-multiturn");
    expect(recovered).toBeTruthy();
    expect(recovered!.content).toBe("the recovered answer");
    expect(recovered!.parentMessageId).toBe("user-t2");
  });

  it("cold-launch resume with a handleOverride never adopts a MISMATCHED stowed pending context", async () => {
    const { result } = renderHook(() =>
      useChatStorage({
        database: db,
        conversationId: "conv_stream_a",
        getToken: async () => "tok",
        resumable: true,
      })
    );

    const detachedA = await detachSend(result, "conv_stream_a", "A's partial", "inf-A");
    const rowA = detachedA.assistantUniqueId;

    const ctxDb = makeCtx(db);
    await createConversationOp(ctxDb, { conversationId: "conv_stream_b" });
    mockResumeStream.mockResolvedValueOnce({
      data: responsesShape("B's full answer"),
      error: null,
      interrupted: false,
    } as never);

    let resB: Awaited<ReturnType<typeof result.current.resumeStream>>;
    await act(async () => {
      resB = await result.current.resumeStream({
        inferenceId: "inf-B",
        apiType: "responses",
        model: "test-model",
        conversationId: "conv_stream_b",
      });
    });

    expect(resB!.error).toBeNull();
    expect(resB!.assistantMessage?.uniqueId).toBe("msg_resume_inf-B");
    const bRows = (await getMessagesOp(ctxDb, "conv_stream_b")).filter(
      (m) => m.role === "assistant"
    );
    expect(bRows).toHaveLength(1);
    expect(bRows[0].content).toBe("B's full answer");
    const aRows = (await getMessagesOp(ctxDb, "conv_stream_a")).filter(
      (m) => m.role === "assistant"
    );
    expect(aRows).toHaveLength(0);

    mockResumeStream.mockResolvedValueOnce({
      data: responsesShape("A's partial, completed"),
      error: null,
      interrupted: false,
    } as never);
    let resA: Awaited<ReturnType<typeof result.current.resumeStream>>;
    await act(async () => {
      resA = await result.current.resumeStream();
    });
    expect(resA!.error).toBeNull();
    expect(resA!.assistantMessage?.uniqueId).toBe(rowA);
    const aRowsAfter = (await getMessagesOp(ctxDb, "conv_stream_a")).filter(
      (m) => m.role === "assistant"
    );
    expect(aRowsAfter).toHaveLength(1);
    expect(aRowsAfter[0].content).toBe("A's partial, completed");
  });

  it("cold-launch: two clean resumes of the same override yield ONE row, not two", async () => {
    const { result } = renderHook(() =>
      useChatStorage({
        database: db,
        conversationId: "conv_cold_twice",
        getToken: async () => "tok",
        resumable: true,
      })
    );

    const override = {
      inferenceId: "inf-cold-twice",
      apiType: "responses" as const,
      model: "test-model",
      conversationId: "conv_cold_twice",
    };

    mockResumeStream.mockResolvedValueOnce({
      data: responsesShape("first cold completion"),
      error: null,
      interrupted: false,
    } as never);

    let first: Awaited<ReturnType<typeof result.current.resumeStream>>;
    await act(async () => {
      first = await result.current.resumeStream(override);
    });
    const rowId = first!.assistantMessage?.uniqueId;
    expect(rowId).toBeTruthy();

    mockResumeStream.mockResolvedValueOnce({
      data: responsesShape("first cold completion"),
      error: null,
      interrupted: false,
    } as never);
    let second: Awaited<ReturnType<typeof result.current.resumeStream>>;
    await act(async () => {
      second = await result.current.resumeStream(override);
    });
    expect(second!.error).toBeNull();
    expect(second!.assistantMessage?.uniqueId).toBe(rowId);

    const ctx = makeCtx(db);
    const assistantRows = (await getMessagesOp(ctx, "conv_cold_twice")).filter(
      (m) => m.role === "assistant"
    );
    expect(assistantRows).toHaveLength(1);
    expect(assistantRows[0].uniqueId).toBe(rowId);
  });

  it("rejects a concurrent resumeStream() while one is in flight", async () => {
    const { result } = renderHook(() =>
      useChatStorage({
        database: db,
        conversationId: "conv_concurrent",
        getToken: async () => "tok",
        resumable: true,
      })
    );

    await detachSend(result, "conv_concurrent", "partial", "inf-conc");

    let release!: () => void;
    const gate = new Promise<void>((r) => {
      release = r;
    });
    mockResumeStream.mockImplementationOnce(async () => {
      await gate;
      return {
        data: responsesShape("done"),
        error: null,
        interrupted: false,
      } as never;
    });

    let firstPromise!: ReturnType<typeof result.current.resumeStream>;
    let second: Awaited<ReturnType<typeof result.current.resumeStream>>;
    await act(async () => {
      firstPromise = result.current.resumeStream();
      second = await result.current.resumeStream();
      release();
      await firstPromise;
    });

    expect(second!.error).toBe("Resume already in progress");
    expect(second!.assistantMessage).toBeNull();

    const ctx = makeCtx(db);
    expect(
      (await getMessagesOp(ctx, "conv_concurrent")).filter((m) => m.role === "assistant")
    ).toHaveLength(1);
  });

  describe("pending turn supersession", () => {
    let fetchSpy: MockInstance<typeof globalThis.fetch>;

    beforeEach(() => {
      mockRunToolLoop.mockReset();
      mockResumeStream.mockReset();
      fetchSpy = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValue(new Response(null, { status: 200 }));
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    function deferred<T>() {
      let resolve!: (value: T) => void;
      const promise = new Promise<T>((done) => {
        resolve = done;
      });
      return { promise, resolve };
    }

    function nextArgs(text = "new question") {
      return {
        messages: [{ role: "user" as const, content: [{ type: "text" as const, text }] }],
        model: "test-model",
        serverTools: [],
      };
    }

    function cancelCalls(inferenceId: string) {
      return fetchSpy.mock.calls.filter(([url]) =>
        String(url).endsWith(streamCancelPath(inferenceId))
      );
    }

    function completedSend(text = "fresh answer") {
      mockRunToolLoop.mockResolvedValueOnce({ data: responsesShape(text), error: null } as never);
    }

    it.each(["warm", "cold"] as const)(
      "saves the latest %s replay after a failed write before the next send",
      async (kind) => {
        const conversationId = `conv_latest_replay_${kind}`;
        const inferenceId = `inf-latest-replay-${kind}`;
        const { result } = renderHook(() =>
          useChatStorage({
            database: db,
            conversationId,
            getToken: async () => "tok",
            resumable: true,
            autoEmbedMessages: false,
          })
        );
        let assistantUniqueId: string;
        if (kind === "warm") {
          const detached = await detachSend(
            result,
            conversationId,
            "original partial",
            inferenceId
          );
          assistantUniqueId = detached.assistantUniqueId!;
        } else {
          await createConversationOp(makeCtx(db), { conversationId });
          await upsertMessageOp(makeCtx(db), {
            conversationId,
            role: "user",
            content: "question",
            uniqueId: "latest-replay-user",
          });
          assistantUniqueId = `msg_resume_${inferenceId}`;
        }
        const event = {
          id: "evt_latest_replay",
          name: "lookup",
          output: "latest tool result",
        };
        mockResumeStream.mockResolvedValueOnce({
          data: {
            ...responsesShape("original partial plus recovered text"),
            tool_call_events: [event],
          },
          error: null,
          interrupted: false,
        } as never);
        vi.spyOn(db, "write").mockImplementationOnce(async () => {
          throw new Error("replay writer unavailable");
        });
        await act(async () => {
          const resumed = await result.current.resumeStream(
            kind === "cold"
              ? { inferenceId, conversationId, model: "test-model", apiType: "responses" }
              : undefined
          );
          expect(resumed.error).toBe("replay writer unavailable");
          expect(resumed.assistantMessage).toBeNull();
        });
        completedSend();
        await act(async () => {
          expect((await result.current.sendMessage(nextArgs())).error).toBeNull();
        });
        const rows = await getMessagesOp(makeCtx(db), conversationId);
        expect(rows.map((row) => row.content)).toEqual([
          "question",
          "original partial plus recovered text",
          "new question",
          "fresh answer",
        ]);
        expect(rows[1]).toMatchObject({
          uniqueId: assistantUniqueId,
          parentMessageId: rows[0].uniqueId,
          wasStopped: true,
          toolCallEvents: [event],
        });
        const prompt = mockRunToolLoop.mock.calls[kind === "warm" ? 1 : 0][0].messages;
        expect(JSON.stringify(prompt)).toContain("original partial plus recovered text");
        expect(prompt.filter((message) => message.role === "tool")).toEqual([
          { role: "tool", tool_call_id: event.id, content: [{ type: "text", text: event.output }] },
        ]);
      }
    );

    it("retains detached tool events in the stopped row and the next model request", async () => {
      const { result } = renderHook(() =>
        useChatStorage({
          database: db,
          conversationId: "conv_detached_tools",
          getToken: async () => "tok",
          resumable: true,
          autoEmbedMessages: false,
        })
      );
      const event = {
        id: "evt_detached_lookup",
        name: "lookup",
        arguments: '{"query":"saved result"}',
        output: '{"answer":"tool context"}',
      };
      mockRunToolLoop.mockResolvedValueOnce({
        data: { ...responsesShape("partial with tools"), tool_call_events: [event] },
        error: "Request detached",
        detached: true,
        resume: {
          inferenceId: "inf-detached-tools",
          apiType: "responses",
          model: "test-model",
          conversationId: "conv_detached_tools",
        },
      } as never);
      await act(async () => {
        await result.current.sendMessage(nextArgs("first question"));
      });
      completedSend();
      await act(async () => {
        expect((await result.current.sendMessage(nextArgs())).error).toBeNull();
      });
      const rows = await getMessagesOp(makeCtx(db), "conv_detached_tools");
      expect(rows[1]).toMatchObject({ wasStopped: true, toolCallEvents: [event] });
      const prompt = mockRunToolLoop.mock.calls[1][0].messages;
      expect(prompt.filter((message) => message.role === "tool")).toEqual([
        {
          role: "tool",
          tool_call_id: event.id,
          content: [{ type: "text", text: event.output }],
        },
      ]);
      expect(prompt.flatMap((message) => message.tool_calls ?? [])).toEqual([
        {
          id: event.id,
          type: "function",
          function: { name: event.name, arguments: event.arguments },
        },
      ]);
    });

    it("retains all current-turn events when a cold replay updates the same row", async () => {
      const ctx = makeCtx(db);
      await createConversationOp(ctx, { conversationId: "conv_cold_tools" });
      const previousEvent = { id: "evt_previous", name: "lookup", output: "previous result" };
      await upsertMessageOp(ctx, {
        conversationId: "conv_cold_tools",
        role: "user",
        content: "previous question",
        uniqueId: "cold-tools-previous-user",
      });
      await upsertMessageOp(ctx, {
        conversationId: "conv_cold_tools",
        role: "assistant",
        content: "previous answer",
        uniqueId: "cold-tools-previous-assistant",
        parentMessageId: "cold-tools-previous-user",
        toolCallEvents: [previousEvent],
      });
      await upsertMessageOp(ctx, {
        conversationId: "conv_cold_tools",
        role: "user",
        content: "current question",
        uniqueId: "cold-tools-current-user",
        parentMessageId: "cold-tools-previous-assistant",
      });
      const { result } = renderHook(() =>
        useChatStorage({
          database: db,
          conversationId: "conv_cold_tools",
          getToken: async () => "tok",
          resumable: true,
          autoEmbedMessages: false,
        })
      );
      const override = {
        inferenceId: "inf-cold-tools",
        apiType: "responses" as const,
        model: "test-model",
        conversationId: "conv_cold_tools",
      };
      const firstEvent = { id: "evt_current_first", name: "lookup", output: "first result" };
      const secondEvent = { id: "evt_current_second", name: "lookup", output: "second result" };
      mockResumeStream.mockResolvedValueOnce({
        data: {
          ...responsesShape("partial tool reply"),
          tool_call_events: [previousEvent, firstEvent],
        },
        error: "Request stopped",
        interrupted: true,
      } as never);
      let ordinal: number | undefined;
      await act(async () => {
        const partial = await result.current.resumeStream(override);
        expect(partial.assistantMessage?.toolCallEvents).toEqual([firstEvent]);
        ordinal = partial.assistantMessage?.messageId;
      });
      mockResumeStream.mockResolvedValueOnce({
        data: {
          ...responsesShape("complete tool reply"),
          tool_call_events: [previousEvent, firstEvent, secondEvent],
        },
        error: null,
        interrupted: false,
      } as never);
      await act(async () => {
        const complete = await result.current.resumeStream(override);
        expect(complete.error).toBeNull();
        expect(complete.assistantMessage).toMatchObject({
          uniqueId: "msg_resume_inf-cold-tools",
          messageId: ordinal,
          parentMessageId: "cold-tools-current-user",
          toolCallEvents: [firstEvent, secondEvent],
          wasStopped: false,
        });
      });
      const rows = await getMessagesOp(ctx, "conv_cold_tools");
      expect(rows.filter((row) => row.uniqueId === "msg_resume_inf-cold-tools")).toHaveLength(1);
    });

    it("honors stop during a failed retirement write and retains the partial for retry", async () => {
      const { result } = renderHook(() =>
        useChatStorage({
          database: db,
          conversationId: "conv_stop_failed_retirement",
          getToken: async () => "tok",
          resumable: true,
          autoEmbedMessages: false,
        })
      );
      const detached = await detachSend(
        result,
        "conv_stop_failed_retirement",
        "partial before stop",
        "inf-stop-failed-retirement"
      );
      const entered = deferred<void>();
      const release = deferred<void>();
      vi.spyOn(db, "write").mockImplementationOnce(async () => {
        entered.resolve();
        await release.promise;
        throw new Error("retirement writer unavailable");
      });
      completedSend();
      await act(async () => {
        const next = result.current.sendMessage(nextArgs());
        await entered.promise;
        try {
          result.current.stop();
          result.current.stop();
          expect(cancelCalls("inf-stop-failed-retirement")).toHaveLength(0);
        } finally {
          release.resolve();
        }
        expect(await next).toMatchObject({
          data: null,
          error: "retirement writer unavailable",
        });
      });
      await waitFor(() => expect(cancelCalls("inf-stop-failed-retirement")).toHaveLength(1));
      expect(mockRunToolLoop).toHaveBeenCalledTimes(1);
      expect(await getMessagesOp(makeCtx(db), "conv_stop_failed_retirement")).toHaveLength(1);
      await act(async () => {
        expect((await result.current.sendMessage(nextArgs())).error).toBeNull();
      });
      const rows = await getMessagesOp(makeCtx(db), "conv_stop_failed_retirement");
      expect(rows.filter((row) => row.uniqueId === detached.assistantUniqueId)).toHaveLength(1);
      expect(rows[1]).toMatchObject({ content: "partial before stop", wasStopped: true });
      expect(cancelCalls("inf-stop-failed-retirement")).toHaveLength(1);
    });

    it("clears an idle cold context after a thrown replay when a new send replaces it", async () => {
      const { result } = renderHook(() =>
        useChatStorage({
          database: db,
          conversationId: "conv_idle_cold",
          getToken: async () => "tok",
          resumable: true,
          autoEmbedMessages: false,
        })
      );
      const override = {
        inferenceId: "inf-idle-cold",
        apiType: "responses" as const,
        model: "test-model",
        conversationId: "conv_idle_cold",
      };
      mockResumeStream.mockRejectedValueOnce(new Error("replay transport unavailable"));
      await act(async () => {
        await expect(result.current.resumeStream(override)).rejects.toThrow(
          "replay transport unavailable"
        );
      });
      completedSend();
      await act(async () => {
        expect((await result.current.sendMessage(nextArgs())).error).toBeNull();
      });
      mockResumeStream.mockResolvedValueOnce({
        data: responsesShape("stale cold reply"),
        error: null,
        interrupted: false,
      } as never);
      await act(async () => {
        expect(await result.current.resumeStream()).toMatchObject({
          data: null,
          error: "No resumable stream",
          assistantMessage: null,
        });
      });
      expect(mockResumeStream).toHaveBeenCalledTimes(1);
      expect(fetchSpy).not.toHaveBeenCalled();
      expect(
        (await getMessagesOp(makeCtx(db), "conv_idle_cold")).map((row) => row.content)
      ).toEqual(["new question", "fresh answer"]);
    });

    it.each([false, true])(
      "preserves encrypted retirement after key recovery, with an initial key failure: %s",
      async (failKey) => {
        const address = "0x1234567890123456789012345678901234567890";
        const signature = `0x${"ab".repeat(65)}`;
        const signMessage = vi.fn(async () => signature);
        clearAllEncryptionKeys();
        try {
          await requestEncryptionKey(address, signMessage);
          const { result } = renderHook(() =>
            useChatStorage({
              database: db,
              conversationId: "conv_encrypted_retirement",
              getToken: async () => "tok",
              walletAddress: address,
              signMessage,
              enableQueue: true,
              autoFlushOnKeyAvailable: false,
              resumable: true,
              autoEmbedMessages: false,
            })
          );
          const detached = await detachSend(
            result,
            "conv_encrypted_retirement",
            "encrypted partial",
            "inf-encrypted-retirement"
          );
          clearAllEncryptionKeys();
          expect(hasEncryptionKey(address)).toBe(false);
          completedSend();
          completedSend();
          if (failKey) {
            signMessage.mockRejectedValue(new Error("wallet key unavailable"));
            await act(async () => {
              expect((await result.current.sendMessage(nextArgs())).error).toBeNull();
            });
            expect(mockRunToolLoop).toHaveBeenCalledTimes(2);
            expect(await db.get("history").query().fetch()).toHaveLength(1);
            expect(result.current.queueStatus.pending).toBe(3);
            act(() => result.current.clearQueue());
            return;
          }
          await act(async () => {
            expect((await result.current.sendMessage(nextArgs())).error).toBeNull();
          });
          const rows = await getMessagesOp(
            { ...makeCtx(db), walletAddress: address, signMessage },
            "conv_encrypted_retirement"
          );
          expect(rows.map((row) => row.content)).toEqual([
            "question",
            "encrypted partial",
            "new question",
            "fresh answer",
          ]);
          expect(rows[1]).toMatchObject({
            uniqueId: detached.assistantUniqueId,
            parentMessageId: detached.userMessage?.uniqueId,
            wasStopped: true,
          });
          expect(rows.filter((row) => row.uniqueId === detached.assistantUniqueId)).toHaveLength(1);
          const raw = await db.get("history").find(detached.assistantUniqueId!);
          expect(raw._getRaw("content")).toMatch(/^enc:v3:/);
          expect(JSON.stringify(mockRunToolLoop.mock.calls[1][0].messages)).toContain(
            "encrypted partial"
          );
          await waitFor(() => expect(cancelCalls("inf-encrypted-retirement")).toHaveLength(1));
        } finally {
          clearAllEncryptionKeys();
        }
      }
    );

    it("keeps ordinary sends queued when a wallet key is unavailable", async () => {
      const address = "0x2234567890123456789012345678901234567890";
      const signMessage = vi.fn(async (): Promise<string> => {
        throw new Error("wallet key unavailable");
      });
      clearAllEncryptionKeys();
      try {
        await createConversationOp(makeCtx(db), { conversationId: "conv_ordinary_queue" });
        const { result } = renderHook(() =>
          useChatStorage({
            database: db,
            conversationId: "conv_ordinary_queue",
            getToken: async () => "tok",
            walletAddress: address,
            signMessage,
            enableQueue: true,
            autoFlushOnKeyAvailable: false,
            resumable: true,
            autoEmbedMessages: false,
          })
        );
        completedSend();
        await act(async () => {
          expect((await result.current.sendMessage(nextArgs())).error).toBeNull();
        });
        expect(mockRunToolLoop).toHaveBeenCalledTimes(1);
        expect(result.current.queueStatus.pending).toBe(2);
        expect(await db.get("history").query().fetch()).toHaveLength(0);
        act(() => result.current.clearQueue());
      } finally {
        clearAllEncryptionKeys();
      }
    });

    it("saves one stopped partial before the next turn and cancels only the old buffer", async () => {
      const onCancelResult = vi.fn();
      let token = "old-token";
      const { result } = renderHook(() =>
        useChatStorage({
          database: db,
          conversationId: "conv_supersede",
          getToken: async () => token,
          resumable: true,
          autoEmbedMessages: false,
          onCancelResult,
        })
      );
      const detached = await detachSend(result, "conv_supersede", "visible partial", "inf-old");
      token = "fresh-token";
      completedSend();
      let next!: Awaited<ReturnType<typeof result.current.sendMessage>>;
      await act(async () => {
        next = await result.current.sendMessage(nextArgs());
      });
      expect(next.error).toBeNull();

      const rows = await getMessagesOp(makeCtx(db), "conv_supersede");
      expect(rows.map((row) => row.content)).toEqual([
        "question",
        "visible partial",
        "new question",
        "fresh answer",
      ]);
      expect(rows.map((row) => row.messageId)).toEqual([1, 2, 3, 4]);
      expect(rows[1]).toMatchObject({
        uniqueId: detached.assistantUniqueId,
        parentMessageId: detached.userMessage?.uniqueId,
        conversationId: "conv_supersede",
        wasStopped: true,
      });
      expect(rows[3].uniqueId).not.toBe(detached.assistantUniqueId);
      expect(rows[3].wasStopped).toBeFalsy();
      const prompt = JSON.stringify(mockRunToolLoop.mock.calls[1][0].messages);
      expect(prompt.split("visible partial")).toHaveLength(2);
      await waitFor(() => expect(onCancelResult).toHaveBeenCalledTimes(1));
      expect(cancelCalls("inf-old")).toHaveLength(1);
      expect(cancelCalls("inf-old")[0][1]).toMatchObject({
        method: "POST",
        headers: { Authorization: "Bearer fresh-token" },
      });
      expect((await result.current.resumeStream()).error).toBe("No resumable stream");
    });

    it("retains the old turn after a real writer failure and retries without duplicate rows", async () => {
      const { result } = renderHook(() =>
        useChatStorage({
          database: db,
          conversationId: "conv_retry",
          getToken: async () => "tok",
          resumable: true,
          autoEmbedMessages: false,
        })
      );
      const detached = await detachSend(result, "conv_retry", "retry partial", "inf-retry");
      const writer = vi.spyOn(db, "write").mockRejectedValueOnce(new Error("writer unavailable"));
      completedSend();
      let failed!: Awaited<ReturnType<typeof result.current.sendMessage>>;
      await act(async () => {
        failed = await result.current.sendMessage(nextArgs());
      });
      expect(failed).toMatchObject({ data: null, error: "writer unavailable" });
      expect(mockRunToolLoop).toHaveBeenCalledTimes(1);
      expect(cancelCalls("inf-retry")).toHaveLength(0);
      expect((await getMessagesOp(makeCtx(db), "conv_retry")).map((row) => row.content)).toEqual([
        "question",
      ]);
      writer.mockRestore();

      await act(async () => {
        expect((await result.current.sendMessage(nextArgs())).error).toBeNull();
      });
      const rows = await getMessagesOp(makeCtx(db), "conv_retry");
      expect(rows.map((row) => row.content)).toEqual([
        "question",
        "retry partial",
        "new question",
        "fresh answer",
      ]);
      expect(rows.filter((row) => row.uniqueId === detached.assistantUniqueId)).toHaveLength(1);
      expect(rows[1].wasStopped).toBe(true);
      await waitFor(() => expect(cancelCalls("inf-retry")).toHaveLength(1));
    });

    it("holds new sends and explicit resumes behind the old writer", async () => {
      const { result } = renderHook(() =>
        useChatStorage({
          database: db,
          conversationId: "conv_writer_gate",
          getToken: async () => "tok",
          resumable: true,
          autoEmbedMessages: false,
        })
      );
      const detached = await detachSend(result, "conv_writer_gate", "gated partial", "inf-gated");
      const entered = deferred<void>();
      const release = deferred<void>();
      const write = db.write.bind(db);
      vi.spyOn(db, "write").mockImplementationOnce(async (work) => {
        entered.resolve();
        await release.promise;
        return write(work);
      });
      completedSend();
      let next!: ReturnType<typeof result.current.sendMessage>;
      let resume!: Awaited<ReturnType<typeof result.current.resumeStream>>;
      await act(async () => {
        next = result.current.sendMessage(nextArgs());
        await entered.promise;
        try {
          expect(mockRunToolLoop).toHaveBeenCalledTimes(1);
          expect(cancelCalls("inf-gated")).toHaveLength(0);
          expect(await getMessagesOp(makeCtx(db), "conv_writer_gate")).toHaveLength(1);
          resume = await result.current.resumeStream(detached.resume!);
          result.current.stop();
          expect(cancelCalls("inf-gated")).toHaveLength(0);
        } finally {
          release.resolve();
          await next;
        }
      });
      expect(resume.error).toBe("Resume already in progress");
      expect(mockResumeStream).not.toHaveBeenCalled();
      const rows = await getMessagesOp(makeCtx(db), "conv_writer_gate");
      expect(rows.map((row) => row.messageId)).toEqual([1, 2, 3, 4]);
      expect(rows.filter((row) => row.uniqueId === detached.assistantUniqueId)).toHaveLength(1);
      await waitFor(() => expect(cancelCalls("inf-gated")).toHaveLength(1));
    });

    it("holds a second new send behind the same partial commit", async () => {
      const { result } = renderHook(() =>
        useChatStorage({
          database: db,
          conversationId: "conv_two_sends",
          getToken: async () => "tok",
          resumable: true,
          autoEmbedMessages: false,
        })
      );
      const detached = await detachSend(result, "conv_two_sends", "shared partial", "inf-shared");
      const entered = deferred<void>();
      const release = deferred<void>();
      const write = db.write.bind(db);
      vi.spyOn(db, "write").mockImplementationOnce(async (work) => {
        entered.resolve();
        await release.promise;
        return write(work);
      });
      completedSend();
      completedSend();
      await act(async () => {
        const first = result.current.sendMessage(nextArgs("stored next"));
        await entered.promise;
        const second = result.current.sendMessage({
          ...nextArgs("unstored next"),
          skipStorage: true,
        });
        try {
          await Promise.resolve();
          await Promise.resolve();
          expect(mockRunToolLoop).toHaveBeenCalledTimes(1);
          expect(await getMessagesOp(makeCtx(db), "conv_two_sends")).toHaveLength(1);
        } finally {
          release.resolve();
          await Promise.all([first, second]);
        }
      });
      const rows = await getMessagesOp(makeCtx(db), "conv_two_sends");
      expect(rows.filter((row) => row.uniqueId === detached.assistantUniqueId)).toHaveLength(1);
      expect(rows[1]).toMatchObject({ content: "shared partial", wasStopped: true });
      expect(rows.map((row) => row.messageId)).toEqual([1, 2, 3, 4]);
      await waitFor(() => expect(cancelCalls("inf-shared")).toHaveLength(1));
    });

    it("a new send cancels a visible resume, waits for its stopped row, then continues", async () => {
      const { result } = renderHook(() =>
        useChatStorage({
          database: db,
          conversationId: "conv_active",
          getToken: async () => "tok",
          resumable: true,
          autoEmbedMessages: false,
        })
      );
      const detached = await detachSend(result, "conv_active", "old partial", "inf-active");
      const entered = deferred<void>();
      mockResumeStream.mockImplementationOnce((async (...args: unknown[]) => {
        const signal = (args[0] as { signal?: AbortSignal }).signal;
        entered.resolve();
        await new Promise<void>((done) => {
          if (signal?.aborted) done();
          signal?.addEventListener("abort", () => done());
        });
        return {
          data: responsesShape("old partial and more"),
          error: "aborted",
          interrupted: true,
        };
      }) as never);
      completedSend();
      let next!: Awaited<ReturnType<typeof result.current.sendMessage>>;
      await act(async () => {
        const resume = result.current.resumeStream();
        await entered.promise;
        next = await result.current.sendMessage(nextArgs());
        await resume;
      });
      expect(next.error).toBeNull();
      expect(mockRunToolLoop).toHaveBeenCalledTimes(2);
      const rows = await getMessagesOp(makeCtx(db), "conv_active");
      expect(rows.map((row) => row.content)).toEqual([
        "question",
        "old partial and more",
        "new question",
        "fresh answer",
      ]);
      expect(rows.filter((row) => row.uniqueId === detached.assistantUniqueId)).toHaveLength(1);
      expect(rows[1].wasStopped).toBe(true);
    });

    it("queues the stopped row behind a queued user message when the key is unavailable", async () => {
      const address = "0x3234567890123456789012345678901234567890";
      const signMessage = vi.fn(async (): Promise<string> => {
        throw new Error("wallet key unavailable");
      });
      clearAllEncryptionKeys();
      try {
        await createConversationOp(makeCtx(db), { conversationId: "conv_queue_dep" });
        const { result } = renderHook(() =>
          useChatStorage({
            database: db,
            conversationId: "conv_queue_dep",
            getToken: async () => "tok",
            walletAddress: address,
            signMessage,
            enableQueue: true,
            autoFlushOnKeyAvailable: false,
            resumable: true,
            autoEmbedMessages: false,
          })
        );
        await detachSend(result, "conv_queue_dep", "queued partial", "inf-queue-dep");
        expect(result.current.queueStatus.pending).toBe(1);
        completedSend();
        await act(async () => {
          expect((await result.current.sendMessage(nextArgs())).error).toBeNull();
        });
        expect(result.current.queueStatus.pending).toBe(4);
        expect(await db.get("history").query().fetch()).toHaveLength(0);
        await waitFor(() => expect(cancelCalls("inf-queue-dep")).toHaveLength(1));
        act(() => result.current.clearQueue());
      } finally {
        clearAllEncryptionKeys();
      }
    });

    it("lets a skipStorage send proceed when the stopped row cannot be saved", async () => {
      const { result } = renderHook(() =>
        useChatStorage({
          database: db,
          conversationId: "conv_skip_storage_fail",
          getToken: async () => "tok",
          resumable: true,
          autoEmbedMessages: false,
        })
      );
      await detachSend(result, "conv_skip_storage_fail", "kept partial", "inf-skip-fail");
      vi.spyOn(db, "write").mockRejectedValue(new Error("writer unavailable"));
      completedSend();
      await act(async () => {
        expect((await result.current.sendMessage({ ...nextArgs(), skipStorage: true })).error).toBe(
          null
        );
      });
      expect(mockRunToolLoop).toHaveBeenCalledTimes(2);
      await act(async () => {
        expect((await result.current.sendMessage(nextArgs())).error).toBe("writer unavailable");
      });
      expect(mockRunToolLoop).toHaveBeenCalledTimes(2);
    });

    it.each([null, responsesShape("")])(
      "does not save a blank detached row (%s)",
      async (partial) => {
        const onCancelResult = vi.fn();
        const { result } = renderHook(() =>
          useChatStorage({
            database: db,
            conversationId: "conv_empty_pending",
            getToken: async () => "tok",
            resumable: true,
            autoEmbedMessages: false,
            onCancelResult,
          })
        );
        mockRunToolLoop.mockResolvedValueOnce({
          data: partial,
          error: "Request detached",
          detached: true,
          resume: {
            inferenceId: "inf-empty",
            apiType: "responses",
            model: "test-model",
            conversationId: "conv_empty_pending",
          },
        } as never);
        await act(async () => {
          await result.current.sendMessage(nextArgs("first question"));
        });
        completedSend();
        await act(async () => {
          await result.current.sendMessage(nextArgs());
        });
        const rows = await getMessagesOp(makeCtx(db), "conv_empty_pending");
        expect(rows.map((row) => row.content)).toEqual([
          "first question",
          "new question",
          "fresh answer",
        ]);
        await waitFor(() => expect(onCancelResult).toHaveBeenCalledTimes(1));
        expect(cancelCalls("inf-empty")).toHaveLength(1);
      }
    );

    it("reports a failed cancel once and still completes the new send", async () => {
      const onCancelResult = vi.fn();
      const { result } = renderHook(() =>
        useChatStorage({
          database: db,
          conversationId: "conv_cancel_failure",
          getToken: async () => "tok",
          resumable: true,
          autoEmbedMessages: false,
          onCancelResult,
        })
      );
      await detachSend(result, "conv_cancel_failure", "kept partial", "inf-cancel-failure");
      fetchSpy.mockRejectedValueOnce(new Error("cancel unavailable"));
      completedSend();
      await act(async () => {
        expect((await result.current.sendMessage(nextArgs())).error).toBeNull();
      });
      await waitFor(() => expect(onCancelResult).toHaveBeenCalledTimes(1));
      expect(onCancelResult.mock.calls[0][0]).toMatchObject({
        inferenceId: "inf-cancel-failure",
        ok: false,
      });
      expect((await getMessagesOp(makeCtx(db), "conv_cancel_failure"))[1]).toMatchObject({
        content: "kept partial",
        wasStopped: true,
      });
    });

    it("preserves a cold foreign headless resume while the visible send completes", async () => {
      const ctx = makeCtx(db);
      await createConversationOp(ctx, { conversationId: "conv_cold_foreign" });
      await upsertMessageOp(ctx, {
        conversationId: "conv_cold_foreign",
        role: "user",
        content: "foreign question",
        uniqueId: "foreign-user",
      });
      const { result } = renderHook(() =>
        useChatStorage({
          database: db,
          conversationId: "conv_cold_visible",
          getToken: async () => "tok",
          resumable: true,
          autoEmbedMessages: false,
        })
      );
      const entered = deferred<void>();
      const release = deferred<void>();
      let replaySignal!: AbortSignal;
      mockResumeStream.mockImplementationOnce(async (opts) => {
        replaySignal = opts.signal!;
        entered.resolve();
        await release.promise;
        return {
          data: responsesShape("cold foreign complete"),
          error: null,
          interrupted: false,
        } as never;
      });
      completedSend("visible complete");
      await act(async () => {
        const foreign = result.current.resumeStream(
          {
            inferenceId: "inf-cold-foreign",
            apiType: "responses",
            model: "test-model",
            conversationId: "conv_cold_foreign",
          },
          { headless: true }
        );
        await entered.promise;
        try {
          const visible = await result.current.sendMessage(nextArgs("visible question"));
          expect(visible.error).toBeNull();
          expect(replaySignal.aborted).toBe(false);
          expect(mockRunToolLoop).toHaveBeenCalledTimes(1);
        } finally {
          release.resolve();
          const resumed = await foreign;
          expect(resumed.error).toBeNull();
          expect(resumed.assistantMessage?.uniqueId).toBe("msg_resume_inf-cold-foreign");
        }
      });
      const foreignRows = await getMessagesOp(ctx, "conv_cold_foreign");
      expect(foreignRows.map((row) => row.content)).toEqual([
        "foreign question",
        "cold foreign complete",
      ]);
      expect(foreignRows[1]).toMatchObject({
        conversationId: "conv_cold_foreign",
        parentMessageId: "foreign-user",
        uniqueId: "msg_resume_inf-cold-foreign",
      });
      expect(foreignRows[1].wasStopped).toBeFalsy();
      const visibleRows = await getMessagesOp(ctx, "conv_cold_visible");
      expect(visibleRows.map((row) => row.content)).toEqual([
        "visible question",
        "visible complete",
      ]);
      expect(visibleRows[1]).toMatchObject({
        conversationId: "conv_cold_visible",
        parentMessageId: visibleRows[0].uniqueId,
      });
      expect(visibleRows[1].wasStopped).toBeFalsy();
      expect(replaySignal.aborted).toBe(false);
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it("retires the warm turn without aborting a foreign headless resume", async () => {
      const { result } = renderHook(() =>
        useChatStorage({
          database: db,
          conversationId: "conv_visible",
          getToken: async () => "tok",
          resumable: true,
          autoEmbedMessages: false,
        })
      );
      const detached = await detachSend(result, "conv_visible", "visible partial", "inf-visible");
      await createConversationOp(makeCtx(db), { conversationId: "conv_foreign" });
      const entered = deferred<void>();
      const release = deferred<void>();
      let replaySignal!: AbortSignal;
      mockResumeStream.mockImplementationOnce(async (opts) => {
        replaySignal = opts.signal!;
        entered.resolve();
        await release.promise;
        return {
          data: responsesShape("foreign complete"),
          error: null,
          interrupted: false,
        } as never;
      });
      completedSend();
      await act(async () => {
        const foreign = result.current.resumeStream(
          {
            inferenceId: "inf-foreign",
            apiType: "responses",
            model: "test-model",
            conversationId: "conv_foreign",
          },
          { headless: true }
        );
        await entered.promise;
        try {
          expect((await result.current.sendMessage(nextArgs())).error).toBeNull();
          expect(replaySignal.aborted).toBe(false);
        } finally {
          release.resolve();
          expect((await foreign).error).toBeNull();
        }
      });
      const visible = await getMessagesOp(makeCtx(db), "conv_visible");
      expect(visible.filter((row) => row.uniqueId === detached.assistantUniqueId)).toHaveLength(1);
      expect(visible[1]).toMatchObject({ content: "visible partial", wasStopped: true });
      expect((await getMessagesOp(makeCtx(db), "conv_foreign"))[0].content).toBe(
        "foreign complete"
      );
      await waitFor(() => expect(cancelCalls("inf-visible")).toHaveLength(1));
      expect(cancelCalls("inf-foreign")).toHaveLength(0);
    });
  });

  it("skipStorage forwards a detached resumable send instead of collapsing it to an error", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("no network"));
    try {
      const { result } = renderHook(() =>
        useChatStorage({
          database: db,
          conversationId: "conv_skip",
          getToken: async () => "tok",
          resumable: true,
        })
      );

      mockRunToolLoop.mockResolvedValueOnce({
        data: responsesShape("partial via skipStorage"),
        error: "Request detached",
        detached: true,
        resume: {
          inferenceId: "inf-skip",
          apiType: "responses",
          model: "test-model",
          conversationId: "conv_skip",
        },
      } as never);

      let sendResult: Awaited<ReturnType<typeof result.current.sendMessage>>;
      await act(async () => {
        sendResult = await result.current.sendMessage({
          messages: [{ role: "user", content: [{ type: "text", text: "q" }] }],
          model: "test-model",
          skipStorage: true,
        });
      });

      const r = sendResult! as Extract<typeof sendResult, { detached: true }>;
      expect(r.detached).toBe(true);
      expect(r.error).toBe("Request detached");
      expect(r.resume?.inferenceId).toBe("inf-skip");
      expect(r.data).not.toBeNull();

      const ctx = makeCtx(db);
      expect(
        (await getMessagesOp(ctx, "conv_skip")).filter((m) => m.role === "assistant")
      ).toHaveLength(0);
    } finally {
      fetchSpy.mockRestore();
    }
  });

  it("forwards onCancelResult to the inner useChat so storage callers observe failed cancels", async () => {
    const onCancelResult = vi.fn();
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("cancel POST down"));
    try {
      const { result } = renderHook(() =>
        useChatStorage({
          database: db,
          conversationId: "conv_cancelobs",
          getToken: async () => "tok",
          resumable: true,
          onCancelResult,
        })
      );

      mockRunToolLoop.mockImplementationOnce((opts) => {
        (opts as { onStreamMeta?: (m: { inferenceId: string }) => void }).onStreamMeta?.({
          inferenceId: "inf-cancelobs",
        });
        return Promise.resolve({
          data: responsesShape("partial"),
          error: "Request detached",
          detached: true,
          resume: {
            inferenceId: "inf-cancelobs",
            apiType: "responses",
            model: "test-model",
            conversationId: "conv_cancelobs",
          },
        } as never);
      });

      await act(async () => {
        await result.current.sendMessage({
          messages: [{ role: "user", content: [{ type: "text", text: "q" }] }],
          model: "test-model",
        });
      });

      await act(async () => {
        result.current.stop();
      });

      await waitFor(() => expect(onCancelResult).toHaveBeenCalled());
      const observed = onCancelResult.mock.calls[0][0] as { inferenceId: string; ok: boolean };
      expect(observed.inferenceId).toBe("inf-cancelobs");
      expect(observed.ok).toBe(false);
    } finally {
      fetchSpy.mockRestore();
    }
  });

  it("headless cold-launch resume PERSISTS the row but never feeds ANY consumer callback (onData/onThinking/onFinish/onError) and never toggles isLoading", async () => {
    const onData = vi.fn();
    const onThinking = vi.fn();
    const onFinish = vi.fn();
    const onError = vi.fn();
    const { result } = renderHook(() =>
      useChatStorage({
        database: db,
        conversationId: "conv_headless",
        getToken: async () => "tok",
        resumable: true,
        onData,
        onThinking,
        onFinish,
        onError,
      })
    );

    const override = {
      inferenceId: "inf-headless",
      apiType: "responses" as const,
      model: "test-model",
      conversationId: "conv_headless",
    };

    let releaseResume!: () => void;
    const resumeReleased = new Promise<void>((r) => {
      releaseResume = r;
    });
    mockResumeStream.mockImplementationOnce(async (libOpts) => {
      const o = libOpts as {
        onData?: (c: string) => void;
        onThinking?: (c: string) => void;
        onFinish?: (r: unknown) => void;
        onError?: (e: unknown) => void;
      };
      o.onData?.("recovered text that must not bleed");
      o.onThinking?.("recovered reasoning");
      o.onFinish?.({ data: responsesShape("headless replay complete"), error: null });
      o.onError?.(new Error("transient that must not surface"));
      await resumeReleased;
      return {
        data: responsesShape("headless replay complete"),
        error: null,
        interrupted: false,
      } as never;
    });

    let resumePromise!: ReturnType<typeof result.current.resumeStream>;
    await act(async () => {
      resumePromise = result.current.resumeStream(override, { headless: true });
    });
    expect(result.current.isLoading).toBe(false);

    let resumeResult: Awaited<ReturnType<typeof result.current.resumeStream>>;
    await act(async () => {
      releaseResume();
      resumeResult = await resumePromise;
    });
    expect(result.current.isLoading).toBe(false);

    expect(resumeResult!.error).toBeNull();
    const rowId = resumeResult!.assistantMessage?.uniqueId;
    expect(rowId).toBeTruthy();
    const ctx = makeCtx(db);
    const assistantRows = (await getMessagesOp(ctx, "conv_headless")).filter(
      (m) => m.role === "assistant"
    );
    expect(assistantRows).toHaveLength(1);
    expect(assistantRows[0].content).toBe("headless replay complete");

    expect(onData).not.toHaveBeenCalled();
    expect(onThinking).not.toHaveBeenCalled();
    expect(onFinish).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
  });

  it("non-headless cold-launch resume feeds onData AND onFinish and toggles isLoading (regression baseline)", async () => {
    const onData = vi.fn();
    const onFinish = vi.fn();
    const { result } = renderHook(() =>
      useChatStorage({
        database: db,
        conversationId: "conv_notheadless",
        getToken: async () => "tok",
        resumable: true,
        onData,
        onFinish,
      })
    );

    const override = {
      inferenceId: "inf-notheadless",
      apiType: "responses" as const,
      model: "test-model",
      conversationId: "conv_notheadless",
    };

    let releaseResume!: () => void;
    const resumeReleased = new Promise<void>((r) => {
      releaseResume = r;
    });
    mockResumeStream.mockImplementationOnce(async (libOpts) => {
      const o = libOpts as {
        onData?: (c: string) => void;
        onFinish?: (r: unknown) => void;
      };
      o.onData?.("live delta");
      o.onFinish?.({ data: responsesShape("normal replay complete"), error: null });
      await resumeReleased;
      return {
        data: responsesShape("normal replay complete"),
        error: null,
        interrupted: false,
      } as never;
    });

    let resumePromise!: ReturnType<typeof result.current.resumeStream>;
    await act(async () => {
      resumePromise = result.current.resumeStream(override);
    });
    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      releaseResume();
      await resumePromise;
    });
    expect(onData).toHaveBeenCalledWith("live delta");
    expect(onFinish).toHaveBeenCalledTimes(1);
    expect(result.current.isLoading).toBe(false);
  });

  it("forwards a consumer onStreamMeta with the resolved apiType + model", async () => {
    const onStreamMeta = vi.fn();
    const { result } = renderHook(() =>
      useChatStorage({
        database: db,
        conversationId: "conv_meta",
        getToken: async () => "tok",
        resumable: true,
        onStreamMeta,
      })
    );

    mockRunToolLoop.mockImplementationOnce((opts) => {
      (
        opts as { onStreamMeta?: (m: { inferenceId: string; round?: number }) => void }
      ).onStreamMeta?.({ inferenceId: "inf-storage-meta", round: 0 });
      return Promise.resolve({
        data: responsesShape("answer"),
        error: null,
      } as never);
    });

    await act(async () => {
      await result.current.sendMessage({
        messages: [{ role: "user", content: [{ type: "text", text: "q" }] }],
        model: "cerebras/llama3.1-8b",
        apiType: "auto",
      });
    });

    expect(onStreamMeta).toHaveBeenCalledTimes(1);
    const meta = onStreamMeta.mock.calls[0][0] as {
      inferenceId: string;
      apiType: string;
      model?: string;
      round?: number;
    };
    expect(meta.inferenceId).toBe("inf-storage-meta");
    expect(meta.apiType).toBe("completions");
    expect(meta.model).toBe("cerebras/llama3.1-8b");
    expect(meta.round).toBe(0);
  });

  it("does not require onStreamMeta — a send with no consumer callback is unchanged", async () => {
    const { result } = renderHook(() =>
      useChatStorage({
        database: db,
        conversationId: "conv_nometa",
        getToken: async () => "tok",
        resumable: true,
      })
    );

    mockRunToolLoop.mockImplementationOnce((opts) => {
      (opts as { onStreamMeta?: (m: { inferenceId: string }) => void }).onStreamMeta?.({
        inferenceId: "inf-nometa-storage",
      });
      return Promise.resolve({ data: responsesShape("answer"), error: null } as never);
    });

    let sendResult: Awaited<ReturnType<typeof result.current.sendMessage>>;
    await act(async () => {
      sendResult = await result.current.sendMessage({
        messages: [{ role: "user", content: [{ type: "text", text: "q" }] }],
        model: "test-model",
      });
    });
    expect(sendResult!.error).toBeNull();
  });
});
