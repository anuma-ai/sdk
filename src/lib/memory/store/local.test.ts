/**
 * The local MemoryStore against a REAL in-memory WatermelonDB (LokiJS — same
 * setup as roundTrip.test.ts). Runs the shared contract, then checks the store
 * returns exactly what the ops it wraps return.
 */
import { Database } from "@nozbe/watermelondb";
import LokiJSAdapter from "@nozbe/watermelondb/adapters/lokijs";
import { describe, expect, it, vi } from "vitest";

vi.mock("../../memoryEngine/embeddings", () => {
  // Deterministic bag-of-words embedder (see roundTrip.test.ts).
  const DIM = 64;
  const embed = (text: string): number[] => {
    const v: number[] = new Array<number>(DIM).fill(0);
    for (const token of text.toLowerCase().match(/[a-z0-9']+/g) ?? []) {
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

import type { Entity, MemoryEntity } from "../../db/entities/models";
import {
  type EntityOperationsContext,
  getEntitiesByMemoryIdsOp,
  getMemoriesByEntityNamesOp,
} from "../../db/entities/operations";
import type { VaultMemory } from "../../db/memoryVault/models";
import {
  getAllVaultMemoriesOp,
  getVaultMemoryOp,
  type VaultMemoryOperationsContext,
} from "../../db/memoryVault/operations";
import { sdkMigrations, sdkModelClasses, sdkSchema } from "../../db/schema";
import { recall } from "../recall";
import { runMemoryStoreContract } from "./contract";
import { createLocalMemoryStore } from "./local";

const embeddingOptions = { apiKey: "test-key" };

function makeDatabase(): Database {
  const adapter = new LokiJSAdapter({
    schema: sdkSchema,
    migrations: sdkMigrations,
    useWebWorker: false,
    useIncrementalIndexedDB: false,
    dbName: `memory-store-test-${Math.random().toString(36).slice(2)}`,
  });
  return new Database({ adapter, modelClasses: sdkModelClasses });
}

runMemoryStoreContract(() =>
  createLocalMemoryStore({ database: makeDatabase(), embeddingOptions })
);

describe("createLocalMemoryStore parity with the raw ops", () => {
  function setup() {
    const database = makeDatabase();
    const store = createLocalMemoryStore({ database, embeddingOptions });
    const entityCtx: EntityOperationsContext = {
      database,
      entityCollection: database.get<Entity>("entity"),
      memoryEntityCollection: database.get<MemoryEntity>("memory_entity"),
    };
    const vaultCtx: VaultMemoryOperationsContext = {
      database,
      vaultMemoryCollection: database.get<VaultMemory>("memory_vault"),
      entityCtx,
    };
    return { store, vaultCtx, entityCtx };
  }

  it("reads the same rows and topic maps as the ops", async () => {
    const { store, vaultCtx, entityCtx } = setup();
    const a = await store.create({ content: "Lives in Lisbon", embedding: "[0.5,0.5]" });
    const b = await store.create({ content: "Works remotely", scope: "shared" });
    await store.archive(b.uniqueId);
    await store.setTopics(a.uniqueId, ["Lisbon"]);
    await store.addTopics(b.uniqueId, ["Remote work", "Lisbon"]);

    expect(await store.list()).toEqual(await getAllVaultMemoriesOp(vaultCtx));
    const widened = { includeArchived: true, scopes: ["shared"] };
    expect(await store.list(widened)).toEqual(await getAllVaultMemoriesOp(vaultCtx, widened));
    expect(await store.get(a.uniqueId)).toEqual(await getVaultMemoryOp(vaultCtx, a.uniqueId));
    const ids = [a.uniqueId, b.uniqueId];
    expect(await store.topicsByMemories(ids)).toEqual(
      await getEntitiesByMemoryIdsOp(entityCtx, ids)
    );
    expect(await store.memoriesByTopics(["lisbon"])).toEqual(
      await getMemoriesByEntityNamesOp(entityCtx, ["lisbon"])
    );
  });

  it("recalls the same ranking as recall() over the same vault", async () => {
    const { store, vaultCtx, entityCtx } = setup();
    for (const fact of ["Favorite color is teal", "Dog is named Mochi", "Plays the cello"]) {
      await store.retain(fact);
    }

    const viaStore = await store.recall("dog named Mochi", { limit: 3 });
    const direct = await recall(
      "dog named Mochi",
      { vaultCtx, entityCtx, embeddingOptions, vaultCache: new Map() },
      { limit: 3, types: ["fact"] }
    );
    expect(viaStore.memories.map((m) => m.id)).toEqual(direct.memories.map((m) => m.id));
    // Recency reads the clock, so the two calls a few ms apart differ past ~1e-10.
    viaStore.memories.forEach((m, i) => expect(m.score).toBeCloseTo(direct.memories[i].score, 6));
  });

  it("drops a memory's cached vector when it is edited", async () => {
    const vaultCache = new Map<string, Float32Array>();
    const store = createLocalMemoryStore({
      database: makeDatabase(),
      embeddingOptions,
      vaultCache,
    });
    const { memoryId } = await store.retain("Commutes by bike");
    await store.recall("bike");
    expect(vaultCache.has(memoryId)).toBe(true);

    await store.update(memoryId, { content: "Commutes by train" });
    expect(vaultCache.has(memoryId)).toBe(false);
  });

  it("binds the decay sweeper to the store's vault", async () => {
    const database = makeDatabase();
    const store = createLocalMemoryStore({ database, embeddingOptions, singleTenant: true });
    await store.create({ content: "Manual saves never decay" });

    const result = await store.maintenance!.createDecaySweeper({ now: Date.now() }).runSweep();
    expect(result).toMatchObject({ scanned: 1, archived: 0, deleted: 0 });
  });
});
