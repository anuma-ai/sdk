import { Database } from "@nozbe/watermelondb";
import LokiJSAdapter from "@nozbe/watermelondb/adapters/lokijs";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useChatStorage as useExpoChatStorage } from "../expo/useChatStorage";
import { runToolLoop } from "../lib/chat/toolLoop";
import { queueManager } from "../lib/db/queue";
import { sdkMigrations, sdkModelClasses, sdkSchema } from "../lib/db/schema";
import type { ChatBackend, ChatBackendFactory, ChatBackendSigner } from "../lib/storage";
import { localChatBackend } from "../lib/storage";
import { useChatStorage as useReactChatStorage } from "./useChatStorage";
import { clearEncryptionKey, seedEncryptionKeys } from "./useEncryption";

vi.mock("../lib/chat/toolLoop", async (importOriginal) => {
  const original = await importOriginal<typeof import("../lib/chat/toolLoop")>();
  return { ...original, runToolLoop: vi.fn() };
});

const walletAddress = "0x00000000000000000000000000000000000000b1";

type ToolLoopResult = Awaited<ReturnType<typeof runToolLoop>>;

const toolLoopResult: ToolLoopResult = {
  data: {
    id: "response-1",
    model: "test-model",
    object: "response",
    output: [
      {
        type: "message",
        role: "assistant",
        content: [{ type: "output_text", text: "Hello back." }],
        status: "completed",
      },
    ],
  },
  error: null,
};

function makeDatabase(): Database {
  const adapter = new LokiJSAdapter({
    schema: sdkSchema,
    migrations: sdkMigrations,
    useWebWorker: false,
    useIncrementalIndexedDB: false,
    dbName: `chat-backend-hook-${Math.random().toString(36).slice(2)}`,
  });
  return new Database({ adapter, modelClasses: sdkModelClasses });
}

function recordingBackend(target: Database) {
  const calls: string[] = [];
  const signers: ChatBackendSigner[] = [];
  const factory: ChatBackendFactory = (signer) => {
    signers.push(signer);
    const inner = localChatBackend(target)(signer);
    return new Proxy(inner, {
      get(object, property, receiver) {
        const value: unknown = Reflect.get(object, property, receiver);
        if (typeof value !== "function") return value;
        return (...args: unknown[]) => {
          calls.push(String(property));
          return (value as (...a: unknown[]) => unknown).apply(object, args);
        };
      },
    }) as ChatBackend;
  };
  return { factory, calls, signers };
}

async function rows(database: Database) {
  return {
    conversations: (await database.get("conversations").query().fetch()).length,
    messages: (await database.get("history").query().fetch()).length,
  };
}

describe.each([
  ["react", useReactChatStorage],
  ["expo", useExpoChatStorage],
] as const)("useChatStorage with a chat backend (%s)", (_platform, useChatStorage) => {
  beforeEach(() => {
    clearEncryptionKey(walletAddress);
    queueManager.clear(walletAddress);
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Network unavailable"));
    vi.mocked(runToolLoop).mockResolvedValue(toolLoopResult);
  });

  afterEach(() => {
    cleanup();
    queueManager.clear(walletAddress);
    clearEncryptionKey(walletAddress);
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it("reads and writes chats through the backend, not the hook's database", async () => {
    const hookDatabase = makeDatabase();
    const backendDatabase = makeDatabase();
    const backend = recordingBackend(backendDatabase);
    const { result } = renderHook(() =>
      useChatStorage({
        database: hookDatabase,
        chatBackend: backend.factory,
        getToken: () => Promise.resolve("token"),
        autoEmbedMessages: false,
      })
    );

    const conversation = await act(async () =>
      result.current.createConversation({ title: "Routed" })
    );
    const sent = await act(async () =>
      result.current.sendMessage({
        messages: [{ role: "user", content: [{ type: "text", text: "Hello" }] }],
        model: "test-model",
      })
    );
    expect(sent.error).toBeNull();
    expect(await rows(backendDatabase)).toEqual({ conversations: 1, messages: 2 });

    const id = conversation.conversationId;
    expect((await result.current.getMessages(id)).map((m) => m.role)).toEqual([
      "user",
      "assistant",
    ]);
    expect(await result.current.getMessagesPage(id, { limit: 1 })).toHaveLength(1);
    expect(await result.current.getMessageSkeletons(id)).toHaveLength(2);
    expect(await result.current.getMessageCount(id)).toBe(2);
    expect(await result.current.deleteConversation(id)).toBe(true);
    expect(await result.current.getConversation(id)).toBeNull();

    expect(await rows(hookDatabase)).toEqual({ conversations: 0, messages: 0 });
    for (const method of [
      "createConversation",
      "getToolCallEventIds",
      "getMessagesPage",
      "createMessage",
      "getMessages",
      "getMessageSkeletons",
      "getMessageCount",
      "deleteConversation",
      "clearMessages",
      "deleteSummary",
    ]) {
      expect(backend.calls).toContain(method);
    }
  });

  it("replays writes queued before the key was ready through the backend", async () => {
    const hookDatabase = makeDatabase();
    const backendDatabase = makeDatabase();
    const backend = recordingBackend(backendDatabase);
    const signMessage = vi.fn().mockRejectedValue(new Error("Encryption key unavailable"));
    const { result } = renderHook(() =>
      useChatStorage({
        database: hookDatabase,
        chatBackend: backend.factory,
        walletAddress,
        signMessage,
        enableQueue: true,
        getToken: () => Promise.resolve("token"),
        autoEmbedMessages: false,
      })
    );

    await act(async () => result.current.createConversation({ title: "Queued" }));
    expect(result.current.queueStatus.pending).toBe(1);
    expect(await rows(backendDatabase)).toEqual({ conversations: 0, messages: 0 });

    await act(() =>
      Promise.resolve(
        seedEncryptionKeys(walletAddress, { legacy: "11".repeat(32), current: "22".repeat(32) })
      )
    );
    await waitFor(() => expect(result.current.queueStatus.pending).toBe(0));

    expect(result.current.queueStatus.failed).toBe(0);
    expect(await rows(backendDatabase)).toMatchObject({ conversations: 1 });
    expect(await rows(hookDatabase)).toEqual({ conversations: 0, messages: 0 });
    expect(backend.signers.some((s) => s.walletAddress === walletAddress)).toBe(true);
  });

  it.each([false, true])(
    "replays a queued write through the backend that queued it, whichever hook flushes (buffered before the wallet: %s)",
    async (buffered) => {
      const hookDatabase = makeDatabase();
      const firstDatabase = makeDatabase();
      const secondDatabase = makeDatabase();
      const signMessage = vi.fn().mockRejectedValue(new Error("Encryption key unavailable"));
      const getWalletAddress = vi.fn().mockResolvedValue(null);
      const render = (factory: ChatBackendFactory, address?: string) =>
        renderHook(
          (props: { address?: string }) =>
            useChatStorage({
              database: hookDatabase,
              chatBackend: factory,
              walletAddress: props.address,
              signMessage,
              getWalletAddress,
              enableQueue: true,
              defaultConversationTitle: "Untitled chat",
              getToken: () => Promise.resolve("token"),
              autoEmbedMessages: false,
            }),
          { initialProps: { address } }
        );
      const first = render(
        recordingBackend(firstDatabase).factory,
        buffered ? undefined : walletAddress
      );
      const second = render(recordingBackend(secondDatabase).factory, walletAddress);

      const queued = await act(async () => first.result.current.createConversation());
      if (buffered) first.rerender({ address: walletAddress });
      await waitFor(() => expect(second.result.current.queueStatus.pending).toBe(1));
      first.unmount();
      await act(() =>
        Promise.resolve(
          seedEncryptionKeys(walletAddress, { legacy: "11".repeat(32), current: "22".repeat(32) })
        )
      );
      await waitFor(() => expect(second.result.current.queueStatus.pending).toBe(0));

      expect(await rows(firstDatabase)).toMatchObject({ conversations: 1 });
      expect(await rows(secondDatabase)).toEqual({ conversations: 0, messages: 0 });
      const stored = await localChatBackend(firstDatabase)({
        walletAddress,
        signMessage,
      }).getConversation(queued.conversationId);
      expect(stored?.title).toBe("Untitled chat");
    }
  );
});
