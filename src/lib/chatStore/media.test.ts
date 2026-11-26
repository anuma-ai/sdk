import { webcrypto } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { createFakeVault, type FakeVault } from "../../../test/chat/fakeVault";
import { deriveMemoryKeyRing, memoryCipher } from "../memory/store/memoryKeys";
import { appFileId, createAppFileIndex, getAppFile, listAppFiles, saveAppFile } from "./appFiles";
import {
  createVaultMediaLibrary,
  type LocalMediaItem,
  mediaItemId,
  seedMediaToVault,
} from "./media";
import { createRemoteChatStore } from "./remote";
import { ChatStoreError } from "./types";
import {
  createVaultAttachments,
  type VaultAttachmentCache,
  type VaultAttachmentJournal,
} from "./vaultAttachments";

beforeAll(() => {
  vi.stubGlobal("crypto", webcrypto);
});
afterAll(() => vi.unstubAllGlobals());

const signature = "0x" + "34".repeat(65);

async function device(vault: FakeVault, cache?: VaultAttachmentCache) {
  const keyRing = await deriveMemoryKeyRing(signature);
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
    cache,
  });
  let notify: ((connected: boolean) => void) | undefined;
  const library = createVaultMediaLibrary({
    store,
    attachments,
    now: vault.now,
    subscribeChanges: (onChange) => {
      notify = onChange;
      return () => {
        notify = undefined;
      };
    },
  });
  return { store, attachments, library, changed: () => notify?.(true) };
}

function bytes(text: string): Uint8Array<ArrayBuffer> {
  return new TextEncoder().encode(text);
}

function contains(haystack: Uint8Array, needle: Uint8Array): boolean {
  outer: for (let i = 0; i + needle.length <= haystack.length; i++) {
    for (let j = 0; j < needle.length; j++) if (haystack[i + j] !== needle[j]) continue outer;
    return true;
  }
  return false;
}

function photo(localId: string) {
  return { localId, name: `${localId}.png`, mimeType: "image/png", source: "upload" };
}

function localItem(localId: string, content: string | null): LocalMediaItem {
  return {
    ...photo(localId),
    createdAt: 1_700_000_000_000,
    read: () => Promise.resolve(content === null ? null : bytes(content)),
  };
}

function memoryJournal(): VaultAttachmentJournal & { entries: Map<string, string> } {
  const entries = new Map<string, string>();
  return {
    entries,
    get: (key) => Promise.resolve(entries.get(key) ?? null),
    set: (key, value) => {
      if (value === null) entries.delete(key);
      else entries.set(key, value);
      return Promise.resolve();
    },
  };
}

function memoryCache(): VaultAttachmentCache & { entries: Map<string, Uint8Array> } {
  const entries = new Map<string, Uint8Array>();
  return {
    entries,
    get: (id) => Promise.resolve(entries.get(id) ?? null),
    set: (id, value) => {
      entries.set(id, value);
      return Promise.resolve();
    },
    delete: (id) => {
      entries.delete(id);
      return Promise.resolve();
    },
  };
}

function settled() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

async function conversation(vault: FakeVault, store: Awaited<ReturnType<typeof device>>["store"]) {
  await store.putMany([
    {
      record: {
        kind: "conversation",
        id: "conv_1",
        conversationId: "",
        sortKey: 1,
        createdAt: 1,
        updatedAt: 1,
        isDeleted: false,
        data: { title: "Deck" },
      },
      expectedVersion: 0,
    },
  ]);
  return vault;
}

describe("vault media library", () => {
  it("stores, lists, reads and deletes library files on every device", async () => {
    const vault = createFakeVault({ mediaAttachments: true });
    const phone = await device(vault);
    const cache = memoryCache();
    const web = await device(vault, cache);
    const pixels = bytes("a private photo of a passport");

    const created = await phone.library.create(
      { ...photo("media_1"), createdAt: 1_700_000_000_000, metadata: { width: 3 } },
      new Blob([pixels])
    );

    expect(created).toMatchObject({
      id: await mediaItemId(phone.store, "media_1"),
      localId: "media_1",
      name: "media_1.png",
      mimeType: "image/png",
      size: pixels.length,
      source: "upload",
      metadata: { width: 3 },
      createdAt: 1_700_000_000_000,
    });
    expect(vault.attachments.get(created.attachmentId)).toMatchObject({
      state: "committed",
      ownerKind: "media",
      ownerId: created.id,
    });
    const stored = vault.record("media", created.id)!.record;
    expect(stored.conversation_id).toBe("");
    expect(stored.payload).not.toContain("passport");
    expect(contains(vault.blobs.get(created.attachmentId)!, pixels)).toBe(false);

    expect(await web.library.list()).toEqual([created]);
    expect(await web.library.read(created.id)).toEqual(pixels);
    expect(cache.entries.has(created.attachmentId)).toBe(true);
    await expect(phone.library.create(photo("media_1"), pixels)).resolves.toEqual(created);
    expect(vault.uploads()).toHaveLength(1);

    const events: string[] = [];
    phone.library.subscribe((event) => events.push(event.origin));
    expect(await web.library.delete(created.id)).toBe(true);
    phone.changed();
    await settled();

    expect(cache.entries.size).toBe(0);
    expect(events).toEqual(["remote"]);
    expect(await phone.library.list()).toEqual([]);
    expect(await phone.library.read(created.id)).toBeNull();
    expect(vault.attachments.has(created.attachmentId)).toBe(false);
    expect(await phone.library.delete(created.id)).toBe(false);
  });

  it("treats a create that conflicts with a delete elsewhere as deleted", async () => {
    const vault = createFakeVault({ mediaAttachments: true });
    const phone = await device(vault);
    const web = await device(vault);
    const id = await mediaItemId(phone.store, "media_1");
    let raced = false;
    vault.faults.push(async (request) => {
      if (raced || request.host !== "r2.test" || request.method !== "PUT") return undefined;
      raced = true;
      await web.library.create(photo("media_1"), bytes("from the web"));
      await web.library.delete(id);
      return undefined;
    });

    await expect(
      phone.library.create(photo("media_1"), bytes("from the phone"))
    ).rejects.toMatchObject({ code: "media_deleted" });

    expect(vault.record("media", id)?.record.is_deleted).toBe(true);
    expect(vault.attachments.size).toBe(0);
    await expect(phone.library.create(photo("media_1"), bytes("again"))).rejects.toMatchObject({
      code: "media_deleted",
    });
    expect(vault.uploads()).toHaveLength(2);
    expect(await phone.library.list()).toEqual([]);
  });

  it("rebuilds the list from the start when vault rejects its changes cursor", async () => {
    const vault = createFakeVault({ mediaAttachments: true });
    const phone = await device(vault);
    const web = await device(vault);
    const first = await web.library.create(photo("media_1"), bytes("one"));
    expect(await phone.library.list()).toEqual([first]);
    const second = await web.library.create(photo("media_2"), bytes("two"));
    await web.library.delete(first.id);
    vault.faults.push((request) =>
      request.path.startsWith("/api/private-chats/changes") && request.path.includes("cursor=")
        ? Response.json({ code: "cursor_expired", detail: "gone" }, { status: 410 })
        : undefined
    );

    expect(await phone.library.list()).toEqual([second]);
  });

  it("stops reading an item once delete reports that another device deleted it", async () => {
    const vault = createFakeVault({ mediaAttachments: true });
    const phone = await device(vault, memoryCache());
    const web = await device(vault);
    const item = await phone.library.create(photo("media_1"), bytes("cached"));
    expect(await phone.library.read(item.id)).toEqual(bytes("cached"));
    await web.library.delete(item.id);

    expect(await phone.library.delete(item.id)).toBe(false);
    expect(await phone.library.read(item.id)).toBeNull();
  });
});

describe("large app files", { timeout: 60_000 }, () => {
  it("round-trips a file over the record limit and deletes the attachment each edit supersedes", async () => {
    const vault = createFakeVault({ mediaAttachments: true });
    const phone = await device(vault);
    const web = await device(vault);
    await conversation(vault, phone.store);
    const large = "<p>" + "x".repeat(2 * 1024 * 1024) + "</p>";
    const file = { conversationId: "conv_1", path: "/deck.jsx", content: large };
    const id = await appFileId(phone.store, "conv_1", "/deck.jsx");

    const saved = await saveAppFile(phone.store, file, undefined, phone.attachments);

    expect(saved).toMatchObject({ path: "deck.jsx", content: large, version: 1 });
    const [first] = vault.attachments.values();
    expect(first).toMatchObject({ state: "committed", ownerKind: "app_file", ownerId: id });
    expect(
      (await getAppFile(web.store, "conv_1", "deck.jsx", undefined, web.attachments))?.content
    ).toBe(large);
    expect((await listAppFiles(web.store, "conv_1", undefined, web.attachments))[0].content).toBe(
      large
    );
    expect((await createAppFileIndex(web.store, web.attachments).list())[0].content).toBe(large);

    const edited = large.replace("<p>", "<h1>");
    await saveAppFile(web.store, { ...file, content: edited }, undefined, web.attachments);
    expect(vault.attachments.has(first.id)).toBe(false);
    expect(vault.attachments.size).toBe(1);
    expect(
      (await getAppFile(phone.store, "conv_1", "deck.jsx", undefined, phone.attachments))?.content
    ).toBe(edited);

    await saveAppFile(
      phone.store,
      { ...file, content: "<p>short</p>" },
      undefined,
      phone.attachments
    );
    expect(vault.attachments.size).toBe(0);
    expect(
      (await getAppFile(web.store, "conv_1", "deck.jsx", undefined, web.attachments))?.content
    ).toBe("<p>short</p>");
  });

  it("keeps a large file readable on every device when the save's answer is lost", async () => {
    const vault = createFakeVault({ mediaAttachments: true });
    const phone = await device(vault);
    const web = await device(vault);
    await conversation(vault, phone.store);
    const large = "y".repeat(2 * 1024 * 1024);
    let lost = false;
    vault.faults.push(async (request) => {
      if (lost || !request.path.startsWith("/api/private-chats/records/batch")) return undefined;
      lost = true;
      await vault.fetch(`https://vault.test${request.path}`, {
        method: request.method,
        body: request.body,
      });
      throw new TypeError("connection reset");
    });

    await expect(
      saveAppFile(
        phone.store,
        { conversationId: "conv_1", path: "deck.jsx", content: large },
        undefined,
        phone.attachments
      )
    ).rejects.toThrow("connection reset");

    expect([...vault.attachments.values()]).toMatchObject([
      { state: "committed", ownerKind: "app_file" },
    ]);
    expect(
      (await getAppFile(web.store, "conv_1", "deck.jsx", undefined, web.attachments))?.content
    ).toBe(large);
  });

  it("lists the readable large files one download at a time when one will not open", async () => {
    const vault = createFakeVault({ mediaAttachments: true });
    const phone = await device(vault);
    const web = await device(vault);
    await conversation(vault, phone.store);
    for (const name of ["a", "b", "c"])
      await saveAppFile(
        phone.store,
        { conversationId: "conv_1", path: `${name}.jsx`, content: name.repeat(2 * 1024 * 1024) },
        undefined,
        phone.attachments
      );
    const [broken] = vault.attachments.keys();
    vault.blobs.get(broken)![40] ^= 1;
    let downloading = 0;
    let most = 0;
    vault.faults.push(async (request) => {
      if (request.host !== "r2.test" || request.method !== "GET") return undefined;
      most = Math.max(most, ++downloading);
      await new Promise((resolve) => setTimeout(resolve, 5));
      downloading--;
      return undefined;
    });

    const files = await listAppFiles(web.store, "conv_1", undefined, web.attachments);

    expect(files.map((f) => f.path).sort()).toEqual(["b.jsx", "c.jsx"]);
    expect(most).toBe(1);
  });

  it("reports a save as done when deleting the attachment it replaced fails", async () => {
    const vault = createFakeVault({ mediaAttachments: true });
    const phone = await device(vault);
    await conversation(vault, phone.store);
    const file = {
      conversationId: "conv_1",
      path: "deck.jsx",
      content: "v".repeat(2 * 1024 * 1024),
    };
    await saveAppFile(phone.store, file, undefined, phone.attachments);
    for (let i = 0; i < 4; i++)
      vault.faults.push((request) =>
        request.method === "DELETE"
          ? Response.json({ code: "unavailable", detail: "down" }, { status: 503 })
          : undefined
      );

    const saved = await saveAppFile(
      phone.store,
      { ...file, content: "w".repeat(2 * 1024 * 1024) },
      undefined,
      phone.attachments
    );

    expect(saved).toMatchObject({ version: 2, content: "w".repeat(2 * 1024 * 1024) });
    expect(vault.attachments.size).toBe(2);
  });
});

describe("seedMediaToVault", () => {
  it("uploads a bounded batch per run and reports what it left", async () => {
    const vault = createFakeVault({ mediaAttachments: true });
    const phone = await device(vault);
    const items = [
      localItem("a", "alpha"),
      localItem("gone", null),
      localItem("b", "beta"),
      localItem("c", "gamma"),
    ];
    const journal = memoryJournal();
    const run = () =>
      seedMediaToVault({
        store: phone.store,
        attachments: phone.attachments,
        journal,
        items,
        maxUploads: 2,
        now: vault.now,
      });

    expect(await run()).toEqual({
      uploaded: 2,
      deleted: [],
      missing: ["gone"],
      oversized: [],
      deferred: [],
      remaining: 1,
    });
    expect(await run()).toMatchObject({ uploaded: 1, remaining: 0 });
    expect(await run()).toMatchObject({ uploaded: 0, remaining: 0 });
    expect(vault.uploads()).toHaveLength(3);
    expect((await phone.library.list()).map((item) => item.localId).sort()).toEqual([
      "a",
      "b",
      "c",
    ]);
    expect(await phone.library.read(await mediaItemId(phone.store, "c"))).toEqual(bytes("gamma"));
    expect(journal.entries.size).toBe(0);
  });

  it("resumes after a crash at each step without uploading or listing an item twice", async () => {
    const vault = createFakeVault({ mediaAttachments: true });
    const phone = await device(vault);
    const items = [localItem("a", "alpha"), localItem("b", "beta"), localItem("c", "gamma")];
    const journal = memoryJournal();
    const run = () =>
      seedMediaToVault({
        store: phone.store,
        attachments: phone.attachments,
        journal,
        items,
        now: vault.now,
      });
    const crashOn = (matches: (path: string) => boolean, skip: number) => {
      let seen = 0;
      vault.faults.push((request) => {
        if (!matches(request.path)) return undefined;
        if (seen++ < skip) return undefined;
        return Promise.reject(new TypeError("app killed"));
      });
    };

    crashOn((p) => p.startsWith("/api/private-chats/records/batch"), 1);
    await expect(run()).rejects.toThrow("app killed");
    vault.faults.length = 0;
    crashOn((p) => /\/commit$/.test(p), 0);
    await expect(run()).rejects.toThrow("app killed");
    vault.faults.length = 0;
    crashOn((p) => /\/commit$/.test(p), 1);
    await expect(run()).rejects.toThrow("app killed");
    vault.faults.length = 0;

    expect(await run()).toMatchObject({ uploaded: 0, remaining: 0 });
    const before = vault.requests.length;
    expect(await run()).toMatchObject({ uploaded: 0, remaining: 0 });
    expect(
      vault.requests
        .slice(before)
        .filter(({ method, path }) => method !== "GET" && path !== "/api/private-chats/records/get")
    ).toEqual([]);
    expect(vault.uploads()).toHaveLength(3);
    expect([...vault.attachments.values()].map((a) => a.state)).toEqual([
      "committed",
      "committed",
      "committed",
    ]);
    const listed = await phone.library.list();
    expect(listed.map((item) => item.localId).sort()).toEqual(["a", "b", "c"]);
    for (const item of listed)
      expect(vault.attachments.get(item.attachmentId)?.ownerId).toBe(item.id);
    expect(journal.entries.size).toBe(0);
  });

  it.each([
    { state: "pending", additionalUploads: 0 },
    { state: "gone", additionalUploads: 1 },
  ])("recovers a $state attachment after journal loss", async ({ state, additionalUploads }) => {
    const vault = createFakeVault({ mediaAttachments: true });
    const phone = await device(vault);
    const journal = memoryJournal();
    const run = (maxUploads?: number) =>
      seedMediaToVault({
        store: phone.store,
        attachments: phone.attachments,
        journal,
        items: [localItem("a", "alpha")],
        maxUploads,
        now: vault.now,
      });

    vault.faults.push((request) => {
      if (request.path.endsWith("/commit")) return Promise.reject(new TypeError("app killed"));
    });
    await expect(run()).rejects.toThrow("app killed");
    const [{ id, attachmentId }] = await phone.library.list();
    expect(vault.attachments.get(attachmentId)?.state).toBe("pending");
    expect(await phone.library.read(id)).toBeNull();

    vault.faults.length = 0;
    expect(journal.entries.size).toBe(1);
    journal.entries.clear();
    if (state === "gone") await phone.attachments.delete(attachmentId);

    expect(await run(additionalUploads)).toMatchObject({
      uploaded: additionalUploads,
      remaining: 0,
    });
    const listed = await phone.library.list();
    expect(listed.map((item) => item.id)).toEqual([id]);
    const [recovered] = listed;
    expect(vault.attachments.get(recovered.attachmentId)).toMatchObject({
      state: "committed",
      ownerKind: "media",
      ownerId: id,
    });
    expect(await phone.library.read(id)).toEqual(bytes("alpha"));
    expect(vault.uploads()).toHaveLength(1 + additionalUploads);
  });

  it("checks existing attachments in bounded parallel without extra uploads", async () => {
    const vault = createFakeVault({ mediaAttachments: true });
    const phone = await device(vault);
    const journal = memoryJournal();
    const items = Array.from({ length: 12 }, (_, i) => localItem(`item_${i}`, `content ${i}`));
    const run = (maxUploads?: number) =>
      seedMediaToVault({
        store: phone.store,
        attachments: phone.attachments,
        journal,
        items,
        maxUploads,
        now: vault.now,
      });
    expect(await run()).toMatchObject({ uploaded: 12, remaining: 0 });

    let inFlight = 0;
    let peak = 0;
    let lookups = 0;
    vault.faults.push(async (request) => {
      if (request.method !== "GET" || !/\/attachments\/[0-9a-f]{32}\?/.test(request.path)) return;
      lookups++;
      peak = Math.max(peak, ++inFlight);
      await new Promise((resolve) => setTimeout(resolve, 5));
      inFlight--;
    });

    expect(await run(0)).toEqual({
      uploaded: 0,
      deleted: [],
      missing: [],
      oversized: [],
      deferred: [],
      remaining: 0,
    });
    expect(lookups).toBe(12);
    expect(peak).toBeGreaterThan(1);
    expect(peak).toBeLessThanOrEqual(8);
    expect(vault.uploads()).toHaveLength(12);
  });

  it("keeps uploads serial and limited while checking attachments in parallel", async () => {
    const vault = createFakeVault({ mediaAttachments: true });
    const phone = await device(vault);
    const journal = memoryJournal();
    const items = Array.from({ length: 6 }, (_, i) => localItem(`item_${i}`, `content ${i}`));
    const run = (maxUploads?: number) =>
      seedMediaToVault({
        store: phone.store,
        attachments: phone.attachments,
        journal,
        items,
        maxUploads,
        now: vault.now,
      });
    await run();
    for (const item of await phone.library.list())
      if (item.localId !== "item_5") await phone.attachments.delete(item.attachmentId);

    let uploading = 0;
    let peakUploads = 0;
    vault.faults.push(async (request) => {
      if (request.host !== "r2.test" || request.method !== "PUT") return;
      peakUploads = Math.max(peakUploads, ++uploading);
      await new Promise((resolve) => setTimeout(resolve, 5));
      uploading--;
    });

    expect(await run(2)).toMatchObject({ uploaded: 2, remaining: 3 });
    expect(peakUploads).toBe(1);
    expect(vault.uploads()).toHaveLength(8);
    expect(await run(5)).toMatchObject({ uploaded: 3, remaining: 0 });
    expect(vault.uploads()).toHaveLength(11);
  });

  it("skips items deleted on another device", async () => {
    const vault = createFakeVault({ mediaAttachments: true });
    const phone = await device(vault);
    const web = await device(vault);
    const journal = memoryJournal();
    const run = () =>
      seedMediaToVault({
        store: phone.store,
        attachments: phone.attachments,
        journal,
        items: [localItem("a", "alpha")],
        now: vault.now,
      });
    await run();
    await web.library.delete(await mediaItemId(web.store, "a"));

    expect(await run()).toMatchObject({ uploaded: 0, deleted: ["a"] });
    expect(vault.uploads()).toHaveLength(1);
  });
});

describe("without vault media support", { timeout: 60_000 }, () => {
  it("keeps media on the device and large app files out of vault", async () => {
    const vault = createFakeVault();
    const phone = await device(vault);
    await conversation(vault, phone.store);
    const before = vault.requests.length;

    expect(phone.store.mediaAttachments).toBeUndefined();
    expect(phone.library.enabled).toBe(false);
    expect(await phone.library.list()).toEqual([]);
    expect(await phone.library.read("anything")).toBeNull();
    await expect(phone.library.create(photo("media_1"), bytes("x"))).rejects.toMatchObject({
      code: "media_unsupported",
    });
    await expect(
      seedMediaToVault({
        store: phone.store,
        attachments: phone.attachments,
        journal: memoryJournal(),
        items: [localItem("a", "alpha")],
      })
    ).rejects.toMatchObject({ code: "media_unsupported" });
    await expect(phone.store.get("media", "m1")).rejects.toMatchObject({ code: "invalid_record" });
    await expect(phone.store.changes(undefined, { kinds: ["media"] })).rejects.toMatchObject({
      code: "invalid_record",
    });
    expect(vault.requests.length).toBe(before);

    const large = "x".repeat(2 * 1024 * 1024);
    const saving = saveAppFile(
      phone.store,
      { conversationId: "conv_1", path: "deck.jsx", content: large },
      undefined,
      phone.attachments
    );
    await expect(saving).rejects.toBeInstanceOf(ChatStoreError);
    await expect(saving).rejects.toMatchObject({ code: "record_too_large" });
    expect(vault.attachments.size).toBe(0);
    expect(vault.requests.some((r) => r.path.includes("/attachments"))).toBe(false);
  });
});
