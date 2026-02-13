/**
 * Security Tests for Encryption Key Management
 *
 * Tests verify:
 * 1. Wallet address validation
 * 2. Non-extractable CryptoKey protection (XSS exfiltration prevention)
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  requestEncryptionKey,
  getEncryptionKey,
  encryptData,
  clearAllEncryptionKeys,
} from "./useEncryption";
import { removeAllKeys as idbRemoveAllKeys } from "./encryptionKeyStorage";

// Type declaration for Buffer in test environment
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const Buffer: any;

// Mock test sign message function
const getTestSignMessage = () => {
  return async (message: string): Promise<string> => {
    return `0x${Buffer.from(message).toString("hex").padStart(130, "0")}`;
  };
};

// Simple wallet address validation
const isValidWalletAddress = (address: string): boolean => {
  // Must start with 0x and be exactly 42 characters (0x + 40 hex chars)
  return /^0x[a-fA-F0-9]{40}$/.test(address);
};

const TEST_SIGN_MESSAGE = getTestSignMessage();

describe("SECURITY: Wallet Address Validation", () => {
  beforeEach(async () => {
    clearAllEncryptionKeys();
    await idbRemoveAllKeys();
  });

  it("should reject invalid wallet addresses before use in encryption functions", async () => {
    const invalidAddresses = [
      "not_an_address",
      "0x123", // Too short
      "1234567890123456789012345678901234567890", // Missing 0x prefix
      "0xGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG", // Invalid hex
      "", // Empty
      "0x12345678901234567890123456789012345678901234567890", // Too long
    ];

    for (const invalidAddress of invalidAddresses) {
      // Validation function correctly rejects invalid addresses
      const isValid = isValidWalletAddress(invalidAddress);
      expect(isValid).toBe(false);

      // Encryption functions should validate before use
      await expect(
        requestEncryptionKey(invalidAddress, TEST_SIGN_MESSAGE)
      ).rejects.toThrow();
    }
  });

  it("should validate addresses before encryption attempts with clear error messages", async () => {
    const malformedAddress = "0xINVALID";

    // Should validate before attempting encryption
    await expect(
      requestEncryptionKey(malformedAddress, TEST_SIGN_MESSAGE)
    ).rejects.toThrow(/invalid.*address|validation/i);
  });

  it("should validate addresses before encryption with clear validation error messages", async () => {
    const validAddress = "0x1234567890123456789012345678901234567890";

    // Setup key
    await requestEncryptionKey(validAddress, TEST_SIGN_MESSAGE);

    // Try to use invalid address for encryption - should throw validation error
    const invalidAddress = "invalid";

    await expect(
      encryptData("test data", invalidAddress)
    ).rejects.toThrow(/invalid.*address|validation/i);
  });
});

describe("SECURITY: Non-extractable CryptoKey", () => {
  const address = "0x1234567890123456789012345678901234567890";

  beforeEach(async () => {
    clearAllEncryptionKeys();
    await idbRemoveAllKeys();
  });

  it("stored CryptoKey cannot be exported", async () => {
    await requestEncryptionKey(address, TEST_SIGN_MESSAGE);

    const key = await getEncryptionKey(address);

    // The key handle should exist and be usable
    expect(key).toBeDefined();
    expect(key.type).toBe("secret");
    expect(key.algorithm.name).toBe("AES-GCM");

    // But it must NOT be extractable
    expect(key.extractable).toBe(false);

    // Attempting to export the raw key bytes should throw
    await expect(
      crypto.subtle.exportKey("raw", key)
    ).rejects.toThrow();
  });

  it("CryptoKey cannot be wrapped (wrapKey)", async () => {
    await requestEncryptionKey(address, TEST_SIGN_MESSAGE);

    const key = await getEncryptionKey(address);

    // Create a wrapping key
    const wrapKey = await crypto.subtle.generateKey(
      { name: "AES-GCM", length: 256 },
      true,
      ["wrapKey", "unwrapKey"]
    );

    // Attempting to wrap the non-extractable key should throw
    await expect(
      crypto.subtle.wrapKey("raw", key, wrapKey, { name: "AES-GCM", iv: new Uint8Array(12) })
    ).rejects.toThrow();
  });

  it("CryptoKey can still be used for encrypt/decrypt", async () => {
    await requestEncryptionKey(address, TEST_SIGN_MESSAGE);

    const key = await getEncryptionKey(address);

    // Encrypt
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const plaintext = new TextEncoder().encode("hello world");
    const encrypted = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      plaintext
    );
    expect(encrypted.byteLength).toBeGreaterThan(0);

    // Decrypt
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      encrypted
    );
    expect(new TextDecoder().decode(decrypted)).toBe("hello world");
  });
});
