import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
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
        text: "User likes pizza on Fridays",
      };

      await act(async () => {
        const saved = await result.current.saveMemory(memory);
        expect(saved.id).toBeDefined();
        expect(saved.text).toBe("User likes pizza on Fridays"); // Should be decrypted
      });

      await act(async () => {
        const saved = await result.current.saveMemory(memory);
        const retrieved = await result.current.getMemoryById(saved.id);
        expect(retrieved).toBeDefined();
        expect(retrieved?.text).toBe("User likes pizza on Fridays");
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
        text: "User prefers tea over coffee",
      };

      await act(async () => {
        const saved = await result.current.saveMemory(memory);
        expect(saved.text).toBe("User prefers tea over coffee");
      });
    });

    it("should fetch all memories", async () => {
      const { result } = renderHook(() =>
        useMemoryStorage({
          database,
          walletAddress: testAddress,
          signMessage: mockSignMessage,
          generateEmbeddings: false, // Disable embeddings for tests
        })
      );

      const memory1: CreateMemoryOptions = {
        text: "User likes pizza",
      };

      const memory2: CreateMemoryOptions = {
        text: "User works at Acme Corp",
      };

      await act(async () => {
        await result.current.saveMemory(memory1);
        await result.current.saveMemory(memory2);
      });

      await act(async () => {
        const all = await result.current.fetchAllMemories();
        expect(all.length).toBeGreaterThanOrEqual(2);
        const texts = all.map((m) => m.text);
        expect(texts).toContain("User likes pizza");
        expect(texts).toContain("User works at Acme Corp");
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
        text: "User likes blue",
      };

      let savedId: string;
      await act(async () => {
        const saved = await result.current.saveMemory(memory);
        savedId = saved.id;
      });

      await act(async () => {
        const updated = await result.current.updateMemory(savedId!, {
          text: "User likes red",
        });
        expect(updated?.text).toBe("User likes red");
      });

      await act(async () => {
        const retrieved = await result.current.getMemoryById(savedId!);
        expect(retrieved?.text).toBe("User likes red");
      });
    });

    it("should save memory with conversationId", async () => {
      const { result } = renderHook(() =>
        useMemoryStorage({
          database,
          walletAddress: testAddress,
          signMessage: mockSignMessage,
          generateEmbeddings: false, // Disable embeddings for tests
        })
      );

      const memory: CreateMemoryOptions = {
        text: "User mentioned this in conversation",
        conversationId: "conv-123",
      };

      await act(async () => {
        const saved = await result.current.saveMemory(memory);
        expect(saved.id).toBeDefined();
        expect(saved.conversationId).toBe("conv-123");
      });
    });

    it("should remove memory by ID", async () => {
      const { result } = renderHook(() =>
        useMemoryStorage({
          database,
          walletAddress: testAddress,
          signMessage: mockSignMessage,
          generateEmbeddings: false, // Disable embeddings for tests
        })
      );

      const memory: CreateMemoryOptions = {
        text: "User likes pizza",
      };

      let savedId: string;
      await act(async () => {
        const saved = await result.current.saveMemory(memory);
        savedId = saved.id;
      });

      await act(async () => {
        await result.current.removeMemoryById(savedId!);
      });

      await act(async () => {
        const retrieved = await result.current.getMemoryById(savedId!);
        expect(retrieved).toBeNull();
      });
    });

    it("should clear all memories", async () => {
      const { result } = renderHook(() =>
        useMemoryStorage({
          database,
          walletAddress: testAddress,
          signMessage: mockSignMessage,
          generateEmbeddings: false, // Disable embeddings for tests
        })
      );

      await act(async () => {
        await result.current.saveMemory({ text: "Memory 1" });
        await result.current.saveMemory({ text: "Memory 2" });
      });

      await act(async () => {
        await result.current.clearMemories();
      });

      await act(async () => {
        const all = await result.current.fetchAllMemories();
        expect(all.length).toBe(0);
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
        text: "Old plaintext memory",
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
        text: "New encrypted memory",
      };

      await act(async () => {
        await result2.current.saveMemory(encryptedMemory);
      });

      // Both should be readable
      await act(async () => {
        const all = await result2.current.fetchAllMemories();
        expect(all.length).toBeGreaterThanOrEqual(2);
        const texts = all.map((m) => m.text);
        expect(texts).toContain("Old plaintext memory");
        expect(texts).toContain("New encrypted memory");
      });
    });
  });

  describe("Multiple Memories", () => {
    it("should save multiple memories at once", async () => {
      const { result } = renderHook(() =>
        useMemoryStorage({
          database,
          walletAddress: testAddress,
          signMessage: mockSignMessage,
          generateEmbeddings: false, // Disable embeddings for tests
        })
      );

      const memories: CreateMemoryOptions[] = [
        { text: "User likes pizza" },
        { text: "User works remotely" },
        { text: "User has a dog named Max" },
      ];

      await act(async () => {
        const saved = await result.current.saveMemories(memories);
        expect(saved.length).toBe(3);
      });

      await act(async () => {
        const all = await result.current.fetchAllMemories();
        expect(all.length).toBeGreaterThanOrEqual(3);
        const texts = all.map((m) => m.text);
        expect(texts).toContain("User likes pizza");
        expect(texts).toContain("User works remotely");
        expect(texts).toContain("User has a dog named Max");
      });
    });
  });
});
