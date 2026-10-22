vi.mock("../../memoryEngine/embeddings.js", () => ({
  generateEmbeddings: vi.fn((texts: string[]) =>
    Promise.resolve(
      texts.map((t) => Array.from({ length: 4096 }, (_, i) => (i === 0 ? t.length : 1)))
    )
  ),
}));

import { Database } from "@nozbe/watermelondb";
import LokiJSAdapter from "@nozbe/watermelondb/adapters/lokijs";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { clearAllEncryptionKeys, type SignMessageFn } from "../../../react/useEncryption";
import type { Entity, MemoryEntity } from "../../db/entities/models";
import { replaceMemoryEntitiesGuardedOp } from "../../db/entities/operations";
import type { VaultMemory } from "../../db/memoryVault/models";
import {
  archiveVaultMemoryOp,
  createVaultMemoryOp,
  deleteVaultMemoryOp,
  setMemoryVisibilityOp,
  updateVaultMemoryOp,
  type VaultMemoryOperationsContext,
} from "../../db/memoryVault/operations";
import { sdkMigrations, sdkModelClasses, sdkSchema } from "../../db/schema";
import { DEFAULT_API_EMBEDDING_MODEL } from "../../memoryEngine/constants";
import { generateEmbeddings } from "../../memoryEngine/embeddings.js";
import { MEDIUM_TTL_MS } from "../decay";
import { deriveMemoryKeyRing, memoryCipher } from "./memoryKeys";
import { migrateMemoriesToRemote } from "./remoteMigration";
import {
  createRemoteMemoryPersistence,
  RemoteMemoryError,
  type RemoteMemoryRow,
} from "./remotePersistence";
import { storedVector } from "./remotePipeline";
import { createRemoteMemoryStore } from "./remoteStore";
import type { MemoryStore } from "./types";

const signatureA = `0x${"a1".repeat(65)}`;
const signatureB = `0x${"b2".repeat(65)}`;
const address = "0x1234567890123456789012345678901234567890";
const otherAddress = "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd";

function makeDatabase(): Database {
  const adapter = new LokiJSAdapter({
    schema: sdkSchema,
    migrations: sdkMigrations,
    useWebWorker: false,
    useIncrementalIndexedDB: false,
    dbName: `memory-migration-test-${Math.random().toString(36).slice(2)}`,
  });
  return new Database({ adapter, modelClasses: sdkModelClasses });
}

function vault(
  database: Database,
  signature: string,
  userId = "u1",
  walletAddress = address
): VaultMemoryOperationsContext {
  return {
    database,
    vaultMemoryCollection: database.get<VaultMemory>("memory_vault"),
    walletAddress,
    signMessage: vi.fn(() => Promise.resolve(signature)) as unknown as SignMessageFn,
    userId,
    entityCtx: {
      database,
      entityCollection: database.get<Entity>("entity"),
      memoryEntityCollection: database.get<MemoryEntity>("memory_entity"),
    },
  };
}

type Stored = RemoteMemoryRow;

function requestUrl(input: Parameters<typeof globalThis.fetch>[0]): string {
  return typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
}

function fakeNearby(initial: { state?: string; key_id?: string } = {}) {
  const rows = new Map<string, Stored>();
  const versions = new Map<string, number>();
  const catalog = new Map<string, { name: string; kind?: string }>();
  const account = { state: initial.state ?? "none", key_id: initial.key_id };
  const calls: string[] = [];
  let rateLimited = 0;
  let retryAfter = "0.01";
  let onImport: (() => Promise<void>) | undefined;
  const json = (status: number, body: unknown, headers: Record<string, string> = {}) =>
    new Response(JSON.stringify(body), { status, headers });
  const newer = (local?: number | null, remote?: number) =>
    local !== null && local !== undefined && (remote === undefined || local > remote);
  const fetch = vi.fn(async (url: string | URL, init?: RequestInit) => {
    const path = String(url).replace(/^.*\/api\/private-memories/, "");
    const method = init?.method ?? "GET";
    const body =
      typeof init?.body === "string" ? (JSON.parse(init.body) as Record<string, unknown>) : {};
    calls.push(`${method} ${path}`);
    if (path === "/topics/import") {
      for (const t of body.topics as { name: string; kind?: string }[])
        if (!catalog.has(t.name)) catalog.set(t.name, t);
      return json(200, {});
    }

    if (path === "/account" && method === "GET")
      return json(200, { ...account, memory_count: rows.size });
    if (path === "/account" && method === "PUT") {
      if (account.state === "none") return json(409, { detail: "import before activating" });
      account.state = "active";
      return json(200, { ...account, memory_count: rows.size });
    }
    if (path === "/import") {
      if (rateLimited > 0) {
        rateLimited--;
        return json(429, { detail: "slow down" }, { "Retry-After": retryAfter });
      }
      if (account.key_id && account.key_id !== body.key_id)
        return json(409, { detail: "key mismatch", code: "key_mismatch" });
      const size = (v: unknown) => (typeof v === "string" ? new TextEncoder().encode(v).length : 0);
      const refused = (body.memories as Record<string, unknown>[]).some(
        (row) =>
          size(row.memory_id) > 128 ||
          size(row.content) > 32 << 10 ||
          size(row.kind_value) > 32 << 10 ||
          ["topics", "media", "source_chunk_ids"].some((f) => size(row[f]) > 16 << 10) ||
          [
            "scope",
            "kind",
            "level",
            "folder_id",
            "embedding_model",
            "source",
            "event_time_kind",
            "superseded_by",
            "fact_type",
            "trust_tier",
            "visibility",
            "geohash",
          ].some((f) => size(row[f]) > 256)
      );
      if (refused) return json(400, { detail: "a field is over its limit" });
      account.key_id = body.key_id as string;
      if (account.state === "none") account.state = "migrating";
      for (const row of body.memories as Stored[]) {
        expect(row.content).toMatch(/^enc:v3:/);
        const existing = rows.get(row.memory_id);
        if (
          !existing ||
          row.updated_at > existing.updated_at ||
          (row.updated_at === existing.updated_at && row.is_deleted && !existing.is_deleted)
        )
          rows.set(row.memory_id, row);
      }
      await onImport?.();
      return json(200, { written: (body.memories as unknown[]).length });
    }
    if (path === "/verify") {
      const missing = (body.memories as Record<string, number | null | string>[])
        .filter((r) => {
          const s = rows.get(r.memory_id as string);
          return (
            !s ||
            newer(r.updated_at as number, s.updated_at) ||
            newer(r.topics_updated_at as number | null, s.topics_updated_at) ||
            newer(r.last_observed_at as number | null, s.last_observed_at)
          );
        })
        .map((r) => r.memory_id);
      return json(200, { missing });
    }
    if (path === "/memories/query") {
      const ids = new Set(body.memory_ids as string[]);
      const items = [...rows.values()]
        .filter((row) => ids.has(row.memory_id))
        .map((memory) => ({ memory, version: 1, server_updated_at: "2026-01-01T00:00:00Z" }));
      return json(200, { items });
    }
    if (path.startsWith("/memories/")) {
      const id = decodeURIComponent(path.slice("/memories/".length));
      if (method === "PUT") {
        const version = versions.get(id) ?? (rows.has(id) ? 1 : 0);
        if (body.expected_version !== version) return json(409, { code: "version_conflict" });
        rows.set(id, body.memory as Stored);
        versions.set(id, version + 1);
      }
      const memory = rows.get(id);
      return memory
        ? json(200, {
            memory,
            version: versions.get(id) ?? 1,
            server_updated_at: "2026-01-01T00:00:00Z",
          })
        : json(404, { detail: "not found" });
    }
    return json(404, { detail: "not found" });
  });
  return {
    rows,
    catalog,
    account,
    calls,
    fetch: fetch as unknown as typeof globalThis.fetch,
    rateLimit: (n: number, header = "0.01") => {
      rateLimited = n;
      retryAfter = header;
    },
    onImport: (fn: () => Promise<void>) => (onImport = fn),
  };
}

const vector4096 = JSON.stringify(Array.from({ length: 4096 }, (_, i) => (i % 7) + 1));

async function migrate(
  nearby: ReturnType<typeof fakeNearby>,
  vaultCtx: VaultMemoryOperationsContext,
  extra: Partial<Parameters<typeof migrateMemoriesToRemote>[0]> = {}
) {
  return migrateMemoriesToRemote({
    baseUrl: "https://nearby.test",
    getToken: () => Promise.resolve("token"),
    fetch: nearby.fetch,
    vaultCtx,
    canonical: await deriveMemoryKeyRing(signatureA),
    withWriteBarrier: (task) => task(),
    onActivated: () => {},
    ...extra,
  });
}

const counts = {
  reembedded: 0,
  unembedded: 0,
  placeholderTombstones: 0,
  truncatedSourceChunkIds: 0,
};

async function setRaw(ctx: VaultMemoryOperationsContext, id: string, raw: Record<string, unknown>) {
  const record = await ctx.vaultMemoryCollection.find(id);
  await ctx.database.write(async () => {
    await record.update((r) => {
      for (const [column, value] of Object.entries(raw)) r._setRaw(column, value as string);
    });
  });
}

beforeEach(() => {
  clearAllEncryptionKeys();
  vi.mocked(generateEmbeddings).mockClear();
});

describe("migrateMemoriesToRemote", () => {
  it.each(["withWriteBarrier", "onActivated"])(
    "requires %s before it changes the remote account",
    async (option) => {
      const ctx = vault(makeDatabase(), signatureA);
      const nearby = fakeNearby();

      await expect(migrate(nearby, ctx, { [option]: undefined })).rejects.toThrow(
        "A write barrier and a remote store handoff are required"
      );

      expect(nearby.calls).toEqual([]);
      expect(nearby.account.state).toBe("none");
    }
  );

  it("uploads every local row in every state under the canonical key, then activates", async () => {
    const ctx = vault(makeDatabase(), signatureA);
    const live = await createVaultMemoryOp(ctx, {
      content: "Likes green tea",
      embedding: vector4096,
    });
    const deleted = await createVaultMemoryOp(ctx, { content: "Had a cat" });
    const archived = await createVaultMemoryOp(ctx, { content: "Lived in Ohio" });
    await deleteVaultMemoryOp(ctx, deleted.uniqueId);
    await archiveVaultMemoryOp(ctx, archived.uniqueId);
    const nearby = fakeNearby();

    const result = await migrate(nearby, ctx);

    expect(result).toEqual({
      state: "active",
      total: 3,
      imported: 3,
      skipped: [],
      ...counts,
      unembedded: 2,
    });
    expect(nearby.account.state).toBe("active");
    const canonical = await deriveMemoryKeyRing(signatureA);
    const remoteLive = nearby.rows.get(live.uniqueId)!;
    expect(await memoryCipher(canonical).decrypt(remoteLive.content)).toBe("Likes green tea");
    expect(remoteLive.embedding).toHaveLength(1536);
    expect(nearby.rows.get(deleted.uniqueId)?.is_deleted).toBe(true);
    expect(nearby.rows.get(archived.uniqueId)?.archived_at).toBeGreaterThan(0);
    expect(nearby.account.key_id).toBe(canonical.keyId);
  });

  it("resends nothing nearby already holds when run again", async () => {
    const ctx = vault(makeDatabase(), signatureA);
    await createVaultMemoryOp(ctx, { content: "Likes green tea" });
    const nearby = fakeNearby();
    await migrate(nearby, ctx);
    nearby.calls.length = 0;

    const onActivated = vi.fn();
    const again = await migrate(nearby, ctx, { onActivated });

    expect(again).toMatchObject({ state: "active", imported: 0 });
    expect(nearby.calls).not.toContain("POST /import");
    expect(nearby.calls).not.toContain("PUT /account");
    expect(onActivated).toHaveBeenCalledOnce();
  });

  it("sends only the rows nearby is missing", async () => {
    const ctx = vault(makeDatabase(), signatureA);
    await createVaultMemoryOp(ctx, { content: "Likes green tea" });
    const nearby = fakeNearby();
    await migrate(nearby, ctx);
    const added = await createVaultMemoryOp(ctx, { content: "Has a dog" });
    const sent: string[] = [];
    const fetch = nearby.fetch;
    nearby.fetch = (async (url: string | URL, init?: RequestInit) => {
      if (String(url).endsWith("/import") && typeof init?.body === "string")
        for (const row of (JSON.parse(init.body) as { memories: RemoteMemoryRow[] }).memories)
          sent.push(row.memory_id);
      return fetch(url, init);
    }) as typeof globalThis.fetch;

    const again = await migrate(nearby, ctx);

    expect(again).toMatchObject({ state: "active", imported: 1 });
    expect(sent).toEqual([added.uniqueId]);
  });

  it("waits out a rate limit and resends the same batch", async () => {
    const ctx = vault(makeDatabase(), signatureA);
    const m = await createVaultMemoryOp(ctx, { content: "Likes green tea" });
    const nearby = fakeNearby();
    nearby.rateLimit(2);

    const result = await migrate(nearby, ctx);

    expect(result.state).toBe("active");
    expect(nearby.calls.filter((c) => c === "POST /import")).toHaveLength(3);
    expect(nearby.rows.has(m.uniqueId)).toBe(true);
  });

  it("uploads a row edited while the first pass was importing", async () => {
    const ctx = vault(makeDatabase(), signatureA);
    const m = await createVaultMemoryOp(ctx, { content: "Likes green tea" });
    const nearby = fakeNearby();
    let edited = false;
    nearby.onImport(async () => {
      if (edited) return;
      edited = true;
      await new Promise((resolve) => setTimeout(resolve, 5));
      await updateVaultMemoryOp(ctx, m.uniqueId, { content: "Likes oolong tea" });
    });

    const result = await migrate(nearby, ctx);

    expect(result).toMatchObject({ state: "active", imported: 2 });
    const canonical = await deriveMemoryKeyRing(signatureA);
    expect(await memoryCipher(canonical).decrypt(nearby.rows.get(m.uniqueId)!.content)).toBe(
      "Likes oolong tea"
    );
  });

  it.each(["save", "edit", "delete"])(
    "includes a concurrent %s before the write barrier starts",
    async (operation) => {
      const ctx = vault(makeDatabase(), signatureA);
      const memory = await createVaultMemoryOp(ctx, { content: "Likes green tea" });
      const nearby = fakeNearby();
      const fetch = nearby.fetch;
      let changed = false;
      nearby.fetch = (async (url, init) => {
        const response = await fetch(url, init);
        if (!requestUrl(url).endsWith("/memories/query") || changed) return response;
        changed = true;
        if (operation === "save") await createVaultMemoryOp(ctx, { content: "Has a dog" });
        if (operation === "edit") {
          await updateVaultMemoryOp(ctx, memory.uniqueId, { content: "Likes oolong tea" });
          await setRaw(ctx, memory.uniqueId, { updated_at: memory.updatedAt.getTime() + 1 });
        }
        if (operation === "delete") await deleteVaultMemoryOp(ctx, memory.uniqueId);
        return response;
      }) as typeof globalThis.fetch;

      const result = await migrate(nearby, ctx);

      expect(changed).toBe(true);
      expect(result.state).toBe("active");
      const canonical = await deriveMemoryKeyRing(signatureA);
      const contents = await Promise.all(
        [...nearby.rows.values()].map((row) => memoryCipher(canonical).decrypt(row.content))
      );
      if (operation === "save") expect(contents).toContain("Has a dog");
      if (operation === "edit") expect(contents).toEqual(["Likes oolong tea"]);
      if (operation === "delete") expect(nearby.rows.get(memory.uniqueId)?.is_deleted).toBe(true);
    }
  );

  it.each(["/verify", "/memories/query", "/account"])(
    "routes writes queued during final %s to the remote store",
    async (path) => {
      const ctx = vault(makeDatabase(), signatureA);
      const edited = await createVaultMemoryOp(ctx, { content: "Likes green tea" });
      const deleted = await createVaultMemoryOp(ctx, { content: "Had a cat" });
      const nearby = fakeNearby();
      const local = {
        create: vi.fn<MemoryStore["create"]>((input) => createVaultMemoryOp(ctx, input)),
        update: vi.fn<MemoryStore["update"]>((id, input) => updateVaultMemoryOp(ctx, id, input)),
        delete: vi.fn<MemoryStore["delete"]>((id) => deleteVaultMemoryOp(ctx, id)),
      } satisfies Pick<MemoryStore, "create" | "update" | "delete">;
      let store: Pick<MemoryStore, "create" | "update" | "delete"> = local;
      let tail = Promise.resolve();
      const exclusive = <T>(task: () => Promise<T>): Promise<T> => {
        const result = tail.then(task);
        tail = result.then(
          () => {},
          () => {}
        );
        return result;
      };
      let held = false;
      let queued: Promise<void> | undefined;
      let completed = false;
      const fetch = nearby.fetch;
      nearby.fetch = (async (url, init) => {
        const response = await fetch(url, init);
        if (held && !queued && requestUrl(url).endsWith(path)) {
          queued = exclusive(async () => {
            await store.create({ content: "Has a dog", embedding: vector4096 });
            await store.update(edited.uniqueId, {
              content: "Likes oolong tea",
              embedding: vector4096,
            });
            await store.delete(deleted.uniqueId);
            completed = true;
          });
          await Promise.resolve();
          expect(completed).toBe(false);
        }
        return response;
      }) as typeof globalThis.fetch;
      const onActivated = vi.fn(async () => {
        expect(held).toBe(true);
        expect(nearby.account.state).toBe("active");
        const canonical = await deriveMemoryKeyRing(signatureA);
        store = createRemoteMemoryStore({
          persistence: await createRemoteMemoryPersistence({
            baseUrl: "https://nearby.test",
            getToken: () => Promise.resolve("token"),
            fetch: nearby.fetch,
            keyId: canonical.keyId,
            ...memoryCipher(canonical),
          }),
          embeddingOptions: {},
        });
      });

      const result = await migrate(nearby, ctx, {
        withWriteBarrier: (task) =>
          exclusive(async () => {
            held = true;
            try {
              return await task();
            } finally {
              held = false;
            }
          }),
        onActivated,
      });
      await queued;

      expect(result.state).toBe("active");
      expect(queued).toBeDefined();
      expect(completed).toBe(true);
      expect(onActivated).toHaveBeenCalledOnce();
      expect(local.create).not.toHaveBeenCalled();
      expect(local.update).not.toHaveBeenCalled();
      expect(local.delete).not.toHaveBeenCalled();
      expect(await ctx.vaultMemoryCollection.query().fetchCount()).toBe(2);
      const canonical = await deriveMemoryKeyRing(signatureA);
      expect(await memoryCipher(canonical).decrypt(nearby.rows.get(edited.uniqueId)!.content)).toBe(
        "Likes oolong tea"
      );
      expect(nearby.rows.get(deleted.uniqueId)?.is_deleted).toBe(true);
      const contents = await Promise.all(
        [...nearby.rows.values()].map((row) => memoryCipher(canonical).decrypt(row.content))
      );
      expect(contents).toContain("Has a dog");
    }
  );

  it.each(["/verify", "/memories/query", "/account"])(
    "leaves local writes enabled if final %s fails before activation",
    async (path) => {
      const ctx = vault(makeDatabase(), signatureA);
      await createVaultMemoryOp(ctx, { content: "Likes green tea" });
      const nearby = fakeNearby();
      const fetch = nearby.fetch;
      let held = false;
      const onActivated = vi.fn();
      nearby.fetch = (async (url, init) => {
        if (held && requestUrl(url).endsWith(path))
          return new Response(JSON.stringify({ detail: "unavailable" }), { status: 503 });
        return fetch(url, init);
      }) as typeof globalThis.fetch;

      await expect(
        migrate(nearby, ctx, {
          withWriteBarrier: async (task) => {
            held = true;
            try {
              return await task();
            } finally {
              held = false;
            }
          },
          onActivated,
        })
      ).rejects.toMatchObject({ status: 503 });

      expect(held).toBe(false);
      expect(nearby.account.state).toBe("migrating");
      expect(onActivated).not.toHaveBeenCalled();
      await createVaultMemoryOp(ctx, { content: "Has a dog" });
      expect(await ctx.vaultMemoryCollection.query().fetchCount()).toBe(2);
    }
  );

  it("refuses an account another key already claimed, before importing", async () => {
    const ctx = vault(makeDatabase(), signatureA);
    await createVaultMemoryOp(ctx, { content: "Likes green tea" });
    const nearby = fakeNearby({ state: "migrating", key_id: "v3:someone-else" });

    await expect(migrate(nearby, ctx)).rejects.toMatchObject({
      constructor: RemoteMemoryError,
      code: "key_mismatch",
    });
    expect(nearby.calls).toEqual(["GET /account"]);
  });

  it("reports a row no supplied key decrypts and leaves the account migrating", async () => {
    const database = makeDatabase();
    const ctx = vault(database, signatureA);
    await createVaultMemoryOp(ctx, { content: "Likes green tea" });
    const foreign = await createVaultMemoryOp(vault(database, signatureB, "u1", otherAddress), {
      content: "Written under another key",
    });
    const nearby = fakeNearby();

    const result = await migrate(nearby, ctx);

    expect(result).toMatchObject({
      state: "migrating",
      skipped: [{ memoryId: foreign.uniqueId, reason: "unreadable" }],
    });
    expect(nearby.account.state).toBe("migrating");
    expect(nearby.calls).not.toContain("PUT /account");

    expect(await migrate(nearby, ctx, { allowSkipped: true })).toMatchObject({ state: "active" });
  });

  it("migrates a row written under an older key when that key is supplied", async () => {
    const database = makeDatabase();
    const ctx = vault(database, signatureA);
    const old = await createVaultMemoryOp(vault(database, signatureB, "u1", otherAddress), {
      content: "Has a dog",
    });
    const nearby = fakeNearby();

    const result = await migrate(nearby, ctx, {
      fallbacks: [await deriveMemoryKeyRing(signatureB)],
    });

    expect(result).toMatchObject({ state: "active", skipped: [] });
    const canonical = await deriveMemoryKeyRing(signatureA);
    expect(await memoryCipher(canonical).decrypt(nearby.rows.get(old.uniqueId)!.content)).toBe(
      "Has a dog"
    );
  });

  it("migrates only the context user's rows", async () => {
    const database = makeDatabase();
    const ctx = vault(database, signatureA, "u1");
    const mine = await createVaultMemoryOp(ctx, { content: "Mine" });
    await createVaultMemoryOp(vault(database, signatureA, "u2"), { content: "Theirs" });
    const nearby = fakeNearby();

    await migrate(nearby, ctx);

    expect([...nearby.rows.keys()]).toEqual([mine.uniqueId]);
  });

  it("activates an account with no local memories by claiming its key first", async () => {
    const ctx = vault(makeDatabase(), signatureA);
    const nearby = fakeNearby();

    const result = await migrate(nearby, ctx);

    expect(result).toEqual({ state: "active", total: 0, imported: 0, skipped: [], ...counts });
    expect(nearby.account).toMatchObject({
      state: "active",
      key_id: (await deriveMemoryKeyRing(signatureA)).keyId,
    });
  });

  it("activates with allowSkipped when every row was skipped", async () => {
    const database = makeDatabase();
    const ctx = vault(database, signatureA);
    await createVaultMemoryOp(vault(database, signatureB, "u1", otherAddress), {
      content: "Written under another key",
    });
    const nearby = fakeNearby();

    const result = await migrate(nearby, ctx, { allowSkipped: true });

    expect(result).toMatchObject({ state: "active", imported: 0 });
    expect(nearby.account.state).toBe("active");
  });

  it("refuses to read an unscoped vault", async () => {
    const ctx = { ...vault(makeDatabase(), signatureA), userId: undefined };

    await expect(migrate(fakeNearby(), ctx)).rejects.toThrow(/unscoped/);
  });

  it("uploads a sharing change that kept updated_at, after an interrupted run", async () => {
    const ctx = vault(makeDatabase(), signatureA);
    const m = await createVaultMemoryOp(ctx, { content: "Likes green tea" });
    await setMemoryVisibilityOp(ctx, m.uniqueId, { visibility: "public" });
    const nearby = fakeNearby();
    await migrate(nearby, ctx);
    nearby.account.state = "migrating";
    const before = nearby.rows.get(m.uniqueId)!.updated_at;

    await setMemoryVisibilityOp(ctx, m.uniqueId, { visibility: "private" });
    const result = await migrate(nearby, ctx);

    expect(result.state).toBe("active");
    expect(nearby.rows.get(m.uniqueId)).toMatchObject({
      visibility: "private",
      updated_at: before + 1,
    });
    expect(nearby.rows.get(m.uniqueId)?.published_at).toBeUndefined();
  });

  it("fills a legacy row's topics from its local links before uploading", async () => {
    const ctx = vault(makeDatabase(), signatureA);
    const m = await createVaultMemoryOp(ctx, { content: "Works at Acme" });
    await replaceMemoryEntitiesGuardedOp(ctx.entityCtx!, m.uniqueId, ["Acme"]);
    const record = await ctx.vaultMemoryCollection.find(m.uniqueId);
    await ctx.database.write(async () => {
      await record.update((r) => {
        r._setRaw("topics", null);
        r._setRaw("topics_updated_at", null);
      });
    });

    const nearby = fakeNearby();
    await migrate(nearby, ctx);

    expect(JSON.parse(nearby.rows.get(m.uniqueId)!.topics!)).toEqual([
      expect.objectContaining({ name: "acme" }),
    ]);
  });

  it("activates when the last allowed upload pass finally lands", async () => {
    const ctx = vault(makeDatabase(), signatureA);
    const m = await createVaultMemoryOp(ctx, { content: "Edit 0" });
    const nearby = fakeNearby();
    let imports = 0;
    nearby.onImport(async () => {
      imports++;
      if (imports > 2) return;
      await new Promise((resolve) => setTimeout(resolve, 5));
      await updateVaultMemoryOp(ctx, m.uniqueId, { content: `Edit ${imports}` });
    });

    const result = await migrate(nearby, ctx);

    expect(result).toMatchObject({ state: "active", imported: 3 });
  });

  it("honours an HTTP-date Retry-After", async () => {
    const ctx = vault(makeDatabase(), signatureA);
    await createVaultMemoryOp(ctx, { content: "Likes green tea" });
    const nearby = fakeNearby();
    nearby.rateLimit(1, "Thu, 01 Jan 1970 00:00:00 GMT");
    const started = Date.now();

    expect((await migrate(nearby, ctx)).state).toBe("active");
    expect(Date.now() - started).toBeLessThan(5_000);
  });

  it("releases its abort listener after each rate-limit wait", async () => {
    const ctx = vault(makeDatabase(), signatureA);
    await createVaultMemoryOp(ctx, { content: "Likes green tea" });
    const nearby = fakeNearby();
    nearby.rateLimit(3);
    const signal = new AbortController().signal;
    const add = vi.spyOn(signal, "addEventListener");
    const remove = vi.spyOn(signal, "removeEventListener");

    await migrate(nearby, ctx, { signal });

    expect(add.mock.calls.length).toBeGreaterThan(0);
    expect(remove.mock.calls.length).toBe(add.mock.calls.length);
  });

  it("keeps a legacy row's newest source ids that fit nearby instead of skipping it", async () => {
    const ctx = vault(makeDatabase(), signatureA);
    const ok = await createVaultMemoryOp(ctx, { content: "Lives in Austin" });
    const big = await createVaultMemoryOp(ctx, { content: "Name is Sam" });
    const ids = Array.from({ length: 600 }, (_, i) => `message-${i}-${"x".repeat(24)}`);
    await setRaw(ctx, big.uniqueId, { source_chunk_ids: JSON.stringify(ids) });
    const nearby = fakeNearby();

    const result = await migrate(nearby, ctx);

    expect(result).toMatchObject({ state: "active", skipped: [], truncatedSourceChunkIds: 1 });
    expect(nearby.rows.has(ok.uniqueId)).toBe(true);
    const kept = JSON.parse(nearby.rows.get(big.uniqueId)!.source_chunk_ids!) as string[];
    expect(new TextEncoder().encode(JSON.stringify(kept)).length).toBeLessThanOrEqual(16 << 10);
    expect(kept).toEqual(ids.slice(ids.length - kept.length));
    expect(kept.length).toBeGreaterThan(400);
  });

  it("re-embeds every row nearby could not rank and keeps the vectors it can", async () => {
    const ctx = vault(makeDatabase(), signatureA);
    const vector1536 = JSON.stringify(Array.from({ length: 1536 }, (_, i) => (i % 5) + 1));
    const noVector = await createVaultMemoryOp(ctx, { content: "Has a dog" });
    const legacy = await createVaultMemoryOp(ctx, { content: "Likes jazz" });
    await setRaw(ctx, legacy.uniqueId, { embedding: vector1536, embedding_model: null });
    const otherModel = await createVaultMemoryOp(ctx, {
      content: "Runs marathons",
      embedding: vector4096,
      embeddingModel: "openai/text-embedding-3-small",
    });
    const current = await createVaultMemoryOp(ctx, {
      content: "Lives in Austin",
      embedding: vector4096,
      embeddingModel: DEFAULT_API_EMBEDDING_MODEL,
    });
    const unlabelledQwen = await createVaultMemoryOp(ctx, {
      content: "Works at Acme",
      embedding: vector4096,
    });
    const tombstone = await createVaultMemoryOp(ctx, { content: "Had a cat" });
    await deleteVaultMemoryOp(ctx, tombstone.uniqueId);
    const nearby = fakeNearby();

    const result = await migrate(nearby, ctx, {
      embeddingOptions: { getToken: () => Promise.resolve("t") },
    });

    expect(result).toMatchObject({ state: "active", reembedded: 4, unembedded: 0 });
    expect(vi.mocked(generateEmbeddings)).toHaveBeenCalledTimes(1);
    expect([...vi.mocked(generateEmbeddings).mock.calls[0][0]].sort()).toEqual(
      ["Has a dog", "Likes jazz", "Runs marathons", "Had a cat"].sort()
    );
    for (const m of [noVector, legacy, otherModel, tombstone]) {
      const row = nearby.rows.get(m.uniqueId)!;
      expect(row.embedding_model).toBe(DEFAULT_API_EMBEDDING_MODEL);
      expect(row.embedding).toHaveLength(1536);
    }
    const original = storedVector(JSON.parse(vector4096) as number[]);
    expect(nearby.rows.get(current.uniqueId)!.embedding).toEqual(original);
    expect(nearby.rows.get(unlabelledQwen.uniqueId)!.embedding).toEqual(original);
    expect(nearby.calls.filter((c) => c === "POST /import")).toHaveLength(1);
  });

  it("labels an unlabelled current vector so its tombstone can suppress a re-extraction", async () => {
    const ctx = vault(makeDatabase(), signatureA);
    const tombstone = await createVaultMemoryOp(ctx, {
      content: "Had a cat",
      embedding: vector4096,
    });
    await deleteVaultMemoryOp(ctx, tombstone.uniqueId);
    const nearby = fakeNearby();
    await migrate(nearby, ctx);
    const sent = nearby.rows.get(tombstone.uniqueId)!;
    expect(sent.embedding_model).toBe(DEFAULT_API_EMBEDDING_MODEL);

    delete sent.embedding_model;
    nearby.account.state = "migrating";
    const result = await migrate(nearby, ctx, { embeddingOptions: {} });

    expect(result).toMatchObject({ state: "active", reembedded: 0 });
    expect(vi.mocked(generateEmbeddings)).not.toHaveBeenCalled();
    expect(nearby.rows.get(tombstone.uniqueId)).toMatchObject({
      embedding_model: DEFAULT_API_EMBEDDING_MODEL,
      updated_at: sent.updated_at + 1,
      embedding: storedVector(JSON.parse(vector4096) as number[]),
    });
    expect(nearby.calls.filter((c) => c === "POST /import")).toHaveLength(2);
  });

  it("repairs a vector an interrupted earlier run uploaded without one", async () => {
    const ctx = vault(makeDatabase(), signatureA);
    const m = await createVaultMemoryOp(ctx, { content: "Has a dog" });
    const nearby = fakeNearby();
    await migrate(nearby, ctx);
    nearby.account.state = "migrating";
    expect(nearby.rows.get(m.uniqueId)!.embedding).toBeUndefined();

    const result = await migrate(nearby, ctx, { embeddingOptions: {} });

    expect(result).toMatchObject({ state: "active", reembedded: 1, unembedded: 0 });
    expect(nearby.rows.get(m.uniqueId)).toMatchObject({
      embedding_model: DEFAULT_API_EMBEDDING_MODEL,
      updated_at: m.updatedAt.getTime() + 1,
    });
    expect(nearby.rows.get(m.uniqueId)!.embedding).toHaveLength(1536);
  });

  it("uploads a row without a vector when re-embedding fails", async () => {
    const ctx = vault(makeDatabase(), signatureA);
    const m = await createVaultMemoryOp(ctx, { content: "Has a dog" });
    vi.mocked(generateEmbeddings)
      .mockRejectedValueOnce(new Error("embedding outage"))
      .mockRejectedValueOnce(new Error("embedding outage"));
    const nearby = fakeNearby();

    const result = await migrate(nearby, ctx, { embeddingOptions: {} });

    expect(result).toMatchObject({ state: "active", reembedded: 0, unembedded: 1 });
    expect(nearby.rows.get(m.uniqueId)!.embedding).toBeUndefined();
    expect(nearby.calls.filter((c) => c === "POST /import")).toHaveLength(2);
  });

  it("never labels a pre-model 1536-dimension vector as the current model", async () => {
    const ctx = vault(makeDatabase(), signatureA);
    const m = await createVaultMemoryOp(ctx, { content: "Likes jazz" });
    await setRaw(ctx, m.uniqueId, {
      embedding: JSON.stringify(Array.from({ length: 1536 }, () => 1)),
      embedding_model: null,
    });
    const nearby = fakeNearby();

    const result = await migrate(nearby, ctx);

    expect(result).toMatchObject({ state: "active", unembedded: 1 });
    expect(nearby.rows.get(m.uniqueId)!.embedding).toBeUndefined();
    expect(vi.mocked(generateEmbeddings)).not.toHaveBeenCalled();
  });

  it("uploads a deleted row no key decrypts as a placeholder tombstone and activates", async () => {
    const database = makeDatabase();
    const ctx = vault(database, signatureA);
    const foreignCtx = vault(database, signatureB, "u1", otherAddress);
    const foreign = await createVaultMemoryOp(foreignCtx, {
      content: "Written under another key",
      embedding: vector4096,
      embeddingModel: DEFAULT_API_EMBEDDING_MODEL,
    });
    await deleteVaultMemoryOp(foreignCtx, foreign.uniqueId);
    const nearby = fakeNearby();

    const result = await migrate(nearby, ctx);

    expect(result).toMatchObject({ state: "active", skipped: [], placeholderTombstones: 1 });
    const row = nearby.rows.get(foreign.uniqueId)!;
    expect(row.is_deleted).toBe(true);
    expect(row.embedding).toHaveLength(1536);
    const canonical = await deriveMemoryKeyRing(signatureA);
    expect(await memoryCipher(canonical).decrypt(row.content)).toBe("");
  });

  it("runs a final decay sweep before uploading", async () => {
    const ctx = vault(makeDatabase(), signatureA);
    const aged = await createVaultMemoryOp(ctx, {
      content: "Was reading a thriller",
      source: "auto-extracted",
      factType: "other",
    });
    await setRaw(ctx, aged.uniqueId, { updated_at: Date.now() - MEDIUM_TTL_MS - 86_400_000 });
    const nearby = fakeNearby();

    await migrate(nearby, ctx);

    expect(nearby.rows.get(aged.uniqueId)!.archived_at).toBeGreaterThan(0);
  });

  it("measures nearby's limits in bytes, not characters", async () => {
    const ctx = vault(makeDatabase(), signatureA);
    const m = await createVaultMemoryOp(ctx, { content: "Likes green tea" });
    const record = await ctx.vaultMemoryCollection.find(m.uniqueId);
    await ctx.database.write(async () => {
      await record.update((r) => r._setRaw("geohash", "é".repeat(200)));
    });

    const result = await migrate(fakeNearby(), ctx);

    expect(result.skipped).toEqual([{ memoryId: m.uniqueId, reason: "invalid" }]);
  });
});

describe("topic migration", () => {
  it("cancels an in-flight topic import before later batches or activation", async () => {
    const ctx = vault(makeDatabase(), signatureA);
    const server = fakeNearby();
    const controller = new AbortController();
    const original = server.fetch;
    let pending: (() => void) | undefined;
    const started = new Promise<void>((resolve) => {
      pending = resolve;
    });
    let imports = 0;
    let requestSignal: AbortSignal | null | undefined;
    server.fetch = (async (url, init) => {
      if (requestUrl(url).endsWith("/topics/import") && ++imports === 2) {
        requestSignal = init?.signal;
        pending!();
        return new Promise<Response>((_resolve, reject) => {
          requestSignal!.addEventListener(
            "abort",
            () => {
              const reason: unknown = requestSignal!.reason;
              reject(reason instanceof Error ? reason : new Error("Request cancelled"));
            },
            { once: true }
          );
        });
      }
      return original(url, init);
    }) as typeof globalThis.fetch;
    const migration = migrate(server, ctx, {
      signal: controller.signal,
      topics: Array.from({ length: 123 }, (_, i) => ({ name: `t-${i}` })),
    });
    const cancelled = expect(migration).rejects.toThrow("cancelled");
    await started;
    controller.abort(new Error("cancelled"));
    await cancelled;

    expect(requestSignal!.aborted).toBe(true);
    expect(imports).toBe(2);
    expect(server.catalog.size).toBe(50);
    expect(server.calls).not.toContain("POST /import");
    expect(server.calls).not.toContain("PUT /account");
    expect(server.account.state).toBe("none");
  });

  it("imports empty topics from a single-owner database before activation", async () => {
    const db = makeDatabase();
    const ctx = { ...vault(db, signatureA), singleTenant: true };
    await db.write(async () => {
      await ctx.entityCtx!.entityCollection.create((r) => {
        r._setRaw("canonical_name", "Gardening");
      });
    });
    const server = fakeNearby();
    expect((await migrate(server, ctx)).state).toBe("active");
    expect([...server.catalog.keys()]).toEqual(["gardening"]);
    expect(server.rows.size).toBe(0);
    expect(server.calls.indexOf("POST /topics/import")).toBeLessThan(
      server.calls.indexOf("PUT /account")
    );
  });

  it("does not upload unowned entity rows from a shared database", async () => {
    const db = makeDatabase();
    const ctx = vault(db, signatureA);
    await db.write(async () => {
      await ctx.entityCtx!.entityCollection.create((r) => {
        r._setRaw("canonical_name", "someone else's topic");
      });
    });
    const server = fakeNearby();
    await migrate(server, ctx);
    expect(server.catalog.size).toBe(0);
  });
});
