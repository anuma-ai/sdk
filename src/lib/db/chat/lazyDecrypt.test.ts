import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  clearAllEncryptionKeys,
  requestEncryptionKey,
  type SignMessageFn,
} from "../../../react/useEncryption";
import { encryptField } from "../encryption-utils";
import {
  _peekLazyTitleCacheSize,
  clearLazyTitleCache,
  decryptConversationTitle,
} from "./lazyDecrypt";

declare const global: typeof globalThis;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const require: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const Buffer: any;

const mockSignMessage = vi.fn(async (message: string) => {
  return `0x${Buffer.from(message).toString("hex").padStart(130, "0")}`;
}) as unknown as SignMessageFn & { mock: { calls: string[][] } };

describe("decryptConversationTitle", () => {
  const testAddress = "0x1234567890123456789012345678901234567890";

  beforeEach(async () => {
    vi.clearAllMocks();
    clearAllEncryptionKeys();
    clearLazyTitleCache();

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

  it("round-trips an encrypted title via the existing encrypt path", async () => {
    await requestEncryptionKey(testAddress, mockSignMessage);
    const plaintext = "My private chat about Q3 planning";
    const encrypted = await encryptField(plaintext, testAddress, mockSignMessage);

    const result = await decryptConversationTitle(encrypted, testAddress);
    expect(result).toBe(plaintext);
  });

  it("returns plaintext titles unchanged without touching the key store", async () => {
    const plaintext = "Legacy conversation";
    const result = await decryptConversationTitle(plaintext, testAddress);
    expect(result).toBe(plaintext);
    expect(_peekLazyTitleCacheSize()).toBe(0);
  });

  it("returns the empty string unchanged", async () => {
    const result = await decryptConversationTitle("", testAddress);
    expect(result).toBe("");
  });

  it("throws when called for an encrypted title without the key loaded", async () => {
    await requestEncryptionKey(testAddress, mockSignMessage);
    const encrypted = await encryptField("secret", testAddress, mockSignMessage);
    clearAllEncryptionKeys();

    await expect(decryptConversationTitle(encrypted, testAddress)).rejects.toThrow(
      /encryption key not loaded/i
    );
  });

  it("memoizes results in an LRU keyed by address + ciphertext", async () => {
    await requestEncryptionKey(testAddress, mockSignMessage);
    const encrypted = await encryptField("Hello", testAddress, mockSignMessage);

    const first = await decryptConversationTitle(encrypted, testAddress);
    expect(first).toBe("Hello");
    expect(_peekLazyTitleCacheSize()).toBe(1);

    const second = await decryptConversationTitle(encrypted, testAddress);
    expect(second).toBe("Hello");
    expect(_peekLazyTitleCacheSize()).toBe(1);
  });

  it("evicts the oldest entry when the LRU exceeds capacity", async () => {
    await requestEncryptionKey(testAddress, mockSignMessage);

    const encryptedTitles: string[] = [];
    for (let i = 0; i < 257; i += 1) {
      encryptedTitles.push(await encryptField(`title-${i}`, testAddress, mockSignMessage));
    }

    for (const enc of encryptedTitles) {
      await decryptConversationTitle(enc, testAddress);
    }

    expect(_peekLazyTitleCacheSize()).toBe(256);

    const firstAgain = await decryptConversationTitle(encryptedTitles[0], testAddress);
    expect(firstAgain).toBe("title-0");
    expect(_peekLazyTitleCacheSize()).toBe(256);
  });

  it("dedupes concurrent calls for the same key into a single decrypt", async () => {
    await requestEncryptionKey(testAddress, mockSignMessage);
    const encrypted = await encryptField("shared", testAddress, mockSignMessage);

    const decryptSpy = vi.spyOn(crypto.subtle, "decrypt");

    const N = 8;
    const results = await Promise.all(
      Array.from({ length: N }, () => decryptConversationTitle(encrypted, testAddress))
    );

    expect(results).toEqual(Array.from({ length: N }, () => "shared"));
    expect(decryptSpy).toHaveBeenCalledTimes(1);

    decryptSpy.mockRestore();
  });

  it("clears the LRU when clearLazyTitleCache() runs", async () => {
    await requestEncryptionKey(testAddress, mockSignMessage);
    const encrypted = await encryptField("Hello", testAddress, mockSignMessage);
    await decryptConversationTitle(encrypted, testAddress);

    expect(_peekLazyTitleCacheSize()).toBe(1);
    clearLazyTitleCache();
    expect(_peekLazyTitleCacheSize()).toBe(0);
  });

  it("clears the LRU on clearAllEncryptionKeys (session teardown)", async () => {
    await requestEncryptionKey(testAddress, mockSignMessage);
    const encrypted = await encryptField("Bye", testAddress, mockSignMessage);
    await decryptConversationTitle(encrypted, testAddress);

    expect(_peekLazyTitleCacheSize()).toBe(1);
    clearAllEncryptionKeys();
    expect(_peekLazyTitleCacheSize()).toBe(0);
  });

  it("does not repopulate cache when teardown runs mid-decrypt (session epoch guard)", async () => {
    await requestEncryptionKey(testAddress, mockSignMessage);
    const encrypted = await encryptField("RaceCondition", testAddress, mockSignMessage);

    const inFlight = decryptConversationTitle(encrypted, testAddress);
    clearLazyTitleCache();
    await inFlight;

    expect(_peekLazyTitleCacheSize()).toBe(0);
  });
});
