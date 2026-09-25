/**
 * hexToBytes must reject non-hex input, and a Uint8Array signature must derive
 * through the bytes path. v2/v3 hex derivation is pinned to fixtures computed
 * independently (Node SHA-256 + HKDF), because a silent change here breaks
 * decryption of existing data.
 */
import { describe, expect, it } from "vitest";

import {
  clearAllEncryptionKeys,
  deriveKeyFromSignature,
  deriveKeyFromSignatureBytes,
  deriveKeyFromSignatureV3,
  hasEncryptionKey,
  hexToBytes,
  requestEncryptionKey,
} from "./useEncryption";

/** 65-byte signature, the length of an ECDSA secp256k1 signature. All bytes are 0xab. */
const HEX_SIGNATURE = `0x${"ab".repeat(65)}`;

/**
 * SHA-256 of the 65 0xab bytes. Independent of this module.
 * `sha256(ab ab … ab)` (65 times).
 */
const V2_KEY = "39cd843414d5125dd308568ace26d04e60b7fa6d2b1a901fb5184fa2eae0598b";

/**
 * HKDF-SHA256, IKM = SHA-256(signature), salt = 32 zero bytes,
 * info = "anuma-sdk-aes-gcm-v3", 32-byte output.
 */
const V3_KEY = "f4fe9ef2051156f51343b6dcf308f0750e220979fa4478dcdacbdaea7e923179";

/** 64 bytes: deadbeef, then 4..63. Not all zeros. */
function sampleSignatureBytes(): Uint8Array {
  const raw = new Uint8Array(64);
  raw[0] = 0xde;
  raw[1] = 0xad;
  raw[2] = 0xbe;
  raw[3] = 0xef;
  for (let i = 4; i < raw.length; i++) raw[i] = i;
  return raw;
}

/**
 * HKDF-SHA256 over those raw bytes with info "anuma-sdk-aes-gcm-v4".
 * Not the v3 key of the hex encoding, and not the all-zeros signature.
 */
const V4_KEY = "5a2215bc5f99e080575582c57d5dc4a9645879b27f4959c2d85ab483627c3a89";

/** Same KDF over 64 zero bytes. The old hex parser stored this class of key. */
const ALL_ZERO_SIGNATURE_KEY = "bc903660d3d6997ec50f8e9a4176fe76c2fc7c51f912759dff2237ee09b8dec4";

const ADDRESS = "0x1234567890123456789012345678901234567890";

describe("hexToBytes", () => {
  it("throws on non-hex input instead of zero-filling", () => {
    // parseInt("zz", 16) is NaN; the old loop stored 0.
    expect(() => hexToBytes("zzzz")).toThrow(/hex/);
    // parseInt("1g", 16) is 1 — a partial parse must not succeed either.
    expect(() => hexToBytes("1g")).toThrow(/hex/);
    // "0xsig" used to become a single 0 byte.
    expect(() => hexToBytes("0xsig")).toThrow(/hex/);
    // Base58 (Privy Solana signatures stringified) is not hex.
    expect(() => hexToBytes("5KQwrPbwdL6PhXujxW37FSSQZ1JiwsST4cqQzDeyXtrz")).toThrow(/hex/);
    expect(() => hexToBytes("abc")).toThrow(/hex/);
    expect(() => hexToBytes("")).toThrow(/hex/);
    expect(() => hexToBytes("0x")).toThrow(/hex/);
  });

  it("throws when a Uint8Array is passed in place of a hex string", () => {
    const signature = new Uint8Array([1, 2, 255]);
    expect(() => hexToBytes(signature as unknown as string)).toThrow(/deriveKeyFromSignatureBytes/);
  });

  it("still decodes valid hex, with or without a 0x prefix", () => {
    expect(Array.from(hexToBytes("0x00ff"))).toEqual([0, 255]);
    expect(Array.from(hexToBytes("00FF"))).toEqual([0, 255]);
    expect(Array.from(hexToBytes(HEX_SIGNATURE))).toEqual(
      Array.from(hexToBytes(HEX_SIGNATURE.slice(2)))
    );
  });
});

describe("v2/v3 hex signature fixtures", () => {
  it("derives the pinned v2 key from a hex signature", async () => {
    expect(await deriveKeyFromSignature(HEX_SIGNATURE)).toBe(V2_KEY);
    expect(await deriveKeyFromSignature(HEX_SIGNATURE.slice(2))).toBe(V2_KEY);
  });

  it("derives the pinned v3 key from a hex signature", async () => {
    expect(await deriveKeyFromSignatureV3(HEX_SIGNATURE)).toBe(V3_KEY);
    expect(await deriveKeyFromSignatureV3(HEX_SIGNATURE.slice(2))).toBe(V3_KEY);
  });

  it("rejects a non-hex signature before any key is stored", async () => {
    clearAllEncryptionKeys();
    const base58 = "5KQwrPbwdL6PhXujxW37FSSQZ1JiwsST4cqQzDeyXtrz";
    await expect(requestEncryptionKey(ADDRESS, async () => base58)).rejects.toThrow(/hex/);
    await expect(
      requestEncryptionKey(ADDRESS, async () => String(sampleSignatureBytes()))
    ).rejects.toThrow(/hex/);
    expect(hasEncryptionKey(ADDRESS)).toBe(false);
    expect(hasEncryptionKey(ADDRESS, "v2")).toBe(false);
  });
});

describe("deriveKeyFromSignatureBytes", () => {
  it("derives the pinned v4 key from raw bytes, not the all-zeros key", async () => {
    const signature = sampleSignatureBytes();
    const key = await deriveKeyFromSignatureBytes(signature);
    expect(key).toBe(V4_KEY);
    expect(key).not.toBe(ALL_ZERO_SIGNATURE_KEY);
    expect(await deriveKeyFromSignatureBytes(new Uint8Array(signature.length))).toBe(
      ALL_ZERO_SIGNATURE_KEY
    );
  });

  it("does not match v3 of the hex encoding of the same bytes", async () => {
    const signature = sampleSignatureBytes();
    const hex = Array.from(signature)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    const bytesKey = await deriveKeyFromSignatureBytes(signature);
    expect(bytesKey).not.toBe(await deriveKeyFromSignatureV3(hex));
    expect(bytesKey).not.toBe(await deriveKeyFromSignature(hex));
  });

  it("hashes a Uint8Array view, not its backing buffer", async () => {
    const backing = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7]);
    const view = backing.subarray(2, 6);
    const tight = new Uint8Array([2, 3, 4, 5]);
    expect(await deriveKeyFromSignatureBytes(view)).toBe(await deriveKeyFromSignatureBytes(tight));
    expect(await deriveKeyFromSignatureBytes(view)).not.toBe(
      await deriveKeyFromSignatureBytes(backing)
    );
  });

  it("rejects an empty signature and a non-Uint8Array", async () => {
    await expect(deriveKeyFromSignatureBytes(new Uint8Array(0))).rejects.toThrow(/non-empty/);
    await expect(deriveKeyFromSignatureBytes("abcd" as unknown as Uint8Array)).rejects.toThrow(
      /Uint8Array/
    );
  });
});
