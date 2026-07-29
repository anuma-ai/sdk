import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  isEncrypted,
  encryptField,
  decryptField,
  encryptMessageFields,
  decryptMessageFields,
} from "./encryption";
import { requestEncryptionKey, clearAllEncryptionKeys } from "../../../react/useEncryption";
import type { SignMessageFn } from "../../../react/useEncryption";
import type { StoredMessage } from "./types";

// Type declaration for global in test environment
declare const global: typeof globalThis;

// Node.js globals available in test environment
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const require: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const Buffer: any;

// Mock crypto for deterministic testing
const mockSignMessage = vi.fn(async (message: string) => {
  return `0x${Buffer.from(message).toString("hex").padStart(130, "0")}`;
}) as unknown as SignMessageFn & { mock: { calls: string[][] } };

describe("Chat Encryption Utilities", () => {
  const testAddress = "0x1234567890123456789012345678901234567890";

  beforeEach(async () => {
    vi.clearAllMocks();
    clearAllEncryptionKeys();

    // Ensure crypto is available
    if (!global.crypto) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { webcrypto } = require("node:crypto");
      Object.defineProperty(global, "crypto", {
        value: webcrypto as Crypto,
        writable: true,
        configurable: true,
      });
    }
  });

  describe("isEncrypted", () => {
    it("should return true for valid enc:v2: encrypted strings", () => {
      const validHex = "a".repeat(56);
      expect(isEncrypted(`enc:v2:${validHex}`)).toBe(true);
    });

    it("should return true for valid enc:v3: encrypted strings", () => {
      const validHex = "b".repeat(56);
      expect(isEncrypted(`enc:v3:${validHex}`)).toBe(true);
    });

    it("should return false for plaintext", () => {
      expect(isEncrypted("hello world")).toBe(false);
      expect(isEncrypted("")).toBe(false);
    });

    it("should return false for prefix with too-short payload", () => {
      expect(isEncrypted("enc:v2:abc123")).toBe(false);
      expect(isEncrypted("enc:v3:abc123")).toBe(false);
    });

    it("should return false for prefix with non-hex payload", () => {
      const nonHex = "g".repeat(56);
      expect(isEncrypted(`enc:v2:${nonHex}`)).toBe(false);
      expect(isEncrypted(`enc:v3:${nonHex}`)).toBe(false);
    });

    it("should return false for enc:v1: prefix (unsupported)", () => {
      const validHex = "a".repeat(56);
      expect(isEncrypted(`enc:v1:${validHex}`)).toBe(false);
    });
  });

  describe("encryptField / decryptField", () => {
    it("should encrypt and decrypt a string field", async () => {
      await requestEncryptionKey(testAddress, mockSignMessage);

      const plaintext = "Hello, this is secret content";
      const encrypted = await encryptField(plaintext, testAddress, mockSignMessage);

      expect(encrypted).not.toBe(plaintext);
      expect(isEncrypted(encrypted)).toBe(true);

      const decrypted = await decryptField(encrypted, testAddress);
      expect(decrypted).toBe(plaintext);
    });

    it("should return empty/falsy values as-is", async () => {
      const result = await encryptField("", testAddress, mockSignMessage);
      expect(result).toBe("");
    });

    it("should skip encryption without address", async () => {
      const result = await encryptField("test", "", mockSignMessage);
      expect(result).toBe("test");
    });

    it("should skip encryption without signMessage", async () => {
      const result = await encryptField("test", testAddress);
      expect(result).toBe("test");
    });

    it("should not double-encrypt already encrypted values", async () => {
      await requestEncryptionKey(testAddress, mockSignMessage);

      const plaintext = "Hello";
      const encrypted = await encryptField(plaintext, testAddress, mockSignMessage);
      const doubleEncrypted = await encryptField(encrypted, testAddress, mockSignMessage);

      // Should be the same - no double encryption
      expect(doubleEncrypted).toBe(encrypted);
    });

    it("should return plaintext if decryption fails", async () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      // Not encrypted, should return as-is
      const result = await decryptField("plaintext value", testAddress);
      expect(result).toBe("plaintext value");

      warnSpy.mockRestore();
    });
  });

  describe("encryptMessageFields", () => {
    it("should encrypt content and thinking fields with v3 prefix", async () => {
      await requestEncryptionKey(testAddress, mockSignMessage);

      const message = {
        conversationId: "conv-123",
        role: "user" as const,
        content: "This is my secret message",
        thinking: "Some internal reasoning",
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const encrypted = (await encryptMessageFields(message, testAddress, mockSignMessage)) as any;

      expect(encrypted.content).not.toBe(message.content);
      expect(isEncrypted(encrypted.content)).toBe(true);
      expect(encrypted.content).toMatch(/^enc:v3:/);
      expect(encrypted.thinking).not.toBe(message.thinking);
      expect(isEncrypted(encrypted.thinking)).toBe(true);
      expect(encrypted.thinking).toMatch(/^enc:v3:/);

      // Non-sensitive fields should be unchanged
      expect(encrypted.conversationId).toBe("conv-123");
      expect(encrypted.role).toBe("user");
    });

    it("should return message as-is without address", async () => {
      const message = {
        conversationId: "conv-123",
        role: "user" as const,
        content: "Hello",
      };

      const result = await encryptMessageFields(message, "", mockSignMessage);
      expect(result).toEqual(message);
    });

    it("should encrypt JSON fields (sources, vector)", async () => {
      await requestEncryptionKey(testAddress, mockSignMessage);

      const message = {
        conversationId: "conv-123",
        role: "assistant" as const,
        content: "response text",
        sources: [{ url: "https://example.com", title: "Example" }],
        vector: [0.1, 0.2, 0.3],
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const encrypted = (await encryptMessageFields(message, testAddress, mockSignMessage)) as any;

      // JSON fields should be encrypted strings
      expect(typeof encrypted.sources).toBe("string");
      expect(isEncrypted(encrypted.sources)).toBe(true);
      expect(typeof encrypted.vector).toBe("string");
      expect(isEncrypted(encrypted.vector)).toBe(true);
    });
  });

  describe("decryptFieldDetailed (#561)", () => {
    it("returns key_missing when only the other version is seeded", async () => {
      clearAllEncryptionKeys();
      const { seedEncryptionKeys } = await import("../../../react/useEncryption");
      seedEncryptionKeys(testAddress, { legacy: "ab".repeat(32) });
      const fakeV3 = `enc:v3:${"a".repeat(64)}`;
      const { decryptFieldDetailed } = await import("../encryption-utils");
      const result = await decryptFieldDetailed(fakeV3, testAddress);
      expect(result.status).toBe("key_missing");
      expect(result.value).toBe(fakeV3);
      expect(result.value).not.toContain("Decryption Failed");
    });

    it("returns auth_mismatch with ciphertext intact when the pinned key is wrong", async () => {
      clearAllEncryptionKeys();
      const { seedEncryptionKeys } = await import("../../../react/useEncryption");
      seedEncryptionKeys(testAddress, { current: "ab".repeat(32) });
      const cipher = `enc:v3:${"b".repeat(64)}`;
      const { decryptFieldDetailed } = await import("../encryption-utils");
      const result = await decryptFieldDetailed(cipher, testAddress);
      expect(result.status).toBe("auth_mismatch");
      expect(result.value).toBe(cipher);
      expect(result.value).not.toContain("Decryption Failed");
    });

    it("refreshEncryptionKeyIfMatches recovers a wrong pinned key without masking ciphertext", async () => {
      await requestEncryptionKey(testAddress, mockSignMessage);
      const cipher = await encryptField("hello-partial", testAddress, mockSignMessage);

      clearAllEncryptionKeys();
      const { seedEncryptionKeys, refreshEncryptionKeyIfMatches, hasEncryptionKey } =
        await import("../../../react/useEncryption");
      // Pin a wrong v3-only key (no v2) — the historical fail-closed shape.
      seedEncryptionKeys(testAddress, { current: "cd".repeat(32) });
      expect(hasEncryptionKey(testAddress, "v2")).toBe(false);
      expect(hasEncryptionKey(testAddress, "v3")).toBe(true);

      const { decryptFieldDetailed } = await import("../encryption-utils");
      expect((await decryptFieldDetailed(cipher, testAddress)).status).toBe("auth_mismatch");

      const refreshed = await refreshEncryptionKeyIfMatches(testAddress, cipher, mockSignMessage);
      expect(refreshed).toBe(true);
      const ok = await decryptFieldDetailed(cipher, testAddress);
      expect(ok.status).toBe("ok");
      expect(ok.value).toBe("hello-partial");
    });

    it("refreshEncryptionKeyIfMatches leaves the store alone when the probe does not match", async () => {
      clearAllEncryptionKeys();
      const { seedEncryptionKeys, refreshEncryptionKeyIfMatches, hasEncryptionKey } =
        await import("../../../react/useEncryption");
      const wrong = "ab".repeat(32);
      seedEncryptionKeys(testAddress, { current: wrong });
      const alienCipher = `enc:v3:${"f".repeat(64)}`;

      const wrongSigner = vi.fn(async () => `0x${"11".repeat(65)}`) as unknown as SignMessageFn;
      const refreshed = await refreshEncryptionKeyIfMatches(testAddress, alienCipher, wrongSigner);
      expect(refreshed).toBe(false);
      // Store still has the original wrong key (not replaced by another wrong derive).
      expect(hasEncryptionKey(testAddress, "v3")).toBe(true);
      const { decryptFieldDetailed } = await import("../encryption-utils");
      expect((await decryptFieldDetailed(alienCipher, testAddress)).status).toBe("auth_mismatch");
    });
  });

  describe("decryptMessageFields", () => {
    it("should decrypt an encrypted message", async () => {
      await requestEncryptionKey(testAddress, mockSignMessage);

      const original = {
        conversationId: "conv-123",
        role: "assistant" as const,
        content: "Secret response",
        thinking: "Internal reasoning",
        sources: [{ url: "https://example.com", title: "Test" }],
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const encrypted = (await encryptMessageFields(original, testAddress, mockSignMessage)) as any;

      // Create a StoredMessage-like object from encrypted data
      const storedMessage: StoredMessage = {
        uniqueId: "msg-123",
        messageId: "msg-123",
        conversationId: "conv-123",
        role: "assistant",
        content: encrypted.content,
        model: "fireworks/accounts/fireworks/models/kimi-k2p5",
        createdAt: new Date(),
        updatedAt: new Date(),
        thinking: encrypted.thinking,
        sources: encrypted.sources,
      };

      const decrypted = await decryptMessageFields(storedMessage, testAddress, mockSignMessage);

      expect(decrypted.content).toBe("Secret response");
      expect(decrypted.thinking).toBe("Internal reasoning");
      expect(decrypted.sources).toEqual([{ url: "https://example.com", title: "Test" }]);
    });

    it("should handle plaintext messages (backwards compatibility)", async () => {
      await requestEncryptionKey(testAddress, mockSignMessage);

      const plaintextMessage: StoredMessage = {
        uniqueId: "msg-old",
        messageId: "msg-old",
        conversationId: "conv-123",
        role: "user",
        content: "This is plaintext from old SDK",
        model: "fireworks/accounts/fireworks/models/kimi-k2p5",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const decrypted = await decryptMessageFields(plaintextMessage, testAddress, mockSignMessage);

      // Should return plaintext as-is
      expect(decrypted.content).toBe("This is plaintext from old SDK");
    });

    it("should return message as-is without address", async () => {
      const message: StoredMessage = {
        uniqueId: "msg-1",
        messageId: "msg-1",
        conversationId: "conv-1",
        role: "user",
        content: "test",
        model: "fireworks/accounts/fireworks/models/kimi-k2p5",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await decryptMessageFields(message);
      expect(result).toEqual(message);
    });

    it("should decrypt v2-prefixed fields (backward compatibility)", async () => {
      await requestEncryptionKey(testAddress, mockSignMessage);

      // Manually create a v2-prefixed encrypted value using the legacy key
      const { encryptData: encryptDataFn, getEncryptionKey: getKeyFn } =
        await import("../../../react/useEncryption");

      // Encrypt with v2 key to simulate old data
      const v2Key = await getKeyFn(testAddress, "v2");
      const plaintext = "v2 encrypted content";
      const plaintextBytes = new TextEncoder().encode(plaintext);
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const encryptedData = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv },
        v2Key,
        plaintextBytes.buffer as ArrayBuffer
      );
      const encryptedBytes = new Uint8Array(encryptedData);
      const combined = new Uint8Array(iv.length + encryptedBytes.length);
      combined.set(iv, 0);
      combined.set(encryptedBytes, iv.length);
      const encryptedHex = Array.from(combined)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      const v2Message: StoredMessage = {
        uniqueId: "msg-v2",
        messageId: "msg-v2",
        conversationId: "conv-123",
        role: "user",
        content: `enc:v2:${encryptedHex}`,
        model: "fireworks/accounts/fireworks/models/kimi-k2p5",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const decrypted = await decryptMessageFields(v2Message, testAddress, mockSignMessage);
      expect(decrypted.content).toBe(plaintext);
    });

    it("self-heals a wrong pinned key when signMessage is provided (#561)", async () => {
      await requestEncryptionKey(testAddress, mockSignMessage);
      const encrypted = (await encryptMessageFields(
        {
          conversationId: "conv-123",
          role: "user" as const,
          content: "recover me",
        },
        testAddress,
        mockSignMessage
      )) as { content: string };

      clearAllEncryptionKeys();
      const { seedEncryptionKeys } = await import("../../../react/useEncryption");
      seedEncryptionKeys(testAddress, { current: "ee".repeat(32) });

      const storedMessage: StoredMessage = {
        uniqueId: "msg-heal",
        messageId: "msg-heal" as unknown as number,
        conversationId: "conv-123",
        role: "user",
        content: encrypted.content,
        model: "test",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const decrypted = await decryptMessageFields(storedMessage, testAddress, mockSignMessage);
      expect(decrypted.content).toBe("recover me");
      expect(decrypted.decryptionStatus).toBeUndefined();
    });

    it("sets decryptionStatus and keeps ciphertext when recovery is impossible (#561)", async () => {
      clearAllEncryptionKeys();
      const { seedEncryptionKeys } = await import("../../../react/useEncryption");
      seedEncryptionKeys(testAddress, { current: "ee".repeat(32) });
      const cipher = `enc:v3:${"c".repeat(64)}`;
      const wrongSigner = vi.fn(async () => `0x${"22".repeat(65)}`) as unknown as SignMessageFn;

      const storedMessage: StoredMessage = {
        uniqueId: "msg-fail",
        messageId: "msg-fail" as unknown as number,
        conversationId: "conv-123",
        role: "user",
        content: cipher,
        model: "test",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const decrypted = await decryptMessageFields(storedMessage, testAddress, wrongSigner);
      expect(decrypted.content).toBe(cipher);
      expect(decrypted.content).not.toContain("Decryption Failed");
      expect(decrypted.decryptionStatus).toBe("auth_mismatch");
    });

    it("sets decryptionStatus when a sibling field fails but content is readable (#828)", async () => {
      await requestEncryptionKey(testAddress, mockSignMessage);
      const encrypted = (await encryptMessageFields(
        {
          conversationId: "conv-123",
          role: "assistant" as const,
          content: "readable content",
          thinking: "secret thinking",
        },
        testAddress,
        mockSignMessage
      )) as { content: string; thinking: string };

      // Corrupt only the thinking ciphertext payload so content still decrypts.
      const badThinking = `enc:v3:${"d".repeat(64)}`;
      const storedMessage: StoredMessage = {
        uniqueId: "msg-sib",
        messageId: "msg-sib" as unknown as number,
        conversationId: "conv-123",
        role: "assistant",
        content: encrypted.content,
        thinking: badThinking,
        model: "test",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // No signMessage — avoid self-heal overwriting; we want the status signal.
      const decrypted = await decryptMessageFields(storedMessage, testAddress);
      expect(decrypted.content).toBe("readable content");
      expect(decrypted.thinking).toBe(badThinking);
      expect(decrypted.decryptionStatus).toBe("auth_mismatch");
    });

    it("dedupes parallel refreshEncryptionKeyIfMatches to a single sign (#828)", async () => {
      await requestEncryptionKey(testAddress, mockSignMessage);
      const cipher = await encryptField("storm-me", testAddress, mockSignMessage);

      clearAllEncryptionKeys();
      const { seedEncryptionKeys, refreshEncryptionKeyIfMatches } =
        await import("../../../react/useEncryption");
      seedEncryptionKeys(testAddress, { current: "ab".repeat(32) });

      let signCalls = 0;
      const countingSigner = vi.fn(async (message: string) => {
        signCalls += 1;
        // Slow sign so concurrent callers overlap on the pending map.
        await new Promise((r) => setTimeout(r, 30));
        return mockSignMessage(message);
      }) as unknown as SignMessageFn;

      const results = await Promise.all([
        refreshEncryptionKeyIfMatches(testAddress, cipher, countingSigner),
        refreshEncryptionKeyIfMatches(testAddress, cipher, countingSigner),
        refreshEncryptionKeyIfMatches(testAddress, cipher, countingSigner),
      ]);

      expect(results).toEqual([true, true, true]);
      expect(signCalls).toBe(1);
    });

    it("requestEncryptionKey does not wipe a seeded key with a divergent signature (#828)", async () => {
      clearAllEncryptionKeys();
      const { seedEncryptionKeys, hasEncryptionKey } = await import("../../../react/useEncryption");

      seedEncryptionKeys(testAddress, { current: "ab".repeat(32) });
      const badSigner = vi.fn(async () => `0x${"33".repeat(65)}`) as unknown as SignMessageFn;
      const ok = await requestEncryptionKey(testAddress, badSigner);
      expect(ok).toBe(false);
      // Store unchanged — still only the wrong seeded current (no legacy filled).
      expect(hasEncryptionKey(testAddress, "v3")).toBe(true);
      expect(hasEncryptionKey(testAddress, "v2")).toBe(false);
      expect(hasEncryptionKey(testAddress)).toBe(true); // default = v3

      // Divergent memo: subsequent calls must not re-sign.
      await requestEncryptionKey(testAddress, badSigner);
      expect(badSigner).toHaveBeenCalledTimes(1);
    });

    it("hasEncryptionKey() without version requires v3, not merely v2 (#828)", async () => {
      clearAllEncryptionKeys();
      const { seedEncryptionKeys, hasEncryptionKey } = await import("../../../react/useEncryption");
      seedEncryptionKeys(testAddress, { legacy: "ab".repeat(32) });
      expect(hasEncryptionKey(testAddress, "v2")).toBe(true);
      expect(hasEncryptionKey(testAddress, "v3")).toBe(false);
      expect(hasEncryptionKey(testAddress)).toBe(false);
    });

    it("refresh memos failed candidates so pagination does not re-sign (#828)", async () => {
      await requestEncryptionKey(testAddress, mockSignMessage);
      const realCipher = await encryptField("alien-target", testAddress, mockSignMessage);

      clearAllEncryptionKeys();
      const { seedEncryptionKeys, refreshEncryptionKeyIfMatches } =
        await import("../../../react/useEncryption");
      seedEncryptionKeys(testAddress, { current: "ab".repeat(32) });

      let signCalls = 0;
      const wrongSigner = vi.fn(async () => {
        signCalls += 1;
        return `0x${"44".repeat(65)}`;
      }) as unknown as SignMessageFn;

      expect(await refreshEncryptionKeyIfMatches(testAddress, realCipher, wrongSigner)).toBe(false);
      expect(await refreshEncryptionKeyIfMatches(testAddress, realCipher, wrongSigner)).toBe(false);
      expect(signCalls).toBe(1);
    });

    it("parallel refresh waiters probe their own ciphertext against shared candidates (#828)", async () => {
      await requestEncryptionKey(testAddress, mockSignMessage);
      const goodCipher = await encryptField("recover-me", testAddress, mockSignMessage);

      // Build an alien probe that the correct signer cannot open.
      const alienSigner = vi.fn(async () => `0x${"55".repeat(65)}`) as unknown as SignMessageFn;
      clearAllEncryptionKeys();
      await requestEncryptionKey(testAddress, alienSigner);
      const alienCipher = await encryptField("alien", testAddress, alienSigner);

      clearAllEncryptionKeys();
      const { seedEncryptionKeys, refreshEncryptionKeyIfMatches, decryptData } =
        await import("../../../react/useEncryption");
      seedEncryptionKeys(testAddress, { current: "ab".repeat(32) });

      let signCalls = 0;
      const countingSigner = vi.fn(async (message: string) => {
        signCalls += 1;
        await new Promise((r) => setTimeout(r, 30));
        return mockSignMessage(message);
      }) as unknown as SignMessageFn;

      // Leader probe misses; waiter probe matches the shared candidates.
      const [leader, waiter] = await Promise.all([
        refreshEncryptionKeyIfMatches(testAddress, alienCipher, countingSigner),
        refreshEncryptionKeyIfMatches(testAddress, goodCipher, countingSigner),
      ]);

      expect(signCalls).toBe(1);
      expect(leader).toBe(false);
      expect(waiter).toBe(true);
      const hex = goodCipher.slice("enc:v3:".length);
      expect(await decryptData(hex, testAddress)).toBe("recover-me");
    });

    it("seedEncryptionKeys rejects non-64-char hex (#828)", async () => {
      clearAllEncryptionKeys();
      const { seedEncryptionKeys } = await import("../../../react/useEncryption");
      expect(() => seedEncryptionKeys(testAddress, { current: "abcd" })).toThrow(/64 hex/);
      expect(() => seedEncryptionKeys(testAddress, { legacy: "zz".repeat(32) })).toThrow(/64 hex/);
    });
  });
});
