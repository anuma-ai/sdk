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
      return { data: null, error: "network error", connectionLost: true } as never;
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

  it("stores a provider error under the turn's reply id instead of detaching", async () => {
    vi.mocked(runToolLoop).mockImplementation(async (options) => {
      options.onStreamMeta?.({ inferenceId: "0xprovider", round: 0 });
      return { data: null, error: "Provider rate limited" } as never;
    });
    const { result } = renderStorage();

    let sent: Awaited<ReturnType<typeof result.current.sendMessage>> | undefined;
    await act(async () => {
      sent = await result.current.sendMessage(userTurn);
    });

    expect(sent).not.toHaveProperty("detached");
    const replyId = vi.mocked(runToolLoop).mock.calls[0][0].headers?.["X-Assistant-Message-ID"];
    const messages = await result.current.getMessages("conv_bg");
    expect(messages.map((m) => [m.role, m.error ?? null])).toEqual([
      ["user", "Provider rate limited"],
      ["assistant", "Provider rate limited"],
    ]);
    expect(messages[1].uniqueId).toBe(replyId);
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

  describe("inbox", () => {
    const encoder = new TextEncoder();
    const b64url = (bytes: Uint8Array) =>
      btoa(String.fromCharCode(...bytes))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
    const fromB64url = (value: string) => {
      const padded = value.replace(/-/g, "+").replace(/_/g, "/");
      return Uint8Array.from(atob(padded + "=".repeat((4 - (padded.length % 4)) % 4)), (c) =>
        c.charCodeAt(0)
      );
    };

    async function seal(recipientB64: string, id: string, plaintext: unknown): Promise<string> {
      const recipientRaw = fromB64url(recipientB64);
      const recipient = await crypto.subtle.importKey(
        "raw",
        recipientRaw,
        { name: "ECDH", namedCurve: "P-256" },
        false,
        []
      );
      const ephemeral = (await crypto.subtle.generateKey(
        { name: "ECDH", namedCurve: "P-256" },
        true,
        ["deriveBits"]
      )) as CryptoKeyPair;
      const epk = new Uint8Array(await crypto.subtle.exportKey("raw", ephemeral.publicKey));
      const shared = await crypto.subtle.deriveBits(
        { name: "ECDH", public: recipient },
        ephemeral.privateKey,
        256
      );
      const salt = new Uint8Array([...epk, ...recipientRaw]);
      const ikm = await crypto.subtle.importKey("raw", shared, "HKDF", false, ["deriveKey"]);
      const key = await crypto.subtle.deriveKey(
        { name: "HKDF", hash: "SHA-256", salt, info: encoder.encode("anuma-inbox-v1:" + id) },
        ikm,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt"]
      );
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const ct = new Uint8Array(
        await crypto.subtle.encrypt(
          { name: "AES-GCM", iv, additionalData: encoder.encode(id) },
          key,
          encoder.encode(JSON.stringify(plaintext))
        )
      );
      return JSON.stringify({
        v: 1,
        alg: "ECDH-ES+HKDF-SHA256+A256GCM",
        epk: b64url(epk),
        iv: b64url(iv),
        ct: b64url(ct),
      });
    }

    function sealedAnswer(id: string, parent: string | null, status = "completed") {
      return {
        v: 1,
        inference_id: id,
        conversation_id: "conv_bg",
        parent_message_id: parent,
        api_type: "responses",
        model: "anthropic/claude-opus-5-5",
        status,
        pending_tool: status === "tool_request" ? "get_location" : null,
        response: answer("Answer from the inbox."),
        finished_at: "2026-11-02T12:00:00Z",
      };
    }

    function fakeInbox(entries: Array<{ id: string; plaintext?: unknown; sealed?: string }>) {
      let publicKey: string | null = null;
      const removed: string[] = [];
      const registered: string[] = [];
      const inbox: VaultInbox = {
        putPublicKey: async (key) => {
          publicKey = key;
          registered.push(key);
        },
        list: async () => {
          const items: InboxItem[] = [];
          for (const entry of entries) {
            if (removed.includes(entry.id)) continue;
            items.push({
              id: entry.id,
              sealed: entry.sealed ?? (await seal(publicKey!, entry.id, entry.plaintext)),
              created_at: "t",
            });
          }
          return items;
        },
        remove: async (id) => {
          removed.push(id);
        },
      };
      return { inbox, removed, registered };
    }

    const walletSigner = vi.fn(async () => "0x" + "ab".repeat(65));

    async function deviceWithTurn(...parents: string[]): Promise<Database> {
      const database = makeDatabase();
      const local = localChatBackend(database)({});
      await local.createConversation({ conversationId: "conv_bg" });
      for (const uniqueId of parents) {
        await local.createMessage({
          conversationId: "conv_bg",
          role: "user",
          content: "question",
          model: "",
          uniqueId,
        });
      }
      return database;
    }

    function renderWithInbox(inbox: VaultInbox, database: Database) {
      return renderHook(() =>
        useChatStorage({
          database,
          conversationId: "conv_bg",
          getToken: async () => "tok",
          walletAddress: "0x1111111111111111111111111111111111111111",
          signMessage: walletSigner,
          resumable: true,
          background: true,
          inbox,
        })
      );
    }

    it("stores a sealed answer once under the sender's reply id and registers the key once", async () => {
      const { inbox, removed, registered } = fakeInbox([
        {
          id: "0xinbox",
          plaintext: {
            ...sealedAnswer("0xinbox", "msg_parent"),
            assistant_message_id: "msg_bg_turn",
          },
        },
      ]);
      const { result } = renderWithInbox(inbox, await deviceWithTurn("msg_parent"));

      let delivered: Awaited<ReturnType<typeof result.current.deliverInbox>> | undefined;
      await act(async () => {
        delivered = await result.current.deliverInbox();
      });
      await act(async () => {
        await result.current.deliverInbox();
      });

      expect(delivered).toMatchObject([
        {
          id: "0xinbox",
          status: "stored",
          assistantMessage: {
            uniqueId: "msg_bg_turn",
            content: "Answer from the inbox.",
            parentMessageId: "msg_parent",
            model: "anthropic/claude-opus-5-5",
          },
        },
      ]);
      expect(removed).toEqual(["0xinbox"]);
      expect(registered).toHaveLength(1);
      expect(fromB64url(registered[0])).toHaveLength(65);
    });

    it("falls back to the inference id when the sender sent no reply id", async () => {
      const { inbox } = fakeInbox([{ id: "0xnoid", plaintext: sealedAnswer("0xnoid", null) }]);
      const { result } = renderWithInbox(inbox, await deviceWithTurn());

      let delivered: Awaited<ReturnType<typeof result.current.deliverInbox>> | undefined;
      await act(async () => {
        delivered = await result.current.deliverInbox();
      });

      expect(delivered).toMatchObject([
        { status: "stored", assistantMessage: { uniqueId: "msg_bg_0xnoid" } },
      ]);
    });

    it("never overwrites an answer the live client already stored", async () => {
      const database = await deviceWithTurn("msg_parent");
      await localChatBackend(database)({}).createMessage({
        conversationId: "conv_bg",
        role: "assistant",
        content: "Live answer.",
        model: "m",
        uniqueId: "msg_bg_live",
      });
      const { inbox, removed } = fakeInbox([
        {
          id: "0xlive",
          plaintext: {
            ...sealedAnswer("0xlive", "msg_parent"),
            assistant_message_id: "msg_bg_live",
          },
        },
      ]);
      const { result } = renderWithInbox(inbox, database);

      let delivered: Awaited<ReturnType<typeof result.current.deliverInbox>> | undefined;
      await act(async () => {
        delivered = await result.current.deliverInbox();
      });

      expect(delivered).toMatchObject([{ status: "delivered" }]);
      expect(removed).toEqual(["0xlive"]);
      const assistants = (await result.current.getMessages("conv_bg")).filter(
        (m) => m.role === "assistant"
      );
      expect(assistants.map((m) => m.content)).toEqual(["Live answer."]);
    });

    it("leaves an answer for the device that has the turn", async () => {
      const { inbox, removed } = fakeInbox([
        {
          id: "0xother",
          plaintext: {
            ...sealedAnswer("0xother", "msg_on_laptop"),
            assistant_message_id: "msg_bg_x",
          },
        },
        { id: "0xnoparent", plaintext: sealedAnswer("0xnoparent", null) },
      ]);
      const phone = makeDatabase();
      const { result } = renderWithInbox(inbox, phone);

      let delivered: Awaited<ReturnType<typeof result.current.deliverInbox>> | undefined;
      await act(async () => {
        delivered = await result.current.deliverInbox();
      });

      expect(delivered).toMatchObject([
        { id: "0xother", status: "elsewhere", assistantMessage: null },
        { id: "0xnoparent", status: "elsewhere", assistantMessage: null },
      ]);
      expect(removed).toEqual([]);
      expect(await localChatBackend(phone)({}).getMessagesByIds(["msg_bg_x"])).toEqual([]);
    });

    it("keeps an item it cannot open", async () => {
      const { inbox, removed } = fakeInbox([{ id: "0xbad", sealed: '{"v":9}' }]);
      const { result } = renderWithInbox(inbox, await deviceWithTurn());

      let delivered: Awaited<ReturnType<typeof result.current.deliverInbox>> | undefined;
      await act(async () => {
        delivered = await result.current.deliverInbox();
      });

      expect(delivered).toMatchObject([{ id: "0xbad", status: "unreadable" }]);
      expect(removed).toEqual([]);
    });

    it("stores a turn that stopped for a device tool as stopped", async () => {
      const { inbox } = fakeInbox([
        { id: "0xtool", plaintext: sealedAnswer("0xtool", "msg_tool_parent", "tool_request") },
      ]);
      const { result } = renderWithInbox(inbox, await deviceWithTurn("msg_tool_parent"));

      let delivered: Awaited<ReturnType<typeof result.current.deliverInbox>> | undefined;
      await act(async () => {
        delivered = await result.current.deliverInbox();
      });

      expect(delivered).toMatchObject([
        { status: "stored", assistantMessage: { wasStopped: true } },
      ]);
    });

    it("does nothing without a signed-in wallet", async () => {
      const inbox: VaultInbox = {
        putPublicKey: vi.fn(),
        list: vi.fn(async () => []),
        remove: vi.fn(),
      };
      const database = makeDatabase();
      const { result } = renderHook(() =>
        useChatStorage({ database, conversationId: "conv_bg", inbox })
      );

      let delivered: Awaited<ReturnType<typeof result.current.deliverInbox>> | undefined;
      await act(async () => {
        delivered = await result.current.deliverInbox();
      });

      expect(delivered).toEqual([]);
      expect(inbox.putPublicKey).not.toHaveBeenCalled();
      expect(inbox.list).not.toHaveBeenCalled();
    });
  });
});
