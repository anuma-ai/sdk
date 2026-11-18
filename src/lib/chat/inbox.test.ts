import { describe, expect, it, vi } from "vitest";

import { getLogger, type Logger, setLogger } from "../logger";
import rewardVector from "./fixtures/inboxRewardVector.json";
import vector from "./fixtures/inboxSealVector.json";
import { createVaultInbox, exportInboxPublicKey, openInboxItem, openSealedText } from "./inbox";

function fromBase64Url(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

async function recipientKeyPair(): Promise<CryptoKeyPair> {
  const privateKey = await crypto.subtle.importKey(
    "jwk",
    vector.recipient_private_jwk,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    ["deriveBits", "deriveKey"]
  );
  const publicKey = await crypto.subtle.importKey(
    "raw",
    fromBase64Url(vector.recipient_public_key) as Uint8Array<ArrayBuffer>,
    { name: "ECDH", namedCurve: "P-256" },
    true,
    []
  );
  return { privateKey, publicKey };
}

describe("openInboxItem", () => {
  it("opens portal's sealed vector to its exact plaintext", async () => {
    const opened = await openInboxItem(
      { id: vector.id, sealed: vector.sealed },
      await recipientKeyPair()
    );
    expect(opened).toEqual(JSON.parse(vector.plaintext));
  });

  it("rejects an envelope bound to a different id", async () => {
    const keyPair = await recipientKeyPair();
    await expect(
      openInboxItem({ id: vector.id.replace(/.$/, "f"), sealed: vector.sealed }, keyPair)
    ).rejects.toThrow();
  });

  it("rejects a tampered ciphertext", async () => {
    const envelope = JSON.parse(vector.sealed) as { ct: string };
    const flipped = envelope.ct.startsWith("A")
      ? "B" + envelope.ct.slice(1)
      : "A" + envelope.ct.slice(1);
    await expect(
      openInboxItem(
        { id: vector.id, sealed: JSON.stringify({ ...envelope, ct: flipped }) },
        await recipientKeyPair()
      )
    ).rejects.toThrow();
  });

  it("rejects an item sealed to someone else", async () => {
    const other = (await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, [
      "deriveBits",
      "deriveKey",
    ])) as CryptoKeyPair;
    await expect(openInboxItem({ id: vector.id, sealed: vector.sealed }, other)).rejects.toThrow();
  });

  it("rejects an unknown envelope version", async () => {
    const envelope = JSON.parse(vector.sealed) as Record<string, unknown>;
    await expect(
      openInboxItem(
        { id: vector.id, sealed: JSON.stringify({ ...envelope, v: 2 }) },
        await recipientKeyPair()
      )
    ).rejects.toThrow("Unsupported inbox envelope");
  });
});

describe("openSealedText", () => {
  function rewardEnvelope(): Record<string, unknown> {
    return JSON.parse(rewardVector.sealed) as Record<string, unknown>;
  }

  it("opens portal's sealed reward code to its exact text", async () => {
    expect(rewardVector.recipient_public_key).toBe(vector.recipient_public_key);
    await expect(
      openSealedText(rewardVector.sealed, rewardVector.seal_id, await recipientKeyPair())
    ).resolves.toBe(rewardVector.plaintext);
  });

  it.each(["referral-reward-claim-43", "referral-reward-claim-4", "", vector.id])(
    "rejects the envelope under the seal id %j",
    async (sealId) => {
      await expect(
        openSealedText(rewardVector.sealed, sealId, await recipientKeyPair())
      ).rejects.toThrow();
    }
  );

  it.each([{ alg: "ECDH-ES+A256KW" }, { alg: undefined }, { v: 2 }, { v: "1" }])(
    "rejects an envelope with %j",
    async (change) => {
      await expect(
        openSealedText(
          JSON.stringify({ ...rewardEnvelope(), ...change }),
          rewardVector.seal_id,
          await recipientKeyPair()
        )
      ).rejects.toThrow("Unsupported inbox envelope");
    }
  );

  it.each([
    ["not JSON", "{"],
    ["null", "null"],
    ["a short iv", JSON.stringify({ ...rewardEnvelope(), iv: "AAAA" })],
    ["a non-base64url epk", JSON.stringify({ ...rewardEnvelope(), epk: "a+b/" })],
  ])("rejects a malformed envelope: %s", async (_label, sealed) => {
    await expect(
      openSealedText(sealed, rewardVector.seal_id, await recipientKeyPair())
    ).rejects.toThrow();
  });

  it("rejects a reward code sealed to another key", async () => {
    const other = (await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, [
      "deriveBits",
      "deriveKey",
    ])) as CryptoKeyPair;
    await expect(
      openSealedText(rewardVector.sealed, rewardVector.seal_id, other)
    ).rejects.toThrow();
  });

  it("puts no key material in a log line, a return value or an error", async () => {
    const secrets = [
      vector.recipient_private_key_hex,
      vector.recipient_private_jwk.d,
      vector.ephemeral_private_key_hex,
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
      const keyPair = await recipientKeyPair();
      outputs.push(await openSealedText(rewardVector.sealed, rewardVector.seal_id, keyPair));
      for (const sealId of ["referral-reward-claim-43", ""]) {
        const failure = await openSealedText(rewardVector.sealed, sealId, keyPair).catch(
          (err: unknown) => err
        );
        outputs.push(String(failure), JSON.stringify(failure));
      }
    } finally {
      setLogger(previous);
      for (const spy of consoleSpies) spy.mockRestore();
    }
    const seen = [...outputs, ...lines.map((line) => String(line))].join("\n");
    expect(outputs[0]).toBe(rewardVector.plaintext);
    for (const secret of secrets) expect(seen).not.toContain(secret);
    expect(lines).toEqual([]);
  });
});

describe("exportInboxPublicKey", () => {
  it("exports the uncompressed point the way vault and portal expect", async () => {
    const { publicKey } = await recipientKeyPair();
    expect(await exportInboxPublicKey(publicKey)).toBe(vector.recipient_public_key);
  });
});

describe("createVaultInbox", () => {
  function fakeFetch(responses: Array<Response>) {
    return vi.fn(async () => responses.shift() ?? new Response(null, { status: 204 }));
  }

  it("registers the key, lists items and deletes them under /api/private-chats", async () => {
    const fetch = fakeFetch([
      new Response(JSON.stringify({ public_key: "k", updated_at: "t" }), { status: 200 }),
      new Response(
        JSON.stringify({
          items: [{ id: "0xa", sealed: "{}", created_at: "t" }, { id: 7 }],
        }),
        { status: 200 }
      ),
      new Response(null, { status: 204 }),
    ]);
    const inbox = createVaultInbox({
      baseUrl: "https://vault.example",
      getToken: async () => "tok",
      fetch,
    });

    await inbox.putPublicKey("k");
    expect(await inbox.list()).toEqual([{ id: "0xa", sealed: "{}", created_at: "t" }]);
    await inbox.remove("0x a");

    const calls = fetch.mock.calls as unknown as Array<[string, RequestInit]>;
    expect(calls.map(([url, init]) => `${init.method ?? "GET"} ${url}`)).toEqual([
      "PUT https://vault.example/api/private-chats/public-key",
      "GET https://vault.example/api/private-chats/inbox",
      "DELETE https://vault.example/api/private-chats/inbox/0x%20a",
    ]);
    expect(JSON.parse(String(calls[0][1].body))).toEqual({ public_key: "k" });
    expect(calls[0][1].headers).toMatchObject({ Authorization: "Bearer tok" });
  });
});
