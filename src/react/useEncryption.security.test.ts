import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  requestEncryptionKey,
  encryptData,
  decryptData,
  clearAllEncryptionKeys,
} from "./useEncryption";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const Buffer: any;

const getTestSignMessage = () => {
  return async (message: string): Promise<string> => {
    return `0x${Buffer.from(message).toString("hex").padStart(130, "0")}`;
  };
};

const isValidWalletAddress = (address: string): boolean => {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
};

const TEST_SIGN_MESSAGE = getTestSignMessage();

describe("SECURITY: Wallet Address Validation", () => {
  beforeEach(() => {
    clearAllEncryptionKeys();
  });

  it("should reject invalid wallet addresses before use in encryption functions", async () => {
    const invalidAddresses = [
      "not_an_address",
      "0x123",
      "1234567890123456789012345678901234567890",
      "0xGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG",
      "",
      "0x12345678901234567890123456789012345678901234567890",
    ];

    for (const invalidAddress of invalidAddresses) {
      const isValid = isValidWalletAddress(invalidAddress);
      expect(isValid).toBe(false);

      await expect(requestEncryptionKey(invalidAddress, TEST_SIGN_MESSAGE)).rejects.toThrow();
    }
  });

  it("should validate addresses before encryption attempts with clear error messages", async () => {
    const malformedAddress = "0xINVALID";

    await expect(requestEncryptionKey(malformedAddress, TEST_SIGN_MESSAGE)).rejects.toThrow(
      /invalid.*address|validation/i
    );
  });

  it("should validate addresses before encryption with clear validation error messages", async () => {
    const validAddress = "0x1234567890123456789012345678901234567890";

    await requestEncryptionKey(validAddress, TEST_SIGN_MESSAGE);

    const invalidAddress = "invalid";

    await expect(encryptData("test data", invalidAddress)).rejects.toThrow(
      /invalid.*address|validation/i
    );
  });
});
