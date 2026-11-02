// @vitest-environment happy-dom

import { Database } from "@nozbe/watermelondb";
import LokiJSAdapter from "@nozbe/watermelondb/adapters/lokijs";
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { sdkMigrations, sdkModelClasses, sdkSchema } from "../lib/db/schema";

vi.mock("../lib/chat/toolLoop", async (importOriginal) => {
  const orig = await importOriginal<typeof import("../lib/chat/toolLoop")>();
  return { ...orig, runToolLoop: vi.fn() };
});
vi.mock("../lib/chat/resumeStream", async (importOriginal) => {
  const orig = await importOriginal<typeof import("../lib/chat/resumeStream")>();
  return { ...orig, resumeStream: vi.fn(), listActiveStreams: vi.fn() };
});
vi.mock("../lib/memoryEngine/generate", async (importOriginal) => {
  const orig = await importOriginal<typeof import("../lib/memoryEngine/generate")>();
  return {
    ...orig,
    generateEmbedding: async () => [0.1, 0.2, 0.3],
    generateEmbeddings: async (texts: string[]) => texts.map(() => [0.1, 0.2, 0.3]),
  };
});

import { listActiveStreams, resumeStream } from "../lib/chat/resumeStream";
import { runToolLoop } from "../lib/chat/toolLoop";
import { useChatStorage } from "./useChatStorage";

function makeDatabase(): Database {
  const adapter = new LokiJSAdapter({
    schema: sdkSchema,
    migrations: sdkMigrations,
    useWebWorker: false,
    useIncrementalIndexedDB: false,
    dbName: `background-${Math.random().toString(36).slice(2)}`,
  });
  return new Database({ adapter, modelClasses: sdkModelClasses });
}

function answer(text: string) {
  return {
    id: "resp",
    model: "anthropic/claude-opus-5-5",
    object: "response",
    output: [
      {
        type: "message",
        role: "assistant",
        content: [{ type: "output_text", text }],
        status: "completed",
      },
    ],
  };
}

const userTurn = {
  messages: [{ role: "user" as const, content: [{ type: "text" as const, text: "hello" }] }],
  model: "auto",
  serverTools: [] as string[],
};

function renderStorage(options: { background?: boolean } = {}) {
  const database = makeDatabase();
  return renderHook(() =>
    useChatStorage({
      database,
      conversationId: "conv_bg",
      getToken: async () => "tok",
      baseUrl: "https://portal.example",
      resumable: true,
      background: options.background ?? true,
    })
  );
}

describe("useChatStorage background turns", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("stores the live answer under the turn's reply id and tells portal both ids", async () => {
    vi.mocked(runToolLoop).mockImplementation(async (options) => {
      options.onStreamMeta?.({ inferenceId: "0xround0", round: 0 });
      options.onStreamMeta?.({ inferenceId: "0xround1", round: 1 });
      return { data: answer("Final."), error: null } as never;
    });
    const { result } = renderStorage();

    let sent: Awaited<ReturnType<typeof result.current.sendMessage>> | undefined;
    await act(async () => {
      sent = await result.current.sendMessage(userTurn);
    });

    const headers = vi.mocked(runToolLoop).mock.calls[0][0].headers ?? {};
    expect(headers["X-Assistant-Message-ID"]).toMatch(/^msg_bg_/);
    expect(headers["X-Parent-Message-ID"]).toBe(sent?.userMessage?.uniqueId);
    expect(sent?.assistantMessage?.uniqueId).toBe(headers["X-Assistant-Message-ID"]);
  });

  it("uses the caller's assistantUniqueId as the turn's reply id", async () => {
    vi.mocked(runToolLoop).mockResolvedValue({ data: answer("Final."), error: null } as never);
    const { result } = renderStorage();

    let sent: Awaited<ReturnType<typeof result.current.sendMessage>> | undefined;
    await act(async () => {
      sent = await result.current.sendMessage({ ...userTurn, assistantUniqueId: "msg_mine" });
    });

    expect(vi.mocked(runToolLoop).mock.calls[0][0].headers).toMatchObject({
      "X-Assistant-Message-ID": "msg_mine",
    });
    expect(sent?.assistantMessage?.uniqueId).toBe("msg_mine");
  });

  it("writes no assistant or error row when the turn detaches", async () => {
    vi.mocked(runToolLoop).mockImplementation(async (options) => {
      options.onStreamMeta?.({ inferenceId: "0xdetached", round: 0 });
      return { data: null, error: "SSE failed: network" } as never;
    });
    const { result } = renderStorage();

    let sent: Awaited<ReturnType<typeof result.current.sendMessage>> | undefined;
    await act(async () => {
      sent = await result.current.sendMessage(userTurn);
    });

    expect(sent).toMatchObject({
      error: "Request detached",
      detached: true,
      resume: { inferenceId: "0xdetached" },
    });
    const messages = await result.current.getMessages("conv_bg");
    expect(messages.map((m) => m.role)).toEqual(["user"]);
    expect(messages[0].error).toBeFalsy();
  });

  it("stores a stopped answer under the turn's reply id", async () => {
    vi.mocked(runToolLoop).mockResolvedValue({
      data: answer("Half"),
      error: "Request aborted",
    } as never);
    const { result } = renderStorage();

    let sent: Awaited<ReturnType<typeof result.current.sendMessage>> | undefined;
    await act(async () => {
      sent = await result.current.sendMessage(userTurn);
    });

    const replyId = vi.mocked(runToolLoop).mock.calls[0][0].headers?.["X-Assistant-Message-ID"];
    expect(sent?.assistantMessage).toMatchObject({ uniqueId: replyId, wasStopped: true });
  });

  it("sends no turn headers without background", async () => {
    vi.mocked(runToolLoop).mockResolvedValue({ data: answer("Done."), error: null } as never);
    const { result } = renderStorage({ background: false });

    await act(async () => {
      await result.current.sendMessage(userTurn);
    });

    const headers = vi.mocked(runToolLoop).mock.calls[0][0].headers ?? {};
    expect(headers).not.toHaveProperty("X-Parent-Message-ID");
    expect(headers).not.toHaveProperty("X-Assistant-Message-ID");
  });

  it("lists running generations from the portal", async () => {
    const running = [
      {
        inferenceId: "0xlive",
        assistantMessageId: "msg_bg_live",
        conversationId: "conv_bg",
        parentMessageId: "msg_user",
        apiType: "responses" as const,
        startedAt: "2026-11-02T12:00:00Z",
      },
    ];
    vi.mocked(listActiveStreams).mockResolvedValue(running);
    const { result } = renderStorage();

    let streams: Awaited<ReturnType<typeof result.current.getActiveStreams>> | undefined;
    await act(async () => {
      streams = await result.current.getActiveStreams("conv_bg");
    });

    expect(streams).toEqual(running);
    expect(listActiveStreams).toHaveBeenCalledWith({
      token: "tok",
      baseUrl: "https://portal.example",
      conversationId: "conv_bg",
    });
  });

  it("shows a running generation without storing anything", async () => {
    vi.mocked(resumeStream).mockResolvedValue({
      data: answer("Watched answer.") as never,
      error: null,
      interrupted: false,
    });
    const { result } = renderStorage();

    let watched: Awaited<ReturnType<typeof result.current.watchStream>> | undefined;
    await act(async () => {
      watched = await result.current.watchStream({
        inferenceId: "0xlive",
        assistantMessageId: "msg_bg_live",
        conversationId: "conv_bg",
        parentMessageId: "msg_user",
        apiType: "responses",
        model: "anthropic/claude-opus-5-5",
        startedAt: "2026-11-02T12:00:00Z",
      });
    });

    expect(watched?.error).toBeNull();
    expect(vi.mocked(resumeStream).mock.calls[0][0].handle).toEqual({
      inferenceId: "0xlive",
      apiType: "responses",
      model: "anthropic/claude-opus-5-5",
      conversationId: "conv_bg",
    });
    expect(await result.current.getMessages("conv_bg")).toEqual([]);
  });
});
