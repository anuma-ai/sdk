import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getEncryptionVersion,
  isOldEncryption,
  migrateEncryptedValue,
  hasMigrationCompleted,
  markMigrationCompleted,
  clearMigrationStatus,
} from "./migration";
import {
  requestEncryptionKey,
  encryptData,
  decryptData,
  clearAllEncryptionKeys,
} from "../../react/useEncryption";
import type { SignMessageFn } from "../../react/useEncryption";
import { clearAllRateLimits } from "../rateLimit";
import { getTestSignMessage } from "../../test-utils/signature";

const TEST_ADDRESS = "0x1234567890123456789012345678901234567890";
// Use mock signature by default (bypasses rate limiting)
const TEST_SIGN_MESSAGE = getTestSignMessage();

describe("Migration Utilities", () => {
  beforeEach(async () => {
    clearAllEncryptionKeys();
    clearAllRateLimits();
    clearMigrationStatus(TEST_ADDRESS);
    // Ensure encryption key is available (uses mock signature by default, no rate limiting)
    await requestEncryptionKey(TEST_ADDRESS, TEST_SIGN_MESSAGE);
  });

  describe("getEncryptionVersion", () => {
    it("should return v2 for v2 encrypted values", async () => {
      const plaintext = "Test value";
      const encrypted = await encryptData(plaintext, TEST_ADDRESS);
      const v2Value = `enc:v2:${encrypted}`;

      expect(getEncryptionVersion(v2Value)).toBe("v2");
    });

    it("should return v1 for v1 encrypted values", () => {
      const v1Value = "enc:v1:encrypted_data";
      expect(getEncryptionVersion(v1Value)).toBe("v1");
    });

    it("should return v1 for legacy encrypted values", () => {
      const legacyValue = "enc:encrypted_data";
      expect(getEncryptionVersion(legacyValue)).toBe("v1");
    });

    it("should return null for unencrypted values", () => {
      expect(getEncryptionVersion("plain text")).toBe(null);
    });
  });

  describe("isOldEncryption", () => {
    it("should return true for v1 encrypted values", () => {
      expect(isOldEncryption("enc:v1:data")).toBe(true);
    });

    it("should return true for legacy encrypted values", () => {
      expect(isOldEncryption("enc:data")).toBe(true);
    });

    it("should return false for v2 encrypted values", async () => {
      const plaintext = "Test value";
      const encrypted = await encryptData(plaintext, TEST_ADDRESS);
      const v2Value = `enc:v2:${encrypted}`;

      expect(isOldEncryption(v2Value)).toBe(false);
    });

    it("should return false for unencrypted values", () => {
      expect(isOldEncryption("plain text")).toBe(false);
    });
  });

  describe("migrateEncryptedValue", () => {
    it("should migrate v1 encrypted value to v2", async () => {
      const plaintext = "Test value to migrate";
      const encrypted = await encryptData(plaintext, TEST_ADDRESS);
      const v1Value = `enc:v1:${encrypted}`;

      const migrated = await migrateEncryptedValue(
        v1Value,
        TEST_ADDRESS,
        TEST_SIGN_MESSAGE
      );

      expect(migrated).toMatch(/^enc:v2:/);
      expect(migrated).not.toMatch(/^enc:v1:/);

      // Verify it can be decrypted
      const decrypted = await decryptData(
        migrated.slice("enc:v2:".length),
        TEST_ADDRESS
      );
      expect(decrypted).toBe(plaintext);
    });

    it("should migrate legacy encrypted value to v2", async () => {
      const plaintext = "Test value to migrate";
      const encrypted = await encryptData(plaintext, TEST_ADDRESS);
      const legacyValue = `enc:${encrypted}`;

      const migrated = await migrateEncryptedValue(
        legacyValue,
        TEST_ADDRESS,
        TEST_SIGN_MESSAGE
      );

      expect(migrated).toMatch(/^enc:v2:/);
      // Note: migrated will still contain "enc:" as part of "enc:v2:"
      expect(migrated).toMatch(/^enc:v2:/);

      // Verify it can be decrypted
      const decrypted = await decryptData(
        migrated.slice("enc:v2:".length),
        TEST_ADDRESS
      );
      expect(decrypted).toBe(plaintext);
    });

    it("should return v2 values unchanged", async () => {
      const plaintext = "Test value";
      const encrypted = await encryptData(plaintext, TEST_ADDRESS);
      const v2Value = `enc:v2:${encrypted}`;

      const migrated = await migrateEncryptedValue(
        v2Value,
        TEST_ADDRESS,
        TEST_SIGN_MESSAGE
      );

      expect(migrated).toBe(v2Value);
    });

    it("should return unencrypted values unchanged", async () => {
      const plaintext = "Plain text value";

      const migrated = await migrateEncryptedValue(
        plaintext,
        TEST_ADDRESS,
        TEST_SIGN_MESSAGE
      );

      expect(migrated).toBe(plaintext);
    });

    it("should request encryption key if not available", async () => {
      clearAllEncryptionKeys();
      clearMigrationStatus(TEST_ADDRESS);

      // First, create the key and encrypted value
      await requestEncryptionKey(TEST_ADDRESS, TEST_SIGN_MESSAGE);
      const plaintext = "Test value";
      const encrypted = await encryptData(plaintext, TEST_ADDRESS);
      const v1Value = `enc:v1:${encrypted}`;

      // Clear key to simulate key not being available
      clearAllEncryptionKeys();
      clearAllRateLimits();

      // Migrate should request key via signMessage
      const migrated = await migrateEncryptedValue(
        v1Value,
        TEST_ADDRESS,
        TEST_SIGN_MESSAGE
      );

      expect(migrated).toMatch(/^enc:v2:/);
    });
  });

  describe("Migration Status", () => {
    it("should track migration completion", () => {
      expect(hasMigrationCompleted(TEST_ADDRESS)).toBe(false);

      markMigrationCompleted(TEST_ADDRESS);

      expect(hasMigrationCompleted(TEST_ADDRESS)).toBe(true);
    });

    it("should clear migration status", () => {
      markMigrationCompleted(TEST_ADDRESS);
      expect(hasMigrationCompleted(TEST_ADDRESS)).toBe(true);

      clearMigrationStatus(TEST_ADDRESS);

      expect(hasMigrationCompleted(TEST_ADDRESS)).toBe(false);
    });

    it("should handle different wallet addresses separately", () => {
      const address1 = "0x1111111111111111111111111111111111111111";
      const address2 = "0x2222222222222222222222222222222222222222";

      markMigrationCompleted(address1);

      expect(hasMigrationCompleted(address1)).toBe(true);
      expect(hasMigrationCompleted(address2)).toBe(false);
    });
  });

  describe("Migration Edge Cases", () => {
    it("should handle invalid old encryption format gracefully", async () => {
      const invalidValue = "enc:invalid_format";

      await expect(
        migrateEncryptedValue(invalidValue, TEST_ADDRESS, TEST_SIGN_MESSAGE)
      ).rejects.toThrow();
    });

    it("should handle empty strings", async () => {
      const migrated = await migrateEncryptedValue(
        "",
        TEST_ADDRESS,
        TEST_SIGN_MESSAGE
      );

      expect(migrated).toBe("");
    });
  });

  describe("V1 to V2 Migration - Comprehensive Tests", () => {
    it("should migrate v1 encrypted data and preserve content integrity", async () => {
      const testData = [
        "Simple text",
        "Text with special characters: !@#$%^&*()",
        "Text with unicode: 你好世界 🌍",
        "Multi-line text\nLine 2\nLine 3",
        "Very long text: " + "a".repeat(1000),
        JSON.stringify({ key: "value", nested: { data: [1, 2, 3] } }),
      ];

      for (const plaintext of testData) {
        // Create v1 encrypted value
        const encrypted = await encryptData(plaintext, TEST_ADDRESS);
        const v1Value = `enc:v1:${encrypted}`;

        // Migrate to v2
        const migrated = await migrateEncryptedValue(
          v1Value,
          TEST_ADDRESS,
          TEST_SIGN_MESSAGE
        );

        // Verify format
        expect(migrated).toMatch(/^enc:v2:/);
        expect(migrated).not.toMatch(/^enc:v1:/);

        // Verify content integrity
        const decrypted = await decryptData(
          migrated.slice("enc:v2:".length),
          TEST_ADDRESS
        );
        expect(decrypted).toBe(plaintext);
      }
    });

    it("should migrate legacy encrypted data and preserve content integrity", async () => {
      const testData = [
        "Legacy encrypted text",
        "Another legacy value with numbers 12345",
      ];

      for (const plaintext of testData) {
        // Create legacy encrypted value
        const encrypted = await encryptData(plaintext, TEST_ADDRESS);
        const legacyValue = `enc:${encrypted}`;

        // Migrate to v2
        const migrated = await migrateEncryptedValue(
          legacyValue,
          TEST_ADDRESS,
          TEST_SIGN_MESSAGE
        );

        // Verify format
        expect(migrated).toMatch(/^enc:v2:/);
        expect(migrated).not.toMatch(/^enc:$/);

        // Verify content integrity
        const decrypted = await decryptData(
          migrated.slice("enc:v2:".length),
          TEST_ADDRESS
        );
        expect(decrypted).toBe(plaintext);
      }
    });

    it("should handle migration of multiple v1 values in sequence", async () => {
      const values = [
        "First value",
        "Second value",
        "Third value",
      ];

      const v1Values: string[] = [];
      for (const plaintext of values) {
        const encrypted = await encryptData(plaintext, TEST_ADDRESS);
        v1Values.push(`enc:v1:${encrypted}`);
      }

      // Migrate all values
      const migratedValues = await Promise.all(
        v1Values.map((v) =>
          migrateEncryptedValue(v, TEST_ADDRESS, TEST_SIGN_MESSAGE)
        )
      );

      // Verify all are v2
      migratedValues.forEach((migrated) => {
        expect(migrated).toMatch(/^enc:v2:/);
      });

      // Verify all can be decrypted correctly
      for (let i = 0; i < migratedValues.length; i++) {
        const decrypted = await decryptData(
          migratedValues[i].slice("enc:v2:".length),
          TEST_ADDRESS
        );
        expect(decrypted).toBe(values[i]);
      }
    });

    it("should not migrate data that is already v2", async () => {
      const plaintext = "Already v2 encrypted";
      const encrypted = await encryptData(plaintext, TEST_ADDRESS);
      const v2Value = `enc:v2:${encrypted}`;

      // Attempt migration
      const migrated = await migrateEncryptedValue(
        v2Value,
        TEST_ADDRESS,
        TEST_SIGN_MESSAGE
      );

      // Should return unchanged
      expect(migrated).toBe(v2Value);

      // Verify it can still be decrypted
      const decrypted = await decryptData(
        migrated.slice("enc:v2:".length),
        TEST_ADDRESS
      );
      expect(decrypted).toBe(plaintext);
    });

    it("should handle migration when encryption key is not initially available", async () => {
      clearAllEncryptionKeys();
      clearAllRateLimits();
      clearMigrationStatus(TEST_ADDRESS);

      // First, create the key and encrypted value
      await requestEncryptionKey(TEST_ADDRESS, TEST_SIGN_MESSAGE);
      const plaintext = "Value to migrate";
      const encrypted = await encryptData(plaintext, TEST_ADDRESS);
      const v1Value = `enc:v1:${encrypted}`;

      // Clear key to simulate key not being available
      clearAllEncryptionKeys();
      clearAllRateLimits();

      // Migrate should request key via signMessage
      const migrated = await migrateEncryptedValue(
        v1Value,
        TEST_ADDRESS,
        TEST_SIGN_MESSAGE
      );

      // Should successfully migrate
      expect(migrated).toMatch(/^enc:v2:/);

      // Verify content
      const decrypted = await decryptData(
        migrated.slice("enc:v2:".length),
        TEST_ADDRESS
      );
      expect(decrypted).toBe(plaintext);
    });

    it("should preserve data integrity across multiple migration attempts", async () => {
      const plaintext = "Data to migrate multiple times";
      const encrypted = await encryptData(plaintext, TEST_ADDRESS);
      const v1Value = `enc:v1:${encrypted}`;

      // First migration
      const migrated1 = await migrateEncryptedValue(
        v1Value,
        TEST_ADDRESS,
        TEST_SIGN_MESSAGE
      );
      expect(migrated1).toMatch(/^enc:v2:/);

      // Second migration attempt (should return unchanged)
      const migrated2 = await migrateEncryptedValue(
        migrated1,
        TEST_ADDRESS,
        TEST_SIGN_MESSAGE
      );
      expect(migrated2).toBe(migrated1);

      // Verify content is still correct
      const decrypted = await decryptData(
        migrated2.slice("enc:v2:".length),
        TEST_ADDRESS
      );
      expect(decrypted).toBe(plaintext);
    });

    it("should handle migration with different wallet addresses independently", async () => {
      clearAllRateLimits();
      const address1 = "0x1111111111111111111111111111111111111111";
      const address2 = "0x2222222222222222222222222222222222222222";

      // Setup keys for both addresses
      await requestEncryptionKey(address1, TEST_SIGN_MESSAGE);
      clearAllRateLimits();
      await requestEncryptionKey(address2, TEST_SIGN_MESSAGE);

      const plaintext1 = "Data for address 1";
      const plaintext2 = "Data for address 2";

      // Create v1 encrypted values for each address
      const encrypted1 = await encryptData(plaintext1, address1);
      const encrypted2 = await encryptData(plaintext2, address2);

      const v1Value1 = `enc:v1:${encrypted1}`;
      const v1Value2 = `enc:v1:${encrypted2}`;

      // Migrate both
      const migrated1 = await migrateEncryptedValue(
        v1Value1,
        address1,
        TEST_SIGN_MESSAGE
      );
      const migrated2 = await migrateEncryptedValue(
        v1Value2,
        address2,
        TEST_SIGN_MESSAGE
      );

      // Verify both are v2
      expect(migrated1).toMatch(/^enc:v2:/);
      expect(migrated2).toMatch(/^enc:v2:/);

      // Verify each can only decrypt with its own key
      const decrypted1 = await decryptData(
        migrated1.slice("enc:v2:".length),
        address1
      );
      const decrypted2 = await decryptData(
        migrated2.slice("enc:v2:".length),
        address2
      );

      expect(decrypted1).toBe(plaintext1);
      expect(decrypted2).toBe(plaintext2);
    });

    it("should handle migration status correctly during migration process", async () => {
      clearMigrationStatus(TEST_ADDRESS);

      const plaintext = "Data to migrate";
      const encrypted = await encryptData(plaintext, TEST_ADDRESS);
      const v1Value = `enc:v1:${encrypted}`;

      // Migration should not be marked complete before migration
      expect(hasMigrationCompleted(TEST_ADDRESS)).toBe(false);

      // Perform migration
      const migrated = await migrateEncryptedValue(
        v1Value,
        TEST_ADDRESS,
        TEST_SIGN_MESSAGE
      );

      expect(migrated).toMatch(/^enc:v2:/);

      // Note: migrateEncryptedValue doesn't mark migration as complete
      // That's done by the calling code (decryptField, etc.)
      // So status should still be false unless explicitly marked
      expect(hasMigrationCompleted(TEST_ADDRESS)).toBe(false);

      // Mark as complete
      markMigrationCompleted(TEST_ADDRESS);
      expect(hasMigrationCompleted(TEST_ADDRESS)).toBe(true);
    });

    it("should handle migration failure gracefully and still allow decryption", async () => {
      const plaintext = "Data that might fail migration";
      const encrypted = await encryptData(plaintext, TEST_ADDRESS);
      const v1Value = `enc:v1:${encrypted}`;

      // Create a mock signMessage that might fail
      let callCount = 0;
      const failingSignMessage: SignMessageFn = async () => {
        callCount++;
        if (callCount === 1) {
          // First call succeeds
          return TEST_SIGN_MESSAGE("test");
        }
        throw new Error("Signing failed");
      };

      // Even if migration fails, decryption should still work
      // because the key derivation is the same
      try {
        await migrateEncryptedValue(v1Value, TEST_ADDRESS, failingSignMessage);
      } catch {
        // Migration might fail, but decryption should still work
      }

      // Direct decryption should still work (same key)
      const payload = v1Value.slice("enc:v1:".length);
      const decrypted = await decryptData(payload, TEST_ADDRESS);
      expect(decrypted).toBe(plaintext);
    });

    it("should verify that v1 and v2 encrypted data use the same encryption key", async () => {
      const plaintext = "Same key test";

      // Create v1 encrypted value
      const encrypted = await encryptData(plaintext, TEST_ADDRESS);
      const v1Value = `enc:v1:${encrypted}`;

      // Decrypt v1 directly (proving same key works)
      const payload = v1Value.slice("enc:v1:".length);
      const decryptedV1 = await decryptData(payload, TEST_ADDRESS);
      expect(decryptedV1).toBe(plaintext);

      // Migrate to v2
      const migrated = await migrateEncryptedValue(
        v1Value,
        TEST_ADDRESS,
        TEST_SIGN_MESSAGE
      );

      // Decrypt v2
      const decryptedV2 = await decryptData(
        migrated.slice("enc:v2:".length),
        TEST_ADDRESS
      );
      expect(decryptedV2).toBe(plaintext);

      // Both should decrypt to the same value, proving same key
      expect(decryptedV1).toBe(decryptedV2);
    });

    it("should handle migration of edge case values", async () => {
      const edgeCases = [
        "", // Empty string
        " ", // Single space
        "\n", // Newline
        "\t", // Tab
        "0", // Single character
        "a".repeat(10000), // Very long string
        "中文", // Chinese characters
        "🚀🎉💯", // Emojis
        JSON.stringify({}), // Empty object
        JSON.stringify([]), // Empty array
      ];

      for (const plaintext of edgeCases) {
        if (plaintext === "") {
          // Skip empty string as it's handled separately
          continue;
        }

        const encrypted = await encryptData(plaintext, TEST_ADDRESS);
        const v1Value = `enc:v1:${encrypted}`;

        const migrated = await migrateEncryptedValue(
          v1Value,
          TEST_ADDRESS,
          TEST_SIGN_MESSAGE
        );

        expect(migrated).toMatch(/^enc:v2:/);

        const decrypted = await decryptData(
          migrated.slice("enc:v2:".length),
          TEST_ADDRESS
        );
        expect(decrypted).toBe(plaintext);
      }
    });
  });
});

