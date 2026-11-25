import { afterEach, describe, expect, it, vi } from "vitest";

import { createChatStoreHarness } from "../../../test/chat/vaultHarness";
import { ChatStoreError } from "../chatStore/types";
import { createVaultChatBackend, type VaultChatBackend } from "../chatStore/vaultBackend";
import { getLogger, type Logger, setLogger } from "../logger";
import rewardVector from "./fixtures/inboxRewardVector.json";
import vector from "./fixtures/inboxSealVector.json";
import { sealInboxText } from "./fixtures/sealInboxItem";
import {
  createVaultInbox,
  deliverInboxAnswers,
  exportInboxPublicKey,
  type InboxPlaintext,
  openInboxItem,
  openSealedText,
} from "./inbox";

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
    const other = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, [
      "deriveBits",
      "deriveKey",
    ]);
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
    const other = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, [
      "deriveBits",
      "deriveKey",
    ]);
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

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function withoutLeadingZeros(bytes: Uint8Array): Uint8Array {
  let start = 0;
  while (start < bytes.length - 1 && bytes[start] === 0) start += 1;
  return bytes.subarray(start);
}

function withUnpaddedJwkCoordinates(x: string, y: string) {
  const subtle = globalThis.crypto.subtle;
  const exportKey = subtle.exportKey.bind(subtle);
  return vi.spyOn(subtle, "exportKey").mockImplementation((async (
    format: KeyFormat,
    key: CryptoKey
  ) => {
    if (format === "jwk" && key.algorithm.name === "ECDH") {
      return { kty: "EC", crv: "P-256", x, y };
    }
    return exportKey(format, key);
  }) as typeof subtle.exportKey);
}

async function keyPairWithZeroCoordinate(): Promise<{
  keyPair: CryptoKeyPair;
  raw: Uint8Array;
}> {
  for (let attempt = 0; attempt < 2048; attempt += 1) {
    const keyPair = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, [
      "deriveBits",
    ]);
    const raw = new Uint8Array(await crypto.subtle.exportKey("raw", keyPair.publicKey));
    if (raw[1] === 0 || raw[33] === 0) return { keyPair, raw };
  }
  throw new Error("P-256 key generation did not yield a zero-prefixed coordinate");
}

function withoutRawEcExport() {
  const subtle = globalThis.crypto.subtle;
  const exportKey = subtle.exportKey.bind(subtle);
  return vi.spyOn(subtle, "exportKey").mockImplementation((async (
    format: KeyFormat,
    key: CryptoKey
  ) => {
    if (format === "raw" && key.algorithm.name === "ECDH") {
      throw new Error("Unsupported EC export format: 0");
    }
    return exportKey(format as "jwk", key);
  }) as typeof subtle.exportKey);
}

describe("exportInboxPublicKey", () => {
  afterEach(() => vi.restoreAllMocks());

  it("exports the uncompressed point the way vault and portal expect", async () => {
    const { publicKey } = await recipientKeyPair();
    expect(await exportInboxPublicKey(publicKey)).toBe(vector.recipient_public_key);
  });

  it("exports the same point where WebCrypto cannot export a raw EC key", async () => {
    const { publicKey } = await recipientKeyPair();
    withoutRawEcExport();
    expect(await exportInboxPublicKey(publicKey)).toBe(vector.recipient_public_key);
  });

  it("opens portal's sealed vector where WebCrypto cannot export a raw EC key", async () => {
    const keyPair = await recipientKeyPair();
    withoutRawEcExport();
    expect(await openInboxItem({ id: vector.id, sealed: vector.sealed }, keyPair)).toEqual(
      JSON.parse(vector.plaintext)
    );
  });

  it("left-pads JWK coordinates that omit leading zeros", async () => {
    const { keyPair, raw } = await keyPairWithZeroCoordinate();
    const jwk = await crypto.subtle.exportKey("jwk", keyPair.publicKey);
    if (typeof jwk.x !== "string" || typeof jwk.y !== "string") {
      throw new Error("P-256 JWK is missing coordinates");
    }
    const x = withoutLeadingZeros(fromBase64Url(jwk.x));
    const y = withoutLeadingZeros(fromBase64Url(jwk.y));
    expect(x.length < 32 || y.length < 32).toBe(true);
    const sealed = await sealInboxText(toBase64Url(raw), "pad", "hello");
    withUnpaddedJwkCoordinates(toBase64Url(x), toBase64Url(y));

    expect(await exportInboxPublicKey(keyPair.publicKey)).toBe(toBase64Url(raw));
    await expect(openSealedText(sealed, "pad", keyPair)).resolves.toBe("hello");
  });
});

describe("createVaultInbox", () => {
  function fakeFetch(responses: Array<Response>) {
    return vi.fn(() => Promise.resolve(responses.shift() ?? new Response(null, { status: 204 })));
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
      getToken: () => Promise.resolve("tok"),
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
    expect(calls[0][1].body).toBe(JSON.stringify({ public_key: "k" }));
    expect(calls[0][1].headers).toMatchObject({ Authorization: "Bearer tok" });
  });
});

describe("inbox persistence", () => {
  const backends: VaultChatBackend[] = [];
  afterEach(() => backends.splice(0).forEach((backend) => backend.close()));

  async function setup(previous?: { content: string; wasStopped?: boolean; error?: string }) {
    const fake = await createChatStoreHarness();
    const backend = createVaultChatBackend({
      store: fake.store,
      pollIntervalMs: 0,
      activity: { isActive: () => true, subscribe: () => () => {} },
    });
    backends.push(backend);
    const opened = JSON.parse(vector.plaintext) as InboxPlaintext;
    const messageId = `msg_bg_${opened.inference_id}`;
    await backend.createMessage({
      uniqueId: opened.parent_message_id!,
      conversationId: opened.conversation_id,
      role: "user",
      content: "hello",
    });
    if (previous) {
      await backend.createMessage({
        uniqueId: messageId,
        conversationId: opened.conversation_id,
        role: "assistant",
        ...previous,
      });
    }
    await backend.flush();
    const items = [{ id: vector.id, sealed: vector.sealed, created_at: opened.finished_at }];
    const inbox = {
      putPublicKey: vi.fn(async () => {}),
      list: () => Promise.resolve(items),
      remove: vi.fn(() => {
        items.splice(0);
        return Promise.resolve();
      }),
    };
    const store = vi.fn(async () =>
      backend.upsertMessage({
        uniqueId: messageId,
        conversationId: opened.conversation_id,
        parentMessageId: opened.parent_message_id!,
        role: "assistant",
        content: "Saved answer",
        wasStopped: false,
        error: "",
      })
    );
    const complete = vi.fn(async () => {});
    const keyPair = await recipientKeyPair();
    const deliver = () => deliverInboxAnswers({ inbox, keyPair, backend, store, complete });
    return { fake, backend, inbox, store, complete, deliver, messageId };
  }

  it.each([
    undefined,
    { content: "Partial answer", wasStopped: true },
    { content: "Saved answer", wasStopped: true },
    { content: "Failed answer", error: "Request failed" },
  ])("retains the item after a quota rejection with previous message %j", async (previous) => {
    const { fake, inbox, store, complete, deliver, messageId } = await setup(previous);
    fake.fail({
      op: "putMany",
      error: new ChatStoreError("Storage limit reached", 413, "private_chat_storage_limit_reached"),
      sticky: true,
      when: (writes) => writes.some(({ record }) => record.id === messageId),
    });

    expect(await deliver()).toMatchObject([{ status: "retry", assistantMessage: null }]);
    expect(inbox.remove).not.toHaveBeenCalled();
    expect(complete).not.toHaveBeenCalled();
    expect((await fake.row("message", messageId))?.record.data.content).toBe(previous?.content);

    fake.heal();
    expect(await deliver()).toMatchObject([{ status: "stored" }]);
    expect(store).toHaveBeenCalledTimes(2);
    expect(inbox.remove).toHaveBeenCalledTimes(1);
    expect(complete).toHaveBeenCalledTimes(1);
  });

  it.each([
    new ChatStoreError("Service unavailable", 503),
    new ChatStoreError("Rate limit reached", 429, undefined, 60_000),
    new ChatStoreError("Account changed", 409, "account_changed"),
  ])("retains a new or cached answer when vault defers the write: %s", async (error) => {
    const { fake, inbox, store, complete, deliver, messageId } = await setup();
    fake.fail({
      op: "putMany",
      error,
      sticky: true,
      when: (writes) => writes.some(({ record }) => record.id === messageId),
    });

    expect(await deliver()).toMatchObject([{ status: "retry", assistantMessage: null }]);
    expect(await deliver()).toMatchObject([{ status: "retry", assistantMessage: null }]);
    expect(store).toHaveBeenCalledTimes(1);
    expect(inbox.remove).not.toHaveBeenCalled();
    expect(complete).not.toHaveBeenCalled();
    expect(await fake.row("message", messageId)).toBeUndefined();
  });

  it("confirms persistence before completion and inbox removal", async () => {
    const { fake, inbox, complete, deliver, messageId } = await setup();
    complete.mockImplementation(async () => {
      expect((await fake.row("message", messageId))?.record.data.content).toBe("Saved answer");
    });

    expect(await deliver()).toMatchObject([{ status: "stored" }]);
    expect(complete).toHaveBeenCalledTimes(1);
    expect(inbox.remove).toHaveBeenCalledTimes(1);
  });
});
