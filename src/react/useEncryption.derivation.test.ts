/**
 * Pre-flight safety for signature → AES key derivation.
 *
 * `hexToBytes` used to `parseInt(..., 16)` per pair, mapping every non-hex
 * byte to `NaN → 0`. A naive adapter that stringifies a Privy Solana
 * `signMessage` Uint8Array therefore derived a near-zero-entropy key with
 * no error. These tests lock the fail-closed hex decoder, the bytes-in
 * derive path, and the frozen v2/v3 hex-signature outputs.
 */
import { describe, it, expect, beforeEach } from "vitest";

import {
  clearAllEncryptionKeys,
  decryptData,
  decryptDataWithKey,
  deriveKeyFromSignatureBytes,
  deriveKeyFromSignatureV3Bytes,
  encryptData,
  encryptDataWithKey,
  getEncryptionKey,
  hexToBytes,
  requestEncryptionKey,
  requestKeyPair,
} from "./useEncryption";

const ADDRESS = "0x1234567890123456789012345678901234567890";

/** 65-byte Ethereum-style signature (repeating 0xab). */
const FIXTURE_HEX_SIGNATURE =
  "0xababababababababababababababababababababababababababababababababababababababababababababababababababababababababababababababababab";

/**
 * Frozen SHA-256 / HKDF outputs of {@link FIXTURE_HEX_SIGNATURE}.
 * A regression here silently breaks decryption of every existing enc:v2: /
 * enc:v3: payload. Computed from the hex-signature path prior to the
 * bytes-in refactor; do not regenerate unless the KDF itself is versioned.
 */
const FIXTURE_V2_KEY = "39cd843414d5125dd308568ace26d04e60b7fa6d2b1a901fb5184fa2eae0598b";
const FIXTURE_V3_KEY = "f4fe9ef2051156f51343b6dcf308f0750e220979fa4478dcdacbdaea7e923179";

/** HKDF-v3 of a 64-byte all-zero signature — the silent-weak-key canary. */
const ALL_ZEROS_64_V3_KEY = "7879b84210f381fc20d7672e4c245d73dd02a47552712dc50c52dc0bd09d0cdf";

function patternBytes(length: number): Uint8Array {
  return Uint8Array.from({ length }, (_, i) => (i * 7 + 13) & 0xff);
}

describe("hexToBytes", () => {
  it("decodes valid hex, with or without 0x prefix", () => {
    expect(Array.from(hexToBytes("0a0b"))).toEqual([0x0a, 0x0b]);
    expect(Array.from(hexToBytes("0x0a0b"))).toEqual([0x0a, 0x0b]);
    expect(Array.from(hexToBytes("0X0A0B"))).toEqual([0x0a, 0x0b]);
  });

  it("throws on non-hex input rather than zero-filling", () => {
    expect(() => hexToBytes("not-hex")).toThrow(/invalid hex string/i);
    expect(() => hexToBytes("gg")).toThrow(/non-hex/i);
    // parseInt("0g", 16) === 0 — the exact silent-zero-fill footgun
    expect(() => hexToBytes("0g")).toThrow(/non-hex/i);
    expect(() => hexToBytes("0xzz")).toThrow(/non-hex/i);
  });

  it("throws on odd length and empty input", () => {
    expect(() => hexToBytes("abc")).toThrow(/odd length|empty/i);
    expect(() => hexToBytes("")).toThrow(/empty or odd length/i);
    expect(() => hexToBytes("0x")).toThrow(/empty or odd length/i);
  });

  it("throws when a Uint8Array is stringified (comma-separated decimals)", () => {
    expect(() => hexToBytes(String(patternBytes(64)))).toThrow(/invalid hex string/i);
  });

  it("throws on base58-alphabet input (Privy Solana signature if stringified)", () => {
    // Contains G/H/J/… which are valid base58 but not hex.
    expect(() => hexToBytes("2qP5KGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstu")).toThrow(
      /invalid hex string/i
    );
  });
});

describe("bytes-in key derivation", () => {
  it("derives from Uint8Array bytes with no string round-trip", async () => {
    const signature = patternBytes(64);
    const v2 = await deriveKeyFromSignatureBytes(signature);
    const v3 = await deriveKeyFromSignatureV3Bytes(signature);

    expect(v2).toMatch(/^[0-9a-f]{64}$/);
    expect(v3).toMatch(/^[0-9a-f]{64}$/);
    expect(v2).not.toBe(v3);
  });

  it("does not produce the all-zeros-signature key (entropy is real)", async () => {
    const signature = patternBytes(64);
    const v3 = await deriveKeyFromSignatureV3Bytes(signature);
    const zerosV3 = await deriveKeyFromSignatureV3Bytes(new Uint8Array(64));

    expect(zerosV3).toBe(ALL_ZEROS_64_V3_KEY);
    expect(v3).not.toBe(zerosV3);
    expect(v3).not.toBe(ALL_ZEROS_64_V3_KEY);
  });

  it("hashes a subarray view, not the whole backing buffer", async () => {
    const backing = new Uint8Array([0, 1, 2, 3, 4, 5]);
    const view = backing.subarray(1, 4); // [1, 2, 3]
    const fromView = await deriveKeyFromSignatureBytes(view);
    const fromCopy = await deriveKeyFromSignatureBytes(new Uint8Array([1, 2, 3]));
    const fromWhole = await deriveKeyFromSignatureBytes(backing);

    expect(fromView).toBe(fromCopy);
    expect(fromView).not.toBe(fromWhole);
  });

  it("rejects an empty signature", async () => {
    await expect(deriveKeyFromSignatureBytes(new Uint8Array(0))).rejects.toThrow(/empty/i);
    await expect(deriveKeyFromSignatureV3Bytes(new Uint8Array(0))).rejects.toThrow(/empty/i);
  });
});

describe("v2/v3 hex-signature derivation fixtures", () => {
  beforeEach(() => {
    clearAllEncryptionKeys();
  });

  it("keeps the frozen v2 and v3 keys for the fixture hex signature", async () => {
    const sigBytes = hexToBytes(FIXTURE_HEX_SIGNATURE);
    expect(await deriveKeyFromSignatureBytes(sigBytes)).toBe(FIXTURE_V2_KEY);
    expect(await deriveKeyFromSignatureV3Bytes(sigBytes)).toBe(FIXTURE_V3_KEY);
  });

  it("stores the same frozen keys through the public hex-signature request path", async () => {
    await requestEncryptionKey(ADDRESS, async () => FIXTURE_HEX_SIGNATURE);

    const frozenV2 = await crypto.subtle.importKey(
      "raw",
      hexToBytes(FIXTURE_V2_KEY) as Uint8Array<ArrayBuffer>,
      { name: "AES-GCM" },
      false,
      ["encrypt", "decrypt"]
    );
    const v2Ciphertext = await encryptDataWithKey("v2-fixture-plaintext", frozenV2);
    expect(await decryptData(v2Ciphertext, ADDRESS, "v2")).toBe("v2-fixture-plaintext");

    const storedV3 = await getEncryptionKey(ADDRESS, "v3");
    const v3Ciphertext = await encryptData("v3-fixture-plaintext", ADDRESS);
    expect(await decryptDataWithKey(v3Ciphertext, storedV3)).toBe("v3-fixture-plaintext");

    const frozenV3 = await crypto.subtle.importKey(
      "raw",
      hexToBytes(FIXTURE_V3_KEY) as Uint8Array<ArrayBuffer>,
      { name: "AES-GCM" },
      false,
      ["encrypt", "decrypt"]
    );
    expect(await decryptDataWithKey(v3Ciphertext, frozenV3)).toBe("v3-fixture-plaintext");
  });
});

describe("hex-signature request path rejects non-hex signatures", () => {
  beforeEach(() => {
    clearAllEncryptionKeys();
  });

  it("raises instead of deriving a key when the signature is not hex", async () => {
    await expect(
      requestEncryptionKey(ADDRESS, async () => String(patternBytes(64)))
    ).rejects.toThrow(/invalid wallet signature/i);
  });
});

describe("isValidWalletAddress hex-only assumption", () => {
  it("rejects a Solana base58 address at every derive/encrypt entry point", async () => {
    const solana = "7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV";
    const signer = async () => FIXTURE_HEX_SIGNATURE;

    await expect(requestEncryptionKey(solana, signer)).rejects.toThrow(/invalid wallet address/i);
    await expect(requestKeyPair(solana, signer)).rejects.toThrow(/invalid wallet address/i);
  });
});
