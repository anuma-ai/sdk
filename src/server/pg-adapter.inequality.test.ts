import { Database, Q } from "@nozbe/watermelondb";
import { toPromise } from "@nozbe/watermelondb/utils/fp/Result";
import { describe, expect, it, vi } from "vitest";

import type { VaultMemory } from "../lib/db/memoryVault/models";
import {
  countActiveVaultMemoriesOp,
  getAllVaultMemoriesOp,
  getVaultMemoriesByIdsOp,
} from "../lib/db/memoryVault/operations";
import { sdkModelClasses, sdkSchema } from "../lib/db/schema";
import type { PgPoolLike } from "./pg-adapter";
import { PostgreSQLAdapter } from "./pg-adapter";

async function createContext() {
  const query = vi.fn<PgPoolLike["query"]>().mockResolvedValue({ rows: [] });
  const adapter = new PostgreSQLAdapter({
    pool: { query },
    schema: sdkSchema,
    dbName: "vault-inequality-test",
  });
  const database = new Database({ adapter, modelClasses: sdkModelClasses });
  await toPromise((cb) => adapter.getLocal("__noop__", cb));
  query.mockClear();
  return {
    ctx: { database, vaultMemoryCollection: database.get<VaultMemory>("memory_vault") },
    query,
  };
}

describe("PostgreSQLAdapter vault inequality", () => {
  it.each(["list", "count", "recall"] as const)(
    "uses NULL-preserving inequality for %s reads",
    async (operation) => {
      const { ctx, query } = await createContext();

      switch (operation) {
        case "list":
          await getAllVaultMemoriesOp(ctx);
          break;
        case "count":
          await countActiveVaultMemoriesOp(ctx);
          break;
        case "recall":
          await getVaultMemoriesByIdsOp(ctx, ["ordinary", "trusted", "quarantined"]);
          break;
      }

      expect(query).toHaveBeenCalledTimes(1);
      const [sql, values] = query.mock.calls[0];
      expect(values).toContain("quarantined");
      const parameter = (values?.indexOf("quarantined") ?? -1) + 1;
      expect(sql).toContain(`"memory_vault"."trust_tier" is distinct from $${parameter}`);
    }
  );

  it.each([
    { comparison: Q.eq(null), operator: "is null" },
    { comparison: Q.notEq(null), operator: "is not null" },
  ])("keeps $operator for a NULL operand", async ({ comparison, operator }) => {
    const { ctx, query } = await createContext();

    await ctx.vaultMemoryCollection.query(Q.where("trust_tier", comparison)).fetchIds();

    expect(query).toHaveBeenCalledTimes(1);
    const [sql, values] = query.mock.calls[0];
    expect(sql).toContain(`"memory_vault"."trust_tier" ${operator}`);
    expect(values).not.toContain(null);
  });
});
