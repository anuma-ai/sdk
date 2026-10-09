import { Database } from "@nozbe/watermelondb";
import LokiJSAdapter from "@nozbe/watermelondb/adapters/lokijs";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { SignMessageFn } from "../../../react/useEncryption";
import { clearAllEncryptionKeys } from "../../../react/useEncryption";
import { sdkMigrations, sdkModelClasses, sdkSchema } from "../schema";
import type { VaultFolder } from "../vaultFolders/models";
import {
  createVaultFolderOp,
  deleteVaultFolderOp,
  moveMemoriesToFolderOp,
  updateVaultFolderOp,
} from "../vaultFolders/operations";
import type { VaultMemory } from "./models";
import {
  createSupersedingMemoryOp,
  createVaultMemoriesBatchOp,
  createVaultMemoryOp,
  getAllVaultMemoriesOp,
  getDecayCandidatesRawOp,
  getVaultMemoryOp,
  supersedeVaultMemoryOp,
  updateVaultMemoryOp,
  type VaultMemoryOperationsContext,
} from "./operations";
import { MemoryLevelError, resolveMemoryLevel } from "./types";

function makeDatabase(): Database {
  const adapter = new LokiJSAdapter({
    schema: sdkSchema,
    migrations: sdkMigrations,
    useWebWorker: false,
    useIncrementalIndexedDB: false,
    dbName: `kind-level-test-${Math.random().toString(36).slice(2)}`,
  });
  return new Database({ adapter, modelClasses: sdkModelClasses });
}

let db: Database;
let ctx: VaultMemoryOperationsContext;

beforeEach(() => {
  db = makeDatabase();
  ctx = {
    database: db,
    vaultMemoryCollection: db.get<VaultMemory>("memory_vault"),
    singleTenant: true,
  };
});

async function rawRow(id: string): Promise<Record<string, unknown>> {
  const record = await ctx.vaultMemoryCollection.find(id);
  return record._raw as unknown as Record<string, unknown>;
}

describe("resolveMemoryLevel", () => {
  it("prefers a known level column and otherwise derives from scope", () => {
    expect(resolveMemoryLevel("profile", "shared")).toBe("profile");
    expect(resolveMemoryLevel("private", "shared")).toBe("private");
    expect(resolveMemoryLevel(null, "shared")).toBe("matching");
    expect(resolveMemoryLevel(null, "public")).toBe("matching");
    expect(resolveMemoryLevel(null, "private")).toBe("private");
    expect(resolveMemoryLevel(null, null)).toBe("private");
    expect(resolveMemoryLevel("friends", "private")).toBe("private");
  });
});

describe("kind/level validation", () => {
  it("rejects level 'profile' on a free-form memory", async () => {
    await expect(
      createVaultMemoryOp(ctx, { content: "Likes hiking", level: "profile" })
    ).rejects.toBeInstanceOf(MemoryLevelError);
    await expect(
      createVaultMemoriesBatchOp(ctx, [{ content: "Likes hiking", level: "profile" }])
    ).rejects.toBeInstanceOf(MemoryLevelError);
    expect(await getAllVaultMemoriesOp(ctx)).toHaveLength(0);
  });

  it("rejects an unknown kind or level", async () => {
    await expect(
      createVaultMemoryOp(ctx, { content: "x", kind: "zodiac" as never })
    ).rejects.toBeInstanceOf(MemoryLevelError);
    await expect(
      createVaultMemoryOp(ctx, { content: "x", level: "public" as never })
    ).rejects.toBeInstanceOf(MemoryLevelError);
  });

  it("accepts 'profile' with a kind", async () => {
    const m = await createVaultMemoryOp(ctx, {
      content: "Works as a nurse",
      kind: "occupation",
      kindValue: JSON.stringify("Nurse"),
      level: "profile",
    });
    expect(m.kind).toBe("occupation");
    expect(m.kindValue).toBe('"Nurse"');
    expect(m.level).toBe("profile");
  });

  it("update: rejects 'profile' on a free-form row and clearing kind on a profile row", async () => {
    const free = await createVaultMemoryOp(ctx, { content: "Likes hiking" });
    await expect(
      updateVaultMemoryOp(ctx, free.uniqueId, { content: "Likes hiking", level: "profile" })
    ).rejects.toBeInstanceOf(MemoryLevelError);

    const kinded = await createVaultMemoryOp(ctx, {
      content: "Is 180 cm tall",
      kind: "height_cm",
      kindValue: "180",
      level: "profile",
    });
    await expect(
      updateVaultMemoryOp(ctx, kinded.uniqueId, { content: "Is 180 cm tall", kind: null })
    ).rejects.toBeInstanceOf(MemoryLevelError);

    expect((await getVaultMemoryOp(ctx, free.uniqueId))?.level).toBe("private");
    expect((await getVaultMemoryOp(ctx, kinded.uniqueId))?.kind).toBe("height_cm");
  });

  it("update: a free-form row can become kinded and profile in one write", async () => {
    const m = await createVaultMemoryOp(ctx, { content: "Born 1990-04-02" });
    const updated = await updateVaultMemoryOp(ctx, m.uniqueId, {
      content: "Born 1990-04-02",
      kind: "birth_date",
      kindValue: JSON.stringify("1990-04-02"),
      level: "profile",
    });
    expect(updated?.kind).toBe("birth_date");
    expect(updated?.level).toBe("profile");
  });
});

describe("scope dual-write", () => {
  it("create: level writes the matching legacy scope", async () => {
    const priv = await createVaultMemoryOp(ctx, { content: "a", level: "private" });
    const matching = await createVaultMemoryOp(ctx, { content: "b", level: "matching" });
    const profile = await createVaultMemoryOp(ctx, {
      content: "c",
      kind: "bio",
      kindValue: '"c"',
      level: "profile",
    });
    expect((await rawRow(priv.uniqueId)).scope).toBe("private");
    expect((await rawRow(matching.uniqueId)).scope).toBe("shared");
    expect((await rawRow(profile.uniqueId)).scope).toBe("shared");
    expect((await rawRow(profile.uniqueId)).level).toBe("profile");
  });

  it("create: a legacy scope-only caller gets the implied level", async () => {
    const shared = await createVaultMemoryOp(ctx, { content: "a", scope: "shared" });
    const def = await createVaultMemoryOp(ctx, { content: "b" });
    expect(shared.level).toBe("matching");
    expect((await rawRow(shared.uniqueId)).level).toBe("matching");
    expect(def.level).toBe("private");
    expect((await rawRow(def.uniqueId)).scope).toBe("private");
  });

  it("update: level rewrites scope; a legacy scope write rewrites level", async () => {
    const m = await createVaultMemoryOp(ctx, { content: "a" });
    await updateVaultMemoryOp(ctx, m.uniqueId, { content: "a", level: "matching" });
    expect(await rawRow(m.uniqueId)).toMatchObject({ level: "matching", scope: "shared" });

    await updateVaultMemoryOp(ctx, m.uniqueId, { content: "a", scope: "private" });
    expect(await rawRow(m.uniqueId)).toMatchObject({ level: "private", scope: "private" });
  });

  it("update: a legacy scope 'shared' write keeps a profile row at profile", async () => {
    const m = await createVaultMemoryOp(ctx, {
      content: "Name is Ivy",
      kind: "display_name",
      kindValue: '"Ivy"',
      level: "profile",
    });
    await updateVaultMemoryOp(ctx, m.uniqueId, { content: "Name is Ivy", scope: "shared" });
    expect(await rawRow(m.uniqueId)).toMatchObject({ level: "profile", scope: "shared" });
  });

  it("reads a NULL level (un-backfilled LokiJS row) from scope, and filters on it", async () => {
    const legacyShared = await createVaultMemoryOp(ctx, { content: "a", scope: "shared" });
    const legacyPrivate = await createVaultMemoryOp(ctx, { content: "b" });
    const profile = await createVaultMemoryOp(ctx, {
      content: "c",
      kind: "religion",
      kindValue: '"buddhist"',
      level: "profile",
    });
    await db.write(async () => {
      for (const id of [legacyShared.uniqueId, legacyPrivate.uniqueId]) {
        const r = await ctx.vaultMemoryCollection.find(id);
        await r.update((rec) => rec._setRaw("level", null));
      }
    });

    expect((await getVaultMemoryOp(ctx, legacyShared.uniqueId))?.level).toBe("matching");
    expect((await getVaultMemoryOp(ctx, legacyPrivate.uniqueId))?.level).toBe("private");

    const ids = async (levels: ("private" | "matching" | "profile")[]) =>
      (await getAllVaultMemoriesOp(ctx, { levels })).map((m) => m.uniqueId).sort();
    expect(await ids(["matching", "profile"])).toEqual(
      [legacyShared.uniqueId, profile.uniqueId].sort()
    );
    expect(await ids(["private"])).toEqual([legacyPrivate.uniqueId]);
    expect(await ids(["profile"])).toEqual([profile.uniqueId]);

    const kinded = await getAllVaultMemoriesOp(ctx, { kinds: ["religion"] });
    expect(kinded.map((m) => m.uniqueId)).toEqual([profile.uniqueId]);
  });
});

describe("kind_value encryption", () => {
  const address = "0x1234567890123456789012345678901234567890";
  const signMessage = vi.fn(
    async (message: string) => `0x${Buffer.from(message).toString("hex").padStart(130, "0")}`
  ) as unknown as SignMessageFn;

  beforeEach(() => {
    clearAllEncryptionKeys();
    ctx = { ...ctx, walletAddress: address, signMessage };
  });

  it("stores kind_value encrypted like content and decrypts it on read", async () => {
    const value = JSON.stringify("buddhist");
    const created = await createVaultMemoryOp(ctx, {
      content: "Is Buddhist",
      kind: "religion",
      kindValue: value,
      level: "matching",
    });
    expect(created.kindValue).toBe(value);

    const raw = await rawRow(created.uniqueId);
    expect(String(raw.kind_value)).toMatch(/^enc:v\d:/);
    expect(raw.kind_value).not.toContain("buddhist");
    expect(String(raw.content)).toMatch(/^enc:v\d:/);
    expect(raw.kind).toBe("religion");
    expect(raw.level).toBe("matching");

    expect((await getVaultMemoryOp(ctx, created.uniqueId))?.kindValue).toBe(value);
    const [listed] = await getAllVaultMemoriesOp(ctx, { kinds: ["religion"] });
    expect(listed.kindValue).toBe(value);

    const next = JSON.stringify("christian");
    const updated = await updateVaultMemoryOp(ctx, created.uniqueId, {
      content: "Is Christian",
      kindValue: next,
    });
    expect(updated?.kindValue).toBe(next);
    expect(String((await rawRow(created.uniqueId)).kind_value)).toMatch(/^enc:v\d:/);
  });

  it("leaves a free-form row's kind_value NULL", async () => {
    const created = await createVaultMemoryOp(ctx, { content: "Likes tea" });
    expect(created.kindValue).toBeNull();
    expect((await rawRow(created.uniqueId)).kind_value).toBeNull();
  });
});

describe("kinded rows are exempt from decay and supersession", () => {
  it("the decay candidate scan never returns a kinded row", async () => {
    const free = await createVaultMemoryOp(ctx, { content: "Planning a trip" });
    const kinded = await createVaultMemoryOp(ctx, {
      content: "Doesn't smoke",
      kind: "smoking",
      kindValue: '"never"',
      level: "profile",
    });
    const ids = (await getDecayCandidatesRawOp(ctx)).map((c) => c.uniqueId);
    expect(ids).toContain(free.uniqueId);
    expect(ids).not.toContain(kinded.uniqueId);
  });

  it("supersedeVaultMemoryOp refuses to retire a kinded row", async () => {
    const kinded = await createVaultMemoryOp(ctx, {
      content: "Works at Google",
      kind: "occupation",
      kindValue: '"Google"',
      level: "profile",
    });
    const successor = await createVaultMemoryOp(ctx, { content: "Works at Riverbend" });
    expect(await supersedeVaultMemoryOp(ctx, kinded.uniqueId, successor.uniqueId)).toBe(false);
    expect((await getVaultMemoryOp(ctx, kinded.uniqueId))?.supersededBy).toBeNull();
  });

  it("createSupersedingMemoryOp creates nothing against a kinded target", async () => {
    const kinded = await createVaultMemoryOp(ctx, {
      content: "Works at Google",
      kind: "occupation",
      kindValue: '"Google"',
      level: "profile",
    });
    const result = await createSupersedingMemoryOp(
      ctx,
      { content: "Works at Riverbend" },
      kinded.uniqueId
    );
    expect(result).toEqual({ created: null, retired: false });
    expect(await getAllVaultMemoriesOp(ctx)).toHaveLength(1);
  });
});

describe("folder scope writes keep level in step", () => {
  function folderCtx() {
    return {
      database: db,
      vaultFolderCollection: db.get<VaultFolder>("vault_folders"),
      vaultMemoryCollection: ctx.vaultMemoryCollection,
    };
  }

  it("unpublishes matching rows when their folder goes private or is deleted", async () => {
    const fctx = folderCtx();
    const folder = (await createVaultFolderOp(fctx, { name: "Trips", scope: "shared" }))!;
    const kept = await createVaultMemoryOp(ctx, {
      content: "Likes hiking",
      level: "matching",
      folderId: folder.uniqueId,
    });
    const profile = await createVaultMemoryOp(ctx, {
      content: "Works as a nurse",
      kind: "occupation",
      kindValue: '"nurse"',
      level: "profile",
      folderId: folder.uniqueId,
    });

    await updateVaultFolderOp(fctx, folder.uniqueId, { scope: "private" });
    expect(await rawRow(kept.uniqueId)).toMatchObject({ level: "private", scope: "private" });
    expect(await rawRow(profile.uniqueId)).toMatchObject({ level: "private", scope: "private" });
    expect(await getAllVaultMemoriesOp(ctx, { levels: ["matching", "profile"] })).toHaveLength(0);

    await updateVaultFolderOp(fctx, folder.uniqueId, { scope: "shared" });
    expect(await rawRow(kept.uniqueId)).toMatchObject({ level: "matching", scope: "shared" });

    await deleteVaultFolderOp(fctx, folder.uniqueId);
    expect(await rawRow(kept.uniqueId)).toMatchObject({ level: "private", scope: "private" });
  });

  it("publishes moved rows and keeps a profile row at profile", async () => {
    const fctx = folderCtx();
    const shared = (await createVaultFolderOp(fctx, { name: "Public", scope: "shared" }))!;
    const plain = await createVaultMemoryOp(ctx, { content: "Likes hiking" });
    const profile = await createVaultMemoryOp(ctx, {
      content: "Works as a nurse",
      kind: "occupation",
      kindValue: '"nurse"',
      level: "profile",
    });

    await moveMemoriesToFolderOp(fctx, [plain.uniqueId, profile.uniqueId], shared.uniqueId);
    expect(await rawRow(plain.uniqueId)).toMatchObject({ level: "matching", scope: "shared" });
    expect(await rawRow(profile.uniqueId)).toMatchObject({ level: "profile", scope: "shared" });

    await moveMemoriesToFolderOp(fctx, [plain.uniqueId], null);
    expect(await rawRow(plain.uniqueId)).toMatchObject({ level: "private", scope: "private" });
  });
});

describe("freeFormOnly updates", () => {
  it("skip a kinded row and leave it unchanged", async () => {
    const profile = await createVaultMemoryOp(ctx, {
      content: "Works as a nurse",
      kind: "occupation",
      kindValue: '"nurse"',
      level: "profile",
    });
    const free = await createVaultMemoryOp(ctx, { content: "Likes hiking" });

    expect(
      await updateVaultMemoryOp(ctx, profile.uniqueId, {
        content: "Works as a doctor",
        freeFormOnly: true,
      })
    ).toBeNull();
    expect(await getVaultMemoryOp(ctx, profile.uniqueId)).toMatchObject({
      content: "Works as a nurse",
      kind: "occupation",
    });
    expect(
      await updateVaultMemoryOp(ctx, free.uniqueId, { content: "Loves hiking", freeFormOnly: true })
    ).toMatchObject({ content: "Loves hiking" });
  });
});
