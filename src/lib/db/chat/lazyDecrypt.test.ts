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
    // No encryption key set up.
    const plaintext = "Legacy conversation";
    const result = await decryptConversationTitle(plaintext, testAddress);
    expect(result).toBe(plaintext);
    // Plaintext fast path must not insert into the LRU.
    expect(_peekLazyTitleCacheSize()).toBe(0);
  });

  it("returns the empty string unchanged", async () => {
    const result = await decryptConversationTitle("", testAddress);
    expect(result).toBe("");
  });

  it("throws when called for an encrypted title without the key loaded", async () => {
    // First, encrypt something with the key. Then clear all keys so the
    // ciphertext outlives the in-memory key material.
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

    // Second call must be a cache hit — it should not re-call decryptField.
    // We can't easily spy on decryptField (already imported), so we rely on
    // the timing characteristic: a cache hit is synchronous-ish, plus
    // observe the cache size doesn't grow.
    const second = await decryptConversationTitle(encrypted, testAddress);
    expect(second).toBe("Hello");
    expect(_peekLazyTitleCacheSize()).toBe(1);
  });

  it("evicts the oldest entry when the LRU exceeds capacity", async () => {
    await requestEncryptionKey(testAddress, mockSignMessage);

    // Insert 257 unique encrypted titles. The 257th insert should
    // evict the first one. We seed the cache by calling the helper on
    // 257 distinct encrypted blobs.
    const encryptedTitles: string[] = [];
    for (let i = 0; i < 257; i += 1) {
      encryptedTitles.push(await encryptField(`title-${i}`, testAddress, mockSignMessage));
    }

    for (const enc of encryptedTitles) {
      await decryptConversationTitle(enc, testAddress);
    }

    // Cache holds at most LRU_CAPACITY (256) entries.
    expect(_peekLazyTitleCacheSize()).toBe(256);

    // The oldest (index 0) was evicted: re-decrypting it must succeed
    // and the cache size stays at 256 because a new insertion evicts
    // the next-oldest in turn.
    const firstAgain = await decryptConversationTitle(encryptedTitles[0], testAddress);
    expect(firstAgain).toBe("title-0");
    expect(_peekLazyTitleCacheSize()).toBe(256);
  });

  it("dedupes concurrent calls for the same key into a single decrypt", async () => {
    await requestEncryptionKey(testAddress, mockSignMessage);
    const encrypted = await encryptField("shared", testAddress, mockSignMessage);

    // Spy on crypto.subtle.decrypt — every successful AES-GCM decrypt
    // call we trigger goes through it. We expect exactly one
    // crypto.subtle.decrypt call across N concurrent helper calls
    // for the same key.
    const decryptSpy = vi.spyOn(crypto.subtle, "decrypt");

    const N = 8;
    const results = await Promise.all(
      Array.from({ length: N }, () => decryptConversationTitle(encrypted, testAddress))
    );

    expect(results).toEqual(Array.from({ length: N }, () => "shared"));
    // One decrypt across all concurrent callers.
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
    // clearAllEncryptionKeys is the deprecated alias for
    // clearAllEncryptionState — both should fire the listener registry.
    clearAllEncryptionKeys();
    expect(_peekLazyTitleCacheSize()).toBe(0);
  });

  it("does not repopulate cache when teardown runs mid-decrypt (session epoch guard)", async () => {
    await requestEncryptionKey(testAddress, mockSignMessage);
    const encrypted = await encryptField("RaceCondition", testAddress, mockSignMessage);

    // Kick off a decrypt and, before awaiting it, simulate a session
    // teardown (clearLazyTitleCache bumps the session epoch). When the
    // promise resolves, the cache must remain empty — otherwise an
    // in-flight decrypt could leak old-session plaintext into the
    // just-cleared LRU.
    const inFlight = decryptConversationTitle(encrypted, testAddress);
    clearLazyTitleCache();
    await inFlight;

    expect(_peekLazyTitleCacheSize()).toBe(0);
  });
});
