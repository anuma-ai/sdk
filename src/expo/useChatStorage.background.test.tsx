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

import { sealInboxItem } from "../lib/chat/fixtures/sealInboxItem";
import type { InboxItem, VaultInbox } from "../lib/chat/inbox";
import { listActiveStreams, resumeStream } from "../lib/chat/resumeStream";
import { runToolLoop } from "../lib/chat/toolLoop";
import { localChatBackend } from "../lib/storage/WatermelonChatStorageAdapter";
import { useChatStorage } from "./useChatStorage";

function makeDatabase(): Database {
  const adapter = new LokiJSAdapter({
    schema: sdkSchema,
    migrations: sdkMigrations,
    useWebWorker: false,
    useIncrementalIndexedDB: false,
    dbName: `expo-background-${Math.random().toString(36).slice(2)}`,
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

const wallet = "0x1111111111111111111111111111111111111111";
const walletSigner = vi.fn(async () => "0x" + "ab".repeat(65));

function renderStorage(options: {
  database?: Database;
  inbox?: VaultInbox;
  onStreamMeta?: (meta: unknown) => void;
  withWallet?: boolean;
}) {
  const database = options.database ?? makeDatabase();
  return renderHook(() =>
    useChatStorage({
      database,
      conversationId: "conv_bg",
      getToken: async () => "tok",
      baseUrl: "https://portal.example",
      resumable: true,
      onStreamMeta: options.onStreamMeta,
      inbox: options.inbox,
      ...(options.withWallet ? { walletAddress: wallet, signMessage: walletSigner } : {}),
    })
  );
}

describe("expo useChatStorage background turns", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sends the turn's reply id and stores the live answer under it", async () => {
    vi.mocked(runToolLoop).mockResolvedValue({ data: answer("Final."), error: null } as never);
    const { result } = renderStorage({});

    let sent: Awaited<ReturnType<typeof result.current.sendMessage>> | undefined;
    await act(async () => {
      sent = await result.current.sendMessage(userTurn);
    });

    const headers = vi.mocked(runToolLoop).mock.calls[0][0].headers ?? {};
    expect(headers["X-Assistant-Message-ID"]).toMatch(/^msg_/);
    expect(headers["X-Parent-Message-ID"]).toBe(sent?.userMessage?.uniqueId);
    expect(sent).toMatchObject({
      assistantMessage: { uniqueId: headers["X-Assistant-Message-ID"] },
    });
  });

  it("puts the reply id on the stream meta and on the detached resume handle", async () => {
    const onStreamMeta = vi.fn();
    vi.mocked(runToolLoop).mockImplementation(async (options) => {
      options.onStreamMeta?.({ inferenceId: "0xdetach", round: 0 });
      return {
        data: null,
        error: "Request detached",
        detached: true,
        resume: { inferenceId: "0xdetach", apiType: "responses" },
      } as never;
    });
    const { result } = renderStorage({ onStreamMeta });

    let sent: Awaited<ReturnType<typeof result.current.sendMessage>> | undefined;
    await act(async () => {
      sent = await result.current.sendMessage(userTurn);
    });

    const replyId = vi.mocked(runToolLoop).mock.calls[0][0].headers?.["X-Assistant-Message-ID"];
    expect(onStreamMeta).toHaveBeenCalledWith(
      expect.objectContaining({ inferenceId: "0xdetach", assistantMessageId: replyId })
    );
    expect(sent).toMatchObject({
      detached: true,
      assistantUniqueId: replyId,
      resume: { inferenceId: "0xdetach", assistantMessageId: replyId },
    });
  });

  it("stores a cold-launch replay under the reply id carried by the handle", async () => {
    vi.mocked(resumeStream).mockResolvedValue({
      data: answer("Recovered.") as never,
      error: null,
      interrupted: false,
    });
    const { result } = renderStorage({});

    let resumed: Awaited<ReturnType<typeof result.current.resumeStream>> | undefined;
    await act(async () => {
      resumed = await result.current.resumeStream(
        {
          inferenceId: "0xcold",
          apiType: "responses",
          conversationId: "conv_bg",
          assistantMessageId: "msg_turn_reply",
        },
        { headless: true }
      );
    });

    expect(resumed?.assistantMessage?.uniqueId).toBe("msg_turn_reply");
  });

  it("lists running generations and watches one without storing anything", async () => {
    const running = {
      inferenceId: "0xlive",
      assistantMessageId: "msg_bg_live",
      conversationId: "conv_bg",
      parentMessageId: "msg_user",
      apiType: "responses" as const,
      model: "m",
      startedAt: "2026-11-03T00:00:00Z",
    };
    vi.mocked(listActiveStreams).mockResolvedValue([running]);
    vi.mocked(resumeStream).mockResolvedValue({
      data: answer("Watched.") as never,
      error: null,
      interrupted: false,
    });
    const { result } = renderStorage({});

    let streams: Awaited<ReturnType<typeof result.current.getActiveStreams>> | undefined;
    await act(async () => {
      streams = await result.current.getActiveStreams("conv_bg");
      await result.current.watchStream(running);
    });

    expect(streams).toEqual([running]);
    expect(listActiveStreams).toHaveBeenCalledWith({
      token: "tok",
      baseUrl: "https://portal.example",
      conversationId: "conv_bg",
    });
    expect(vi.mocked(resumeStream).mock.calls[0][0].handle).toEqual({
      inferenceId: "0xlive",
      apiType: "responses",
      model: "m",
      conversationId: "conv_bg",
    });
    expect(await result.current.getMessages("conv_bg")).toEqual([]);
  });

  describe("inbox", () => {
    function fakeInbox(entries: Array<{ id: string; plaintext: unknown }>) {
      let publicKey: string | null = null;
      const removed: string[] = [];
      const inbox: VaultInbox = {
        putPublicKey: async (key) => {
          publicKey = key;
        },
        list: async () => {
          const items: InboxItem[] = [];
          for (const entry of entries) {
            if (removed.includes(entry.id)) continue;
            items.push({
              id: entry.id,
              sealed: await sealInboxItem(publicKey!, entry.id, entry.plaintext),
              created_at: "t",
            });
          }
          return items;
        },
        remove: async (id) => {
          removed.push(id);
        },
      };
      return { inbox, removed };
    }

    function sealed(id: string, parent: string, status = "completed") {
      return {
        v: 1,
        inference_id: id,
        conversation_id: "conv_bg",
        parent_message_id: parent,
        assistant_message_id: `msg_reply_${id}`,
        api_type: "responses",
        model: "anthropic/claude-opus-5-5",
        status,
        pending_tool: null,
        response: answer("From the inbox."),
        finished_at: "2026-11-03T00:00:00Z",
      };
    }

    async function deviceWithParent(parent: string): Promise<Database> {
      const database = makeDatabase();
      const local = localChatBackend(database)({});
      await local.createConversation({ conversationId: "conv_bg" });
      await local.createMessage({
        conversationId: "conv_bg",
        role: "user",
        content: "question",
        model: "",
        uniqueId: parent,
      });
      return database;
    }

    it("stores a sealed answer under the sender's reply id on the device that owns the turn", async () => {
      const { inbox, removed } = fakeInbox([{ id: "0xin", plaintext: sealed("0xin", "msg_p") }]);
      const { result } = renderStorage({
        inbox,
        withWallet: true,
        database: await deviceWithParent("msg_p"),
      });

      let delivered: Awaited<ReturnType<typeof result.current.deliverInbox>> | undefined;
      await act(async () => {
        delivered = await result.current.deliverInbox();
      });

      expect(delivered).toMatchObject([
        {
          status: "stored",
          assistantMessage: {
            uniqueId: "msg_reply_0xin",
            content: "From the inbox.",
            parentMessageId: "msg_p",
          },
        },
      ]);
      expect(removed).toEqual(["0xin"]);
    });

    it("leaves an answer for the device that has the turn", async () => {
      const { inbox, removed } = fakeInbox([
        { id: "0xaway", plaintext: sealed("0xaway", "msg_x") },
      ]);
      const { result } = renderStorage({ inbox, withWallet: true });

      let delivered: Awaited<ReturnType<typeof result.current.deliverInbox>> | undefined;
      await act(async () => {
        delivered = await result.current.deliverInbox();
      });

      expect(delivered).toMatchObject([{ status: "elsewhere" }]);
      expect(removed).toEqual([]);
    });

    it("stores a turn that stopped for a device tool as stopped", async () => {
      const { inbox } = fakeInbox([
        { id: "0xtool", plaintext: sealed("0xtool", "msg_t", "tool_request") },
      ]);
      const { result } = renderStorage({
        inbox,
        withWallet: true,
        database: await deviceWithParent("msg_t"),
      });

      let delivered: Awaited<ReturnType<typeof result.current.deliverInbox>> | undefined;
      await act(async () => {
        delivered = await result.current.deliverInbox();
      });

      expect(delivered).toMatchObject([
        { status: "stored", assistantMessage: { wasStopped: true } },
      ]);
    });
  });
});
