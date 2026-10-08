import { Database } from "@nozbe/watermelondb";
import LokiJSAdapter from "@nozbe/watermelondb/adapters/lokijs";
import { describe, expect, it, vi } from "vitest";

vi.mock("../../memoryEngine/embeddings", () => {
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
  createVaultMemoryOp,
  getAllVaultMemoriesOp,
  getVaultMemoryOp,
  updateVaultMemoryEmbeddingOp,
  updateVaultMemoryOp,
  type VaultMemoryOperationsContext,
} from "../../db/memoryVault/operations";
import { eagerEmbedContent } from "../../memoryVault/searchTool";
import { generateEmbedding } from "../../memoryEngine/embeddings";
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
  function setup(database: Database = makeDatabase()) {
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

  it("embeds new manual memories without replacing supplied vectors", async () => {
    const { store } = setup();
    const embed = vi.mocked(generateEmbedding);
    embed.mockClear();
    const single = await store.create({ content: "Commutes by bike" });
    const batch = await store.createMany([
      { content: "Plays the cello" },
      { content: "Lives in Lisbon", embedding: "[1,0]", embeddingModel: "supplied" },
    ]);
    await vi.waitFor(async () => {
      expect((await store.get(single.uniqueId))?.embedding).toBeTruthy();
      expect((await store.get(batch[0].uniqueId))?.embedding).toBeTruthy();
    });
    expect(await store.get(batch[1].uniqueId)).toMatchObject({
      embedding: "[1,0]",
      embeddingModel: "supplied",
    });
    expect(embed.mock.calls.map(([content]) => content)).toEqual([
      "Commutes by bike",
      "Plays the cello",
    ]);
  });

  it("does not refresh default subscribers for embedding or bookkeeping writes", async () => {
    const { store, vaultCtx } = setup();
    const m = await store.create({ content: "Plays chess", embedding: "[1,0]" });
    const onChange = vi.fn();
    const unsubscribe = store.subscribe(onChange);
    try {
      expect(await updateVaultMemoryEmbeddingOp(vaultCtx, m.uniqueId, "[0,1]", "new-model")).toBe(
        true
      );
      const record = await vaultCtx.vaultMemoryCollection.find(m.uniqueId);
      const updatedAt = record.updatedAt.getTime();
      await vaultCtx.database.write(() =>
        record.update((r) => {
          r._setRaw("proof_count", 2);
          r._setRaw("last_observed_at", Date.now());
          r._setRaw("topics_extracted_at", Date.now());
          r._setRaw("updated_at", updatedAt);
        })
      );
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(onChange).not.toHaveBeenCalled();
      await store.setTopics(m.uniqueId, ["Chess"]);
      await vi.waitFor(() => expect(onChange).toHaveBeenCalled());
    } finally {
      unsubscribe();
    }
  });

  it("notifies embedding subscribers while keeping deleted-inclusive watches membership-only", async () => {
    const { store, vaultCtx } = setup();
    const m = await store.create({ content: "Plays chess", embedding: "[1,0]" });
    const onEmbedding = vi.fn();
    const onMembership = vi.fn();
    const unsubscribeEmbedding = store.subscribe(onEmbedding, { embeddings: true });
    const unsubscribeMembership = store.subscribe(onMembership, {
      includeDeleted: true,
      embeddings: true,
    });
    try {
      expect(await updateVaultMemoryEmbeddingOp(vaultCtx, m.uniqueId, "[0,1]", "new-model")).toBe(
        true
      );
      await vi.waitFor(() => expect(onEmbedding).toHaveBeenCalled());
      expect(onMembership).not.toHaveBeenCalled();
    } finally {
      unsubscribeEmbedding();
      unsubscribeMembership();
    }
  });

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
    viaStore.memories.forEach((m, i) => expect(m.score).toBeCloseTo(direct.memories[i].score, 6));
  });

  it("clears an edited memory's vector, then re-embeds the new content", async () => {
    const vaultCache = new Map<string, Float32Array>();
    const store = createLocalMemoryStore({
      database: makeDatabase(),
      embeddingOptions,
      vaultCache,
    });
    const { memoryId } = await store.retain("Commutes by bike");
    await store.recall("bike");
    const before = await store.get(memoryId);
    const cachedBefore = vaultCache.get(memoryId);
    expect(before?.embedding).toBeTruthy();
    expect(cachedBefore).toBeDefined();

    const edited = await store.update(memoryId, { content: "Commutes by train" });
    expect(edited).toMatchObject({ embedding: null, embeddingModel: null });
    await vi.waitFor(async () => {
      const after = await store.get(memoryId);
      expect(after?.embedding).toBeTruthy();
      expect(after?.embedding).not.toBe(before?.embedding);
      expect(vaultCache.get(memoryId)).toBeDefined();
      expect(vaultCache.get(memoryId)).not.toBe(cachedBefore);
    });
  });

  it("never lands a re-embed for content an edit has since replaced", async () => {
    const { store, vaultCtx } = setup();
    const { uniqueId } = await store.create({ content: "Commutes by bike" });
    const first = await updateVaultMemoryOp(vaultCtx, uniqueId, {
      content: "Commutes by train",
      embedding: null,
    });
    await updateVaultMemoryOp(vaultCtx, uniqueId, { content: "Commutes by bus", embedding: null });

    await eagerEmbedContent(
      "Commutes by train",
      embeddingOptions,
      new Map(),
      vaultCtx,
      uniqueId,
      first!.updatedAt
    );
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect((await store.get(uniqueId))?.embedding).toBeNull();
  });

  it("sees rows an unscoped context wrote when single-tenant (the client's shape)", async () => {
    const database = makeDatabase();
    const { vaultCtx } = setup(database);
    const row = await createVaultMemoryOp(vaultCtx, { content: "Lives in Lisbon" });

    const store = createLocalMemoryStore({ database, embeddingOptions, singleTenant: true });
    expect((await store.list()).map((m) => m.uniqueId)).toEqual([row.uniqueId]);
    expect((await getVaultMemoryOp(vaultCtx, row.uniqueId))?.userId ?? null).toBeNull();
  });

  it("scopes topic writes and topic change events to the store's user", async () => {
    const database = makeDatabase();
    const mine = createLocalMemoryStore({ database, embeddingOptions, userId: "user-1" });
    const theirs = createLocalMemoryStore({ database, embeddingOptions, userId: "user-2" });
    const theirRow = await theirs.create({ content: "Plays the cello" });

    expect(await mine.addTopics(theirRow.uniqueId, ["Cello"])).toEqual([]);
    expect(await theirs.topicsByMemories([theirRow.uniqueId])).toEqual(new Map());

    const onChange = vi.fn();
    const unsubscribe = mine.subscribe(onChange, { topics: true });
    await theirs.addTopics(theirRow.uniqueId, ["Cello"]);
    expect(onChange).not.toHaveBeenCalled();
    const myRow = await mine.create({ content: "Plays the viola" });
    onChange.mockClear();
    await mine.addTopics(myRow.uniqueId, ["Viola"]);
    await vi.waitFor(() => expect(onChange).toHaveBeenCalled());
    unsubscribe();
  });

  it("binds the decay sweeper to the store's vault", async () => {
    const database = makeDatabase();
    const store = createLocalMemoryStore({ database, embeddingOptions, singleTenant: true });
    await store.create({ content: "Manual saves never decay" });

    const result = await store.maintenance!.createDecaySweeper({ now: Date.now() }).runSweep();
    expect(result).toMatchObject({ scanned: 1, archived: 0, deleted: 0 });
  });

  it("does not recreate topic links after a delete wins the writer race", async () => {
    const database = makeDatabase();
    const store = createLocalMemoryStore({ database, embeddingOptions });
    const m = await store.create({ content: "Plays chess" });
    await store.addTopics(m.uniqueId, ["Chess"]);

    const originalWrite = database.write.bind(database);
    const writeSpy = vi
      .spyOn(database, "write")
      .mockImplementationOnce(async (work, description) => {
        writeSpy.mockRestore();
        expect(await store.delete(m.uniqueId)).toBe(true);
        return originalWrite(work, description);
      });
    try {
      expect(await store.addTopics(m.uniqueId, ["Late topic"])).toEqual([]);
      expect(await store.get(m.uniqueId)).toBeNull();
      expect(await store.topicsByMemories([m.uniqueId])).toEqual(new Map());
      expect(await store.memoriesByTopics(["Chess", "Late topic"])).toEqual(new Map());
    } finally {
      writeSpy.mockRestore();
    }
  });
});
