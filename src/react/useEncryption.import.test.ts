import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  clearAllEncryptionState,
  clearEncryptionKey,
  decryptData,
  encryptData,
  EncryptionKeyMissingError,
  getEncryptionKey,
  hasEncryptionKey,
  seedEncryptionKeys,
} from "./useEncryption";

const ADDRESS = "0x1234567890123456789012345678901234567890";
const KEYS = { legacy: "11".repeat(32), current: "11".repeat(32) };
const REPLACEMENT_KEYS = { legacy: "22".repeat(32), current: "22".repeat(32) };

function delayNextImport(): () => void {
  const importKey = crypto.subtle.importKey.bind(crypto.subtle);
  let releaseImport: () => void = () => undefined;
  const gate = new Promise<void>((resolve) => {
    releaseImport = resolve;
  });

  vi.spyOn(crypto.subtle, "importKey").mockImplementationOnce(async (...args) => {
    const key = await importKey(...args);
    await gate;
    return key;
  });

  return releaseImport;
}

describe.each(["v2", "v3"] as const)("getEncryptionKey %s import", (version) => {
  beforeEach(() => {
    clearAllEncryptionState();
    seedEncryptionKeys(ADDRESS, KEYS);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    clearAllEncryptionState();
  });

  it.each([
    ["session teardown", clearAllEncryptionState],
    ["key removal", () => clearEncryptionKey(ADDRESS)],
  ] as const)("rejects the key after %s and leaves the cache empty", async (_name, clear) => {
    const ciphertext = await encryptData("private data", ADDRESS);
    seedEncryptionKeys(ADDRESS, KEYS);
    const releaseImport = delayNextImport();
    const pendingKey = getEncryptionKey(ADDRESS, version);
    const rejectedKey = expect(pendingKey).rejects.toBeInstanceOf(EncryptionKeyMissingError);

    clear();
    releaseImport();

    await rejectedKey;
    expect(hasEncryptionKey(ADDRESS, version)).toBe(false);
    await expect(getEncryptionKey(ADDRESS, version)).rejects.toBeInstanceOf(
      EncryptionKeyMissingError
    );
    await expect(decryptData(ciphertext, ADDRESS, version)).rejects.toBeInstanceOf(
      EncryptionKeyMissingError
    );
  });

  it("rejects the old key after replacement and preserves the new cache entry", async () => {
    const releaseImport = delayNextImport();
    const pendingKey = getEncryptionKey(ADDRESS, version);
    const rejectedKey = expect(pendingKey).rejects.toBeInstanceOf(EncryptionKeyMissingError);

    seedEncryptionKeys(ADDRESS, REPLACEMENT_KEYS);
    const replacementKey = await getEncryptionKey(ADDRESS, version);
    const ciphertext = await encryptData("replacement data", ADDRESS);
    releaseImport();

    await rejectedKey;
    expect(await getEncryptionKey(ADDRESS, version)).toBe(replacementKey);
    await expect(decryptData(ciphertext, ADDRESS, version)).resolves.toBe("replacement data");
  });

  it("rejects the old session import when the same key returns after teardown", async () => {
    const releaseImport = delayNextImport();
    const pendingKey = getEncryptionKey(ADDRESS, version);
    const rejectedKey = expect(pendingKey).rejects.toBeInstanceOf(EncryptionKeyMissingError);

    clearAllEncryptionState();
    seedEncryptionKeys(ADDRESS, KEYS);
    const restoredKey = await getEncryptionKey(ADDRESS, version);
    releaseImport();

    await rejectedKey;
    expect(await getEncryptionKey(ADDRESS, version)).toBe(restoredKey);
  });

  it("rejects decryption when teardown occurs during the key import", async () => {
    const ciphertext = await encryptData("private data", ADDRESS);
    seedEncryptionKeys(ADDRESS, KEYS);
    const releaseImport = delayNextImport();
    const pendingDecryption = decryptData(ciphertext, ADDRESS, version);
    const rejectedDecryption =
      expect(pendingDecryption).rejects.toBeInstanceOf(EncryptionKeyMissingError);

    clearAllEncryptionState();
    releaseImport();

    await rejectedDecryption;
    await expect(getEncryptionKey(ADDRESS, version)).rejects.toBeInstanceOf(
      EncryptionKeyMissingError
    );
  });
});
