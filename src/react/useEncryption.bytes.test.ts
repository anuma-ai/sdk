/**
 * Tests for the bytes-in crypto variants (no hex round-trip):
 *   - encryptDataBytes:           bytes -> raw [IV][ct+tag] bytes
 *   - decryptDataBytesFromBytes:  raw [IV][ct+tag] bytes -> plaintext bytes
 *
 * These avoid the ~1.37x hex string that encryptData/decryptDataBytes build for
 * binary payloads (large media). Real WebCrypto + deterministic signature so the
 * round-trips and wire-compatibility with the existing hex functions are exercised.
 */
import { describe, it, expect, beforeEach } from "vitest";

import {
  clearAllEncryptionKeys,
  decryptDataBytes,
  decryptDataBytesFromBytes,
  encryptData,
  encryptDataBytes,
  requestEncryptionKey,
} from "./useEncryption";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const Buffer: any;

const ADDRESS = "0x1234567890123456789012345678901234567890";
const signMessage = async (message: string): Promise<string> =>
  `0x${Buffer.from(message).toString("hex").padStart(130, "0")}`;

// Includes non-UTF-8 bytes — the whole reason media needs a bytes path.
const PLAIN = new Uint8Array([0x00, 0xff, 0xfe, 0x01, 0x80, 0x7f, 0x10, 0x20, 0x30, 0x40]);

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) out[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  return out;
}

describe("bytes-in crypto variants", () => {
  beforeEach(async () => {
    clearAllEncryptionKeys();
    await requestEncryptionKey(ADDRESS, signMessage);
  });

  it("round-trips encryptDataBytes -> decryptDataBytesFromBytes byte-for-byte", async () => {
    const encrypted = await encryptDataBytes(PLAIN, ADDRESS);
    const decrypted = await decryptDataBytesFromBytes(encrypted, ADDRESS);
    expect(Array.from(decrypted)).toEqual(Array.from(PLAIN));
  });

  it("produces a wire format the existing hex decryptDataBytes can read", async () => {
    // new encrypt (raw bytes) -> hex -> old hex decrypt
    const encrypted = await encryptDataBytes(PLAIN, ADDRESS);
    const decrypted = await decryptDataBytes(bytesToHex(encrypted), ADDRESS);
    expect(Array.from(decrypted)).toEqual(Array.from(PLAIN));
  });

  it("reads the wire format the existing hex encryptData produces", async () => {
    // old encrypt (hex) -> bytes -> new bytes decrypt
    const hex = await encryptData(PLAIN, ADDRESS);
    const decrypted = await decryptDataBytesFromBytes(hexToBytes(hex), ADDRESS);
    expect(Array.from(decrypted)).toEqual(Array.from(PLAIN));
  });

  it("rejects an invalid wallet address on encrypt", async () => {
    await expect(encryptDataBytes(PLAIN, "0x123")).rejects.toThrow();
  });

  it("throws on garbage/empty ciphertext rather than returning a wrong result", async () => {
    await expect(decryptDataBytesFromBytes(new Uint8Array(0), ADDRESS)).rejects.toThrow();
    await expect(
      decryptDataBytesFromBytes(
        new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]),
        ADDRESS
      )
    ).rejects.toThrow();
  });
});
