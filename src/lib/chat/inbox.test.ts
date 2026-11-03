import { describe, expect, it, vi } from "vitest";

import vector from "./fixtures/inboxSealVector.json";
import { createVaultInbox, exportInboxPublicKey, openInboxItem } from "./inbox";

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
