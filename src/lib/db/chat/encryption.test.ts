import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  isEncrypted,
  encryptField,
  decryptField,
  encryptMessageFields,
  decryptMessageFields,
} from "./encryption";
import { tryDecryptField } from "../encryption-utils";
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

  describe("tryDecryptField", () => {
    it("returns ok:true with the value for plaintext", async () => {
      const result = await tryDecryptField("plaintext value", testAddress);
      expect(result).toEqual({ ok: true, value: "plaintext value" });
    });

    it("returns ok:true for empty values", async () => {
      const result = await tryDecryptField("", testAddress);
      expect(result).toEqual({ ok: true, value: "" });
    });

    it("returns ok:true with the decrypted value on success", async () => {
      await requestEncryptionKey(testAddress, mockSignMessage);
      const encrypted = await encryptField("secret", testAddress, mockSignMessage);

      const result = await tryDecryptField(encrypted, testAddress);
      expect(result).toEqual({ ok: true, value: "secret" });
    });

    it("returns ok:false reason='key-missing' when no key is loaded", async () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      await requestEncryptionKey(testAddress, mockSignMessage);
      const encrypted = await encryptField("secret", testAddress, mockSignMessage);

      // Drop the key so the encrypted value can no longer be decrypted.
      clearAllEncryptionKeys();

      const result = await tryDecryptField(encrypted, testAddress);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toBe("key-missing");
        // Ciphertext is preserved, never coerced to plaintext.
        expect(result.ciphertext).toBe(encrypted);
        expect(isEncrypted(result.ciphertext)).toBe(true);
      }
      warnSpy.mockRestore();
    });

    it("returns ok:false reason='decrypt-failed' when the ciphertext fails to verify", async () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      await requestEncryptionKey(testAddress, mockSignMessage);
      const encrypted = await encryptField("secret", testAddress, mockSignMessage);

      // Tamper the final hex char of the payload: still a valid-length hex
      // ciphertext, but the AES-GCM auth tag no longer verifies. The key IS
      // present, so this is a genuine decrypt failure, not a missing key.
      const payload = encrypted.slice("enc:v3:".length);
      const lastChar = payload.slice(-1);
      const tampered = `enc:v3:${payload.slice(0, -1)}${lastChar === "a" ? "b" : "a"}`;

      const result = await tryDecryptField(tampered, testAddress);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toBe("decrypt-failed");
        expect(result.ciphertext).toBe(tampered);
      }
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
      // Successful decryption must not flag the message.
      expect(decrypted.decryptionFailed).toBeUndefined();
    });

    it("flags decryptionFailed and preserves ciphertext when content can't be decrypted", async () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      await requestEncryptionKey(testAddress, mockSignMessage);

      const encrypted = (await encryptMessageFields(
        { conversationId: "conv-123", role: "assistant" as const, content: "Secret response" },
        testAddress,
        mockSignMessage
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      )) as any;

      const storedMessage: StoredMessage = {
        uniqueId: "msg-123",
        messageId: "msg-123",
        conversationId: "conv-123",
        role: "assistant",
        content: encrypted.content,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Drop the key, then decrypt WITHOUT signMessage — mirrors the chat read
      // path, which has no signMessage and so cannot silently re-derive.
      clearAllEncryptionKeys();
      const decrypted = await decryptMessageFields(storedMessage, testAddress);

      expect(decrypted.decryptionFailed).toBe(true);
      // The ciphertext is left in place — never fabricated or blanked.
      expect(decrypted.content).toBe(encrypted.content);
      expect(isEncrypted(decrypted.content)).toBe(true);
      warnSpy.mockRestore();
    });

    it("flags decryptionFailed when an encrypted JSON field (sources) can't be decrypted", async () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      await requestEncryptionKey(testAddress, mockSignMessage);

      const encrypted = (await encryptMessageFields(
        {
          conversationId: "conv-123",
          role: "assistant" as const,
          content: "plaintext stays readable",
          sources: [{ url: "https://example.com", title: "Secret" }],
        },
        testAddress,
        mockSignMessage
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      )) as any;

      const storedMessage: StoredMessage = {
        uniqueId: "msg-json",
        messageId: "msg-json",
        conversationId: "conv-123",
        role: "assistant",
        content: "plaintext stays readable", // unencrypted, so content decrypts fine
        sources: encrypted.sources,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      clearAllEncryptionKeys();
      const decrypted = await decryptMessageFields(storedMessage, testAddress);

      // The JSON field failed to decrypt → message is flagged and ciphertext stays retryable.
      expect(decrypted.decryptionFailed).toBe(true);
      expect(decrypted.sources).toBe(encrypted.sources);
      expect(isEncrypted(decrypted.sources as unknown as string)).toBe(true);

      await requestEncryptionKey(testAddress, mockSignMessage);
      const retried = await decryptMessageFields(decrypted, testAddress);
      expect(retried.sources).toEqual([{ url: "https://example.com", title: "Secret" }]);
      expect(retried.decryptionFailed).toBeUndefined();
      warnSpy.mockRestore();
    });

    it("clears a stale decryptionFailed flag when a re-run succeeds", async () => {
      await requestEncryptionKey(testAddress, mockSignMessage);

      // Simulate re-running decryption on a message previously flagged as failed
      // (e.g. after the user re-unlocked). Content is plaintext so it succeeds.
      const previouslyFailed: StoredMessage = {
        uniqueId: "msg-retry",
        messageId: "msg-retry",
        conversationId: "conv-123",
        role: "user",
        content: "now readable",
        createdAt: new Date(),
        updatedAt: new Date(),
        decryptionFailed: true,
      };

      const decrypted = await decryptMessageFields(previouslyFailed, testAddress);

      expect(decrypted.content).toBe("now readable");
      expect(decrypted.decryptionFailed).toBeUndefined();
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
  });
});
