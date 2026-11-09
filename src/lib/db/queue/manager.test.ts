import { describe, it, expect, beforeEach, vi } from "vitest";
import { QueueManager, topologicalSort } from "./manager";
import type { QueuedOperation, QueueEncryptionContext, OperationExecutor } from "./types";
import type { SignMessageFn } from "../../../react/useEncryption";

const testAddress = "0x1234567890123456789012345678901234567890";

const mockSignMessage = vi.fn(async () => "0xmocksignature") as unknown as SignMessageFn;

const mockEncryptionContext: QueueEncryptionContext = {
  walletAddress: testAddress,
  signMessage: mockSignMessage,
};

describe("QueueManager", () => {
  let manager: QueueManager;

  beforeEach(() => {
    manager = new QueueManager();
  });

  describe("queueOperation", () => {
    it("should add an operation and return an id", () => {
      const id = manager.queueOperation(testAddress, "createMessage", { content: "hello" });
      expect(id).toBeTruthy();
      expect(typeof id).toBe("string");
    });

    it("should track pending operations in status", () => {
      manager.queueOperation(testAddress, "createMessage", { content: "a" });
      manager.queueOperation(testAddress, "createMessage", { content: "b" });

      const status = manager.getStatus(testAddress);
      expect(status.pending).toBe(2);
      expect(status.failed).toBe(0);
      expect(status.isFlushing).toBe(false);
    });

    it("should reject operations when queue is full (1000 limit)", () => {
      for (let i = 0; i < 1000; i++) {
        const id = manager.queueOperation(testAddress, "createMessage", { i });
        expect(id).toBeTruthy();
      }

      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const id = manager.queueOperation(testAddress, "createMessage", { overflow: true });
      expect(id).toBeNull();
      warnSpy.mockRestore();
    });

    it("should isolate queues per wallet", () => {
      const addr2 = "0x0000000000000000000000000000000000000002";

      manager.queueOperation(testAddress, "createMessage", { a: 1 });
      manager.queueOperation(testAddress, "createMessage", { a: 2 });
      manager.queueOperation(addr2, "createMessage", { b: 1 });

      expect(manager.getStatus(testAddress).pending).toBe(2);
      expect(manager.getStatus(addr2).pending).toBe(1);
    });
  });

  describe("getOperations", () => {
    it("should return operations in priority order", () => {
      manager.queueOperation(testAddress, "createMessage", { role: "user" });
      manager.queueOperation(testAddress, "createConversation", { title: "test" });

      const ops = manager.getOperations(testAddress);
      expect(ops.length).toBe(2);
      expect(ops[0].type).toBe("createConversation");
      expect(ops[1].type).toBe("createMessage");
    });

    it("should return empty array for unknown wallet", () => {
      const ops = manager.getOperations("0xunknown0000000000000000000000000000000000");
      expect(ops).toEqual([]);
    });
  });

  describe("removeOperation", () => {
    it("should remove a specific operation", () => {
      const id1 = manager.queueOperation(testAddress, "createMessage", { a: 1 })!;
      manager.queueOperation(testAddress, "createMessage", { a: 2 });

      manager.removeOperation(testAddress, id1);
      expect(manager.getStatus(testAddress).pending).toBe(1);
    });
  });

  describe("clear", () => {
    it("should remove all operations for a wallet", () => {
      manager.queueOperation(testAddress, "createMessage", { a: 1 });
      manager.queueOperation(testAddress, "createMessage", { a: 2 });

      manager.clear(testAddress);
      expect(manager.getStatus(testAddress).pending).toBe(0);
      expect(manager.hasPending(testAddress)).toBe(false);
    });
  });

  describe("hasPending", () => {
    it("should return true when operations exist", () => {
      manager.queueOperation(testAddress, "createMessage", { a: 1 });
      expect(manager.hasPending(testAddress)).toBe(true);
    });

    it("should return false when no operations", () => {
      expect(manager.hasPending(testAddress)).toBe(false);
    });
  });

  describe("flush", () => {
    it("should execute all operations and clear the queue", async () => {
      manager.queueOperation(testAddress, "createConversation", { title: "test" });
      manager.queueOperation(testAddress, "createMessage", { content: "hello" });

      const executor = vi.fn(async () => {});

      const result = await manager.flush(mockEncryptionContext, executor);

      expect(result.succeeded.length).toBe(2);
      expect(result.failed.length).toBe(0);
      expect(result.total).toBe(2);
      expect(executor).toHaveBeenCalledTimes(2);
      expect(manager.hasPending(testAddress)).toBe(false);
    });

    it("should handle executor failures", async () => {
      manager.queueOperation(testAddress, "createMessage", { content: "will fail" });

      const executor = vi.fn(async () => {
        throw new Error("Validation error");
      });

      const result = await manager.flush(mockEncryptionContext, executor);

      expect(result.succeeded.length).toBe(0);
      expect(result.failed.length).toBe(1);
      expect(result.failed[0].error).toBe("Validation error");
      expect(manager.getStatus(testAddress).pending).toBe(0);
      expect(manager.getStatus(testAddress).failed).toBe(1);
    });

    it("should fail dependent operations when parent fails", async () => {
      const parentId = manager.queueOperation(testAddress, "createConversation", {
        title: "test",
      })!;
      manager.queueOperation(testAddress, "createMessage", { content: "depends on conversation" }, [
        parentId,
      ]);

      const executor = vi.fn(async () => {
        throw new Error("Parent failed");
      });

      const result = await manager.flush(mockEncryptionContext, executor);

      expect(result.succeeded.length).toBe(0);
      expect(result.failed.length).toBe(2);
      expect(result.failed[1].error).toBe("Dependency failed");
    });

    it.each(["parent", "later operation"])(
      "executes a child on the next flush when added during the %s",
      async (enqueueDuring) => {
        const parentId = manager.queueOperation(testAddress, "createConversation", {
          title: "test",
        })!;
        const laterId = manager.queueOperation(testAddress, "createMessage", { content: "later" })!;
        let childId: string | null = null;
        const executor = vi.fn<OperationExecutor>(async (op) => {
          if (op.id === (enqueueDuring === "parent" ? parentId : laterId)) {
            childId = manager.queueOperation(testAddress, "createMedia", { name: "child" }, [
              parentId,
            ]);
          }
        });

        const firstResult = await manager.flush(mockEncryptionContext, executor);

        expect(firstResult).toEqual({ succeeded: [parentId, laterId], failed: [], total: 2 });
        expect(childId).not.toBeNull();
        expect(manager.getStatus(testAddress).pending).toBe(1);

        const secondResult = await manager.flush(mockEncryptionContext, executor);

        expect(secondResult).toEqual({ succeeded: [childId], failed: [], total: 1 });
        expect(executor.mock.calls.map(([op]) => op.id)).toEqual([parentId, laterId, childId]);
        expect(manager.hasPending(testAddress)).toBe(false);
      }
    );

    it("keeps unresolved dependencies after a parent succeeds", async () => {
      const parentId = manager.queueOperation(testAddress, "createConversation", {
        title: "test",
      })!;
      const childId = manager.queueOperation(testAddress, "createMessage", { content: "child" }, [
        parentId,
        "missing",
      ])!;
      const executor = vi.fn(async () => {});

      await manager.flush(mockEncryptionContext, executor);
      const result = await manager.flush(mockEncryptionContext, executor);

      expect(result).toEqual({
        succeeded: [],
        failed: [{ id: childId, error: "Dependencies not yet resolved" }],
        total: 1,
      });
      expect(executor).toHaveBeenCalledTimes(1);
      expect(manager.getOperations(testAddress)[0].dependencies).toEqual(["missing"]);
    });

    it("should prevent concurrent flushes", async () => {
      manager.queueOperation(testAddress, "createMessage", { content: "a" });

      let resolveFirst: () => void;
      const firstCallPromise = new Promise<void>((resolve) => {
        resolveFirst = resolve;
      });

      const executor = vi.fn(async () => {
        await firstCallPromise;
      });

      const flush1Promise = manager.flush(mockEncryptionContext, executor);

      const result2 = await manager.flush(mockEncryptionContext, executor);
      expect(result2.total).toBe(0);

      resolveFirst!();
      const result1 = await flush1Promise;
      expect(result1.total).toBe(1);
    });

    it("should return empty result for empty queue", async () => {
      const executor = vi.fn();
      const result = await manager.flush(mockEncryptionContext, executor);

      expect(result.succeeded).toEqual([]);
      expect(result.failed).toEqual([]);
      expect(result.total).toBe(0);
      expect(executor).not.toHaveBeenCalled();
    });
  });

  describe("pause/resume", () => {
    it("executes a dependent child after pause and resume", async () => {
      const parentId = manager.queueOperation(testAddress, "createConversation", {
        title: "test",
      })!;
      const childId = manager.queueOperation(testAddress, "createMessage", { content: "child" }, [
        parentId,
      ])!;
      const executor = vi.fn<OperationExecutor>(async (op) => {
        if (op.id === parentId) {
          manager.pause(testAddress);
        }
      });

      const firstResult = await manager.flush(mockEncryptionContext, executor);

      expect(firstResult).toEqual({ succeeded: [parentId], failed: [], total: 2 });
      expect(manager.getStatus(testAddress)).toMatchObject({ pending: 1, isPaused: true });

      manager.resume(testAddress);
      const secondResult = await manager.flush(mockEncryptionContext, executor);

      expect(secondResult).toEqual({ succeeded: [childId], failed: [], total: 1 });
      expect(executor.mock.calls.map(([op]) => op.id)).toEqual([parentId, childId]);
      expect(manager.hasPending(testAddress)).toBe(false);
    });

    it("should stop flushing mid-way when paused", async () => {
      manager.queueOperation(testAddress, "createMessage", { content: "1" });
      manager.queueOperation(testAddress, "createMessage", { content: "2" });
      manager.queueOperation(testAddress, "createMessage", { content: "3" });

      let callCount = 0;
      const executor = vi.fn(async () => {
        callCount++;
        if (callCount === 1) {
          manager.pause(testAddress);
        }
      });

      const result = await manager.flush(mockEncryptionContext, executor);

      expect(result.succeeded.length).toBe(1);

      manager.resume(testAddress);
      expect(manager.getStatus(testAddress).isPaused).toBe(false);
    });
  });

  describe("onQueueChange", () => {
    it("should notify listeners on queue changes", () => {
      const callback = vi.fn();
      manager.onQueueChange(testAddress, callback);

      manager.queueOperation(testAddress, "createMessage", { a: 1 });
      expect(callback).toHaveBeenCalledTimes(1);

      manager.queueOperation(testAddress, "createMessage", { a: 2 });
      expect(callback).toHaveBeenCalledTimes(2);
    });

    it("should stop notifying after unsubscribe", () => {
      const callback = vi.fn();
      const unsubscribe = manager.onQueueChange(testAddress, callback);

      manager.queueOperation(testAddress, "createMessage", { a: 1 });
      expect(callback).toHaveBeenCalledTimes(1);

      unsubscribe();

      manager.queueOperation(testAddress, "createMessage", { a: 2 });
      expect(callback).toHaveBeenCalledTimes(1);
    });
  });
});

describe("topologicalSort", () => {
  it("should sort operations respecting dependencies", () => {
    const ops: QueuedOperation[] = [
      {
        id: "msg1",
        type: "createMessage",
        walletAddress: testAddress,
        timestamp: 1000,
        priority: 2,
        dependencies: ["conv1"],
        payload: {},
        retryCount: 0,
        maxRetries: 3,
      },
      {
        id: "conv1",
        type: "createConversation",
        walletAddress: testAddress,
        timestamp: 999,
        priority: 0,
        dependencies: [],
        payload: {},
        retryCount: 0,
        maxRetries: 3,
      },
    ];

    const sorted = topologicalSort(ops);
    expect(sorted[0].id).toBe("conv1");
    expect(sorted[1].id).toBe("msg1");
  });

  it("should sort by priority then timestamp for independent operations", () => {
    const ops: QueuedOperation[] = [
      {
        id: "msg2",
        type: "createMessage",
        walletAddress: testAddress,
        timestamp: 2000,
        priority: 2,
        dependencies: [],
        payload: {},
        retryCount: 0,
        maxRetries: 3,
      },
      {
        id: "msg1",
        type: "createMessage",
        walletAddress: testAddress,
        timestamp: 1000,
        priority: 2,
        dependencies: [],
        payload: {},
        retryCount: 0,
        maxRetries: 3,
      },
      {
        id: "conv1",
        type: "createConversation",
        walletAddress: testAddress,
        timestamp: 3000,
        priority: 0,
        dependencies: [],
        payload: {},
        retryCount: 0,
        maxRetries: 3,
      },
    ];

    const sorted = topologicalSort(ops);
    expect(sorted[0].id).toBe("conv1");
    expect(sorted[1].id).toBe("msg1");
    expect(sorted[2].id).toBe("msg2");
  });

  it("should handle empty array", () => {
    expect(topologicalSort([])).toEqual([]);
  });
});
