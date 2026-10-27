import { Database, Q } from "@nozbe/watermelondb";
import LokiJSAdapter from "@nozbe/watermelondb/adapters/lokijs";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { sdkMigrations, sdkModelClasses, sdkSchema } from "../schema";
import { decryptVaultMemoryFields } from "./encryption";
import type { VaultMemory } from "./models";
import { getVaultProfileMetadataOp, type VaultMemoryOperationsContext } from "./operations";

vi.mock("./encryption", () => ({
  encryptVaultMemoryContent: vi.fn(),
  decryptVaultMemoryFields: vi.fn(),
}));

let ctx: VaultMemoryOperationsContext;

beforeEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
  const database = new Database({
    adapter: new LokiJSAdapter({
      schema: sdkSchema,
      migrations: sdkMigrations,
      useWebWorker: false,
      useIncrementalIndexedDB: false,
      dbName: `profile-metadata-${Math.random().toString(36).slice(2)}`,
    }),
    modelClasses: sdkModelClasses,
  });
  ctx = {
    database,
    vaultMemoryCollection: database.get<VaultMemory>("memory_vault"),
    userId: "owner",
    walletAddress: "0xowner",
  };
});

describe("getVaultProfileMetadataOp", () => {
  it.each([{ scopes: ["private"] }, { scopes: [] }])(
    "selects metadata columns with scopes $scopes",
    async ({ scopes }) => {
      const sqlSpy = vi.spyOn(Q, "unsafeSqlQuery");
      const unsafeFetchRaw = vi.fn().mockResolvedValue([
        {
          id: "a",
          scope: "private",
          created_at: 500,
          updated_at: 1000,
          last_observed_at: 3000,
          superseded_at: 4000,
          superseded_by: "b",
          is_deleted: 1,
          proof_count: 3,
        },
      ]);
      vi.spyOn(ctx.vaultMemoryCollection, "query").mockReturnValueOnce({
        unsafeFetchRaw,
      } as unknown as ReturnType<typeof ctx.vaultMemoryCollection.query>);

      const rows = await getVaultProfileMetadataOp(ctx, { scopes });

      const [sql, args] = sqlSpy.mock.calls[0];
      expect(sql.split(" from ")[0]).toBe(
        'select "id", "scope", "created_at", "updated_at", "last_observed_at", ' +
          '"superseded_at", "superseded_by", "is_deleted", "proof_count"'
      );
      expect(sql).toContain('"archived_at" is null');
      expect(sql).toContain("\"trust_tier\" is not 'quarantined'");
      expect(sql).toContain('"user_id" = ?');
      expect(sql).toContain("\"_status\" != 'deleted'");
      expect(sql).not.toContain('"is_deleted" = 0');
      expect(sql).not.toContain('"superseded_by" is null');
      expect(args).toEqual(["owner", ...scopes]);
      expect(rows).toEqual([
        {
          uniqueId: "a",
          scope: "private",
          createdAt: new Date(500),
          updatedAt: new Date(1000),
          lastObservedAt: 3000,
          supersededAt: 4000,
          supersededBy: "b",
          isDeleted: true,
          proofCount: 3,
        },
      ]);
      expect(decryptVaultMemoryFields).not.toHaveBeenCalled();
    }
  );

  it("keeps deleted and superseded rows with the same owner and scope on LokiJS", async () => {
    const records: (Record<string, string | number | boolean | null> & { id: string })[] = [
      { id: "active" },
      { id: "deleted", is_deleted: true },
      { id: "superseded", superseded_by: "active", superseded_at: 5000 },
      { id: "foreign", user_id: "other" },
      { id: "shared", scope: "shared" },
      { id: "archived", archived_at: 6000 },
      { id: "quarantined", trust_tier: "quarantined" },
      { id: "database-deleted" },
    ];
    await ctx.database.write(async () => {
      for (const overrides of records) {
        const created = await ctx.vaultMemoryCollection.create((record) => {
          record._raw.id = overrides.id;
          const raw = {
            content: "encrypted content",
            embedding: "[1,0]",
            scope: "private",
            user_id: "owner",
            created_at: 500,
            updated_at: 1000,
            ...overrides,
          };
          for (const [key, value] of Object.entries(raw)) {
            if (key !== "id") record._setRaw(key, value);
          }
        });
        if (overrides.id === "database-deleted") await created.markAsDeleted();
      }
    });

    const rows = await getVaultProfileMetadataOp(ctx, { scopes: ["private"] });

    expect(rows.map((row) => row.uniqueId).sort()).toEqual(["active", "deleted", "superseded"]);
    expect(rows.find((row) => row.uniqueId === "superseded")).toMatchObject({
      supersededBy: "active",
      supersededAt: 5000,
    });
    expect(rows.find((row) => row.uniqueId === "deleted")?.isDeleted).toBe(true);
    for (const row of rows) {
      expect(row).not.toHaveProperty("content");
      expect(row).not.toHaveProperty("embedding");
    }
    expect(decryptVaultMemoryFields).not.toHaveBeenCalled();
  });
});
