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
  return { ...orig, resumeStream: vi.fn() };
});
vi.mock("../lib/memoryEngine/generate", async (importOriginal) => {
  const orig = await importOriginal<typeof import("../lib/memoryEngine/generate")>();
  return {
    ...orig,
    generateEmbedding: async () => [0.1, 0.2, 0.3],
    generateEmbeddings: async (texts: string[]) => texts.map(() => [0.1, 0.2, 0.3]),
  };
});

import {
  createLocalStoragePendingStreams,
  type PendingStream,
  type PendingStreamStore,
} from "../lib/chat/pendingStreams";
import { resumeStream, StreamExpiredError } from "../lib/chat/resumeStream";
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

function memoryStore(): PendingStreamStore {
  const data = new Map<string, string>();
  return createLocalStoragePendingStreams("pending", {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
  });
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

function renderStorage(pendingStreams: PendingStreamStore, database = makeDatabase()) {
  return renderHook(() =>
    useChatStorage({
      database,
      conversationId: "conv_bg",
      getToken: async () => "tok",
      resumable: true,
      background: true,
      pendingStreams,
    })
  );
}

function failAfterStreamStarts(inferenceId: string) {
  vi.mocked(runToolLoop).mockImplementation(async (options) => {
    options.onStreamMeta?.({ inferenceId, round: 0 });
    return { data: null, error: "SSE failed: network" } as never;
  });
}

describe("useChatStorage background turns", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("records the turn while it streams and forgets it once the answer is stored", async () => {
    const pending = memoryStore();
    let seenDuringStream: PendingStream[] = [];
    vi.mocked(runToolLoop).mockImplementation(async (options) => {
      options.onStreamMeta?.({ inferenceId: "0xlive", round: 0 });
      seenDuringStream = pending.list();
      return { data: answer("Done."), error: null } as never;
    });
    const { result } = renderStorage(pending);

    let sent: Awaited<ReturnType<typeof result.current.sendMessage>> | undefined;
    await act(async () => {
      sent = await result.current.sendMessage(userTurn);
    });

    expect(sent?.error).toBeNull();
    expect(seenDuringStream).toMatchObject([
      {
        inferenceId: "0xlive",
        apiType: "responses",
        conversationId: "conv_bg",
        parentMessageId: sent?.userMessage?.uniqueId,
      },
    ]);
    expect(vi.mocked(runToolLoop).mock.calls[0][0].headers).toMatchObject({
      "X-Parent-Message-ID": sent?.userMessage?.uniqueId,
    });
    expect(pending.list()).toEqual([]);
  });

  it("keeps a detached turn recorded and writes no assistant or error row", async () => {
    const pending = memoryStore();
    failAfterStreamStarts("0xdetached");
    const { result } = renderStorage(pending);

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
    expect(pending.list().map((p) => p.inferenceId)).toEqual(["0xdetached"]);
  });

  it("stores the recovered answer once under its background id", async () => {
    const pending = memoryStore();
    failAfterStreamStarts("0xrecover");
    const { result } = renderStorage(pending);
    await act(async () => {
      await result.current.sendMessage(userTurn);
    });
    vi.mocked(resumeStream).mockResolvedValue({
      data: answer("Recovered answer.") as never,
      error: null,
      interrupted: false,
    });

    let first: Awaited<ReturnType<typeof result.current.resumePendingStreams>> | undefined;
    await act(async () => {
      first = await result.current.resumePendingStreams();
    });

    const [user] = (await result.current.getMessages("conv_bg")).filter((m) => m.role === "user");
    expect(first).toMatchObject([
      {
        status: "completed",
        inferenceId: "0xrecover",
        assistantMessage: {
          uniqueId: "msg_bg_0xrecover",
          content: "Recovered answer.",
          parentMessageId: user.uniqueId,
        },
      },
    ]);
    expect(vi.mocked(resumeStream).mock.calls[0][0].handle).toMatchObject({
      inferenceId: "0xrecover",
      apiType: "responses",
    });
    expect(pending.list()).toEqual([]);

    pending.put({ ...first![0], apiType: "responses", createdAt: Date.now() } as PendingStream);
    let second: Awaited<ReturnType<typeof result.current.resumePendingStreams>> | undefined;
    await act(async () => {
      second = await result.current.resumePendingStreams();
    });
    expect(second).toMatchObject([{ status: "delivered" }]);
    expect(resumeStream).toHaveBeenCalledOnce();
    const assistants = (await result.current.getMessages("conv_bg")).filter(
      (m) => m.role === "assistant"
    );
    expect(assistants).toHaveLength(1);
  });

  it("drops an expired turn without writing anything", async () => {
    const pending = memoryStore();
    failAfterStreamStarts("0xexpired");
    const { result } = renderStorage(pending);
    await act(async () => {
      await result.current.sendMessage(userTurn);
    });
    vi.mocked(resumeStream).mockRejectedValue(new StreamExpiredError("0xexpired"));

    let resumed: Awaited<ReturnType<typeof result.current.resumePendingStreams>> | undefined;
    await act(async () => {
      resumed = await result.current.resumePendingStreams();
    });

    expect(resumed).toMatchObject([{ status: "expired", assistantMessage: null }]);
    expect(pending.list()).toEqual([]);
    const messages = await result.current.getMessages("conv_bg");
    expect(messages.map((m) => m.role)).toEqual(["user"]);
  });

  it("keeps the turn for a later retry after a transient replay failure", async () => {
    const pending = memoryStore();
    failAfterStreamStarts("0xtransient");
    const { result } = renderStorage(pending);
    await act(async () => {
      await result.current.sendMessage(userTurn);
    });
    vi.mocked(resumeStream).mockResolvedValue({
      data: null,
      error: "SSE failed: 503",
      interrupted: false,
      statusCode: 503,
    });

    let resumed: Awaited<ReturnType<typeof result.current.resumePendingStreams>> | undefined;
    await act(async () => {
      resumed = await result.current.resumePendingStreams();
    });

    expect(resumed).toMatchObject([{ status: "retry", error: "SSE failed: 503" }]);
    expect(pending.list().map((p) => p.inferenceId)).toEqual(["0xtransient"]);
  });

  it("stores an interrupted replay as a stopped answer", async () => {
    const pending = memoryStore();
    failAfterStreamStarts("0xinterrupted");
    const { result } = renderStorage(pending);
    await act(async () => {
      await result.current.sendMessage(userTurn);
    });
    vi.mocked(resumeStream).mockResolvedValue({
      data: answer("Half an") as never,
      error: "Stream ended with a pending tool request",
      interrupted: true,
    });

    let resumed: Awaited<ReturnType<typeof result.current.resumePendingStreams>> | undefined;
    await act(async () => {
      resumed = await result.current.resumePendingStreams();
    });

    expect(resumed).toMatchObject([
      { status: "interrupted", assistantMessage: { content: "Half an", wasStopped: true } },
    ]);
  });

  it("only recovers turns recorded for the signed-in wallet", async () => {
    const pending = memoryStore();
    pending.put({
      inferenceId: "0xsomeone-else",
      apiType: "responses",
      conversationId: "conv_bg",
      parentMessageId: "msg_other",
      walletAddress: "0xOther",
      createdAt: Date.now(),
    });
    const { result } = renderHook(() =>
      useChatStorage({
        database: makeDatabase(),
        conversationId: "conv_bg",
        getToken: async () => "tok",
        walletAddress: "0xMine",
        resumable: true,
        background: true,
        pendingStreams: pending,
      })
    );

    let resumed: Awaited<ReturnType<typeof result.current.resumePendingStreams>> | undefined;
    await act(async () => {
      resumed = await result.current.resumePendingStreams();
    });

    expect(resumed).toEqual([]);
    expect(resumeStream).not.toHaveBeenCalled();
    expect(pending.list()).toHaveLength(1);
  });

  it("records nothing and sends no extra header without background", async () => {
    const pending = memoryStore();
    vi.mocked(runToolLoop).mockImplementation(async (options) => {
      options.onStreamMeta?.({ inferenceId: "0xplain", round: 0 });
      return { data: answer("Done."), error: null } as never;
    });
    const { result } = renderHook(() =>
      useChatStorage({
        database: makeDatabase(),
        conversationId: "conv_bg",
        getToken: async () => "tok",
        resumable: true,
        pendingStreams: pending,
      })
    );

    await act(async () => {
      await result.current.sendMessage(userTurn);
    });

    expect(pending.list()).toEqual([]);
    expect(vi.mocked(runToolLoop).mock.calls[0][0].headers ?? {}).not.toHaveProperty(
      "X-Parent-Message-ID"
    );
  });
});
