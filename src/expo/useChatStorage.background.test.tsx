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
const conversationRedactors = vi.hoisted(() => new Map<string | null, unknown>());
vi.mock("../lib/pii/useConversationRedactors", async () => {
  const { PiiRedactor: Redactor } = await import("../lib/pii/redactor");
  return {
    useConversationRedactors: () => (conversationId: string | null) => {
      if (!conversationRedactors.has(conversationId)) {
        conversationRedactors.set(conversationId, new Redactor());
      }
      return conversationRedactors.get(conversationId);
    },
  };
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
import { listActiveStreams, resumeStream, StreamExpiredError } from "../lib/chat/resumeStream";
import { runToolLoop } from "../lib/chat/toolLoop";
import { PiiRedactor } from "../lib/pii/redactor";
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
  piiRedaction?: boolean;
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
      piiRedaction: options.piiRedaction,
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

  it("exports the inbox and active-stream API from the expo entry", async () => {
    const expo = await import("./index");
    expect(typeof expo.createVaultInbox).toBe("function");
    expect(typeof expo.listActiveStreams).toBe("function");
    expect(typeof expo.openInboxItem).toBe("function");
  });

  it("keeps the newer send's reply id when a superseded send finishes", async () => {
    const onStreamMeta = vi.fn();
    let first: Promise<unknown> | undefined;
    let call = 0;
    vi.mocked(runToolLoop).mockImplementation(async (options) => {
      if (call++ === 0) {
        options.onStreamMeta?.({ inferenceId: "0xold", round: 0 });
        await new Promise<void>((resolve) =>
          options.signal?.addEventListener("abort", () => resolve(), { once: true })
        );
        return { data: null, error: "Request aborted" } as never;
      }
      await first;
      options.onStreamMeta?.({ inferenceId: "0xnew", round: 0 });
      return { data: answer("New."), error: null } as never;
    });
    const { result } = renderStorage({ onStreamMeta });

    await act(async () => {
      first = result.current.sendMessage(userTurn);
      await vi.waitFor(() => expect(onStreamMeta).toHaveBeenCalledOnce());
      await result.current.sendMessage(userTurn);
    });

    const newReplyId = vi.mocked(runToolLoop).mock.calls[1][0].headers?.["X-Assistant-Message-ID"];
    expect(onStreamMeta).toHaveBeenLastCalledWith(
      expect.objectContaining({ inferenceId: "0xnew", assistantMessageId: newReplyId })
    );
  });

  it("returns the reply id on the handle from detach()", async () => {
    let release: () => void = () => {};
    vi.mocked(runToolLoop).mockImplementation(async (options) => {
      options.onStreamMeta?.({ inferenceId: "0xdetached", round: 0 });
      await new Promise<void>((resolve) => {
        release = resolve;
      });
      return { data: answer("Done."), error: null } as never;
    });
    const { result } = renderStorage({ onStreamMeta: () => {} });

    let sending: Promise<unknown> | undefined;
    act(() => {
      sending = result.current.sendMessage(userTurn);
    });
    await vi.waitFor(() => expect(runToolLoop).toHaveBeenCalled());
    const replyId = vi.mocked(runToolLoop).mock.calls[0][0].headers?.["X-Assistant-Message-ID"];
    const handle = result.current.detach();
    await act(async () => {
      release();
      await sending;
    });

    expect(handle).toMatchObject({ inferenceId: "0xdetached", assistantMessageId: replyId });
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

  describe("stop", () => {
    function cancelPosts(fetchSpy: { mock: { calls: unknown[][] } }) {
      return fetchSpy.mock.calls
        .filter(([, init]) => (init as RequestInit | undefined)?.method === "POST")
        .map(([url]) => String(url));
    }

    it("cancels the generation on portal when the user stops a replay of a saved handle", async () => {
      const fetchSpy = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValue(new Response(null, { status: 204 }));
      vi.mocked(resumeStream).mockImplementationOnce(
        (opts) =>
          new Promise((resolve) => {
            opts.signal?.addEventListener("abort", () =>
              resolve({ data: null, error: "Request aborted", interrupted: false })
            );
          })
      );
      const { result } = renderStorage({});

      let replay: Promise<unknown> | undefined;
      act(() => {
        replay = result.current.resumeStream({ inferenceId: "0xcold", apiType: "responses" });
      });
      await vi.waitFor(() => expect(resumeStream).toHaveBeenCalled());
      await act(async () => {
        result.current.stop();
        await replay;
      });

      await vi.waitFor(() =>
        expect(cancelPosts(fetchSpy)).toEqual([
          "https://portal.example/api/v1/chat/streams/0xcold/cancel",
        ])
      );
      fetchSpy.mockRestore();
    });

    it("cancels the generation on portal when the user stops a detached turn", async () => {
      const fetchSpy = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValue(new Response(null, { status: 204 }));
      vi.mocked(runToolLoop).mockImplementationOnce(async (options) => {
        options.onStreamMeta?.({ inferenceId: "0xdet", round: 0 });
        return {
          data: answer("Half an"),
          error: "Request detached",
          detached: true,
          resume: { inferenceId: "0xdet", apiType: "responses" },
        } as never;
      });
      const { result } = renderStorage({});
      await act(async () => {
        await result.current.sendMessage(userTurn);
      });

      await act(async () => {
        result.current.stop();
      });

      await vi.waitFor(() =>
        expect(cancelPosts(fetchSpy)).toEqual([
          "https://portal.example/api/v1/chat/streams/0xdet/cancel",
        ])
      );
      fetchSpy.mockRestore();
    });
  });

  describe("inbox", () => {
    type InboxEntry = { id: string; plaintext: unknown };
    function fakeInbox(entries: InboxEntry[] | (() => InboxEntry[])) {
      let publicKey: string | null = null;
      const removed: string[] = [];
      const inbox: VaultInbox = {
        putPublicKey: async (key) => {
          publicKey = key;
        },
        list: async () => {
          const items: InboxItem[] = [];
          for (const entry of typeof entries === "function" ? entries() : entries) {
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

    it("restores PII placeholders with the turn's conversation redactor", async () => {
      const turnRedactor = new PiiRedactor();
      turnRedactor.redactText("mail john@example.com");
      conversationRedactors.set("conv_bg", turnRedactor);
      const withPlaceholder = {
        ...sealed("0xpii", "msg_pii"),
        response: answer("Sent to [EMAIL_1]."),
      };
      const { inbox } = fakeInbox([{ id: "0xpii", plaintext: withPlaceholder }]);
      const { result } = renderStorage({
        inbox,
        withWallet: true,
        piiRedaction: true,
        database: await deviceWithParent("msg_pii"),
      });
      await act(async () => {
        result.current.setConversationId("conv_other");
      });

      let delivered: Awaited<ReturnType<typeof result.current.deliverInbox>> | undefined;
      await act(async () => {
        delivered = await result.current.deliverInbox();
      });

      expect(delivered).toMatchObject([
        { status: "stored", assistantMessage: { content: "Sent to john@example.com." } },
      ]);
    });

    it("stores an answer without a parent id without adopting the latest row as parent", async () => {
      const { inbox } = fakeInbox([
        { id: "0xorphan", plaintext: { ...sealed("0xorphan", "unused"), parent_message_id: null } },
      ]);
      const { result } = renderStorage({
        inbox,
        withWallet: true,
        database: await deviceWithParent("msg_latest"),
      });

      let delivered: Awaited<ReturnType<typeof result.current.deliverInbox>> | undefined;
      await act(async () => {
        delivered = await result.current.deliverInbox();
      });

      expect(delivered).toMatchObject([{ status: "stored" }]);
      expect(delivered?.[0].assistantMessage?.parentMessageId ?? null).toBeNull();
    });

    function detachWithPartial(inferenceId: string) {
      vi.mocked(runToolLoop).mockImplementationOnce(async (options) => {
        options.onStreamMeta?.({ inferenceId, round: 0 });
        return {
          data: answer("Half an"),
          error: "Request detached",
          detached: true,
          resume: { inferenceId, apiType: "responses" },
        } as never;
      });
    }

    async function detachedTurn(inbox: VaultInbox, database = makeDatabase()) {
      detachWithPartial("0xturn");
      const rendered = renderStorage({ inbox, withWallet: true, database });
      let sent: Awaited<ReturnType<typeof rendered.result.current.sendMessage>> | undefined;
      await act(async () => {
        sent = await rendered.result.current.sendMessage(userTurn);
      });
      const replyId = vi.mocked(runToolLoop).mock.calls[0][0].headers?.["X-Assistant-Message-ID"];
      return { ...rendered, replyId: replyId!, parent: sent!.userMessage!.uniqueId, database };
    }

    it("keeps an inbox answer when the detached turn is later retired by the next send", async () => {
      const turn: { replyId?: string; parent?: string } = {};
      const box = fakeInbox(() => [
        {
          id: "0xturn",
          plaintext: {
            ...sealed("0xturn", turn.parent!),
            assistant_message_id: turn.replyId,
            response: answer("The full answer."),
          },
        },
      ]);
      const { result, replyId, parent } = await detachedTurn(box.inbox);
      Object.assign(turn, { replyId, parent });

      await act(async () => {
        await result.current.deliverInbox();
      });
      vi.mocked(runToolLoop).mockResolvedValue({ data: answer("Next."), error: null } as never);
      await act(async () => {
        await result.current.sendMessage(userTurn);
      });

      const stored = (await result.current.getMessages("conv_bg")).find(
        (m) => m.uniqueId === replyId
      );
      expect(stored).toMatchObject({ content: "The full answer." });
      expect(stored?.wasStopped).toBeFalsy();
    });

    it("forgets the detached turn once its answer arrives through the inbox", async () => {
      const turn: { replyId?: string; parent?: string } = {};
      const box = fakeInbox(() => [
        {
          id: "0xturn",
          plaintext: {
            ...sealed("0xturn", turn.parent!),
            assistant_message_id: turn.replyId,
          },
        },
      ]);
      const { result, replyId, parent } = await detachedTurn(box.inbox);
      Object.assign(turn, { replyId, parent });

      await act(async () => {
        await result.current.deliverInbox();
      });
      let resumed: Awaited<ReturnType<typeof result.current.resumeStream>> | undefined;
      await act(async () => {
        resumed = await result.current.resumeStream();
      });

      expect(resumed?.error).toBe("No resumable stream");
    });

    it("never lets a stopped partial replace an answer stored elsewhere", async () => {
      const { result, replyId, database } = await detachedTurn(fakeInbox([]).inbox);
      await localChatBackend(database)({}).upsertMessage({
        conversationId: "conv_bg",
        role: "assistant",
        content: "Answer synced from another device.",
        model: "m",
        uniqueId: replyId,
      });
      vi.mocked(resumeStream).mockRejectedValue(new StreamExpiredError("0xturn"));

      await act(async () => {
        await result.current.resumeStream();
      });

      const stored = (await result.current.getMessages("conv_bg")).find(
        (m) => m.uniqueId === replyId
      );
      expect(stored).toMatchObject({ content: "Answer synced from another device." });
      expect(stored?.wasStopped).toBeFalsy();
    });

    function finishedTurnInbox(status = "completed") {
      const turn: { replyId?: string; parent?: string } = {};
      const box = fakeInbox(() => [
        {
          id: "0xturn",
          plaintext: {
            ...sealed("0xturn", turn.parent!, status),
            assistant_message_id: turn.replyId,
            response: answer("The full answer."),
          },
        },
      ]);
      return { ...box, turn };
    }

    async function partialFromExpiredReplay(status = "completed") {
      const box = finishedTurnInbox(status);
      const detached = await detachedTurn(box.inbox);
      Object.assign(box.turn, { replyId: detached.replyId, parent: detached.parent });
      vi.mocked(resumeStream).mockRejectedValueOnce(new StreamExpiredError("0xturn"));
      await act(async () => {
        await detached.result.current.resumeStream();
      });
      const row = async () =>
        (await detached.result.current.getMessages("conv_bg")).find(
          (m) => m.uniqueId === detached.replyId
        );
      expect(await row()).toMatchObject({ content: "Half an", wasStopped: true });
      return { ...detached, removed: box.removed, row };
    }

    it("replaces a partial an expired replay wrote with the finished inbox answer", async () => {
      const { result, removed, row } = await partialFromExpiredReplay();

      let delivered: Awaited<ReturnType<typeof result.current.deliverInbox>> | undefined;
      await act(async () => {
        delivered = await result.current.deliverInbox();
      });

      expect(delivered).toMatchObject([{ status: "stored" }]);
      expect(await row()).toMatchObject({ content: "The full answer." });
      expect((await row())?.wasStopped).toBeFalsy();
      expect(removed).toEqual(["0xturn"]);
    });

    it("keeps the partial when the inbox item stopped for a device tool", async () => {
      const { result, removed, row } = await partialFromExpiredReplay("tool_request");

      let delivered: Awaited<ReturnType<typeof result.current.deliverInbox>> | undefined;
      await act(async () => {
        delivered = await result.current.deliverInbox();
      });

      expect(delivered).toMatchObject([{ status: "delivered" }]);
      expect(await row()).toMatchObject({ content: "Half an", wasStopped: true });
      expect(removed).toEqual(["0xturn"]);
    });

    async function droppedTurn(inbox: VaultInbox) {
      vi.mocked(runToolLoop).mockResolvedValueOnce({
        data: null,
        error: "network error",
        connectionLost: true,
      } as never);
      const rendered = renderStorage({ inbox, withWallet: true });
      let sent: Awaited<ReturnType<typeof rendered.result.current.sendMessage>> | undefined;
      await act(async () => {
        sent = await rendered.result.current.sendMessage(userTurn);
      });
      const replyId = vi.mocked(runToolLoop).mock.calls[0][0].headers?.["X-Assistant-Message-ID"];
      const rows = () => rendered.result.current.getMessages("conv_bg");
      expect((await rows()).map((m) => [m.role, m.uniqueId === replyId, m.error ?? null])).toEqual([
        ["user", false, "network error"],
        ["assistant", true, "network error"],
      ]);
      return { ...rendered, replyId: replyId!, parent: sent!.userMessage!.uniqueId, rows };
    }

    async function droppedTurnWithInbox(status = "completed") {
      const box = finishedTurnInbox(status);
      const dropped = await droppedTurn(box.inbox);
      Object.assign(box.turn, { replyId: dropped.replyId, parent: dropped.parent });
      return { ...dropped, removed: box.removed };
    }

    it("replaces the error row a dropped connection left and clears the question's error", async () => {
      const { result, removed, rows } = await droppedTurnWithInbox();

      let delivered: Awaited<ReturnType<typeof result.current.deliverInbox>> | undefined;
      await act(async () => {
        delivered = await result.current.deliverInbox();
      });

      expect(delivered).toMatchObject([{ status: "stored" }]);
      expect(delivered?.[0].assistantMessage?.error).toBeFalsy();
      expect((await rows()).map((m) => [m.role, m.content, !!m.error, !!m.wasStopped])).toEqual([
        ["user", "hello", false, false],
        ["assistant", "The full answer.", false, false],
      ]);
      expect(removed).toEqual(["0xturn"]);
    });

    it("replaces the error row with a turn that stopped for a device tool", async () => {
      const { result, removed, rows } = await droppedTurnWithInbox("tool_request");

      await act(async () => {
        await result.current.deliverInbox();
      });

      expect((await rows()).map((m) => [m.role, m.content, !!m.error, !!m.wasStopped])).toEqual([
        ["user", "hello", false, false],
        ["assistant", "The full answer.", false, true],
      ]);
      expect(removed).toEqual(["0xturn"]);
    });

    it("clears the error row when a replay of the dropped turn finishes", async () => {
      const { result, replyId, rows } = await droppedTurn(fakeInbox([]).inbox);
      vi.mocked(resumeStream).mockResolvedValueOnce({
        data: answer("Replayed."),
        error: null,
      } as never);

      await act(async () => {
        await result.current.resumeStream({
          inferenceId: "0xturn",
          apiType: "responses",
          conversationId: "conv_bg",
          assistantMessageId: replyId,
        });
      });

      expect((await rows()).map((m) => [m.role, m.content, !!m.error, !!m.wasStopped])).toEqual([
        ["user", "hello", false, false],
        ["assistant", "Replayed.", false, false],
      ]);
    });

    it("stores an interrupted replay of the dropped turn over its error row", async () => {
      const { result, replyId, rows } = await droppedTurn(fakeInbox([]).inbox);
      vi.mocked(resumeStream).mockResolvedValueOnce({
        data: answer("Half an"),
        error: "network error",
        interrupted: true,
      });

      await act(async () => {
        await result.current.resumeStream({
          inferenceId: "0xturn",
          apiType: "responses",
          conversationId: "conv_bg",
          assistantMessageId: replyId,
        });
      });

      expect((await rows()).map((m) => [m.role, m.content, !!m.error, !!m.wasStopped])).toEqual([
        ["user", "hello", false, false],
        ["assistant", "Half an", false, true],
      ]);
    });

    it("detaches a turn whose connection drops after portal's id arrived", async () => {
      vi.mocked(runToolLoop).mockImplementationOnce(async (options) => {
        options.onStreamMeta?.({ inferenceId: "0xturn", round: 0 });
        return { data: null, error: "network error", connectionLost: true } as never;
      });
      const { result } = renderStorage({ withWallet: true });

      let sent: Awaited<ReturnType<typeof result.current.sendMessage>> | undefined;
      await act(async () => {
        sent = await result.current.sendMessage(userTurn);
      });

      const replyId = vi.mocked(runToolLoop).mock.calls[0][0].headers?.["X-Assistant-Message-ID"];
      expect(sent).toMatchObject({
        detached: true,
        resume: { inferenceId: "0xturn", assistantMessageId: replyId },
      });
      const rows = await result.current.getMessages("conv_bg");
      expect(rows.map((m) => [m.role, m.error ?? null])).toEqual([["user", null]]);
    });

    it("keeps the text that streamed before the drop when the user stops the turn", async () => {
      vi.mocked(runToolLoop).mockImplementationOnce(async (options) => {
        options.onStreamMeta?.({ inferenceId: "0xturn", round: 0 });
        return { data: answer("Half an"), error: "network error", connectionLost: true } as never;
      });
      const { result } = renderStorage({ withWallet: true });
      await act(async () => {
        await result.current.sendMessage(userTurn);
      });

      await act(async () => {
        result.current.stop();
      });

      await vi.waitFor(async () =>
        expect(
          (await result.current.getMessages("conv_bg")).map((m) => [
            m.role,
            m.content,
            !!m.wasStopped,
          ])
        ).toEqual([
          ["user", "hello", false],
          ["assistant", "Half an", true],
        ])
      );
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
