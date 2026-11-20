import { webcrypto } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { createFakeVault, type FakeVault } from "../../../test/chat/fakeVault";
import { deriveMemoryKeyRing, memoryCipher } from "../memory/store/memoryKeys";
import { createRemoteChatStore } from "./remote";
import { openSealedAttachment, plaintextBytes, type SealedAttachment } from "./sealedAttachments";
import { createVaultAttachments, type VaultAttachmentSource } from "./vaultAttachments";

beforeAll(() => {
  vi.stubGlobal("crypto", webcrypto);
});
afterAll(() => vi.unstubAllGlobals());

const MiB = 1024 * 1024;
const chunkCiphertext = MiB + 28;
const largeSize = 6 * MiB + 12_345;

function patternByte(offset: number): number {
  return (offset * 131 + (offset >>> 13) * 7 + 11) & 0xff;
}

function pattern(size: number): VaultAttachmentSource {
  return {
    size,
    read: (offset, length) => {
      const bytes = new Uint8Array(length);
      for (let i = 0; i < length; i++) bytes[i] = patternByte(offset + i);
      return Promise.resolve(bytes);
    },
  };
}

function matches(bytes: Uint8Array, start: number, end: number): boolean {
  if (bytes.length !== end - start) return false;
  for (let i = 0; i < bytes.length; i++) if (bytes[i] !== patternByte(start + i)) return false;
  return true;
}

function same(a: Uint8Array | undefined, b: Uint8Array | undefined): boolean {
  return !!a && !!b && Buffer.compare(a, b) === 0;
}

const chunked = 50 * MiB + 1;

async function stored(vault: FakeVault, size: number) {
  const keyRing = await deriveMemoryKeyRing("0x" + "56".repeat(65));
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
  await store.putMany([
    {
      record: {
        kind: "message",
        id: "m1",
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
  const id = await attachments.upload(pattern(size));
  await attachments.commit(id, { kind: "message", id: "m1" });
  return { attachments, id, key: keyRing.v3 };
}

async function sealedDownload(vault: FakeVault, size: number) {
  const { attachments, id, key } = await stored(vault, size);
  const pieces: Uint8Array[] = [];
  const found = await attachments.readSealedTo(id, { write: (piece) => void pieces.push(piece) });
  const bytes = new Uint8Array(pieces.reduce((total, piece) => total + piece.length, 0));
  pieces.reduce((offset, piece) => (bytes.set(piece, offset), offset + piece.length), 0);
  return { found, pieces, bytes, id, key };
}

function fromBytes(bytes: Uint8Array, key: CryptoKey, attachmentId: string) {
  const reads: [number, number][] = [];
  const sealed: SealedAttachment = {
    key,
    attachmentId,
    sizeBytes: bytes.length,
    read: (start, end) => {
      reads.push([start, end]);
      return Promise.resolve(bytes.slice(start, end));
    },
  };
  return { sealed, reads };
}

describe("sealed attachment reads", () => {
  it("downloads a chunked attachment's ciphertext exactly as vault stores it, a window at a time", async () => {
    const vault = createFakeVault({ multipartAttachments: true });
    const { found, pieces, bytes, id } = await sealedDownload(vault, chunked);

    expect(found).toBe(true);
    expect(pieces.length).toBeGreaterThan(1);
    expect(same(bytes, vault.blobs.get(id))).toBe(true);
    expect(bytes[0]).toBe(2);
  }, 60_000);

  it("downloads a single-frame attachment's ciphertext without decrypting it", async () => {
    const vault = createFakeVault();
    const { found, bytes, id } = await sealedDownload(vault, 4096);

    expect(found).toBe(true);
    expect(same(bytes, vault.blobs.get(id))).toBe(true);
    expect(bytes[0]).toBe(1);
    expect(bytes.length).toBe(4096 + 29);
  });

  it("decrypts any plaintext range of a chunked attachment from the chunks that hold it", async () => {
    const vault = createFakeVault({ multipartAttachments: true });
    const { bytes, id, key } = await sealedDownload(vault, chunked);
    const { sealed, reads } = fromBytes(bytes, key, id);
    const total = plaintextBytes(bytes.length);
    expect(total).toBe(chunked);

    for (const [start, end] of [
      [0, 10],
      [MiB - 5, MiB + 5],
      [3 * MiB, 5 * MiB],
      [total - 1, total],
      [total - 1000, total + 50],
      [49 * MiB, total],
    ] as const) {
      expect(
        matches(await openSealedAttachment(sealed, start, end), start, Math.min(end, total))
      ).toBe(true);
    }
    expect(await openSealedAttachment(sealed, total, total + 10)).toEqual(new Uint8Array(0));

    reads.length = 0;
    await openSealedAttachment(sealed, MiB - 5, MiB + 5);
    await openSealedAttachment(sealed, 3 * MiB + 1, 3 * MiB + 2);
    expect(reads).toEqual([
      [0, 1 + 2 * chunkCiphertext],
      [1 + 3 * chunkCiphertext, 1 + 4 * chunkCiphertext],
    ]);
  }, 60_000);

  it("decrypts ranges of a single-frame attachment", async () => {
    const vault = createFakeVault();
    const { bytes, id, key } = await sealedDownload(vault, largeSize);
    const { sealed } = fromBytes(bytes, key, id);

    expect(matches(await openSealedAttachment(sealed, 5, MiB + 7), 5, MiB + 7)).toBe(true);
    expect(
      matches(
        await openSealedAttachment(sealed, largeSize - 3, largeSize + 3),
        largeSize - 3,
        largeSize
      )
    ).toBe(true);
  });

  it("refuses a tampered chunk, another attachment id and a truncated copy", async () => {
    const vault = createFakeVault({ multipartAttachments: true });
    const { bytes, id, key } = await sealedDownload(vault, chunked);
    const tampered = bytes.slice();
    tampered[1 + 2 * chunkCiphertext + 40] ^= 1;

    await expect(
      openSealedAttachment(fromBytes(tampered, key, id).sealed, 2 * MiB, 2 * MiB + 1)
    ).rejects.toMatchObject({ code: "invalid_attachment" });
    expect(
      matches(await openSealedAttachment(fromBytes(tampered, key, id).sealed, 0, 3), 0, 3)
    ).toBe(true);
    await expect(
      openSealedAttachment(fromBytes(bytes, key, "f".repeat(32)).sealed, 0, 3)
    ).rejects.toMatchObject({ code: "invalid_attachment" });
    const truncated = fromBytes(bytes.subarray(0, bytes.length - 10), key, id).sealed;
    await expect(
      openSealedAttachment({ ...truncated, sizeBytes: bytes.length }, 50 * MiB, 50 * MiB + 1)
    ).rejects.toMatchObject({ code: "invalid_attachment" });
  }, 60_000);
});
