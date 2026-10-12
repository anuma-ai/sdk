import { beforeEach, describe, expect, it, vi } from "vitest";

import { encryptField } from "../../db/encryption-utils";
import {
  clearAllEncryptionKeys,
  encryptDataWithKey,
  type SignMessageFn,
} from "../../../react/useEncryption";
import {
  deriveMemoryKeyRing,
  MemoryKeyError,
  memoryCipher,
  reencryptMemoryField,
} from "./memoryKeys";

const signatureA = `0x${"a1".repeat(65)}`;
const signatureB = `0x${"b2".repeat(65)}`;

beforeEach(() => clearAllEncryptionKeys());

describe("memory keys", () => {
  it("derives a stable key id per signature without exposing the key", async () => {
    const a = await deriveMemoryKeyRing(signatureA);
    expect((await deriveMemoryKeyRing(signatureA)).keyId).toBe(a.keyId);
    expect((await deriveMemoryKeyRing(signatureB)).keyId).not.toBe(a.keyId);
    expect(a.keyId).toMatch(/^v3:[0-9a-f]{64}$/);
  });

  it("re-encrypts the vault's own enc:v3 field under the canonical key", async () => {
    const address = "0x1234567890123456789012345678901234567890";
    const signMessage = vi.fn(async () => signatureA) as unknown as SignMessageFn;
    const stored = await encryptField("Likes green tea", address, signMessage);
    const canonical = await deriveMemoryKeyRing(signatureA);

    const moved = await reencryptMemoryField(stored, canonical);

    expect(moved).toMatch(/^enc:v3:/);
    expect(moved).not.toBe(stored);
    expect(await memoryCipher(canonical).decrypt(moved)).toBe("Likes green tea");
  });

  it("falls back to a pinned key and to legacy v2, and fails closed otherwise", async () => {
    const pinned = await deriveMemoryKeyRing(signatureA);
    const canonical = await deriveMemoryKeyRing(signatureB);
    const underPin = await memoryCipher(pinned).encrypt("Has a dog");
    const legacy = `enc:v2:${await encryptDataWithKey("Has a cat", canonical.v2)}`;

    await expect(reencryptMemoryField(underPin, canonical)).rejects.toBeInstanceOf(MemoryKeyError);
    const moved = await reencryptMemoryField(underPin, canonical, [pinned]);
    expect(await memoryCipher(canonical).decrypt(moved)).toBe("Has a dog");
    expect(
      await memoryCipher(canonical).decrypt(await reencryptMemoryField(legacy, canonical))
    ).toBe("Has a cat");
  });

  it("encrypts plaintext and rejects a malformed encrypted field", async () => {
    const canonical = await deriveMemoryKeyRing(signatureA);
    const moved = await reencryptMemoryField("Plain fact", canonical);
    expect(await memoryCipher(canonical).decrypt(moved)).toBe("Plain fact");
    await expect(reencryptMemoryField("enc:v3:abcd", canonical)).rejects.toBeInstanceOf(
      MemoryKeyError
    );
  });

  it("decrypts only canonical enc:v3 content", async () => {
    const canonical = await deriveMemoryKeyRing(signatureA);
    const other = await deriveMemoryKeyRing(signatureB);
    const legacy = `enc:v2:${await encryptDataWithKey("Old", canonical.v2)}`;
    await expect(memoryCipher(canonical).decrypt(legacy)).rejects.toBeInstanceOf(MemoryKeyError);
    await expect(
      memoryCipher(canonical).decrypt(await memoryCipher(other).encrypt("Foreign"))
    ).rejects.toBeInstanceOf(MemoryKeyError);
  });
});
