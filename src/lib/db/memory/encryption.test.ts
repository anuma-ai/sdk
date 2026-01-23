import { describe, it, expect, beforeEach, vi } from "vitest";
import { isEncrypted, encryptMemoryText, decryptMemoryText } from "./encryption";
import {
  requestEncryptionKey,
  clearAllEncryptionKeys,
} from "../../../react/useEncryption";
import type { SignMessageFn } from "../../../react/useEncryption";

// Type declaration for global in test environment
declare const global: typeof globalThis;

// Node.js globals available in test environment
// These are deliberately typed as 'any' because:
// 1. They're Node.js-specific globals not available in browser/TypeScript lib types
// 2. They're only used in test setup code, not in production logic
// 3. Using 'any' here is safer than incorrect type assertions that could hide real issues
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const require: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const Buffer: any;

// Mock crypto for deterministic testing
const mockSignMessage = vi.fn(async (message: string) => {
  return `0x${Buffer.from(message).toString("hex").padStart(130, "0")}`;
}) as unknown as SignMessageFn & { mock: { calls: string[][] } };

describe("Memory Encryption Utilities", () => {
  const testAddress = "0x1234567890123456789012345678901234567890";

  beforeEach(async () => {
    vi.clearAllMocks();
    clearAllEncryptionKeys();

    // Ensure crypto is available (should be available in Node.js test environment)
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
    it("should return true for encrypted strings with enc:v2: prefix", () => {
      expect(isEncrypted("enc:v2:abc123")).toBe(true);
      expect(isEncrypted("enc:v2:")).toBe(true);
    });

    it("should return false for plaintext strings", () => {
      expect(isEncrypted("plaintext")).toBe(false);
      expect(isEncrypted("")).toBe(false);
      expect(isEncrypted("enc:v1:old")).toBe(false);
    });
  });

  describe("encryptMemoryText", () => {
    it("should encrypt text and add prefix", async () => {
      await requestEncryptionKey(testAddress, mockSignMessage);

      const plaintext = "User likes pizza on Fridays";
      const encrypted = await encryptMemoryText(
        plaintext,
        testAddress,
        mockSignMessage
      );

      expect(encrypted).toMatch(/^enc:v2:/);
      expect(encrypted).not.toBe(plaintext);
      expect(isEncrypted(encrypted)).toBe(true);
    });

    it("should return empty string as-is", async () => {
      await requestEncryptionKey(testAddress, mockSignMessage);

      const encrypted = await encryptMemoryText("", testAddress, mockSignMessage);
      expect(encrypted).toBe("");
    });

    it("should return plaintext if wallet address not provided", async () => {
      const plaintext = "User likes pizza";
      const result = await encryptMemoryText(plaintext, "", undefined);
      expect(result).toBe(plaintext);
      expect(isEncrypted(result)).toBe(false);
    });

    it("should not double-encrypt already encrypted values", async () => {
      await requestEncryptionKey(testAddress, mockSignMessage);

      const plaintext = "User likes pizza";
      const encrypted1 = await encryptMemoryText(
        plaintext,
        testAddress,
        mockSignMessage
      );

      // Try to encrypt again
      const encrypted2 = await encryptMemoryText(
        encrypted1,
        testAddress,
        mockSignMessage
      );

      // Should be the same (not double-encrypted)
      expect(encrypted2).toBe(encrypted1);
    });
  });

  describe("decryptMemoryText", () => {
    it("should decrypt encrypted text", async () => {
      await requestEncryptionKey(testAddress, mockSignMessage);

      const plaintext = "User likes pizza on Fridays";
      const encrypted = await encryptMemoryText(
        plaintext,
        testAddress,
        mockSignMessage
      );
      const decrypted = await decryptMemoryText(encrypted, testAddress);

      expect(decrypted).toBe(plaintext);
    });

    it("should return plaintext as-is if not encrypted", async () => {
      await requestEncryptionKey(testAddress, mockSignMessage);

      const plaintext = "not encrypted";
      const result = await decryptMemoryText(plaintext, testAddress);
      expect(result).toBe(plaintext);
    });

    it("should return original value if decryption fails", async () => {
      await requestEncryptionKey(testAddress, mockSignMessage);

      const invalidEncrypted = "enc:v2:invalidhexdata";
      const result = await decryptMemoryText(invalidEncrypted, testAddress);
      // Should return the original value on error
      expect(result).toBe(invalidEncrypted);
    });

    it("should return old enc: prefix unchanged (pass to client)", async () => {
      await requestEncryptionKey(testAddress, mockSignMessage);

      const oldEncrypted = "enc:oldformatdata";
      const result = await decryptMemoryText(oldEncrypted, testAddress);
      // Should return unchanged - client handles old format
      expect(result).toBe(oldEncrypted);
    });

    it("should return old enc:v1: prefix unchanged (pass to client)", async () => {
      await requestEncryptionKey(testAddress, mockSignMessage);

      const oldEncrypted = "enc:v1:oldformatdata";
      const result = await decryptMemoryText(oldEncrypted, testAddress);
      // Should return unchanged - client handles old format
      expect(result).toBe(oldEncrypted);
    });
  });

  describe("Deterministic Encryption", () => {
    it("should produce same ciphertext for same plaintext", async () => {
      await requestEncryptionKey(testAddress, mockSignMessage);

      const text = "User likes pizza on Fridays";
      const encrypted1 = await encryptMemoryText(
        text,
        testAddress,
        mockSignMessage
      );
      const encrypted2 = await encryptMemoryText(
        text,
        testAddress,
        mockSignMessage
      );

      // Same plaintext should produce same ciphertext (deterministic)
      expect(encrypted1).toBe(encrypted2);
      expect(isEncrypted(encrypted1)).toBe(true);
    });

    it("should produce different ciphertext for different plaintext", async () => {
      await requestEncryptionKey(testAddress, mockSignMessage);

      const encrypted1 = await encryptMemoryText(
        "User likes pizza",
        testAddress,
        mockSignMessage
      );
      const encrypted2 = await encryptMemoryText(
        "User likes sushi",
        testAddress,
        mockSignMessage
      );

      // Different plaintext should produce different ciphertext
      expect(encrypted1).not.toBe(encrypted2);
    });
  });

  describe("Backwards Compatibility", () => {
    it("should handle plaintext memories (old data)", async () => {
      await requestEncryptionKey(testAddress, mockSignMessage);

      const plaintextMemory = "User likes pizza";
      const decrypted = await decryptMemoryText(plaintextMemory, testAddress);
      expect(decrypted).toBe(plaintextMemory);
    });
  });

  describe("Round-trip Encryption", () => {
    it("should successfully encrypt and decrypt memory text", async () => {
      await requestEncryptionKey(testAddress, mockSignMessage);

      const memories = [
        "Charlie likes pizza on Fridays",
        "When traveling Roy likes to go hiking",
        "Denis has been working on the Anuma project focused on the SDK",
        "User prefers concise, direct answers",
        "User is in the PST timezone",
      ];

      for (const memory of memories) {
        const encrypted = await encryptMemoryText(
          memory,
          testAddress,
          mockSignMessage
        );
        expect(isEncrypted(encrypted)).toBe(true);

        const decrypted = await decryptMemoryText(encrypted, testAddress);
        expect(decrypted).toBe(memory);
      }
    });

    it("should decrypt with signMessage when key not in memory", async () => {
      // Clear all keys to simulate key not in memory
      clearAllEncryptionKeys();

      const text = "User likes pizza on Fridays";

      // Encrypt with signMessage (this will request the key)
      const encrypted = await encryptMemoryText(
        text,
        testAddress,
        mockSignMessage
      );

      // Clear keys again
      clearAllEncryptionKeys();

      // Re-request the key (simulating signMessage being called again)
      await requestEncryptionKey(testAddress, mockSignMessage);

      // Decrypt should succeed
      const decrypted = await decryptMemoryText(encrypted, testAddress);
      expect(decrypted).toBe(text);
    });
  });
});
