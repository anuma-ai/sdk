import { describe, expect, it } from "vitest";

import { loadSettings, saveSetting } from "./settings";
import {
  type ChatListOptions,
  type ChatSnapshot,
  type ChatStore,
  ChatStoreError,
  type ChatWrite,
} from "./types";

function memoryStore(options: { beforePut?: (rows: Map<string, ChatSnapshot>) => void } = {}) {
  const rows = new Map<string, ChatSnapshot>();
  let puts = 0;
  const store = {
    get: (kind: string, id: string) => Promise.resolve(rows.get(kind + "/" + id) ?? null),
    list: (query: ChatListOptions) => {
      const items = [...rows.values()].filter(
        (s) => s.record.kind === query.kind && (query.includeDeleted || !s.record.isDeleted)
      );
      const start = query.cursor ? Number(query.cursor) : 0;
      const limit = query.limit ?? 20;
      const page = items.slice(start, start + limit);
      return Promise.resolve({
        items: page,
        ...(start + limit < items.length ? { nextCursor: String(start + limit) } : {}),
      });
    },
    putMany: (writes: readonly ChatWrite[]) => {
      puts++;
      options.beforePut?.(rows);
      for (const w of writes) {
        if ((rows.get(w.record.kind + "/" + w.record.id)?.version ?? 0) !== w.expectedVersion)
          return Promise.reject(new ChatStoreError("changed", 409, "version_conflict"));
      }
      return Promise.resolve(
        writes.map((w) => {
          const snapshot = {
            record: structuredClone(w.record),
            version: w.expectedVersion + 1,
            serverUpdatedAt: "2026-10-30T00:00:00Z",
          };
          rows.set(w.record.kind + "/" + w.record.id, snapshot);
          return snapshot;
        })
      );
    },
  } as unknown as ChatStore;
  return { store, rows, puts: () => puts };
}

describe("settings on the chat store", () => {
  it("creates a section, then replaces it at the next version", async () => {
    const { store } = memoryStore();
    const first = await saveSetting(store, "instructions", { text: "be brief" });
    expect(first).toMatchObject({
      section: "instructions",
      version: 1,
      data: { text: "be brief" },
    });

    const second = await saveSetting(store, "instructions", { text: "be thorough" });
    expect(second.version).toBe(2);
    expect(second.createdAt).toBe(first.createdAt);
    expect(second.updatedAt).toBeGreaterThan(first.updatedAt);
  });

  it("stores a section as a root setting record", async () => {
    const { store, rows } = memoryStore();
    await saveSetting(store, "models", { default: "auto" });
    expect(rows.get("setting/models")?.record).toMatchObject({
      kind: "setting",
      id: "models",
      conversationId: "",
      sortKey: 0,
      isDeleted: false,
    });
  });

  it("rereads and wins when another device saved the same section first", async () => {
    let raced = false;
    const { store, puts } = memoryStore({
      beforePut: (rows) => {
        if (raced) return;
        raced = true;
        rows.set("setting/privacy", {
          record: {
            kind: "setting",
            id: "privacy",
            conversationId: "",
            sortKey: 0,
            createdAt: 5,
            updatedAt: 5,
            isDeleted: false,
            data: { redact: false },
          },
          version: 1,
          serverUpdatedAt: "2026-10-30T00:00:00Z",
        });
      },
    });
    const saved = await saveSetting(store, "privacy", { redact: true });
    expect(puts()).toBe(2);
    expect(saved).toMatchObject({ version: 2, createdAt: 5, data: { redact: true } });
  });

  it("gives up after repeated conflicts", async () => {
    const { store, puts } = memoryStore({
      beforePut: (rows) => {
        const current = rows.get("setting/voices");
        rows.set("setting/voices", {
          record: {
            kind: "setting",
            id: "voices",
            conversationId: "",
            sortKey: 0,
            createdAt: 1,
            updatedAt: 1,
            isDeleted: false,
            data: {},
          },
          version: (current?.version ?? 0) + 1,
          serverUpdatedAt: "2026-10-30T00:00:00Z",
        });
      },
    });
    await expect(saveSetting(store, "voices", { ids: [] })).rejects.toMatchObject({
      code: "version_conflict",
    });
    expect(puts()).toBe(3);
  });

  it("loads every live section across pages", async () => {
    const { store, rows } = memoryStore();
    for (let i = 0; i < 105; i++) await saveSetting(store, `s${i}`, { i });
    const gone = rows.get("setting/s3");
    if (gone) gone.record.isDeleted = true;

    const settings = await loadSettings(store);
    expect(settings.size).toBe(104);
    expect(settings.has("s3")).toBe(false);
    expect(settings.get("s104")?.data).toEqual({ i: 104 });
  });
});
