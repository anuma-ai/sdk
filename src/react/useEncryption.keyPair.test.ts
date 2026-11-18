import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  clearAllEncryptionState,
  clearKeyPair,
  exportPublicKey,
  getKeyPair,
  hasKeyPair,
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

  it("keeps a key pair the wallet already has", async () => {
    await requestKeyPair(ADDRESS, vi.fn<SignMessageFn>().mockResolvedValue(OTHER_SIGNATURE));
    const existing = await exportPublicKey(ADDRESS, vi.fn<SignMessageFn>());

    await requestEncryptionKey(ADDRESS, vi.fn<SignMessageFn>().mockResolvedValue(SIGNATURE));

    expect(await exportPublicKey(ADDRESS, vi.fn<SignMessageFn>())).toBe(existing);
  });
});
