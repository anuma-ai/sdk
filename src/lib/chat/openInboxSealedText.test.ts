// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from "vitest";

import {
  clearAllEncryptionState,
  clearKeyPair,
  getEncryptionKey,
  requestEncryptionKey,
  type SignMessageFn,
} from "../../react/useEncryption";
import { getLogger, type Logger, setLogger } from "../logger";
import rewardVector from "./fixtures/inboxRewardVector.json";
import vector from "./fixtures/inboxSealVector.json";
import { openInboxSealedText } from "./inbox";

const walletAddress = "0x2222222222222222222222222222222222222222";
const signature = "0x" + "cd".repeat(65);

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

async function walletHoldsVectorKey(): Promise<Mock<SignMessageFn>> {
  const signMessage = vi.fn<SignMessageFn>(() => Promise.resolve(signature));
  await requestEncryptionKey(walletAddress, signMessage);
  clearKeyPair(walletAddress);
  const { d: _d, ...publicKey } = vector.recipient_private_jwk;
  const plaintext = new TextEncoder().encode(
    JSON.stringify({ privateKey: vector.recipient_private_jwk, publicKey })
  );
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      await getEncryptionKey(walletAddress, "v3"),
      plaintext
    )
  );
  localStorage.setItem(`ecdh_keypair_${walletAddress}`, toHex(iv) + toHex(ciphertext));
  return signMessage;
}

function envelopeWith(change: Record<string, unknown>): string {
  return JSON.stringify({ ...(JSON.parse(rewardVector.sealed) as object), ...change });
}

describe("openInboxSealedText", () => {
  beforeEach(() => {
    clearAllEncryptionState();
    localStorage.clear();
  });

  afterEach(() => {
    clearAllEncryptionState();
    localStorage.clear();
  });

  it("opens portal's sealed reward code with the key the wallet signer gives", async () => {
    const signMessage = await walletHoldsVectorKey();
    await expect(
      openInboxSealedText({ walletAddress, signMessage }, rewardVector.sealed, rewardVector.seal_id)
    ).resolves.toBe(rewardVector.plaintext);
    expect(signMessage).toHaveBeenCalled();
  });

  it.each(["referral-reward-claim-43", "", vector.id])(
    "rejects the envelope under the seal id %j",
    async (sealId) => {
      const signMessage = await walletHoldsVectorKey();
      await expect(
        openInboxSealedText({ walletAddress, signMessage }, rewardVector.sealed, sealId)
      ).rejects.toThrow();
    }
  );

  it.each([
    ["another algorithm", envelopeWith({ alg: "ECDH-ES+A256KW" }), "Unsupported inbox envelope"],
    ["another version", envelopeWith({ v: 2 }), "Unsupported inbox envelope"],
    ["a short iv", envelopeWith({ iv: "AAAA" }), "Malformed inbox envelope"],
    ["not JSON", "{", undefined],
  ])("rejects an envelope with %s", async (_label, sealed, message) => {
    const signMessage = await walletHoldsVectorKey();
    await expect(
      openInboxSealedText({ walletAddress, signMessage }, sealed, rewardVector.seal_id)
    ).rejects.toThrow(message);
  });

  it.each(["", undefined])(
    "throws a clear error and asks for no signature without a wallet: %j",
    async (address) => {
      const signMessage = vi.fn(() => Promise.resolve(signature));
      await expect(
        openInboxSealedText(
          { walletAddress: address as string, signMessage },
          rewardVector.sealed,
          rewardVector.seal_id
        )
      ).rejects.toThrow("No inbox key: set walletAddress and signMessage");
      expect(signMessage).not.toHaveBeenCalled();
    }
  );

  it("rejects a wallet address that is not an address", async () => {
    const signMessage = vi.fn(() => Promise.resolve(signature));
    await expect(
      openInboxSealedText(
        { walletAddress: "0x1234", signMessage },
        rewardVector.sealed,
        rewardVector.seal_id
      )
    ).rejects.toThrow("Invalid wallet address");
    expect(signMessage).not.toHaveBeenCalled();
  });

  it("puts no key material in a log line, a return value or an error", async () => {
    const secrets = [
      vector.recipient_private_key_hex,
      vector.recipient_private_jwk.d,
      vector.ephemeral_private_key_hex,
      vector.shared_secret_hex,
      vector.aes_key_hex,
      signature.slice(2),
    ];
    const lines: unknown[] = [];
    const record = (...args: unknown[]) => void lines.push(...args);
    const capture: Logger = { debug: record, info: record, warn: record, error: record };
    const previous = getLogger();
    const consoleSpies = (["log", "info", "warn", "error", "debug"] as const).map((level) =>
      vi.spyOn(console, level).mockImplementation(record)
    );
    setLogger(capture);
    const outputs: string[] = [];
    try {
      const signMessage = await walletHoldsVectorKey();
      const options = { walletAddress, signMessage };
      outputs.push(await openInboxSealedText(options, rewardVector.sealed, rewardVector.seal_id));
      for (const [sealed, sealId] of [
        [rewardVector.sealed, "referral-reward-claim-43"],
        [envelopeWith({ alg: "ECDH-ES+A256KW" }), rewardVector.seal_id],
        [rewardVector.sealed, ""],
      ]) {
        const failure = await openInboxSealedText(options, sealed, sealId).catch(
          (err: unknown) => err
        );
        outputs.push(String(failure), JSON.stringify(failure));
      }
    } finally {
      setLogger(previous);
      for (const spy of consoleSpies) spy.mockRestore();
    }
    const seen = [...outputs, ...lines.map((line) => String(line))].join("\n").toLowerCase();
    expect(outputs[0]).toBe(rewardVector.plaintext);
    for (const secret of secrets) expect(seen).not.toContain(secret.toLowerCase());
    expect(lines).toEqual([]);
  });
});
