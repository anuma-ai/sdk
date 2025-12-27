import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  encryptField,
  decryptField,
  encryptMessageFields,
  decryptMessageFields,
  encryptMessagesBatch,
  decryptMessagesBatch,
  hasEncryptedFields,
  needsEncryption,
  type MessageData,
} from "./encryption";
import { requestEncryptionKey, clearAllEncryptionKeys } from "../../../react/useEncryption";
import type { SignMessageFn } from "../../../react/useEncryption";
import { getTestSignMessage } from "../../../test-utils/signature";

const TEST_ADDRESS = "0x1234567890123456789012345678901234567890";
// Use mock signature by default (bypasses rate limiting)
const TEST_SIGN_MESSAGE = getTestSignMessage();

describe("Chat Message Encryption", () => {
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
    it("should encrypt message content", async () => {
      const plaintext = "This is a secret message";
      const encrypted = await encryptField(plaintext, TEST_ADDRESS);

      expect(encrypted).toBeDefined();
      expect(encrypted).not.toBe(plaintext);
      expect(encrypted).toMatch(/^enc:v2:/);
    });

    it("should return already encrypted values unchanged", async () => {
      const plaintext = "This is a secret message";
      const encrypted1 = await encryptField(plaintext, TEST_ADDRESS);
      const encrypted2 = await encryptField(encrypted1, TEST_ADDRESS);

      expect(encrypted2).toBe(encrypted1);
    });
  });

  describe("decryptField", () => {
    it("should decrypt an encrypted message", async () => {
      const plaintext = "This is a secret message";
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
      const plaintext = "Old encrypted message";
      const encrypted = await encryptField(plaintext, TEST_ADDRESS);
      const v1Encrypted = encrypted.replace(/^enc:v2:/, "enc:v1:");

      const decrypted = await decryptField(v1Encrypted, TEST_ADDRESS, TEST_SIGN_MESSAGE);
      expect(decrypted).toBe(plaintext);
    });
  });

  describe("encryptMessageFields", () => {
    it("should encrypt content field only", async () => {
      const message: MessageData = {
        content: "Secret message content",
        role: "user", // Should not be encrypted
        vector: [0.1, 0.2, 0.3], // Should not be encrypted
      };

      const encrypted = await encryptMessageFields(message, TEST_ADDRESS);

      expect(encrypted.content).toMatch(/^enc:v2:/);
      expect(encrypted.role).toBe("user");
      expect(encrypted.vector).toEqual([0.1, 0.2, 0.3]);
    });

    it("should handle empty content", async () => {
      const message: MessageData = {
        content: "",
      };

      const encrypted = await encryptMessageFields(message, TEST_ADDRESS);

      expect(encrypted.content).toBe("");
    });
  });

  describe("decryptMessageFields", () => {
    it("should decrypt encrypted message fields", async () => {
      const message: MessageData = {
        content: "Secret message content",
      };

      const encrypted = await encryptMessageFields(message, TEST_ADDRESS);
      const decrypted = await decryptMessageFields(encrypted, TEST_ADDRESS);

      expect(decrypted.content).toBe("Secret message content");
    });

    it("should encrypt unencrypted fields when found", async () => {
      const message: MessageData = {
        uniqueId: "test-id",
        content: "Unencrypted message",
      };

      const updateMessage = vi.fn(async (id: string, data: Partial<MessageData>) => {
        expect(id).toBe("test-id");
        expect(data.content).toMatch(/^enc:v2:/);
      });

      const decrypted = await decryptMessageFields(
        message,
        TEST_ADDRESS,
        TEST_SIGN_MESSAGE,
        updateMessage
      );

      expect(decrypted.content).toBe("Unencrypted message");
      expect(updateMessage).toHaveBeenCalled();
    });

    it("should migrate v1 encrypted fields to v2", async () => {
      const message: MessageData = {
        uniqueId: "test-id",
        content: "Old encrypted message",
      };

      const encrypted = await encryptMessageFields(message, TEST_ADDRESS);
      const v1Message: MessageData = {
        ...encrypted,
        content: encrypted.content ? encrypted.content.replace(/^enc:v2:/, "enc:v1:") : undefined,
      };

      const updateMessage = vi.fn(async (id: string, data: Partial<MessageData>) => {
        expect(id).toBe("test-id");
        expect(data.content).toMatch(/^enc:v2:/);
        expect(data.content).not.toMatch(/^enc:v1:/);
      });

      const decrypted = await decryptMessageFields(
        v1Message,
        TEST_ADDRESS,
        TEST_SIGN_MESSAGE,
        updateMessage
      );

      expect(decrypted.content).toBe("Old encrypted message");
      expect(updateMessage).toHaveBeenCalled();
    });
  });

  describe("encryptMessagesBatch", () => {
    it("should encrypt multiple messages in parallel", async () => {
      const messages: MessageData[] = [
        { content: "Message 1" },
        { content: "Message 2" },
        { content: "Message 3" },
      ];

      const encrypted = await encryptMessagesBatch(messages, TEST_ADDRESS);

      expect(encrypted).toHaveLength(3);
      encrypted.forEach((msg) => {
        expect(msg.content).toMatch(/^enc:v2:/);
      });
    });
  });

  describe("decryptMessagesBatch", () => {
    it("should decrypt multiple messages in parallel", async () => {
      const messages: MessageData[] = [
        { content: "Message 1" },
        { content: "Message 2" },
        { content: "Message 3" },
      ];

      const encrypted = await encryptMessagesBatch(messages, TEST_ADDRESS);
      const decrypted = await decryptMessagesBatch(encrypted, TEST_ADDRESS);

      expect(decrypted).toHaveLength(3);
      expect(decrypted[0].content).toBe("Message 1");
      expect(decrypted[1].content).toBe("Message 2");
      expect(decrypted[2].content).toBe("Message 3");
    });
  });

  describe("hasEncryptedFields", () => {
    it("should return true if message has encrypted fields", async () => {
      const encrypted = await encryptField("test", TEST_ADDRESS);
      const message: MessageData = {
        content: encrypted,
      };

      expect(hasEncryptedFields(message)).toBe(true);
    });

    it("should return false if message has no encrypted fields", () => {
      const message: MessageData = {
        content: "Plain text",
      };

      expect(hasEncryptedFields(message)).toBe(false);
    });
  });

  describe("needsEncryption", () => {
    it("should return true if message needs encryption", () => {
      const message: MessageData = {
        content: "Plain text",
      };

      expect(needsEncryption(message)).toBe(true);
    });

    it("should return false if message is already encrypted", async () => {
      const encrypted = await encryptField("test", TEST_ADDRESS);
      const message: MessageData = {
        content: encrypted,
      };

      expect(needsEncryption(message)).toBe(false);
    });
  });
});

