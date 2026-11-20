import { webcrypto } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { conformance, createChatStoreHarness } from "../../../test/chat/vaultHarness";
import { deriveMemoryKeyRing } from "../memory/store/memoryKeys";
import { createVaultMediaLibrary, mediaItemId } from "./media";
import type { ChatRecord } from "./types";
import { createVaultAttachments } from "./vaultAttachments";

beforeAll(() => {
  vi.stubGlobal("crypto", webcrypto);
});
afterAll(() => vi.unstubAllGlobals());

describe.runIf(conformance)("media records against a real vault", () => {
  it("keeps media through deleting every chat and never brings a deleted item back", async (context) => {
    const { store } = await createChatStoreHarness();
    if (!store.mediaAttachments) context.skip();
    const id = await mediaItemId(store, "media_1");
    const record: ChatRecord = {
      kind: "media",
      id,
      conversationId: "",
      sortKey: 5,
      createdAt: 5,
      updatedAt: 5,
      isDeleted: false,
      data: {
        localId: "media_1",
        name: "photo.png",
        mimeType: "image/png",
        size: 3,
        source: "upload",
        attachmentId: "0".repeat(32),
      },
    };

    const [created] = await store.putMany([{ record, expectedVersion: 0 }]);
    const [moved] = await store.putMany([
      { record: { ...record, sortKey: 9, updatedAt: 6 }, expectedVersion: created.version },
    ]);
    expect(moved.record.sortKey).toBe(9);
    expect(
      (await store.changes(undefined, { kinds: ["media"] })).items.map((s) => s.record.id)
    ).toEqual([id]);
    expect((await store.changes()).items.some((s) => s.record.kind === "media")).toBe(false);
    expect((await store.getMany([{ kind: "media", id }])).map((s) => s.version)).toEqual([
      moved.version,
    ]);

    await store.deleteAll();
    expect((await store.get("media", id))?.record.isDeleted).toBe(false);

    const [gone] = await store.putMany([
      {
        record: { ...record, isDeleted: true, updatedAt: 7, data: {} },
        expectedVersion: moved.version,
      },
    ]);
    await expect(store.putMany([{ record, expectedVersion: 0 }])).rejects.toMatchObject({
      status: 409,
      code: "version_conflict",
    });
    await expect(
      store.putMany([{ record: { ...record, updatedAt: 8 }, expectedVersion: gone.version }])
    ).rejects.toMatchObject({ status: 409, code: "version_conflict" });

    const library = createVaultMediaLibrary({
      store,
      attachments: createVaultAttachments({
        store,
        keyRing: await deriveMemoryKeyRing("0x" + "34".repeat(65)),
      }),
    });
    expect(await library.list()).toEqual([]);
  });
});
