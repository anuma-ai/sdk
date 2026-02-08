import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  makeSyntheticStoredMessage,
  makeSyntheticStoredConversation,
} from "./operations";
import type { CreateMessageOptions, CreateConversationOptions } from "./types";
import { QueueManager } from "../queue/manager";
import type { QueueEncryptionContext, OperationExecutor } from "../queue/types";
import type { SignMessageFn } from "../../../react/useEncryption";

const testAddress = "0x1234567890123456789012345678901234567890";
const mockSignMessage = vi.fn(async () => "0xmocksignature") as unknown as SignMessageFn;

const mockEncryptionContext: QueueEncryptionContext = {
  walletAddress: testAddress,
  signMessage: mockSignMessage,
};

describe("Synthetic Constructors", () => {
  describe("makeSyntheticStoredMessage", () => {
    it("should create a valid StoredMessage from CreateMessageOptions", () => {
      const opts: CreateMessageOptions = {
        conversationId: "conv_123",
        role: "user",
        content: "Hello, world!",
        model: "gpt-4o",
      };

      const result = makeSyntheticStoredMessage(opts);

      expect(result.uniqueId).toMatch(/^queued_/);
      expect(result.messageId).toBe(-1);
      expect(result.conversationId).toBe("conv_123");
      expect(result.role).toBe("user");
      expect(result.content).toBe("Hello, world!");
      expect(result.model).toBe("gpt-4o");
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
    });

    it("should preserve optional fields", () => {
      const opts: CreateMessageOptions = {
        conversationId: "conv_123",
        role: "assistant",
        content: "Hi there!",
        model: "gpt-4o",
        sources: [{ title: "Source 1", url: "https://example.com" }],
        responseDuration: 1.5,
        wasStopped: true,
        thinking: "Let me think...",
      };

      const result = makeSyntheticStoredMessage(opts);

      expect(result.sources).toEqual([{ title: "Source 1", url: "https://example.com" }]);
      expect(result.responseDuration).toBe(1.5);
      expect(result.wasStopped).toBe(true);
      expect(result.thinking).toBe("Let me think...");
    });

    it("should generate unique IDs for each call", () => {
      const opts: CreateMessageOptions = {
        conversationId: "conv_123",
        role: "user",
        content: "test",
      };

      const result1 = makeSyntheticStoredMessage(opts);
      const result2 = makeSyntheticStoredMessage(opts);

      expect(result1.uniqueId).not.toBe(result2.uniqueId);
    });
  });

  describe("makeSyntheticStoredConversation", () => {
    it("should create a valid StoredConversation with provided options", () => {
      const opts: CreateConversationOptions = {
        conversationId: "conv_test",
        title: "My Chat",
        projectId: "proj_123",
      };

      const result = makeSyntheticStoredConversation(opts);

      expect(result.uniqueId).toMatch(/^queued_/);
      expect(result.conversationId).toBe("conv_test");
      expect(result.title).toBe("My Chat");
      expect(result.projectId).toBe("proj_123");
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
      expect(result.isDeleted).toBe(false);
    });

    it("should generate a conversation ID if not provided", () => {
      const result = makeSyntheticStoredConversation();

      expect(result.conversationId).toMatch(/^conv_/);
      expect(result.title).toBe("New Conversation");
    });

    it("should use default title when provided", () => {
      const result = makeSyntheticStoredConversation(undefined, "Custom Default");

      expect(result.title).toBe("Custom Default");
    });

    it("should prefer opts.title over defaultTitle", () => {
      const opts: CreateConversationOptions = {
        title: "Explicit Title",
      };

      const result = makeSyntheticStoredConversation(opts, "Default Title");

      expect(result.title).toBe("Explicit Title");
    });
  });
});

describe("Queue Integration with Synthetic Constructors", () => {
  let manager: QueueManager;

  beforeEach(() => {
    manager = new QueueManager();
  });

  it("should queue createMessage and flush with executor", async () => {
    const msgOpts: CreateMessageOptions = {
      conversationId: "conv_1",
      role: "user",
      content: "Hello",
    };

    // Queue the operation
    const queueId = manager.queueOperation(
      testAddress,
      "createMessage",
      msgOpts
    );
    expect(queueId).toBeTruthy();
    expect(manager.getStatus(testAddress).pending).toBe(1);

    // Create synthetic message for immediate return
    const synthetic = makeSyntheticStoredMessage(msgOpts);
    expect(synthetic.content).toBe("Hello");
    expect(synthetic.uniqueId).toMatch(/^queued_/);

    // Flush with a mock executor
    const executedOps: string[] = [];
    const executor: OperationExecutor = async (op) => {
      executedOps.push(op.type);
    };

    const result = await manager.flush(mockEncryptionContext, executor);

    expect(result.succeeded.length).toBe(1);
    expect(result.failed.length).toBe(0);
    expect(executedOps).toEqual(["createMessage"]);
    expect(manager.getStatus(testAddress).pending).toBe(0);
  });

  it("should flush operations in dependency order", async () => {
    // Queue conversation first
    const convQueueId = manager.queueOperation(
      testAddress,
      "createConversation",
      { title: "Test Conv" }
    );

    // Queue message depending on conversation
    const msgQueueId = manager.queueOperation(
      testAddress,
      "createMessage",
      { conversationId: "conv_1", role: "user", content: "Hello" },
      convQueueId ? [convQueueId] : []
    );

    expect(manager.getStatus(testAddress).pending).toBe(2);

    // Flush and verify order
    const executedOrder: string[] = [];
    const executor: OperationExecutor = async (op) => {
      executedOrder.push(op.type);
    };

    const result = await manager.flush(mockEncryptionContext, executor);

    expect(result.succeeded.length).toBe(2);
    // Conversation should be flushed before message
    expect(executedOrder[0]).toBe("createConversation");
    expect(executedOrder[1]).toBe("createMessage");
  });

  it("should handle pre-wallet pending buffer transfer", () => {
    // Simulate the pendingOpsRef pattern
    const pendingOps: Array<{
      type: "createMessage" | "createConversation";
      payload: Record<string, any>;
      dependencies: string[];
    }> = [];

    // Buffer ops when walletAddress is undefined
    pendingOps.push({
      type: "createConversation",
      payload: { title: "Buffered Conv" },
      dependencies: [],
    });
    pendingOps.push({
      type: "createMessage",
      payload: { conversationId: "conv_1", role: "user", content: "Buffered msg" },
      dependencies: [],
    });

    expect(pendingOps.length).toBe(2);

    // Transfer to QueueManager when walletAddress becomes available
    for (const op of pendingOps) {
      manager.queueOperation(testAddress, op.type, op.payload, op.dependencies);
    }

    expect(manager.getStatus(testAddress).pending).toBe(2);
    expect(manager.getOperations(testAddress)[0].type).toBe("createConversation");
  });

  it("should return null when queue is full", () => {
    // Fill the queue to max (1000)
    for (let i = 0; i < 1000; i++) {
      manager.queueOperation(testAddress, "createMessage", { i });
    }

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const id = manager.queueOperation(testAddress, "createMessage", { overflow: true });
    expect(id).toBeNull();
    warnSpy.mockRestore();
  });

  it("should create synthetic messages with correct fields for queued assistant messages", () => {
    const opts: CreateMessageOptions = {
      conversationId: "conv_1",
      role: "assistant",
      content: "I can help with that!",
      model: "gpt-4o",
      usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
      responseDuration: 2.5,
      sources: [{ title: "Ref", url: "https://example.com" }],
    };

    const synthetic = makeSyntheticStoredMessage(opts);

    // Verify all fields are passed through correctly
    expect(synthetic.role).toBe("assistant");
    expect(synthetic.content).toBe("I can help with that!");
    expect(synthetic.model).toBe("gpt-4o");
    expect(synthetic.usage).toEqual({ promptTokens: 10, completionTokens: 20, totalTokens: 30 });
    expect(synthetic.responseDuration).toBe(2.5);
    expect(synthetic.sources).toEqual([{ title: "Ref", url: "https://example.com" }]);
    // Synthetic markers
    expect(synthetic.uniqueId).toMatch(/^queued_/);
    expect(synthetic.messageId).toBe(-1);
  });
});
