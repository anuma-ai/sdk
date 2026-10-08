// @vitest-environment happy-dom

import { Database } from "@nozbe/watermelondb";
import LokiJSAdapter from "@nozbe/watermelondb/adapters/lokijs";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

  it("clears a pending handle when a new sendMessage is dispatched", async () => {
    const { result } = renderHook(() =>
      useChatStorage({
        database: db,
        conversationId: "conv_clear",
        getToken: async () => "tok",
        resumable: true,
      })
    );

    await detachSend(result, "conv_clear", "partial", "inf-5");

    mockRunToolLoop.mockResolvedValueOnce({
      data: responsesShape("a fresh answer"),
      error: null,
    } as never);
    await act(async () => {
      await result.current.sendMessage({
        messages: [{ role: "user", content: [{ type: "text", text: "new question" }] }],
        model: "test-model",
      });
    });

    let resumeResult: Awaited<ReturnType<typeof result.current.resumeStream>>;
    await act(async () => {
      resumeResult = await result.current.resumeStream();
    });
    expect(resumeResult!.error).toBe("No resumable stream");
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
