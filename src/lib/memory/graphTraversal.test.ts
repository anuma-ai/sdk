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

vi.mock("../memoryVault/searchTool", async (importActual) => {
  const actual = await importActual<typeof import("../memoryVault/searchTool")>();
  return { ...actual, searchVaultMemoriesWithSize: vi.fn(actual.searchVaultMemoriesWithSize) };
});

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
  getActiveVaultMemoryIdsOp,
  type VaultMemoryOperationsContext,
} from "../db/memoryVault/operations";
import { sdkMigrations, sdkModelClasses, sdkSchema } from "../db/schema";
import { searchVaultMemoriesWithSize } from "../memoryVault/searchTool";

import {
  capHopsForDensity,
  createLlmNeighborRefiner,
  MAX_HOPS,
  type NeighborRefiner,
  traverseGraphLane,
} from "./graphTraversal";
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
    const ctxNoUser = makeEntityCtx();
    const ctxU1 = makeEntityCtx({ userId: "u1" });
    await link(ctxNoUser, "M", ["Unscoped"]);
    await link(ctxU1, "M", ["OwnedByU1"]);

    expect([...(await getEntitiesByMemoryIdsOp(ctxU1, ["M"])).get("M")!]).toEqual(["ownedbyu1"]);

    const lenient = makeEntityCtx({ userId: "u1", allowUnscopedRows: true });
    expect([...(await getEntitiesByMemoryIdsOp(lenient, ["M"])).get("M")!].sort()).toEqual([
      "ownedbyu1",
      "unscoped",
    ]);
  });
});

describe("traverseGraphLane — hop reachability", () => {
  async function buildChain(ctx: EntityOperationsContext): Promise<void> {
    await link(ctx, "A", ["Alpha"]);
    await link(ctx, "B", ["Alpha", "Beta"]);
    await link(ctx, "C", ["Beta"]);
  }
  const QUERY = "What about Alpha";

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
    expect(ids.indexOf("C")).toBeGreaterThan(ids.indexOf("A"));
    expect(ids.indexOf("C")).toBeGreaterThan(ids.indexOf("B"));
  });

  it("recovers an all-lowercase query through the same fallback seed extraction (D4)", async () => {
    const ctx = makeEntityCtx();
    await buildChain(ctx);

    const lower = await traverseGraphLane("what about alpha", ctx, { maxHops: 1 });
    const upper = await traverseGraphLane(QUERY, ctx, { maxHops: 1 });

    expect(lower).toEqual(upper);
    expect(lower).toEqual(expect.arrayContaining(["A", "B"]));
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
  it("explicit maxHops=1 is seed-only and equals the single-hop ordering", async () => {
    const ctx = makeEntityCtx();
    await link(ctx, "X", ["Alpha", "Beta"]);
    await link(ctx, "Y", ["Alpha"]);
    await link(ctx, "Z", ["Beta"]);
    const QUERY = "Alpha and Beta";

    const seedMap = await getMemoriesByEntityNamesOp(ctx, ["alpha", "beta"]);
    const expected = [...seedMap.entries()].sort((a, b) => b[1].size - a[1].size).map(([id]) => id);

    expect(await traverseGraphLane(QUERY, ctx, { maxHops: 1 })).toEqual(expected);
    expect(expected[0]).toBe("X");
  });

  it("PR5: MAX_HOPS default is 2 (one expansion beyond the seed)", async () => {
    const ctx = makeEntityCtx();
    await link(ctx, "A", ["Alpha", "Beta"]);
    await link(ctx, "C", ["Beta"]);
    expect(MAX_HOPS).toBe(2);
    const ids = await traverseGraphLane("What about Alpha", ctx);
    expect(ids).toContain("A");
    expect(ids).toContain("C");
  });

  it("clamps maxHops < 1 to the MAX_HOPS default (2 → expands)", async () => {
    const ctx = makeEntityCtx();
    await link(ctx, "A", ["Alpha", "Beta"]);
    await link(ctx, "C", ["Beta"]);
    const ids = await traverseGraphLane("What about Alpha", ctx, { maxHops: 0 });
    expect(ids).toContain("A");
    expect(ids).toContain("C");
  });

  it("ENTITY_FANOUT limits how many neighbor entities expand per hop", async () => {
    const ctx = makeEntityCtx();
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
    await link(ctx, "C", ["Beta"]);
    const QUERY = "What about Alpha";

    const capped = await traverseGraphLane(QUERY, ctx, { maxHops: 2, nodeBudget: 2 });
    expect(capped).toEqual(expect.arrayContaining(["A", "B"]));
    expect(capped).not.toContain("C");

    const roomy = await traverseGraphLane(QUERY, ctx, { maxHops: 2, nodeBudget: 64 });
    expect(roomy).toContain("C");
  });

  it("caps the emitted candidate pool at NODE_BUDGET even when one entity returns more", async () => {
    const ctx = makeEntityCtx();
    for (let i = 0; i < 10; i++) await link(ctx, `M${i}`, ["Hub"]);

    const ids = await traverseGraphLane("What about Hub", ctx, { maxHops: 2, nodeBudget: 4 });
    expect(ids.length).toBe(4);
  });

  it("capHopsForDensity forces seed-only above the vault-size threshold", () => {
    expect(capHopsForDensity(2, 500)).toBe(2);
    expect(capHopsForDensity(2, 5000)).toBe(1);
    expect(capHopsForDensity(2, undefined)).toBe(2);
  });

  it("applies the density cap end-to-end via the vaultSize option", async () => {
    const ctx = makeEntityCtx();
    await link(ctx, "A", ["Alpha", "Beta"]);
    await link(ctx, "C", ["Beta"]);
    const ids = await traverseGraphLane("What about Alpha", ctx, { maxHops: 2, vaultSize: 5000 });
    expect(ids).toContain("A");
    expect(ids).not.toContain("C");
  });
});

describe("traverseGraphLane — PR5 LLM neighbor refinement", () => {
  async function seedRefineGraph(ctx: EntityOperationsContext): Promise<void> {
    await link(ctx, "A", ["Alpha", "Beta"]);
    await link(ctx, "B", ["Alpha", "Beta"]);
    await link(ctx, "D", ["Alpha", "Gamma"]);
    await link(ctx, "MB", ["Beta"]);
    await link(ctx, "MG", ["Gamma"]);
  }

  it("expands the neighbor the refiner picks, not the co-occurrence top", async () => {
    const ctx = makeEntityCtx();
    await seedRefineGraph(ctx);
    const refiner: NeighborRefiner = {
      refine: async () => ["gamma"],
    };
    const ids = await traverseGraphLane("What about Alpha", ctx, {
      maxHops: 2,
      entityFanout: 1,
      refineNeighbors: refiner,
    });
    expect(ids).toContain("MG");
    expect(ids).not.toContain("MB");
  });

  it("falls back to the deterministic order when the refiner throws", async () => {
    const ctx = makeEntityCtx();
    await seedRefineGraph(ctx);
    const throwing: NeighborRefiner = {
      refine: async () => {
        throw new Error("refiner down");
      },
    };
    const withThrow = await traverseGraphLane("What about Alpha", ctx, {
      maxHops: 2,
      entityFanout: 1,
      refineNeighbors: throwing,
    });
    const deterministic = await traverseGraphLane("What about Alpha", ctx, {
      maxHops: 2,
      entityFanout: 1,
    });
    expect(withThrow).toEqual(deterministic);
    expect(withThrow).toContain("MB");
  });

  it("ignores an empty refiner result and keeps the deterministic set", async () => {
    const ctx = makeEntityCtx();
    await seedRefineGraph(ctx);
    const empty: NeighborRefiner = { refine: async () => [] };
    const ids = await traverseGraphLane("What about Alpha", ctx, {
      maxHops: 2,
      entityFanout: 1,
      refineNeighbors: empty,
    });
    expect(ids).toContain("MB");
  });

  it("caps the candidate list handed to the refiner (PII egress bound)", async () => {
    const ctx = makeEntityCtx();
    const many = Array.from({ length: 30 }, (_, i) => `Ent${i}`);
    await link(ctx, "S", ["Alpha", ...many]);

    let received = -1;
    const refiner: NeighborRefiner = {
      refine: async (_q, candidates) => {
        received = candidates.length;
        return [];
      },
    };
    await traverseGraphLane("What about Alpha", ctx, {
      maxHops: 2,
      entityFanout: 1,
      refineNeighbors: refiner,
    });
    expect(received).toBe(16);
  });

  it("hard-caps the refiner candidate list regardless of a large entityFanout", async () => {
    const ctx = makeEntityCtx();
    const many = Array.from({ length: 200 }, (_, i) => `Ent${i}`);
    await link(ctx, "S", ["Alpha", ...many]);

    let received = -1;
    const refiner: NeighborRefiner = {
      refine: async (_q, candidates) => {
        received = candidates.length;
        return [];
      },
    };
    await traverseGraphLane("What about Alpha", ctx, {
      maxHops: 2,
      entityFanout: 100,
      refineNeighbors: refiner,
    });
    expect(received).toBe(64);
  });
});

describe("createLlmNeighborRefiner", () => {
  function mockFetch(body: unknown, ok = true): typeof fetch {
    return vi.fn().mockResolvedValue({ ok, json: async () => body }) as unknown as typeof fetch;
  }
  const choices = (jsonContent: unknown) => ({
    choices: [{ message: { content: JSON.stringify(jsonContent) } }],
  });

  it("maps the model's expand list back to real candidates (case-insensitive)", async () => {
    const refiner = createLlmNeighborRefiner({
      apiKey: "k",
      fetchFn: mockFetch(choices({ expand: ["Gamma", "not-a-candidate"] })),
      backoffMs: () => 0,
    });
    const out = await refiner.refine("q", ["beta", "gamma"], 2);
    expect(out).toEqual(["gamma"]);
  });

  it("returns [] on an LLM error (caller then falls back deterministically)", async () => {
    const refiner = createLlmNeighborRefiner({
      apiKey: "k",
      fetchFn: vi.fn().mockRejectedValue(new Error("boom")) as unknown as typeof fetch,
      maxAttempts: 1,
      backoffMs: () => 0,
    });
    expect(await refiner.refine("q", ["beta", "gamma"], 2)).toEqual([]);
  });

  it("returns [] for empty candidates without calling the LLM", async () => {
    const fetchFn = vi.fn() as unknown as typeof fetch;
    const refiner = createLlmNeighborRefiner({ apiKey: "k", fetchFn });
    expect(await refiner.refine("q", [], 2)).toEqual([]);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("declares memory_graph and keeps the per-hop cap out of the system turn", async () => {
    const fetchFn = mockFetch(choices({ expand: [] }));
    const refiner = createLlmNeighborRefiner({ apiKey: "k", fetchFn, backoffMs: () => 0 });
    await refiner.refine("who is Sara", ["beta", "gamma"], 2);
    await refiner.refine("where is Kyoto", ["delta"], 7);

    const calls = (fetchFn as unknown as ReturnType<typeof vi.fn>).mock.calls;
    expect(calls).toHaveLength(2);
    const turn = (i: number, role: "system" | "user"): string => {
      const messages = JSON.parse(calls[i][1].body as string).messages as Array<{
        role: string;
        content: string;
      }>;
      return messages.find((m) => m.role === role)!.content;
    };

    for (const call of calls) {
      expect((call[1].headers as Record<string, string>)["X-Anuma-Task-Type"]).toBe("memory_graph");
    }

    expect(turn(0, "system")).toBe(turn(1, "system"));
    expect(turn(0, "system")).not.toMatch(/\d/);
    expect(turn(0, "system")).not.toContain("Sara");
    expect(turn(0, "system")).not.toContain("beta");
    expect(turn(0, "user")).toContain("Choose at most 2.");
    expect(turn(1, "user")).toContain("Choose at most 7.");
  });
});

describe("traverseGraphLane — forgotten memories don't steer or egress", () => {
  it("an archived seed memory is dropped from the frontier: not in output, entities never egressed", async () => {
    const vaultCtx: VaultMemoryOperationsContext = {
      database,
      vaultMemoryCollection: database.get<VaultMemory>("memory_vault"),
    };
    const entityCtx = makeEntityCtx();

    const clean = await createVaultMemoryOp(vaultCtx, { content: "clean alpha note" });
    const arch = await createVaultMemoryOp(vaultCtx, { content: "archived alpha note" });
    await link(entityCtx, clean.uniqueId, ["Alpha", "Beta", "Gamma"]);
    await link(entityCtx, arch.uniqueId, ["Alpha", "SecretPerson"]);
    await archiveVaultMemoryOp(vaultCtx, arch.uniqueId);

    const egressed: string[] = [];
    const refiner: NeighborRefiner = {
      refine: async (_q, candidates) => {
        egressed.push(...candidates);
        return [];
      },
    };

    const ids = await traverseGraphLane("What about Alpha", entityCtx, {
      maxHops: 2,
      entityFanout: 1,
      refineNeighbors: refiner,
      filterActiveMemoryIds: (batch) => getActiveVaultMemoryIdsOp(vaultCtx, batch),
    });

    expect(ids).toContain(clean.uniqueId);
    expect(ids).not.toContain(arch.uniqueId);
    expect(egressed.some((name) => /secret/i.test(name))).toBe(false);
    expect(egressed.length).toBeGreaterThan(0);
  });

  it("without the active filter the archived memory DOES steer (guard is load-bearing)", async () => {
    const vaultCtx: VaultMemoryOperationsContext = {
      database,
      vaultMemoryCollection: database.get<VaultMemory>("memory_vault"),
    };
    const entityCtx = makeEntityCtx();
    const clean = await createVaultMemoryOp(vaultCtx, { content: "clean alpha note" });
    const arch = await createVaultMemoryOp(vaultCtx, { content: "archived alpha note" });
    await link(entityCtx, clean.uniqueId, ["Alpha", "Beta", "Gamma"]);
    await link(entityCtx, arch.uniqueId, ["Alpha", "SecretPerson"]);
    await archiveVaultMemoryOp(vaultCtx, arch.uniqueId);

    const egressed: string[] = [];
    const refiner: NeighborRefiner = {
      refine: async (_q, candidates) => {
        egressed.push(...candidates);
        return [];
      },
    };
    const ids = await traverseGraphLane("What about Alpha", entityCtx, {
      maxHops: 2,
      entityFanout: 1,
      refineNeighbors: refiner,
    });
    expect(ids).toContain(arch.uniqueId);
    expect(egressed.some((name) => /secret/i.test(name))).toBe(true);
  });
});

describe("recall graph lane — archived / quarantined never leak", () => {
  it("drops an archived and a quarantined memory linked to a hop entity", async () => {
    const vaultCtx: VaultMemoryOperationsContext = {
      database,
      vaultMemoryCollection: database.get<VaultMemory>("memory_vault"),
    };
    const entityCtx = makeEntityCtx();

    const QUERY = "What about Zeta";
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

    for (const id of [clean.uniqueId, quarantined.uniqueId, archived.uniqueId]) {
      await link(entityCtx, id, ["Zeta"]);
    }

    const recallCtx: RecallContext = {
      vaultCtx,
      entityCtx,
      embeddingOptions: { apiKey: "test-key" },
      vaultCache: new Map<string, Float32Array>(),
    };
    const result = await recall(QUERY, recallCtx, { budget: "low", minScore: 0 });

    const ids = result.memories.map((m) => m.id);
    expect(ids).toContain(clean.uniqueId);
    expect(ids).not.toContain(quarantined.uniqueId);
    expect(ids).not.toContain(archived.uniqueId);
    expect(result.memories.some((m) => m.content.includes("quarantined"))).toBe(false);
    expect(result.memories.some((m) => m.content.includes("archived"))).toBe(false);
  });

  it("single-hop (low budget): an archived id never enters entityRanking", async () => {
    const searchSpy = vi.mocked(searchVaultMemoriesWithSize);
    searchSpy.mockClear();

    const vaultCtx: VaultMemoryOperationsContext = {
      database,
      vaultMemoryCollection: database.get<VaultMemory>("memory_vault"),
    };
    const entityCtx = makeEntityCtx();

    const QUERY = "What about Zeta";
    const vec = JSON.stringify(embed(QUERY));

    const clean = await createVaultMemoryOp(vaultCtx, {
      content: "clean zeta note",
      embedding: vec,
    });
    const archived = await createVaultMemoryOp(vaultCtx, {
      content: "archived zeta note",
      embedding: vec,
    });
    await archiveVaultMemoryOp(vaultCtx, archived.uniqueId);

    for (const id of [clean.uniqueId, archived.uniqueId]) {
      await link(entityCtx, id, ["Zeta"]);
    }

    const recallCtx: RecallContext = {
      vaultCtx,
      entityCtx,
      embeddingOptions: { apiKey: "test-key" },
      vaultCache: new Map<string, Float32Array>(),
    };
    await recall(QUERY, recallCtx, { budget: "low", minScore: 0 });

    const lastCall = searchSpy.mock.calls.at(-1);
    const entityRanking = lastCall?.[4]?.entityRanking ?? [];
    expect(entityRanking).toContain(clean.uniqueId);
    expect(entityRanking).not.toContain(archived.uniqueId);
  });
});
