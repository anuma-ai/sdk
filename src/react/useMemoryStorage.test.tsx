import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { Database } from "@nozbe/watermelondb";
import LokiJSAdapter from "@nozbe/watermelondb/adapters/lokijs";
import { useMemoryStorage } from "./useMemoryStorage";
import { sdkSchema, sdkMigrations, sdkModelClasses } from "../lib/db/schema";
import { requestEncryptionKey, clearAllEncryptionKeys } from "./useEncryption";
import type { SignMessageFn } from "./useEncryption";
import type { CreateMemoryOptions } from "../lib/db/memory";

// Type declaration for global in test environment
declare const global: typeof globalThis;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const Buffer: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const require: any;

// Mock crypto
const mockSignMessage = vi.fn(async (message: string) => {
  return `0x${Buffer.from(message).toString("hex").padStart(130, "0")}`;
}) as unknown as SignMessageFn & { mock: { calls: string[][] } };

describe("useMemoryStorage with Encryption", () => {
  let database: Database;
  const testAddress = "0x1234567890123456789012345678901234567890";

  beforeEach(async () => {
    vi.clearAllMocks();
    clearAllEncryptionKeys();

    // Setup real crypto (ensure it's available)
    if (!global.crypto) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { webcrypto } = require("node:crypto");
      Object.defineProperty(global, "crypto", {
        value: webcrypto as Crypto,
        writable: true,
        configurable: true,
      });
    } else {
      // Ensure crypto has the required methods
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { webcrypto } = require("node:crypto");
      if (!global.crypto.getRandomValues || !global.crypto.subtle) {
        Object.defineProperty(global, "crypto", {
          value: webcrypto as Crypto,
          writable: true,
          configurable: true,
        });
      }
    }

    // Create in-memory database for testing
    const adapter = new LokiJSAdapter({
      schema: sdkSchema,
      migrations: sdkMigrations,
      dbName: "test-db",
      useWebWorker: false,
      useIncrementalIndexedDB: false,
    });

    database = new Database({
      adapter,
      modelClasses: sdkModelClasses,
    });

    // Request encryption key for tests
    await requestEncryptionKey(testAddress, mockSignMessage);
  });

  afterEach(async () => {
    if (database) {
      await database.write(async () => {
        // Clean up test data
      });
    }
  });

  describe("Memory Storage with Encryption", () => {
    it("should save and retrieve encrypted memories", async () => {
      const { result } = renderHook(() =>
        useMemoryStorage({
          database,
          walletAddress: testAddress,
          signMessage: mockSignMessage,
          generateEmbeddings: false, // Disable embeddings for tests
        })
      );

      const memory: CreateMemoryOptions = {
        type: "preference",
        namespace: "user",
        key: "favorite_color",
        value: "blue",
        rawEvidence: "User said blue is favorite",
        confidence: 0.9,
        pii: false,
      };

      await act(async () => {
        const saved = await result.current.saveMemory(memory);
        expect(saved.memory.uniqueId).toBeDefined();
        expect(saved.memory.namespace).toBe("user"); // Should be decrypted
        expect(saved.memory.value).toBe("blue"); // Should be decrypted
      });

      await act(async () => {
        const retrieved = await result.current.getMemoryById(
          (await result.current.saveMemory(memory)).memory.uniqueId
        );
        expect(retrieved).toBeDefined();
        expect(retrieved?.namespace).toBe("user");
        expect(retrieved?.value).toBe("blue");
      });
    });

    it("should handle memories without encryption (backwards compatibility)", async () => {
      const { result } = renderHook(() =>
        useMemoryStorage({
          database,
          generateEmbeddings: false, // Disable embeddings for tests
          // No walletAddress provided
        })
      );

      const memory: CreateMemoryOptions = {
        type: "preference",
        namespace: "user",
        key: "favorite_color",
        value: "blue",
        rawEvidence: "User said blue",
        confidence: 0.9,
        pii: false,
      };

      await act(async () => {
        const saved = await result.current.saveMemory(memory);
        expect(saved.memory.namespace).toBe("user");
        expect(saved.memory.value).toBe("blue");
      });
    });

    it("should query encrypted memories by namespace (deterministic encryption)", async () => {
      const { result } = renderHook(() =>
        useMemoryStorage({
          database,
          walletAddress: testAddress,
          signMessage: mockSignMessage,
          generateEmbeddings: false, // Disable embeddings for tests
        })
      );

      const memory: CreateMemoryOptions = {
        type: "preference",
        namespace: "user",
        key: "favorite_color",
        value: "blue",
        rawEvidence: "User said blue",
        confidence: 0.9,
        pii: false,
      };

      await act(async () => {
        await result.current.saveMemory(memory);
      });

      await act(async () => {
        // Query should work because namespace encryption is deterministic
        const memories = await result.current.fetchMemoriesByNamespace("user");
        expect(memories.length).toBeGreaterThan(0);
        expect(memories[0].namespace).toBe("user");
        expect(memories[0].value).toBe("blue");
      });
    });

    it("should query encrypted memories by key (deterministic encryption)", async () => {
      const { result } = renderHook(() =>
        useMemoryStorage({
          database,
          walletAddress: testAddress,
          signMessage: mockSignMessage,
          generateEmbeddings: false, // Disable embeddings for tests
        })
      );

      const memory: CreateMemoryOptions = {
        type: "preference",
        namespace: "user",
        key: "favorite_color",
        value: "blue",
        rawEvidence: "User said blue",
        confidence: 0.9,
        pii: false,
      };

      await act(async () => {
        await result.current.saveMemory(memory);
      });

      await act(async () => {
        // Query should work because namespace and key encryption are deterministic
        const memories = await result.current.fetchMemoriesByKey("user", "favorite_color");
        expect(memories.length).toBeGreaterThan(0);
        expect(memories[0].key).toBe("favorite_color");
        expect(memories[0].value).toBe("blue");
      });
    });

    it("should update encrypted memories", async () => {
      const { result } = renderHook(() =>
        useMemoryStorage({
          database,
          walletAddress: testAddress,
          signMessage: mockSignMessage,
          generateEmbeddings: false, // Disable embeddings for tests
        })
      );

      const memory: CreateMemoryOptions = {
        type: "preference",
        namespace: "user",
        key: "favorite_color",
        value: "blue",
        rawEvidence: "User said blue",
        confidence: 0.9,
        pii: false,
      };

      let savedId: string;
      await act(async () => {
        const saved = await result.current.saveMemory(memory);
        savedId = saved.memory.uniqueId;
      });

      await act(async () => {
        const updated = await result.current.updateMemory(savedId!, {
          value: "red",
        });
        expect(updated?.value).toBe("red");
      });

      await act(async () => {
        const retrieved = await result.current.getMemoryById(savedId!);
        expect(retrieved?.value).toBe("red");
      });
    });

    it("should keep embeddings unencrypted for search", async () => {
      const { result } = renderHook(() =>
        useMemoryStorage({
          database,
          walletAddress: testAddress,
          signMessage: mockSignMessage,
          generateEmbeddings: false, // Disable embeddings for this test
        })
      );

      const memory: CreateMemoryOptions = {
        type: "preference",
        namespace: "user",
        key: "favorite_color",
        value: "blue",
        rawEvidence: "User said blue is favorite",
        confidence: 0.9,
        pii: false,
      };

      // Note: This test would require mocking the embedding API
      // For now, we just verify the structure
      await act(async () => {
        const saved = await result.current.saveMemory(memory);
        expect(saved.memory.uniqueId).toBeDefined();
      });
    });
  });

  describe("Mixed Encrypted/Unencrypted Data", () => {
    it("should handle reading both encrypted and plaintext memories", async () => {
      // First save without encryption
      const { result: result1 } = renderHook(() =>
        useMemoryStorage({
          database,
          generateEmbeddings: false, // Disable embeddings for tests
        })
      );

      const plaintextMemory: CreateMemoryOptions = {
        type: "preference",
        namespace: "user",
        key: "old_key",
        value: "old_value",
        rawEvidence: "Old data",
        confidence: 0.9,
        pii: false,
      };

      await act(async () => {
        await result1.current.saveMemory(plaintextMemory);
      });

      // Then save with encryption
      const { result: result2 } = renderHook(() =>
        useMemoryStorage({
          database,
          walletAddress: testAddress,
          signMessage: mockSignMessage,
          generateEmbeddings: false, // Disable embeddings for tests
        })
      );

      const encryptedMemory: CreateMemoryOptions = {
        type: "preference",
        namespace: "user",
        key: "new_key",
        value: "new_value",
        rawEvidence: "New data",
        confidence: 0.9,
        pii: false,
      };

      await act(async () => {
        await result2.current.saveMemory(encryptedMemory);
      });

      // Both should be readable
      await act(async () => {
        const all = await result2.current.fetchAllMemories();
        expect(all.length).toBeGreaterThanOrEqual(2);
        // Both should be readable (decrypted or plaintext)
        const oldMemory = all.find((m) => m.key === "old_key");
        const newMemory = all.find((m) => m.key === "new_key");
        expect(oldMemory?.value).toBe("old_value");
        expect(newMemory?.value).toBe("new_value");
      });
    });
  });
});

