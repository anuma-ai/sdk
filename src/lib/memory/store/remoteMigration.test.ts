import { Database } from "@nozbe/watermelondb";
import LokiJSAdapter from "@nozbe/watermelondb/adapters/lokijs";
import { beforeEach, describe, expect, it, vi } from "vitest";

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
import { clearAllEncryptionKeys, type SignMessageFn } from "../../../react/useEncryption";
import { deriveMemoryKeyRing, memoryCipher } from "./memoryKeys";
import { migrateMemoriesToRemote } from "./remoteMigration";
import { RemoteMemoryError, type RemoteMemoryRow } from "./remotePersistence";

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
    signMessage: vi.fn(async () => signature) as unknown as SignMessageFn,
    userId,
    entityCtx: {
      database,
      entityCollection: database.get<Entity>("entity"),
      memoryEntityCollection: database.get<MemoryEntity>("memory_entity"),
    },
  };
}

type Stored = RemoteMemoryRow;

function fakeNearby(initial: { state?: string; key_id?: string } = {}) {
  const rows = new Map<string, Stored>();
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
    const body = init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : {};
    calls.push(`${method} ${path}`);
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
    return json(404, { detail: "not found" });
  });
  return {
    rows,
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
    getToken: async () => "token",
    fetch: nearby.fetch,
    vaultCtx,
    canonical: await deriveMemoryKeyRing(signatureA),
    ...extra,
  });
}

beforeEach(() => clearAllEncryptionKeys());

describe("migrateMemoriesToRemote", () => {
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

    expect(result).toEqual({ state: "active", total: 3, imported: 3, skipped: [] });
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

    const again = await migrate(nearby, ctx);

    expect(again).toMatchObject({ state: "active", imported: 0 });
    expect(nearby.calls).not.toContain("POST /import");
    expect(nearby.calls).not.toContain("PUT /account");
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
      if (String(url).endsWith("/import"))
        for (const row of (JSON.parse(String(init?.body)) as { memories: RemoteMemoryRow[] })
          .memories)
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

    expect(result).toEqual({ state: "active", total: 0, imported: 0, skipped: [] });
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
});
