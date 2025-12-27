import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  encryptField,
  decryptField,
  encryptMemoryFields,
  decryptMemoryFields,
  encryptMemoriesBatch,
  decryptMemoriesBatch,
  hasEncryptedFields,
  needsEncryption,
  encryptMemoriesBatchInPlace,
  type MemoryData,
} from "./encryption";
import { requestEncryptionKey, clearAllEncryptionKeys } from "../../../react/useEncryption";
import type { SignMessageFn } from "../../../react/useEncryption";

const TEST_ADDRESS = "0x1234567890123456789012345678901234567890";
const TEST_SIGN_MESSAGE: SignMessageFn = async () => {
  return "0x" + "a".repeat(130);
};

describe("Memory Encryption", () => {
  beforeEach(async () => {
    clearAllEncryptionKeys();
    // Clear rate limit state
    if (typeof window !== "undefined" && window.localStorage) {
      const keys = Object.keys(window.localStorage);
      keys.forEach((key) => {
        if (key.startsWith("rate_limit_")) {
          window.localStorage.removeItem(key);
        }
      });
    }
    // Ensure encryption key is available
    await requestEncryptionKey(TEST_ADDRESS, TEST_SIGN_MESSAGE);
  });

  describe("encryptField", () => {
    it("should encrypt a plain text field", async () => {
      const plaintext = "This is a secret memory";
      const encrypted = await encryptField(plaintext, TEST_ADDRESS);

      expect(encrypted).toBeDefined();
      expect(encrypted).not.toBe(plaintext);
      expect(encrypted).toMatch(/^enc:v2:/);
    });

    it("should return already encrypted values unchanged", async () => {
      const plaintext = "This is a secret memory";
      const encrypted1 = await encryptField(plaintext, TEST_ADDRESS);
      const encrypted2 = await encryptField(encrypted1, TEST_ADDRESS);

      expect(encrypted2).toBe(encrypted1);
    });

    it("should handle empty strings", async () => {
      const encrypted = await encryptField("", TEST_ADDRESS);
      expect(encrypted).toBe("");
    });

    it("should throw error for values exceeding MAX_FIELD_SIZE", async () => {
      const largeValue = "a".repeat(1024 * 1024 + 1); // 1MB + 1 byte

      await expect(encryptField(largeValue, TEST_ADDRESS)).rejects.toThrow(
        "too large"
      );
    });
  });

  describe("decryptField", () => {
    it("should decrypt an encrypted field", async () => {
      const plaintext = "This is a secret memory";
      const encrypted = await encryptField(plaintext, TEST_ADDRESS);
      const decrypted = await decryptField(encrypted, TEST_ADDRESS);

      expect(decrypted).toBe(plaintext);
    });

    it("should return plain text unchanged", async () => {
      const plaintext = "This is not encrypted";
      const result = await decryptField(plaintext, TEST_ADDRESS);

      expect(result).toBe(plaintext);
    });

    it("should handle v1 encrypted values", async () => {
      // Create a v1 encrypted value (simulate old format)
      const plaintext = "Old encrypted memory";
      const encrypted = await encryptField(plaintext, TEST_ADDRESS);
      
      // Manually create v1 format for testing - need to extract payload first
      const payload = encrypted.replace(/^enc:v2:/, "");
      const v1Encrypted = `enc:v1:${payload}`;
      
      const decrypted = await decryptField(v1Encrypted, TEST_ADDRESS, TEST_SIGN_MESSAGE);
      expect(decrypted).toBe(plaintext);
    });

    it("should handle legacy encrypted values", async () => {
      const plaintext = "Legacy encrypted memory";
      const encrypted = await encryptField(plaintext, TEST_ADDRESS);
      
      // Manually create legacy format for testing - need to extract payload first
      const payload = encrypted.replace(/^enc:v2:/, "");
      const legacyEncrypted = `enc:${payload}`;
      
      const decrypted = await decryptField(legacyEncrypted, TEST_ADDRESS, TEST_SIGN_MESSAGE);
      expect(decrypted).toBe(plaintext);
    });

    it("should return placeholder on decryption failure", async () => {
      // Use a properly formatted but invalid encrypted value
      const invalidEncrypted = "enc:v2:" + "a".repeat(100);
      
      const decrypted = await decryptField(invalidEncrypted, TEST_ADDRESS);
      expect(decrypted).toBe("[Decryption Failed]");
    });
  });

  describe("encryptMemoryFields", () => {
    it("should encrypt sensitive fields only", async () => {
      const memory: MemoryData = {
        value: "Secret value",
        rawEvidence: "Secret evidence",
        key: "secret-key",
        namespace: "secret-namespace",
        embedding: [0.1, 0.2, 0.3], // Should not be encrypted
      };

      const encrypted = await encryptMemoryFields(memory, TEST_ADDRESS);

      expect(String(encrypted.value)).toMatch(/^enc:v2:/);
      expect(String(encrypted.rawEvidence)).toMatch(/^enc:v2:/);
      expect(String(encrypted.key)).toMatch(/^enc:v2:/);
      expect(String(encrypted.namespace)).toMatch(/^enc:v2:/);
      expect(encrypted.embedding).toEqual([0.1, 0.2, 0.3]); // Unchanged
    });

    it("should handle empty fields", async () => {
      const memory: MemoryData = {
        value: "",
        rawEvidence: "Evidence",
      };

      const encrypted = await encryptMemoryFields(memory, TEST_ADDRESS);

      expect(encrypted.value).toBe("");
      expect(encrypted.rawEvidence).toMatch(/^enc:v2:/);
    });
  });

  describe("decryptMemoryFields", () => {
    it("should decrypt encrypted memory fields", async () => {
      const memory: MemoryData = {
        value: "Secret value",
        rawEvidence: "Secret evidence",
      };

      const encrypted = await encryptMemoryFields(memory, TEST_ADDRESS);
      const decrypted = await decryptMemoryFields(encrypted, TEST_ADDRESS);

      expect(decrypted.value).toBe("Secret value");
      expect(decrypted.rawEvidence).toBe("Secret evidence");
    });

    it("should encrypt unencrypted fields when found", async () => {
      const memory: MemoryData = {
        uniqueId: "test-id",
        value: "Unencrypted value",
        rawEvidence: "Unencrypted evidence",
      };

      const updateMemory = vi.fn(async (id: string, data: Partial<MemoryData>) => {
        expect(id).toBe("test-id");
        expect(data.value).toMatch(/^enc:v2:/);
        expect(data.rawEvidence).toMatch(/^enc:v2:/);
      });

      const decrypted = await decryptMemoryFields(
        memory,
        TEST_ADDRESS,
        TEST_SIGN_MESSAGE,
        updateMemory
      );

      expect(decrypted.value).toBe("Unencrypted value");
      expect(decrypted.rawEvidence).toBe("Unencrypted evidence");
      expect(updateMemory).toHaveBeenCalledTimes(2); // value and rawEvidence
    });

    it("should migrate v1 encrypted fields to v2", async () => {
      const memory: MemoryData = {
        uniqueId: "test-id",
        value: "Old encrypted value",
      };

      // Encrypt and manually convert to v1 format
      const encrypted = await encryptMemoryFields(memory, TEST_ADDRESS);
      const v1Memory: MemoryData = {
        ...encrypted,
        value: encrypted.value ? encrypted.value.replace(/^enc:v2:/, "enc:v1:") : undefined,
      };

      const updateMemory = vi.fn(async (id: string, data: Partial<MemoryData>) => {
        expect(id).toBe("test-id");
        expect(data.value).toMatch(/^enc:v2:/);
        expect(data.value).not.toMatch(/^enc:v1:/);
      });

      const decrypted = await decryptMemoryFields(
        v1Memory,
        TEST_ADDRESS,
        TEST_SIGN_MESSAGE,
        updateMemory
      );

      expect(decrypted.value).toBe("Old encrypted value");
      expect(updateMemory).toHaveBeenCalled();
    });

    it("should migrate legacy v1 encrypted memory (enc: prefix without version) to v2", async () => {
      const memory: MemoryData = {
        uniqueId: "legacy-memory-id",
        value: "Legacy encrypted memory value",
        rawEvidence: "Legacy encrypted evidence",
        key: "legacy-key",
        namespace: "legacy-namespace",
      };

      // Encrypt the memory first to get valid encrypted payload
      const encrypted = await encryptMemoryFields(memory, TEST_ADDRESS);
      
      // Convert to legacy format (enc: prefix without version number)
      // Extract the payload (remove enc:v2: prefix)
      const legacyMemory: MemoryData = {
        ...encrypted,
        value: encrypted.value ? `enc:${encrypted.value.replace(/^enc:v2:/, "")}` : undefined,
        rawEvidence: encrypted.rawEvidence ? `enc:${encrypted.rawEvidence.replace(/^enc:v2:/, "")}` : undefined,
        key: encrypted.key ? `enc:${encrypted.key.replace(/^enc:v2:/, "")}` : undefined,
        namespace: encrypted.namespace ? `enc:${encrypted.namespace.replace(/^enc:v2:/, "")}` : undefined,
      };

      // Verify legacy format (no version in prefix)
      expect(legacyMemory.value).toMatch(/^enc:/);
      expect(legacyMemory.value).not.toMatch(/^enc:v/);

      const updateMemory = vi.fn(async (id: string, data: Partial<MemoryData>) => {
        expect(id).toBe("legacy-memory-id");
        // All migrated fields should have v2 prefix
        if (data.value) {
          expect(data.value).toMatch(/^enc:v2:/);
          expect(data.value).not.toMatch(/^enc:$/);
        }
        if (data.rawEvidence) {
          expect(data.rawEvidence).toMatch(/^enc:v2:/);
        }
        if (data.key) {
          expect(data.key).toMatch(/^enc:v2:/);
        }
        if (data.namespace) {
          expect(data.namespace).toMatch(/^enc:v2:/);
        }
      });

      const decrypted = await decryptMemoryFields(
        legacyMemory,
        TEST_ADDRESS,
        TEST_SIGN_MESSAGE,
        updateMemory
      );

      // Verify all fields are decrypted correctly
      expect(decrypted.value).toBe("Legacy encrypted memory value");
      expect(decrypted.rawEvidence).toBe("Legacy encrypted evidence");
      expect(decrypted.key).toBe("legacy-key");
      expect(decrypted.namespace).toBe("legacy-namespace");

      // Verify migration callback was called for all encrypted fields
      expect(updateMemory).toHaveBeenCalled();
      const callCount = updateMemory.mock.calls.length;
      // Should be called for each encrypted field that was migrated
      expect(callCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe("encryptMemoriesBatch", () => {
    it("should encrypt multiple memories in parallel", async () => {
      const memories: MemoryData[] = [
        { value: "Memory 1" },
        { value: "Memory 2" },
        { value: "Memory 3" },
      ];

      const encrypted = await encryptMemoriesBatch(memories, TEST_ADDRESS);

      expect(encrypted).toHaveLength(3);
      encrypted.forEach((mem) => {
        expect(mem.value).toMatch(/^enc:v2:/);
      });
    });
  });

  describe("decryptMemoriesBatch", () => {
    it("should decrypt multiple memories in parallel", async () => {
      const memories: MemoryData[] = [
        { value: "Memory 1" },
        { value: "Memory 2" },
        { value: "Memory 3" },
      ];

      const encrypted = await encryptMemoriesBatch(memories, TEST_ADDRESS);
      const decrypted = await decryptMemoriesBatch(encrypted, TEST_ADDRESS);

      expect(decrypted).toHaveLength(3);
      expect(decrypted[0].value).toBe("Memory 1");
      expect(decrypted[1].value).toBe("Memory 2");
      expect(decrypted[2].value).toBe("Memory 3");
    });
  });

  describe("hasEncryptedFields", () => {
    it("should return true if memory has encrypted fields", async () => {
      const encrypted = await encryptField("test", TEST_ADDRESS);
      const memory: MemoryData = {
        value: encrypted,
      };

      expect(hasEncryptedFields(memory)).toBe(true);
    });

    it("should return false if memory has no encrypted fields", () => {
      const memory: MemoryData = {
        value: "Plain text",
      };

      expect(hasEncryptedFields(memory)).toBe(false);
    });
  });

  describe("needsEncryption", () => {
    it("should return true if memory needs encryption", () => {
      const memory: MemoryData = {
        value: "Plain text",
      };

      expect(needsEncryption(memory)).toBe(true);
    });

    it("should return false if memory is already encrypted", async () => {
      const encrypted = await encryptField("test", TEST_ADDRESS);
      const memory: MemoryData = {
        value: encrypted,
      };

      expect(needsEncryption(memory)).toBe(false);
    });
  });

  describe("encryptMemoriesBatchInPlace", () => {
    it("should encrypt memories and update them in place", async () => {
      const memories = [
        {
          uniqueId: "id1",
          type: "fact",
          namespace: "test",
          key: "key1",
          value: "Value 1",
          rawEvidence: "Evidence 1",
          confidence: 0.9,
          pii: false,
        },
        {
          uniqueId: "id2",
          type: "fact",
          namespace: "test",
          key: "key2",
          value: "Value 2",
          rawEvidence: "Evidence 2",
          confidence: 0.8,
          pii: false,
        },
      ];

      const updateFn = vi.fn(async (id: string, data: MemoryData) => {
        expect(data.value).toMatch(/^enc:v2:/);
        expect(data.rawEvidence).toMatch(/^enc:v2:/);
      });

      const result = await encryptMemoriesBatchInPlace(
        memories,
        TEST_ADDRESS,
        updateFn
      );

      expect(result.success).toBe(2);
      expect(result.failed).toHaveLength(0);
      expect(updateFn).toHaveBeenCalledTimes(2);
    });

    it("should handle encryption failures gracefully", async () => {
      const memories = [
        {
          uniqueId: "id1",
          type: "fact",
          namespace: "test",
          key: "key1",
          value: "a".repeat(1024 * 1024 + 1), // Too large
          rawEvidence: "Evidence 1",
          confidence: 0.9,
          pii: false,
        },
      ];

      const updateFn = vi.fn();

      const result = await encryptMemoriesBatchInPlace(
        memories,
        TEST_ADDRESS,
        updateFn
      );

      expect(result.success).toBe(0);
      expect(result.failed).toContain("id1");
    });
  });
});

