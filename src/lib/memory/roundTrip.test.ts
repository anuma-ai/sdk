/**
 * retain() → recall() round trip against a REAL in-memory WatermelonDB
 * (LokiJS adapter — same setup as test/memory/src/longmemeval/suite.ts
 * and src/lib/db/media/operations.relink.test.ts).
 *
 * Only the network edge is faked: `generateEmbedding(s)` is replaced with
 * a deterministic bag-of-words hash embedder, so identical texts map to
 * identical vectors, token-overlapping texts are similar, and disjoint
 * texts are (near-)orthogonal. Everything else — vault DB operations,
 * the fused ranking pipeline, auto-merge cosine gating — runs for real.
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
      for (let i = 0; i < token.length; i++) {
        hash = (hash * 31 + token.charCodeAt(i)) >>> 0;
      }
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

import type { VaultMemory } from "../db/memoryVault/models";
import {
  getAllVaultMemoriesOp,
  type VaultMemoryOperationsContext,
} from "../db/memoryVault/operations";
import { sdkMigrations, sdkModelClasses, sdkSchema } from "../db/schema";

import { recall } from "./recall";
import { retain, type RetainContext } from "./retain";
import type { RecallContext } from "./types";

function makeDatabase(): Database {
  const adapter = new LokiJSAdapter({
    schema: sdkSchema,
    migrations: sdkMigrations,
    useWebWorker: false,
    useIncrementalIndexedDB: false,
    dbName: `round-trip-test-${Math.random().toString(36).slice(2)}`,
  });
  return new Database({ adapter, modelClasses: sdkModelClasses });
}

let database: Database;
let vaultCtx: VaultMemoryOperationsContext;
let retainCtx: RetainContext;
let recallCtx: RecallContext;

beforeEach(() => {
  database = makeDatabase();
  vaultCtx = {
    database,
    vaultMemoryCollection: database.get<VaultMemory>("memory_vault"),
  };
  const embeddingOptions = { apiKey: "test-key" };
  const vaultCache = new Map<string, number[]>();
  retainCtx = { vaultCtx, embeddingOptions, vaultCache };
  recallCtx = { vaultCtx, embeddingOptions, vaultCache };
});

describe("retain → recall round trip", () => {
  it("retains three distinct facts and recalls the matching one ranked first", async () => {
    const facts = ["Favorite color is teal", "Dog is named Mochi", "Works at Anuma as an engineer"];
    for (const fact of facts) {
      const result = await retain(fact, retainCtx);
      expect(result.action).toBe("create");
      expect(result.proofCount).toBe(1);
    }

    const result = await recall("favorite color", recallCtx);

    expect(result.memories.length).toBeGreaterThanOrEqual(1);
    expect(result.memories[0].content).toBe("Favorite color is teal");
    expect(result.memories[0].kind).toBe("fact");
    expect(result.vaultSize).toBe(3);
    // The unrelated facts must not outrank the match.
    const ranks = new Map(result.memories.map((m, i) => [m.content, i]));
    for (const other of facts.slice(1)) {
      const rank = ranks.get(other);
      if (rank !== undefined) expect(rank).toBeGreaterThan(0);
    }
  });

  it("merges a re-observed fact instead of duplicating it (proofCount=2, one row)", async () => {
    const first = await retain("Dog is named Mochi", retainCtx);
    expect(first.action).toBe("create");

    const second = await retain("Dog is named Mochi", retainCtx);
    expect(second.action).toBe("merge");
    expect(second.targetId).toBe(first.memoryId);
    expect(second.proofCount).toBe(2);

    const rows = await getAllVaultMemoriesOp(vaultCtx);
    expect(rows).toHaveLength(1);
    expect(rows[0].content).toBe("Dog is named Mochi");
    expect(rows[0].proofCount).toBe(2);

    // The merged fact is still recallable.
    const result = await recall("dog named mochi", recallCtx);
    expect(result.memories[0]?.id).toBe(first.memoryId);
  });

  it("accumulates sourceChunkIds across merges", async () => {
    await retain("Allergic to shellfish", retainCtx, { sourceChunkIds: ["msg-1"] });
    await retain("Allergic to shellfish", retainCtx, { sourceChunkIds: ["msg-2", "msg-1"] });

    const rows = await getAllVaultMemoriesOp(vaultCtx);
    expect(rows).toHaveLength(1);
    expect(rows[0].sourceChunkIds).toEqual(["msg-1", "msg-2"]);
  });

  it("keeps clearly distinct facts as separate rows (no spurious auto-merge)", async () => {
    await retain("Favorite color is teal", retainCtx);
    const second = await retain("Works at Anuma as an engineer", retainCtx);
    expect(second.action).toBe("create");
    expect(await getAllVaultMemoriesOp(vaultCtx)).toHaveLength(2);
  });

  it("respects the scopes filter on recall", async () => {
    await retain("Yoga class on Tuesday evenings", retainCtx, { scope: "personal" });
    await retain("Quarterly budget review with finance", retainCtx, { scope: "work" });

    const personal = await recall("yoga class", recallCtx, { scopes: ["personal"] });
    expect(personal.memories.map((m) => m.content)).toEqual(["Yoga class on Tuesday evenings"]);
    expect(personal.vaultSize).toBe(1);

    // Same query scoped to work must NOT surface the personal fact.
    const work = await recall("yoga class", recallCtx, { scopes: ["work"] });
    expect(work.memories.map((m) => m.content)).not.toContain("Yoga class on Tuesday evenings");
  });
});
