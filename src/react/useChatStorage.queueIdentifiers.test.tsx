import { Database } from "@nozbe/watermelondb";
import LokiJSAdapter from "@nozbe/watermelondb/adapters/lokijs";
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useChatStorage as useExpoChatStorage } from "../expo/useChatStorage";
import { runToolLoop } from "../lib/chat/toolLoop";
import { queueManager } from "../lib/db/queue";
import { sdkMigrations, sdkModelClasses, sdkSchema } from "../lib/db/schema";
import { useChatStorage as useReactChatStorage } from "./useChatStorage";
import { clearEncryptionKey, hasEncryptionKey, seedEncryptionKeys } from "./useEncryption";

vi.mock("../lib/chat/toolLoop", async (importOriginal) => {
  const original = await importOriginal<typeof import("../lib/chat/toolLoop")>();
  return { ...original, runToolLoop: vi.fn() };
});

const walletAddress = "0x1234567890123456789012345678901234567890";

function makeDatabase(): Database {
  const adapter = new LokiJSAdapter({
    schema: sdkSchema,
    migrations: sdkMigrations,
    useWebWorker: false,
    useIncrementalIndexedDB: false,
    dbName: `queue-identifiers-${Math.random().toString(36).slice(2)}`,
  });
  return new Database({ adapter, modelClasses: sdkModelClasses });
}

describe.each([
  ["react", useReactChatStorage],
  ["expo", useExpoChatStorage],
] as const)("useChatStorage queue identifiers (%s)", (_platform, useChatStorage) => {
  beforeEach(() => {
    clearEncryptionKey(walletAddress);
    queueManager.clear(walletAddress);
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Network unavailable"));
    vi.mocked(runToolLoop).mockResolvedValue({
      data: {
        id: "response-1",
        model: "test-model",
        object: "response",
        output: [
          {
            type: "message",
            role: "assistant",
            content: [{ type: "output_text", text: "The tool returned a result." }],
            status: "completed",
          },
        ],
      },
      error: null,
      autoExecutedToolResults: [{ name: "lookup", result: { value: "found" } }],
    });
  });

  afterEach(() => {
    cleanup();
    queueManager.clear(walletAddress);
    clearEncryptionKey(walletAddress);
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it.each([false, true])(
    "preserves identifiers across queued and direct turns with explicit IDs: %s",
    async (explicitIds) => {
      const database = makeDatabase();
      const signMessage = vi.fn().mockRejectedValue(new Error("Encryption key unavailable"));
      const { result } = renderHook(() =>
        useChatStorage({
          database,
          walletAddress,
          signMessage,
          getToken: () => Promise.resolve("token"),
          autoEmbedMessages: false,
          autoFlushOnKeyAvailable: false,
        })
      );

      const conversation = await act(async () =>
        result.current.createConversation(
          explicitIds ? { conversationId: "conversation-explicit" } : undefined
        )
      );
      const sent = await act(async () =>
        result.current.sendMessage({
          messages: [{ role: "user", content: [{ type: "text", text: "Find a value." }] }],
          model: "test-model",
          assistantUniqueId: explicitIds ? "assistant-explicit" : undefined,
        })
      );

      expect(sent.error).toBeNull();
      if (!("toolResultsMessage" in sent) || !sent.toolResultsMessage) {
        throw new Error("The send result has no tool result message");
      }
      expect(sent.userMessage).toBeDefined();
      expect(sent.assistantMessage).toBeDefined();
      expect(sent.toolResultsMessage).toBeDefined();

      const followUpParentId = sent.toolResultsMessage.uniqueId;
      const followUp = await act(async () =>
        result.current.sendMessage({
          messages: [{ role: "user", content: [{ type: "text", text: "Find another value." }] }],
          model: "test-model",
          parentMessageId: followUpParentId,
        })
      );

      expect(followUp.error).toBeNull();
      if (!("toolResultsMessage" in followUp) || !followUp.toolResultsMessage) {
        throw new Error("The follow-up result has no tool result message");
      }
      expect(hasEncryptionKey(walletAddress)).toBe(false);
      expect(await database.get("conversations").query().fetch()).toHaveLength(0);
      expect(await database.get("history").query().fetch()).toHaveLength(0);
      expect(result.current.queueStatus.pending).toBe(7);

      const syntheticMessages = [
        sent.userMessage,
        sent.assistantMessage,
        sent.toolResultsMessage,
        followUp.userMessage,
        followUp.assistantMessage,
        followUp.toolResultsMessage,
      ];
      expect(new Set(syntheticMessages.map((message) => message.uniqueId)).size).toBe(6);
      for (let index = 1; index < syntheticMessages.length; index++) {
        expect(syntheticMessages[index].parentMessageId).toBe(
          syntheticMessages[index - 1].uniqueId
        );
      }
      const queuedOperations = queueManager.getOperations(walletAddress);
      expect(queuedOperations).toMatchObject([
        {
          type: "createConversation",
          payload: { conversationId: conversation.conversationId },
        },
        ...syntheticMessages.map((message) => ({
          type: "createMessage",
          payload: {
            uniqueId: message.uniqueId,
            conversationId: conversation.conversationId,
            parentMessageId: message.parentMessageId,
          },
        })),
      ]);
      if (explicitIds) {
        expect(conversation.conversationId).toBe("conversation-explicit");
        expect(sent.assistantMessage.uniqueId).toBe("assistant-explicit");
      }

      seedEncryptionKeys(walletAddress, { legacy: "11".repeat(32), current: "22".repeat(32) });
      const flushed = await act(async () => result.current.flushQueue());

      expect(flushed.failed).toEqual([]);
      expect(flushed.succeeded).toHaveLength(7);
      expect(result.current.queueStatus.pending).toBe(0);
      const storedConversations = await result.current.getConversations();
      expect(storedConversations.map((stored) => stored.conversationId)).toEqual([
        conversation.conversationId,
      ]);
      const storedMessages = await result.current.getMessages(conversation.conversationId);
      expect(storedMessages).toHaveLength(6);
      for (const synthetic of syntheticMessages) {
        const stored = storedMessages.find((message) => message.uniqueId === synthetic.uniqueId);
        expect(stored).toMatchObject({
          uniqueId: synthetic.uniqueId,
          conversationId: conversation.conversationId,
          content: synthetic.content,
        });
        expect(stored!.parentMessageId ?? null).toBe(synthetic.parentMessageId ?? null);
      }

      const directParentId = followUp.toolResultsMessage.uniqueId;
      const direct = await act(async () =>
        result.current.sendMessage({
          messages: [{ role: "user", content: [{ type: "text", text: "Find the final value." }] }],
          model: "test-model",
          parentMessageId: directParentId,
        })
      );

      expect(direct.error).toBeNull();
      if (!("toolResultsMessage" in direct) || !direct.toolResultsMessage) {
        throw new Error("The direct result has no tool result message");
      }
      expect(direct.userMessage.parentMessageId).toBe(directParentId);
      expect(direct.assistantMessage.parentMessageId).toBe(direct.userMessage.uniqueId);
      expect(direct.toolResultsMessage.parentMessageId).toBe(direct.assistantMessage.uniqueId);
      expect(result.current.queueStatus.pending).toBe(0);
      const allMessages = await result.current.getMessages(conversation.conversationId);
      expect(allMessages).toHaveLength(9);
      for (const message of [
        direct.userMessage,
        direct.assistantMessage,
        direct.toolResultsMessage,
      ]) {
        expect(allMessages.find((stored) => stored.uniqueId === message.uniqueId)).toMatchObject({
          conversationId: conversation.conversationId,
          content: message.content,
          parentMessageId: message.parentMessageId,
        });
      }
    }
  );
});
