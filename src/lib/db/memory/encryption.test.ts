import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  isEncrypted,
  encryptField,
  decryptField,
  encryptMemoryFields,
  decryptMemoryFields,
  encryptNamespaceForQuery,
  encryptKeyForQuery,
} from "./encryption";
import { requestEncryptionKey, clearAllEncryptionKeys } from "../../../react/useEncryption";
import type { SignMessageFn } from "../../../react/useEncryption";
import type { CreateMemoryOptions, MemoryItem } from "./types";

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

  describe("encryptField", () => {
    it("should encrypt a field and add prefix", async () => {
      await requestEncryptionKey(testAddress, mockSignMessage);
      
      const plaintext = "sensitive data";
      const encrypted = await encryptField(plaintext, testAddress, mockSignMessage);
      
      expect(encrypted).toMatch(/^enc:v2:/);
      expect(encrypted).not.toBe(plaintext);
      expect(isEncrypted(encrypted)).toBe(true);
    });

    it("should return empty string as-is", async () => {
      await requestEncryptionKey(testAddress, mockSignMessage);
      
      const encrypted = await encryptField("", testAddress, mockSignMessage);
      expect(encrypted).toBe("");
    });

    it("should return plaintext if wallet address not provided", async () => {
      const plaintext = "test";
      const result = await encryptField(plaintext, "", undefined);
      expect(result).toBe(plaintext);
      expect(isEncrypted(result)).toBe(false);
    });
  });

  describe("decryptField", () => {
    it("should decrypt an encrypted field", async () => {
      await requestEncryptionKey(testAddress, mockSignMessage);
      
      const plaintext = "sensitive data";
      const encrypted = await encryptField(plaintext, testAddress, mockSignMessage);
      const decrypted = await decryptField(encrypted, testAddress);
      
      expect(decrypted).toBe(plaintext);
    });

    it("should return plaintext as-is if not encrypted", async () => {
      await requestEncryptionKey(testAddress, mockSignMessage);
      
      const plaintext = "not encrypted";
      const result = await decryptField(plaintext, testAddress);
      expect(result).toBe(plaintext);
    });

    it("should return original value if decryption fails", async () => {
      await requestEncryptionKey(testAddress, mockSignMessage);
      
      const invalidEncrypted = "enc:v2:invalidhexdata";
      const result = await decryptField(invalidEncrypted, testAddress);
      // Should return the original value on error
      expect(result).toBe(invalidEncrypted);
    });
  });

  describe("encryptMemoryFields", () => {
    it("should encrypt all sensitive fields", async () => {
      await requestEncryptionKey(testAddress, mockSignMessage);
      
      const memory: CreateMemoryOptions = {
        type: "preference",
        namespace: "user",
        key: "favorite_color",
        value: "blue",
        rawEvidence: "User said blue is their favorite",
        confidence: 0.9,
        pii: false,
      };

      const encrypted = await encryptMemoryFields(memory, testAddress, mockSignMessage);
      
      expect(isEncrypted(encrypted.namespace)).toBe(true);
      expect(isEncrypted(encrypted.key)).toBe(true);
      expect(isEncrypted(encrypted.value)).toBe(true);
      expect(isEncrypted(encrypted.rawEvidence)).toBe(true);
      expect(encrypted.type).toBe(memory.type);
      expect(encrypted.confidence).toBe(memory.confidence);
      expect(encrypted.pii).toBe(memory.pii);
    });

    it("should return original memory if wallet address not provided", async () => {
      const memory: CreateMemoryOptions = {
        type: "preference",
        namespace: "user",
        key: "favorite_color",
        value: "blue",
        rawEvidence: "User said blue",
        confidence: 0.9,
        pii: false,
      };

      const result = await encryptMemoryFields(memory, "", undefined);
      expect(result).toEqual(memory);
    });
  });

  describe("decryptMemoryFields", () => {
    it("should decrypt all encrypted fields", async () => {
      await requestEncryptionKey(testAddress, mockSignMessage);
      
      const memory: CreateMemoryOptions = {
        type: "preference",
        namespace: "user",
        key: "favorite_color",
        value: "blue",
        rawEvidence: "User said blue",
        confidence: 0.9,
        pii: false,
      };

      const encrypted = await encryptMemoryFields(memory, testAddress, mockSignMessage);
      const decrypted = await decryptMemoryFields(encrypted, testAddress);
      
      expect(decrypted.namespace).toBe(memory.namespace);
      expect(decrypted.key).toBe(memory.key);
      expect(decrypted.value).toBe(memory.value);
      expect(decrypted.rawEvidence).toBe(memory.rawEvidence);
    });

    it("should return original memory if wallet address not provided", async () => {
      const memory: CreateMemoryOptions = {
        type: "preference",
        namespace: "user",
        key: "favorite_color",
        value: "blue",
        rawEvidence: "User said blue",
        confidence: 0.9,
        pii: false,
      };

      const result = await decryptMemoryFields(memory, undefined);
      expect(result).toEqual(memory);
    });

    it("should handle mixed encrypted/plaintext fields", async () => {
      await requestEncryptionKey(testAddress, mockSignMessage);
      
      const memory = {
        type: "preference" as const,
        namespace: "enc:v2:encrypted",
        key: "plaintext_key",
        value: "enc:v2:encrypted_value",
        rawEvidence: "plaintext_evidence",
        confidence: 0.9,
        pii: false,
      };

      const decrypted = await decryptMemoryFields(memory, testAddress);
      // Encrypted fields should be attempted to decrypt, plaintext should remain
      expect(decrypted.namespace).toBeDefined();
      expect(decrypted.key).toBe("plaintext_key");
      expect(decrypted.rawEvidence).toBe("plaintext_evidence");
    });
  });

  describe("encryptNamespaceForQuery", () => {
    it("should encrypt namespace for querying", async () => {
      await requestEncryptionKey(testAddress, mockSignMessage);
      
      const namespace = "user";
      const encrypted = await encryptNamespaceForQuery(namespace, testAddress, mockSignMessage);
      
      expect(isEncrypted(encrypted)).toBe(true);
      expect(encrypted).not.toBe(namespace);
    });

    it("should return plaintext if wallet address not provided", async () => {
      const namespace = "user";
      const result = await encryptNamespaceForQuery(namespace, "", undefined);
      expect(result).toBe(namespace);
    });
  });

  describe("encryptKeyForQuery", () => {
    it("should encrypt key for querying", async () => {
      await requestEncryptionKey(testAddress, mockSignMessage);
      
      const key = "favorite_color";
      const encrypted = await encryptKeyForQuery(key, testAddress, mockSignMessage);
      
      expect(isEncrypted(encrypted)).toBe(true);
      expect(encrypted).not.toBe(key);
    });

    it("should return plaintext if wallet address not provided", async () => {
      const key = "favorite_color";
      const result = await encryptKeyForQuery(key, "", undefined);
      expect(result).toBe(key);
    });
  });

  describe("Deterministic Encryption", () => {
    it("should produce same ciphertext for same plaintext (namespace)", async () => {
      await requestEncryptionKey(testAddress, mockSignMessage);
      
      const namespace = "user";
      const encrypted1 = await encryptNamespaceForQuery(namespace, testAddress, mockSignMessage);
      const encrypted2 = await encryptNamespaceForQuery(namespace, testAddress, mockSignMessage);
      
      // Same plaintext should produce same ciphertext (deterministic)
      expect(encrypted1).toBe(encrypted2);
      expect(isEncrypted(encrypted1)).toBe(true);
    });

    it("should produce same ciphertext for same plaintext (key)", async () => {
      await requestEncryptionKey(testAddress, mockSignMessage);
      
      const key = "favorite_color";
      const encrypted1 = await encryptKeyForQuery(key, testAddress, mockSignMessage);
      const encrypted2 = await encryptKeyForQuery(key, testAddress, mockSignMessage);
      
      // Same plaintext should produce same ciphertext (deterministic)
      expect(encrypted1).toBe(encrypted2);
      expect(isEncrypted(encrypted1)).toBe(true);
    });

    it("should produce different ciphertext for different plaintext", async () => {
      await requestEncryptionKey(testAddress, mockSignMessage);
      
      const encrypted1 = await encryptNamespaceForQuery("user1", testAddress, mockSignMessage);
      const encrypted2 = await encryptNamespaceForQuery("user2", testAddress, mockSignMessage);
      
      // Different plaintext should produce different ciphertext
      expect(encrypted1).not.toBe(encrypted2);
    });

    it("should use deterministic encryption for all fields in encryptMemoryFields", async () => {
      await requestEncryptionKey(testAddress, mockSignMessage);
      
      const memory: CreateMemoryOptions = {
        type: "preference",
        namespace: "user",
        key: "favorite_color",
        value: "blue",
        rawEvidence: "User said blue",
        confidence: 0.9,
        pii: false,
      };

      // Encrypt same memory twice
      const encrypted1 = await encryptMemoryFields(memory, testAddress, mockSignMessage);
      const encrypted2 = await encryptMemoryFields(memory, testAddress, mockSignMessage);
      
      // All fields (namespace, key, value, rawEvidence) should be deterministically encrypted
      expect(encrypted1.namespace).toBe(encrypted2.namespace);
      expect(encrypted1.key).toBe(encrypted2.key);
      expect(encrypted1.value).toBe(encrypted2.value);
      expect(encrypted1.rawEvidence).toBe(encrypted2.rawEvidence);
    });
  });

  describe("Backwards Compatibility", () => {
    it("should handle plaintext memories (old data)", async () => {
      await requestEncryptionKey(testAddress, mockSignMessage);
      
      const plaintextMemory: MemoryItem = {
        type: "preference",
        namespace: "user",
        key: "favorite_color",
        value: "blue",
        rawEvidence: "User said blue",
        confidence: 0.9,
        pii: false,
      };

      const decrypted = await decryptMemoryFields(plaintextMemory, testAddress);
      expect(decrypted.namespace).toBe("user");
      expect(decrypted.key).toBe("favorite_color");
      expect(decrypted.value).toBe("blue");
    });
  });

  describe("Double Encryption Prevention", () => {
    it("should not double-encrypt already encrypted values", async () => {
      await requestEncryptionKey(testAddress, mockSignMessage);
      
      const memory: CreateMemoryOptions = {
        type: "preference",
        namespace: "user",
        key: "favorite_color",
        value: "blue",
        rawEvidence: "User said blue",
        confidence: 0.9,
        pii: false,
      };

      // Encrypt once
      const encrypted1 = await encryptMemoryFields(memory, testAddress, mockSignMessage);
      
      // Try to encrypt again (simulating the updateMemoryOp scenario)
      const encrypted2 = await encryptMemoryFields(encrypted1, testAddress, mockSignMessage);
      
      // Should be the same (not double-encrypted)
      expect(encrypted2.namespace).toBe(encrypted1.namespace);
      expect(encrypted2.key).toBe(encrypted1.key);
      expect(encrypted2.value).toBe(encrypted1.value);
      expect(encrypted2.rawEvidence).toBe(encrypted1.rawEvidence);
      
      // Should still be decryptable
      const decrypted = await decryptMemoryFields(encrypted2, testAddress);
      expect(decrypted.namespace).toBe(memory.namespace);
      expect(decrypted.key).toBe(memory.key);
      expect(decrypted.value).toBe(memory.value);
      expect(decrypted.rawEvidence).toBe(memory.rawEvidence);
    });

    it("should decrypt with signMessage when key not in memory", async () => {
      // Clear all keys to simulate key not in memory
      clearAllEncryptionKeys();
      
      const memory: CreateMemoryOptions = {
        type: "preference",
        namespace: "user",
        key: "favorite_color",
        value: "blue",
        rawEvidence: "User said blue",
        confidence: 0.9,
        pii: false,
      };

      // Encrypt with signMessage (this will request the key)
      const encrypted = await encryptMemoryFields(memory, testAddress, mockSignMessage);
      
      // Clear keys again
      clearAllEncryptionKeys();
      
      // Decrypt with signMessage (should request key and succeed)
      const decrypted = await decryptMemoryFields(encrypted, testAddress, mockSignMessage);
      
      expect(decrypted.namespace).toBe(memory.namespace);
      expect(decrypted.key).toBe(memory.key);
      expect(decrypted.value).toBe(memory.value);
      expect(decrypted.rawEvidence).toBe(memory.rawEvidence);
    });
  });
});

