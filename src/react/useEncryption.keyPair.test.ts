import { createECDH, createHash, hkdfSync } from "node:crypto";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  clearAllEncryptionState,
  clearKeyPair,
  exportPublicKey,
  getKeyPair,
  hasKeyPair,
  onKeyAvailable,
  requestEncryptionKey,
  requestKeyPair,
  type SignMessageFn,
} from "./useEncryption";

const ADDRESS = "0x1234567890123456789012345678901234567890";
const OTHER_ADDRESS = "0x2222222222222222222222222222222222222222";
const SIGNATURE = `0x${"11".repeat(65)}`;
const OTHER_SIGNATURE = `0x${"22".repeat(65)}`;

function deferredSignature() {
  let resolve: (signature: string) => void = () => undefined;
  const promise = new Promise<string>((release) => {
    resolve = release;
  });
  return { promise, resolve };
}

describe("requestKeyPair concurrency", () => {
  beforeEach(() => {
    clearAllEncryptionState();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    clearAllEncryptionState();
  });

  it("shares one signature and preserves the exported public key", async () => {
    const laterSignature = deferredSignature();
    const signMessage = vi
      .fn<SignMessageFn>()
      .mockResolvedValueOnce(SIGNATURE)
      .mockReturnValueOnce(laterSignature.promise);

    const firstRequest = requestKeyPair(ADDRESS, signMessage);
    const secondRequest = requestKeyPair(ADDRESS, signMessage);
    await firstRequest;
    const publicKey = await exportPublicKey(ADDRESS, signMessage);

    laterSignature.resolve(OTHER_SIGNATURE);
    await secondRequest;

    expect(await exportPublicKey(ADDRESS, signMessage)).toBe(publicKey);
    expect(signMessage).toHaveBeenCalledTimes(1);
  });

  it("shares a signature error and permits a subsequent request", async () => {
    const error = new Error("The signature request failed.");
    const signMessage = vi
      .fn<SignMessageFn>()
      .mockRejectedValueOnce(error)
      .mockResolvedValue(SIGNATURE);

    const results = await Promise.allSettled([
      requestKeyPair(ADDRESS, signMessage),
      requestKeyPair(ADDRESS, signMessage),
      requestKeyPair(ADDRESS, signMessage),
    ]);

    expect(results).toEqual([
      { status: "rejected", reason: error },
      { status: "rejected", reason: error },
      { status: "rejected", reason: error },
    ]);
    expect(signMessage).toHaveBeenCalledTimes(1);
    expect(hasKeyPair(ADDRESS)).toBe(false);

    await requestKeyPair(ADDRESS, signMessage);

    expect(signMessage).toHaveBeenCalledTimes(2);
    expect(hasKeyPair(ADDRESS)).toBe(true);
  });

  it("permits independent requests for different addresses", async () => {
    const signature = deferredSignature();
    const signMessage = vi.fn<SignMessageFn>().mockReturnValue(signature.promise);
    const otherSignMessage = vi.fn<SignMessageFn>().mockResolvedValue(OTHER_SIGNATURE);
    const request = requestKeyPair(ADDRESS, signMessage);

    await requestKeyPair(OTHER_ADDRESS, otherSignMessage);

    expect(hasKeyPair(ADDRESS)).toBe(false);
    expect(hasKeyPair(OTHER_ADDRESS)).toBe(true);
    signature.resolve(SIGNATURE);
    await request;

    expect(signMessage).toHaveBeenCalledTimes(1);
    expect(otherSignMessage).toHaveBeenCalledTimes(1);
    expect(await exportPublicKey(ADDRESS, signMessage)).not.toBe(
      await exportPublicKey(OTHER_ADDRESS, otherSignMessage)
    );
  });

  it("preserves a new session request after the old request completes", async () => {
    const oldSignature = deferredSignature();
    const newSignature = deferredSignature();
    const signMessage = vi
      .fn<SignMessageFn>()
      .mockResolvedValue(SIGNATURE)
      .mockReturnValueOnce(oldSignature.promise)
      .mockReturnValueOnce(newSignature.promise);
    const oldRequest = requestKeyPair(ADDRESS, signMessage);
    await vi.waitFor(() => expect(signMessage).toHaveBeenCalledTimes(1));

    clearAllEncryptionState();
    const newRequest = requestKeyPair(ADDRESS, signMessage);
    await vi.waitFor(() => expect(signMessage).toHaveBeenCalledTimes(2));
    oldSignature.resolve(SIGNATURE);
    await oldRequest;

    expect(hasKeyPair(ADDRESS)).toBe(false);
    const joinedRequest = requestKeyPair(ADDRESS, signMessage);
    newSignature.resolve(OTHER_SIGNATURE);
    await Promise.all([newRequest, joinedRequest]);

    expect(signMessage).toHaveBeenCalledTimes(2);
    expect(hasKeyPair(ADDRESS)).toBe(true);
  });
});

describe("requestEncryptionKey and the key pair", () => {
  beforeEach(() => {
    clearAllEncryptionState();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    clearAllEncryptionState();
  });

  async function publicKeyFrom(signature: string): Promise<string> {
    await requestKeyPair(ADDRESS, vi.fn<SignMessageFn>().mockResolvedValue(signature));
    const publicKey = await exportPublicKey(ADDRESS, vi.fn<SignMessageFn>());
    clearAllEncryptionState();
    return publicKey;
  }

  it("derives the key pair from the same signature, so getKeyPair signs nothing more", async () => {
    const expected = await publicKeyFrom(SIGNATURE);
    const signMessage = vi.fn<SignMessageFn>().mockResolvedValue(SIGNATURE);
    const gated = vi.fn<SignMessageFn>().mockRejectedValue(new Error("signing is gated"));

    expect(await requestEncryptionKey(ADDRESS, signMessage)).toBe(true);
    await getKeyPair(ADDRESS, gated);

    expect(gated).not.toHaveBeenCalled();
    expect(signMessage).toHaveBeenCalledTimes(1);
    expect(await exportPublicKey(ADDRESS, gated)).toBe(expected);
  });

  it("uses the key pair an earlier session persisted", async () => {
    await requestEncryptionKey(ADDRESS, vi.fn<SignMessageFn>().mockResolvedValue(SIGNATURE));
    clearKeyPair(ADDRESS);
    await requestKeyPair(ADDRESS, vi.fn<SignMessageFn>().mockResolvedValue(OTHER_SIGNATURE));
    const persistedPublicKey = await exportPublicKey(ADDRESS, vi.fn<SignMessageFn>());
    const persisted = localStorage.getItem(`ecdh_keypair_${ADDRESS}`);
    expect(persisted).not.toBeNull();
    clearAllEncryptionState();
    localStorage.setItem(`ecdh_keypair_${ADDRESS}`, persisted!);

    await requestEncryptionKey(ADDRESS, vi.fn<SignMessageFn>().mockResolvedValue(SIGNATURE));

    expect(await exportPublicKey(ADDRESS, vi.fn<SignMessageFn>())).toBe(persistedPublicKey);
  });

  it("never replaces a key pair installed while an earlier request waited to sign", async () => {
    const later = deferredSignature();
    const pending = requestKeyPair(ADDRESS, vi.fn<SignMessageFn>().mockReturnValue(later.promise));
    await requestEncryptionKey(ADDRESS, vi.fn<SignMessageFn>().mockResolvedValue(SIGNATURE));
    const installed = await exportPublicKey(ADDRESS, vi.fn<SignMessageFn>());

    later.resolve(OTHER_SIGNATURE);
    await pending;

    expect(await exportPublicKey(ADDRESS, vi.fn<SignMessageFn>())).toBe(installed);
  });

  it("reports no key when the session ends while the key pair is being derived", async () => {
    const importKey = crypto.subtle.importKey.bind(crypto.subtle) as (
      ...args: unknown[]
    ) => Promise<CryptoKey>;
    let release: () => void = () => undefined;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    let reached: () => void = () => undefined;
    const deriving = new Promise<void>((resolve) => {
      reached = resolve;
    });
    vi.spyOn(crypto.subtle, "importKey").mockImplementation((async (...args: unknown[]) => {
      if (args[0] === "jwk") {
        reached();
        await held;
      }
      return importKey(...args);
    }) as typeof crypto.subtle.importKey);
    const ready = vi.fn();
    onKeyAvailable(ADDRESS, ready);

    const request = requestEncryptionKey(
      ADDRESS,
      vi.fn<SignMessageFn>().mockResolvedValue(SIGNATURE)
    );
    await deriving;
    clearAllEncryptionState();
    release();

    expect(await request).toBe(false);
    expect(ready).not.toHaveBeenCalled();
  });

  it("keeps the key pair it derives in memory only", async () => {
    await requestEncryptionKey(ADDRESS, vi.fn<SignMessageFn>().mockResolvedValue(SIGNATURE));

    expect(hasKeyPair(ADDRESS)).toBe(true);
    expect(localStorage.getItem(`ecdh_keypair_${ADDRESS}`)).toBeNull();
  });

  it("still unlocks the encryption keys when the key pair cannot be derived", async () => {
    const importKey = crypto.subtle.importKey.bind(crypto.subtle) as (
      ...args: unknown[]
    ) => Promise<CryptoKey>;
    vi.spyOn(crypto.subtle, "importKey").mockImplementation((async (...args: unknown[]) => {
      if (args[0] === "jwk") throw new Error("JWK import unsupported");
      return importKey(...args);
    }) as typeof crypto.subtle.importKey);

    expect(
      await requestEncryptionKey(ADDRESS, vi.fn<SignMessageFn>().mockResolvedValue(SIGNATURE))
    ).toBe(true);

    expect(hasKeyPair(ADDRESS)).toBe(false);
  });

  it("keeps a key pair the wallet already has", async () => {
    await requestKeyPair(ADDRESS, vi.fn<SignMessageFn>().mockResolvedValue(OTHER_SIGNATURE));
    const existing = await exportPublicKey(ADDRESS, vi.fn<SignMessageFn>());

    await requestEncryptionKey(ADDRESS, vi.fn<SignMessageFn>().mockResolvedValue(SIGNATURE));

    expect(await exportPublicKey(ADDRESS, vi.fn<SignMessageFn>())).toBe(existing);
  });
});

describe("the derived key pair", () => {
  const algorithm = { name: "ECDH", namedCurve: "P-256" };

  beforeEach(() => {
    clearAllEncryptionState();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    clearAllEncryptionState();
  });

  function standardPublicPoint(signature: string, address: string): string {
    const seed = createHash("sha256")
      .update(Buffer.from(signature.slice(2), "hex"))
      .digest();
    const scalar = hkdfSync("sha256", seed, address.toLowerCase(), "ECDH-P256-KeyPair", 32);
    const ecdh = createECDH("prime256v1");
    ecdh.setPrivateKey(Buffer.from(scalar));
    return ecdh.getPublicKey("hex");
  }

  async function rawPublicKey(keyPair: CryptoKeyPair): Promise<string> {
    return Buffer.from(await crypto.subtle.exportKey("raw", keyPair.publicKey)).toString("hex");
  }

  it("is the standard P-256 key of the signature's HKDF scalar", async () => {
    const keyPair = await getKeyPair(ADDRESS, vi.fn<SignMessageFn>().mockResolvedValue(SIGNATURE));

    expect(await rawPublicKey(keyPair)).toBe(standardPublicPoint(SIGNATURE, ADDRESS));
  });

  it("agrees on the ECDH secret with a peer", async () => {
    const keyPair = await getKeyPair(ADDRESS, vi.fn<SignMessageFn>().mockResolvedValue(SIGNATURE));
    const peer = createECDH("prime256v1");
    peer.generateKeys();
    const peerPublic = await crypto.subtle.importKey(
      "raw",
      peer.getPublicKey(),
      algorithm,
      false,
      []
    );

    const secret = await crypto.subtle.deriveBits(
      { name: "ECDH", public: peerPublic },
      keyPair.privateKey,
      256
    );

    expect(Buffer.from(secret).toString("hex")).toBe(
      peer.computeSecret(Buffer.from(await rawPublicKey(keyPair), "hex")).toString("hex")
    );
  });

  it("is derived without a PKCS#8 import, which WebKit refuses without the public key", async () => {
    const importKey = crypto.subtle.importKey.bind(crypto.subtle) as (
      ...args: unknown[]
    ) => Promise<CryptoKey>;
    vi.spyOn(crypto.subtle, "importKey").mockImplementation(((...args: unknown[]) =>
      args[0] === "pkcs8"
        ? Promise.reject(
            new DOMException(
              "Data provided to an operation does not meet requirements",
              "DataError"
            )
          )
        : importKey(...args)) as typeof crypto.subtle.importKey);

    const keyPair = await getKeyPair(ADDRESS, vi.fn<SignMessageFn>().mockResolvedValue(SIGNATURE));

    expect(await rawPublicKey(keyPair)).toBe(standardPublicPoint(SIGNATURE, ADDRESS));
  });
});
