/**
 * Multi-hop graph traversal (PR4) against a REAL in-memory WatermelonDB
 * (LokiJS adapter — same setup as roundTrip.test.ts). The entity /
 * memory_entity joins run for real; only the embeddings network edge is
 * faked (a deterministic bag-of-words hash embedder) for the one recall()
 * integration test that needs a query vector.
 *
 * Coverage:
 *  - getEntitiesByMemoryIdsOp: reverse lookup, userId/scope filtering, empty.
 *  - traverseGraphLane: hop reachability (C surfaces at hop 2 not hop 1),
 *    ENTITY_FANOUT / NODE_BUDGET / MAX_HOPS caps, density hop-cap.
 *  - Regression guard: maxHops=1 output == the single-hop lane ordering.
 *  - Invariant: an archived / quarantined memory linked to a hop entity does
 *    NOT leak into recall results (dropped at the getAllVaultMemoriesOp choke
 *    point even though the graph lane emits its id).
 */
import { Database } from "@nozbe/watermelondb";
import LokiJSAdapter from "@nozbe/watermelondb/adapters/lokijs";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../memoryEngine/embeddings", () => {
  const DIM = 64;
  const embed = (text: string): number[] => {
    const v: number[] = new Array<number>(DIM).fill(0);
    const tokens = text.toLowerCase().match(/[a-z0-9']+/g) ?? [];
    for (const token of tokens) {
      let hash = 0;
      for (let i = 0; i < token.length; i++) hash = (hash * 31 + token.charCodeAt(i)) >>> 0;
      v[hash % DIM] += 1;
    }
    const norm = Math.sqrt(v.reduce((sum, x) => sum + x * x, 0)) || 1;
    return v.map((x) => x / norm);
  };
  return {
    generateEmbedding: vi.fn(async (text: string) => embed(text)),
    generateEmbeddings: vi.fn(async (texts: string[]) => texts.map(embed)),
  };
});

// Same deterministic embedder as the mock above (mock factories are hoisted and
// can't close over module scope, so the row-embedding helper is duplicated).
const EMBED_DIM = 64;
function embed(text: string): number[] {
  const v: number[] = new Array<number>(EMBED_DIM).fill(0);
  const tokens = text.toLowerCase().match(/[a-z0-9']+/g) ?? [];
  for (const token of tokens) {
    let hash = 0;
    for (let i = 0; i < token.length; i++) hash = (hash * 31 + token.charCodeAt(i)) >>> 0;
    v[hash % EMBED_DIM] += 1;
  }
  const norm = Math.sqrt(v.reduce((sum, x) => sum + x * x, 0)) || 1;
  return v.map((x) => x / norm);
}

import type { Entity, MemoryEntity } from "../db/entities/models";
import {
  type EntityOperationsContext,
  getEntitiesByMemoryIdsOp,
  getMemoriesByEntityNamesOp,
  linkMemoryEntitiesOp,
} from "../db/entities/operations";
import type { VaultMemory } from "../db/memoryVault/models";
import {
  archiveVaultMemoryOp,
  createVaultMemoryOp,
  type VaultMemoryOperationsContext,
} from "../db/memoryVault/operations";
import { sdkMigrations, sdkModelClasses, sdkSchema } from "../db/schema";

import { capHopsForDensity, MAX_HOPS, traverseGraphLane } from "./graphTraversal";
import { recall } from "./recall";
import type { RecallContext } from "./types";

function makeDatabase(): Database {
  const adapter = new LokiJSAdapter({
    schema: sdkSchema,
    migrations: sdkMigrations,
    useWebWorker: false,
    useIncrementalIndexedDB: false,
    dbName: `graph-traversal-test-${Math.random().toString(36).slice(2)}`,
  });
  return new Database({ adapter, modelClasses: sdkModelClasses });
}

let database: Database;

function makeEntityCtx(overrides: Partial<EntityOperationsContext> = {}): EntityOperationsContext {
  return {
    database,
    entityCollection: database.get<Entity>("entity"),
    memoryEntityCollection: database.get<MemoryEntity>("memory_entity"),
    ...overrides,
  };
}

/** Link a memory id to entity names in the given (user-scoped) context. */
async function link(
  ctx: EntityOperationsContext,
  memoryId: string,
  names: string[]
): Promise<void> {
  await linkMemoryEntitiesOp(ctx, memoryId, names);
}

beforeEach(() => {
  database = makeDatabase();
});

describe("getEntitiesByMemoryIdsOp", () => {
  it("returns each memory's linked canonical entity names (reverse lookup)", async () => {
    const ctx = makeEntityCtx();
    await link(ctx, "A", ["Alpha", "Beta"]);
    await link(ctx, "B", ["Beta"]);

    const map = await getEntitiesByMemoryIdsOp(ctx, ["A", "B"]);

    expect([...(map.get("A") ?? [])].sort()).toEqual(["alpha", "beta"]);
    expect([...(map.get("B") ?? [])]).toEqual(["beta"]);
  });

  it("returns an empty map for empty input without querying", async () => {
    const ctx = makeEntityCtx();
    await link(ctx, "A", ["Alpha"]);
    expect((await getEntitiesByMemoryIdsOp(ctx, [])).size).toBe(0);
    expect((await getEntitiesByMemoryIdsOp(ctx, [""])).size).toBe(0);
  });

  it("filters by userId — a user only sees links they own", async () => {
    const ctxU1 = makeEntityCtx({ userId: "u1" });
    const ctxU2 = makeEntityCtx({ userId: "u2" });
    await link(ctxU1, "M", ["OwnedByU1"]);
    await link(ctxU2, "M", ["OwnedByU2"]);

    expect([...(await getEntitiesByMemoryIdsOp(ctxU1, ["M"])).get("M")!]).toEqual(["ownedbyu1"]);
    expect([...(await getEntitiesByMemoryIdsOp(ctxU2, ["M"])).get("M")!]).toEqual(["ownedbyu2"]);
  });

  it("admits user_id=null rows only under allowUnscopedRows", async () => {
    const ctxNoUser = makeEntityCtx(); // writes user_id=null links
    const ctxU1 = makeEntityCtx({ userId: "u1" });
    await link(ctxNoUser, "M", ["Unscoped"]);
    await link(ctxU1, "M", ["OwnedByU1"]);

    // Strict: null rows are invisible.
    expect([...(await getEntitiesByMemoryIdsOp(ctxU1, ["M"])).get("M")!]).toEqual(["ownedbyu1"]);

    // Escape hatch: null rows admitted alongside the user's own.
    const lenient = makeEntityCtx({ userId: "u1", allowUnscopedRows: true });
    expect([...(await getEntitiesByMemoryIdsOp(lenient, ["M"])).get("M")!].sort()).toEqual([
      "ownedbyu1",
      "unscoped",
    ]);
  });
});

describe("traverseGraphLane — hop reachability", () => {
  // Fixture graph: A–B share e1 (alpha), B–C share e2 (beta).
  //   A → {alpha}, B → {alpha, beta}, C → {beta}
  // A query on "alpha" seeds {A, B}; C is only reachable by expanding B's
  // neighbor entity beta (one hop out).
  async function buildChain(ctx: EntityOperationsContext): Promise<void> {
    await link(ctx, "A", ["Alpha"]);
    await link(ctx, "B", ["Alpha", "Beta"]);
    await link(ctx, "C", ["Beta"]);
  }
  const QUERY = "What about Alpha"; // seed = ["alpha"] ("What" is a stopword)

  it("surfaces the seed memories but NOT the hop-2 memory at maxHops=1", async () => {
    const ctx = makeEntityCtx();
    await buildChain(ctx);

    const ids = await traverseGraphLane(QUERY, ctx, { maxHops: 1 });

    expect(ids).toEqual(expect.arrayContaining(["A", "B"]));
    expect(ids).not.toContain("C");
  });

  it("reaches the hop-2 memory at maxHops=2, ranked below the closer seeds", async () => {
    const ctx = makeEntityCtx();
    await buildChain(ctx);

    const ids = await traverseGraphLane(QUERY, ctx, { maxHops: 2 });

    expect(ids).toContain("C");
    // C is farther from the seed than A and B → must not outrank them.
    expect(ids.indexOf("C")).toBeGreaterThan(ids.indexOf("A"));
    expect(ids.indexOf("C")).toBeGreaterThan(ids.indexOf("B"));
  });

  it("returns [] when the query has no extractable entities", async () => {
    const ctx = makeEntityCtx();
    await buildChain(ctx);
    expect(await traverseGraphLane("what happened yesterday", ctx, { maxHops: 2 })).toEqual([]);
  });

  it("returns [] when no stored memory shares a seed entity", async () => {
    const ctx = makeEntityCtx();
    await buildChain(ctx);
    expect(await traverseGraphLane("What about Zeta", ctx, { maxHops: 2 })).toEqual([]);
  });
});

describe("traverseGraphLane — caps", () => {
  it("MAX_HOPS default is seed-only (1) and equals the single-hop ordering", async () => {
    const ctx = makeEntityCtx();
    // Distinct shared-counts pin a specific order: X shares 2, Y & Z share 1.
    await link(ctx, "X", ["Alpha", "Beta"]);
    await link(ctx, "Y", ["Alpha"]);
    await link(ctx, "Z", ["Beta"]);
    const QUERY = "Alpha and Beta"; // seed = ["alpha", "beta"]

    // Independent single-hop computation (what buildGraphLaneRanking produces).
    const seedMap = await getMemoriesByEntityNamesOp(ctx, ["alpha", "beta"]);
    const expected = [...seedMap.entries()].sort((a, b) => b[1].size - a[1].size).map(([id]) => id);

    expect(MAX_HOPS).toBe(1);
    // Default (no maxHops) and explicit maxHops=1 both equal the single-hop order.
    expect(await traverseGraphLane(QUERY, ctx)).toEqual(expected);
    expect(await traverseGraphLane(QUERY, ctx, { maxHops: 1 })).toEqual(expected);
    // X (shares both) must lead.
    expect(expected[0]).toBe("X");
  });

  it("clamps maxHops < 1 to the seed-only default", async () => {
    const ctx = makeEntityCtx();
    await link(ctx, "A", ["Alpha", "Beta"]);
    await link(ctx, "C", ["Beta"]);
    // maxHops=0 is invalid → falls back to MAX_HOPS(1) → no expansion → no C.
    const ids = await traverseGraphLane("What about Alpha", ctx, { maxHops: 0 });
    expect(ids).toContain("A");
    expect(ids).not.toContain("C");
  });

  it("ENTITY_FANOUT limits how many neighbor entities expand per hop", async () => {
    const ctx = makeEntityCtx();
    // Frontier {A, B, D} seeds on alpha. Neighbor beta co-occurs twice (A, B),
    // gamma once (D). With fanout=1 only beta expands → MB reachable, MG not.
    await link(ctx, "A", ["Alpha", "Beta"]);
    await link(ctx, "B", ["Alpha", "Beta"]);
    await link(ctx, "D", ["Alpha", "Gamma"]);
    await link(ctx, "MB", ["Beta"]);
    await link(ctx, "MG", ["Gamma"]);
    const QUERY = "What about Alpha";

    const fanout1 = await traverseGraphLane(QUERY, ctx, { maxHops: 2, entityFanout: 1 });
    expect(fanout1).toContain("MB");
    expect(fanout1).not.toContain("MG");

    const fanout2 = await traverseGraphLane(QUERY, ctx, { maxHops: 2, entityFanout: 2 });
    expect(fanout2).toContain("MB");
    expect(fanout2).toContain("MG");
  });

  it("NODE_BUDGET stops expansion once the accumulated set is full", async () => {
    const ctx = makeEntityCtx();
    await link(ctx, "A", ["Alpha", "Beta"]);
    await link(ctx, "B", ["Alpha", "Beta"]);
    await link(ctx, "C", ["Beta"]); // only reachable via a hop-2 expansion
    const QUERY = "What about Alpha";

    // Seed already fills the budget (2) → the loop breaks before expanding.
    const capped = await traverseGraphLane(QUERY, ctx, { maxHops: 2, nodeBudget: 2 });
    expect(capped).toEqual(expect.arrayContaining(["A", "B"]));
    expect(capped).not.toContain("C");

    // Roomy budget → the expansion runs and reaches C.
    const roomy = await traverseGraphLane(QUERY, ctx, { maxHops: 2, nodeBudget: 64 });
    expect(roomy).toContain("C");
  });

  it("capHopsForDensity forces seed-only above the vault-size threshold", () => {
    expect(capHopsForDensity(2, 500)).toBe(2); // below threshold
    expect(capHopsForDensity(2, 5000)).toBe(1); // above → capped
    expect(capHopsForDensity(2, undefined)).toBe(2); // unknown → no cap
  });

  it("applies the density cap end-to-end via the vaultSize option", async () => {
    const ctx = makeEntityCtx();
    await link(ctx, "A", ["Alpha", "Beta"]);
    await link(ctx, "C", ["Beta"]);
    // maxHops=2 requested, but a huge vault caps it to 1 → C not reached.
    const ids = await traverseGraphLane("What about Alpha", ctx, { maxHops: 2, vaultSize: 5000 });
    expect(ids).toContain("A");
    expect(ids).not.toContain("C");
  });
});

describe("recall graph lane — archived / quarantined never leak", () => {
  it("drops an archived and a quarantined memory linked to a hop entity", async () => {
    const vaultCtx: VaultMemoryOperationsContext = {
      database,
      vaultMemoryCollection: database.get<VaultMemory>("memory_vault"),
    };
    const entityCtx = makeEntityCtx();

    const QUERY = "What about Zeta"; // seed = ["zeta"]
    // Identical embedding for all three so cosine can't be the reason a row is
    // dropped — only the archived/quarantine filter can be. Distinct content so
    // recall's content-dedup doesn't collapse them.
    const vec = JSON.stringify(embed(QUERY));

    const clean = await createVaultMemoryOp(vaultCtx, {
      content: "clean zeta note",
      embedding: vec,
    });
    const quarantined = await createVaultMemoryOp(vaultCtx, {
      content: "quarantined zeta note",
      embedding: vec,
      trustTier: "quarantined",
    });
    const archived = await createVaultMemoryOp(vaultCtx, {
      content: "archived zeta note",
      embedding: vec,
    });
    await archiveVaultMemoryOp(vaultCtx, archived.uniqueId);

    // All three are linked to the seed entity, so all three enter the graph
    // lane's entityRanking.
    for (const id of [clean.uniqueId, quarantined.uniqueId, archived.uniqueId]) {
      await link(entityCtx, id, ["Zeta"]);
    }

    const recallCtx: RecallContext = {
      vaultCtx,
      entityCtx,
      embeddingOptions: { apiKey: "test-key" },
      vaultCache: new Map<string, number[]>(),
    };
    const result = await recall(QUERY, recallCtx, { budget: "low", minScore: 0 });

    const ids = result.memories.map((m) => m.id);
    expect(ids).toContain(clean.uniqueId);
    expect(ids).not.toContain(quarantined.uniqueId);
    expect(ids).not.toContain(archived.uniqueId);
    expect(result.memories.some((m) => m.content.includes("quarantined"))).toBe(false);
    expect(result.memories.some((m) => m.content.includes("archived"))).toBe(false);
  });
});
