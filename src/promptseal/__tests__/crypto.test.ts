import { describe, expect, it } from "vitest";

import { generateKeypair, loadAgentKeyFromPem, publicKeyBytes, sign, verify } from "../crypto";

describe("crypto", () => {
  it("signs and verifies a message round-trip", async () => {
    const { sk } = generateKeypair();
    const pk = await publicKeyBytes(sk);
    expect(pk).toHaveLength(32);
    const msg = new TextEncoder().encode("hello promptseal");
    const sig = await sign(sk, msg);
    expect(sig).toHaveLength(64);
    expect(await verify(pk, msg, sig)).toBe(true);
  });

  it("returns false on tampered message", async () => {
    const { sk } = generateKeypair();
    const pk = await publicKeyBytes(sk);
    const msg = new TextEncoder().encode("hello");
    const sig = await sign(sk, msg);
    const tampered = new TextEncoder().encode("hello!");
    expect(await verify(pk, tampered, sig)).toBe(false);
  });

  it("returns false on wrong key length", async () => {
    expect(await verify(new Uint8Array(31), new Uint8Array(0), new Uint8Array(64))).toBe(false);
    expect(await verify(new Uint8Array(32), new Uint8Array(0), new Uint8Array(63))).toBe(false);
  });

  it("loads PKCS8 PEM key", () => {
    // Sample Ed25519 PKCS8 PEM (RFC 8410). We synthesize one by encoding a
    // generated raw seed inside the well-known DER envelope.
    const rawSeed = new Uint8Array([
      0xd4, 0xee, 0x72, 0xdb, 0xf9, 0x13, 0x58, 0x4a, 0xd5, 0xb6, 0xd8, 0xf1, 0xf7, 0x69, 0xf8,
      0xad, 0x3a, 0xfe, 0x7c, 0x28, 0xcb, 0xf1, 0xd4, 0xfb, 0xe0, 0x97, 0xa8, 0x8f, 0x44, 0x75,
      0x58, 0x42,
    ]);
    // Standard Ed25519 PKCS8 prefix (16 bytes): MC4CAQAwBQYDK2VwBCIEIA==
    const prefix = new Uint8Array([
      0x30, 0x2e, 0x02, 0x01, 0x00, 0x30, 0x05, 0x06, 0x03, 0x2b, 0x65, 0x70, 0x04, 0x22, 0x04,
      0x20,
    ]);
    const der = new Uint8Array(prefix.length + rawSeed.length);
    der.set(prefix, 0);
    der.set(rawSeed, prefix.length);
    let bin = "";
    for (let i = 0; i < der.length; i++) bin += String.fromCharCode(der[i]!);
    const b64 = btoa(bin);
    const pem = `-----BEGIN PRIVATE KEY-----\n${b64}\n-----END PRIVATE KEY-----\n`;
    const seed = loadAgentKeyFromPem(pem);
    expect(seed).toEqual(rawSeed);
  });
});
