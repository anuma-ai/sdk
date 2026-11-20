import { webcrypto } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { createFakeVault, type FakeVault } from "../../../test/chat/fakeVault";
import { deriveMemoryKeyRing, memoryCipher } from "../memory/store/memoryKeys";
import { mediaItemId, seedMediaToVault } from "./media";
import { createRemoteChatStore } from "./remote";
import type { ChatStore } from "./types";
import {
  createVaultAttachments,
  maxVaultAttachmentBytes,
  type VaultAttachmentJournal,
  type VaultAttachmentSource,
} from "./vaultAttachments";

beforeAll(() => {
  vi.stubGlobal("crypto", webcrypto);
});
afterAll(() => vi.unstubAllGlobals());

const MiB = 1024 * 1024;
const partBytes = 16 * MiB;
const chunkBytes = MiB;
const chunkCiphertext = chunkBytes + 28;
const largeSize = 60 * MiB + 12_345;
const urlTtlMs = 15 * 60_000;

async function device(vault: FakeVault) {
  const keyRing = await deriveMemoryKeyRing("0x" + "34".repeat(65));
  const store = await createRemoteChatStore({
    baseUrl: "https://vault.test",
    getToken: () => Promise.resolve("token"),
    keyId: keyRing.keyId,
    fetch: vault.fetch,
    ...memoryCipher(keyRing),
  });
  const attachments = createVaultAttachments({
    store,
    keyRing,
    fetch: vault.fetch,
    now: vault.now,
    retryDelayMs: 0,
  });
  return { store, attachments, keyRing };
}

function patternByte(offset: number): number {
  return (offset * 131 + (offset >>> 13) * 7 + 11) & 0xff;
}

function pattern(size: number, onRead?: (offset: number) => void) {
  let pulled = 0;
  const source: VaultAttachmentSource & { pulled(): number } = {
    size,
    read: (offset, length) => {
      onRead?.(offset);
      pulled += length;
      const bytes = new Uint8Array(length);
      for (let i = 0; i < length; i++) bytes[i] = patternByte(offset + i);
      return Promise.resolve(bytes);
    },
    pulled: () => pulled,
  };
  return source;
}

async function putMessage(store: ChatStore, id: string) {
  await store.putMany([
    {
      record: {
        kind: "message",
        id,
        conversationId: "c1",
        sortKey: 1,
        createdAt: 1,
        updatedAt: 1,
        isDeleted: false,
        data: { role: "user", content: "a video" },
      },
      expectedVersion: 0,
    },
  ]);
}

function partPuts(vault: FakeVault) {
  return vault.requests.filter(
    (r) => r.host === "r2.test" && r.method === "PUT" && r.path.includes("partNumber=")
  );
}

function partUrlRequests(vault: FakeVault) {
  return vault.requests
    .filter((r) => /\/parts$/.test(r.path))
    .map(
      (r) =>
        (JSON.parse(new TextDecoder().decode(r.body!)) as { part_numbers: number[] }).part_numbers
    );
}

function checkingSink() {
  let written = 0;
  let mismatch = -1;
  return {
    write: (bytes: Uint8Array) => {
      for (let i = 0; i < bytes.length; i++)
        if (mismatch < 0 && bytes[i] !== patternByte(written + i)) mismatch = written + i;
      written += bytes.length;
    },
    written: () => written,
    mismatch: () => mismatch,
  };
}

async function uploadLarge(vault: FakeVault, source = pattern(largeSize)) {
  const phone = await device(vault);
  await putMessage(phone.store, "m1");
  const id = await phone.attachments.upload(source);
  await phone.attachments.commit(id, { kind: "message", id: "m1" });
  return { phone, id };
}

describe("chunked vault attachments", () => {
  it("uploads a file over 50 MiB in parts and streams it back, holding only a few chunks", async () => {
    const vault = createFakeVault({ multipartAttachments: true });
    const phone = await device(vault);
    await putMessage(phone.store, "m1");
    const source = pattern(largeSize);
    let uploaded = 0;
    let heldWhileUploading = 0;
    vault.faults.push((request) => {
      if (request.host === "r2.test" && request.method === "PUT") {
        heldWhileUploading = Math.max(heldWhileUploading, source.pulled() - uploaded);
        uploaded += request.body!.length;
      }
      return undefined;
    });

    const id = await phone.attachments.upload(source);
    await phone.attachments.commit(id, { kind: "message", id: "m1" });

    const ciphertext = 1 + largeSize + 28 * Math.ceil(largeSize / chunkBytes);
    expect(vault.attachments.get(id)).toMatchObject({ size: ciphertext, state: "committed" });
    expect(partPuts(vault)).toHaveLength(Math.ceil(ciphertext / partBytes));
    expect(partUrlRequests(vault)).toEqual([[1, 2, 3, 4]]);
    expect(source.pulled()).toBe(largeSize);
    expect(heldWhileUploading).toBeLessThanOrEqual(partBytes + 2 * chunkBytes);
    expect(vault.blobs.get(id)![0]).toBe(2);

    const web = await device(vault);
    const sink = checkingSink();
    let fetched = 0;
    let heldWhileReading = 0;
    const ranges: string[] = [];
    vault.faults.push((request) => {
      if (request.host === "r2.test" && request.method === "GET") {
        ranges.push(request.headers.range ?? "");
        const [, from, to] = /bytes=(\d+)-(\d+)/.exec(request.headers.range ?? "") ?? [];
        fetched += Number(to) - Number(from) + 1;
        heldWhileReading = Math.max(heldWhileReading, fetched - sink.written());
      }
      return undefined;
    });

    expect(await web.attachments.readTo(id, sink)).toBe(true);

    expect(sink.written()).toBe(largeSize);
    expect(sink.mismatch()).toBe(-1);
    expect(ranges).toHaveLength(Math.ceil(Math.ceil(largeSize / chunkBytes) / 4));
    expect(ranges[0]).toBe(`bytes=0-${4 * chunkCiphertext}`);
    expect(heldWhileReading).toBeLessThanOrEqual(5 * chunkCiphertext);
    const whole = await web.attachments.read(id);
    expect(whole?.length).toBe(largeSize);
    expect(whole![largeSize - 1]).toBe(patternByte(largeSize - 1));
  });

  it("fails on a tampered, reordered, dropped or truncated chunk", async () => {
    const vault = createFakeVault({ multipartAttachments: true });
    const { id } = await uploadLarge(vault);
    const original = vault.blobs.get(id)!;
    const size = original.length;
    const chunk = (index: number) =>
      original.slice(1 + index * chunkCiphertext, 1 + (index + 1) * chunkCiphertext);
    const lastStart = 1 + Math.floor((size - 1) / chunkCiphertext) * chunkCiphertext;
    const tampered = original.slice();
    tampered[1 + 10 * chunkCiphertext + 40] ^= 1;
    const reordered = original.slice();
    reordered.set(chunk(3), 1 + 2 * chunkCiphertext);
    reordered.set(chunk(2), 1 + 3 * chunkCiphertext);
    const dropped = new Uint8Array(size - chunkCiphertext);
    dropped.set(original.subarray(0, 1 + 5 * chunkCiphertext));
    dropped.set(original.subarray(1 + 6 * chunkCiphertext), 1 + 5 * chunkCiphertext);
    const truncated = original.slice(0, lastStart);

    for (const [name, blob] of Object.entries({ tampered, reordered, dropped, truncated })) {
      vault.blobs.set(id, blob as Uint8Array<ArrayBuffer>);
      vault.attachments.get(id)!.size = blob.length;
      const reader = await device(vault);
      await expect(
        reader.attachments.readTo(id, { write: () => undefined }),
        name
      ).rejects.toMatchObject({ code: "invalid_attachment" });
    }

    vault.blobs.set(id, original);
    vault.attachments.get(id)!.size = size;
    const reader = await device(vault);
    expect(await reader.attachments.readTo(id, checkingSink())).toBe(true);
  });

  it("re-fetches part URLs that storage refused or that expired, and finishes the same reservation", async () => {
    const vault = createFakeVault({ multipartAttachments: true });
    vault.faults.push((request) =>
      request.path.includes("partNumber=2&")
        ? new Response("<Code>AccessDenied</Code>", { status: 403 })
        : undefined
    );
    let slept = false;
    const source = pattern(largeSize, (offset) => {
      if (slept || offset < 2 * partBytes) return;
      slept = true;
      vault.advance(urlTtlMs + 1);
    });

    const { phone, id } = await uploadLarge(vault, source);

    expect(partUrlRequests(vault)).toEqual([
      [1, 2, 3, 4],
      [2, 3, 4],
      [3, 4],
    ]);
    expect(vault.requests.filter((r) => r.path === "/api/private-chats/attachments")).toHaveLength(
      1
    );
    expect(partPuts(vault).map((r) => /partNumber=(\d+)/.exec(r.path)![1])).toEqual([
      "1",
      "2",
      "2",
      "3",
      "4",
    ]);
    const sink = checkingSink();
    expect(await phone.attachments.readTo(id, sink)).toBe(true);
    expect([sink.written(), sink.mismatch()]).toEqual([largeSize, -1]);
  });

  it("refuses a download whose storage ignores the byte range", async () => {
    const vault = createFakeVault({ multipartAttachments: true });
    const { phone, id } = await uploadLarge(vault);
    vault.faults.push((request) =>
      request.host === "r2.test" && request.headers.range
        ? new Response(new Uint8Array(64))
        : undefined
    );

    await expect(phone.attachments.readTo(id, { write: () => undefined })).rejects.toMatchObject({
      code: "attachment_range_unsupported",
    });
  });

  it("keeps single frames for files up to 50 MiB and reads them back", async () => {
    const vault = createFakeVault({ multipartAttachments: true });
    const phone = await device(vault);
    await putMessage(phone.store, "m1");
    const bytes = new TextEncoder().encode("a short voice note");

    const id = await phone.attachments.upload(bytes);
    await phone.attachments.commit(id, { kind: "message", id: "m1" });

    expect(partUrlRequests(vault)).toEqual([]);
    const frame = vault.blobs.get(id)!;
    expect([frame[0], frame.length]).toEqual([1, bytes.length + 29]);
    const pieces: Uint8Array[] = [];
    expect(await phone.attachments.readTo(id, { write: (piece) => void pieces.push(piece) })).toBe(
      true
    );
    expect(pieces).toEqual([bytes]);
    expect(await phone.attachments.read(id)).toEqual(bytes);
  });

  it("refuses a file over 50 MiB before reserving when vault takes no parts", async () => {
    const vault = createFakeVault();
    const phone = await device(vault);
    const source = pattern(maxVaultAttachmentBytes + 1);

    await expect(phone.attachments.upload(source)).rejects.toMatchObject({
      status: 413,
      code: "attachment_too_large",
    });
    expect(source.pulled()).toBe(0);
    expect(vault.requests.some((r) => r.path.startsWith("/api/private-chats/attachments"))).toBe(
      false
    );
  });

  it("records a large library file's plaintext size when seeding resumes its upload", async () => {
    const vault = createFakeVault({ mediaAttachments: true, multipartAttachments: true });
    const phone = await device(vault);
    const entries = new Map<string, string>();
    const journal: VaultAttachmentJournal = {
      get: (key) => Promise.resolve(entries.get(key) ?? null),
      set: (key, value) => {
        if (value === null) entries.delete(key);
        else entries.set(key, value);
        return Promise.resolve();
      },
    };
    const item = {
      localId: "video_1",
      name: "trip.mp4",
      mimeType: "video/mp4",
      source: "studio",
      read: () => Promise.resolve(pattern(largeSize)),
    };
    let crashed = false;
    vault.faults.push((request) => {
      if (crashed || !request.path.startsWith("/api/private-chats/records/batch")) return undefined;
      crashed = true;
      return Promise.reject(new TypeError("app killed"));
    });
    const run = () =>
      seedMediaToVault({
        store: phone.store,
        attachments: phone.attachments,
        journal,
        items: [item],
        now: vault.now,
      });

    await expect(run()).rejects.toThrow("app killed");
    expect(await run()).toMatchObject({ uploaded: 0, oversized: [] });

    const id = await mediaItemId(phone.store, "video_1");
    const snapshot = await phone.store.get("media", id);
    expect(snapshot?.record.data.size).toBe(largeSize);
    expect(partUrlRequests(vault)).toHaveLength(1);
  });
});
