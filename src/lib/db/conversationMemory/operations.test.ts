import { beforeEach, describe, expect, it } from "vitest";

import type { ConversationMemoryOperationsContext } from "./operations";
import {
  addConversationMemoriesOp,
  clearConversationMemoriesOp,
  getConversationMemoriesOp,
  MAX_PER_CONVERSATION,
} from "./operations";

/**
 * Stateful in-memory fake of the WatermelonDB collection/database surface the
 * ops touch: query(Q.where/Q.sortBy).fetch(), prepareCreate, record
 * prepareDestroyPermanently, database.write, database.batch. Enough to exercise
 * dedupe / prune / clear end-to-end without a real DB.
 */
interface Raw {
  id: string;
  conversation_id: string;
  memory_id: string;
  score: number;
  created_at: number;
}
let idSeq = 0;

function makeRecord(raw: Raw) {
  return {
    _raw: raw,
    get id() {
      return raw.id;
    },
    get conversationId() {
      return raw.conversation_id;
    },
    get memoryId() {
      return raw.memory_id;
    },
    get score() {
      return raw.score;
    },
    get createdAt() {
      return new Date(raw.created_at);
    },
    prepareDestroyPermanently() {
      return { __op: "destroy" as const, id: raw.id };
    },
  };
}

function makeCtx(seed: Raw[] = []): {
  ctx: ConversationMemoryOperationsContext;
  rows: ReturnType<typeof makeRecord>[];
} {
  const rows = seed.map(makeRecord);

  const collection = {
    query(...conds: any[]) {
      let filtered = rows.slice();
      for (const c of conds) {
        if (c?.type === "where") {
          const col = c.left as keyof Raw;
          const val = c.comparison.right.value;
          filtered = filtered.filter((r) => (r._raw as any)[col] === val);
        }
      }
      // Only sortBy created_at asc is used by the ops.
      const sort = conds.find((c) => c?.type === "sortBy");
      if (sort) filtered.sort((a, b) => a._raw.created_at - b._raw.created_at);
      return { fetch: async () => filtered };
    },
    prepareCreate(builder: (r: any) => void) {
      const raw: Raw = {
        id: `cm_${++idSeq}`,
        conversation_id: "",
        memory_id: "",
        score: 0,
        created_at: 0,
      };
      builder({ _setRaw: (k: string, v: any) => ((raw as any)[k] = v) });
      return { __op: "create" as const, raw };
    },
  };

  const database = {
    write: async (cb: () => any) => cb(),
    batch: async (...ops: any[]) => {
      for (const op of ops) {
        if (op.__op === "create") rows.push(makeRecord(op.raw));
        else if (op.__op === "destroy") {
          const i = rows.findIndex((r) => r._raw.id === op.id);
          if (i >= 0) rows.splice(i, 1);
        }
      }
    },
  };

  return {
    ctx: { database, conversationMemoryCollection: collection } as any,
    rows,
  };
}

describe("conversationMemory operations", () => {
  beforeEach(() => {
    idSeq = 0;
  });

  it("adds rows and reads them back oldest-first", async () => {
    const { ctx } = makeCtx();
    await addConversationMemoriesOp(ctx, "c1", [
      { memoryId: "m1", score: 0.9 },
      { memoryId: "m2", score: 0.7 },
    ]);
    const got = await getConversationMemoriesOp(ctx, "c1");
    expect(got.map((r) => r.memoryId)).toEqual(["m1", "m2"]);
    expect(got[0].score).toBe(0.9);
  });

  it("no-ops on empty conversation id or empty list", async () => {
    const { rows, ctx } = makeCtx();
    await addConversationMemoriesOp(ctx, "", [{ memoryId: "m1", score: 1 }]);
    await addConversationMemoriesOp(ctx, "c1", []);
    expect(rows).toHaveLength(0);
  });

  it("dedupes against existing rows and within the batch", async () => {
    const { ctx } = makeCtx([
      { id: "cm_seed", conversation_id: "c1", memory_id: "m1", score: 0.5, created_at: 1 },
    ]);
    await addConversationMemoriesOp(ctx, "c1", [
      { memoryId: "m1", score: 0.9 }, // dup of existing → skip
      { memoryId: "m2", score: 0.8 },
      { memoryId: "m2", score: 0.4 }, // dup within batch → skip
    ]);
    const got = await getConversationMemoriesOp(ctx, "c1");
    expect(got.map((r) => r.memoryId)).toEqual(["m1", "m2"]);
  });

  it("prunes oldest rows beyond MAX_PER_CONVERSATION", async () => {
    const seed: Raw[] = Array.from({ length: MAX_PER_CONVERSATION }, (_, i) => ({
      id: `cm_${i}`,
      conversation_id: "c1",
      memory_id: `m${i}`,
      score: 0.5,
      created_at: i + 1, // oldest = m0
    }));
    const { ctx } = makeCtx(seed);
    await addConversationMemoriesOp(ctx, "c1", [{ memoryId: "new", score: 1 }]);
    const got = await getConversationMemoriesOp(ctx, "c1");
    expect(got).toHaveLength(MAX_PER_CONVERSATION);
    expect(got.some((r) => r.memoryId === "m0")).toBe(false); // oldest pruned
    expect(got.some((r) => r.memoryId === "new")).toBe(true);
  });

  it("caps a single oversized batch to the newest MAX_PER_CONVERSATION", async () => {
    const { ctx } = makeCtx();
    const items = Array.from({ length: MAX_PER_CONVERSATION + 50 }, (_, i) => ({
      memoryId: `m${i}`,
      score: 0.5,
    }));
    await addConversationMemoriesOp(ctx, "c1", items);
    const got = await getConversationMemoriesOp(ctx, "c1");
    expect(got).toHaveLength(MAX_PER_CONVERSATION);
    // Newest MAX kept (m50..m249); oldest 50 of the batch dropped.
    expect(got.some((r) => r.memoryId === "m0")).toBe(false);
    expect(got.some((r) => r.memoryId === `m${MAX_PER_CONVERSATION + 49}`)).toBe(true);
  });

  it("drops all existing rows when an oversized batch fills the cap", async () => {
    const seed: Raw[] = Array.from({ length: 10 }, (_, i) => ({
      id: `old_${i}`,
      conversation_id: "c1",
      memory_id: `old${i}`,
      score: 0.5,
      created_at: i + 1,
    }));
    const { ctx } = makeCtx(seed);
    const items = Array.from({ length: MAX_PER_CONVERSATION + 5 }, (_, i) => ({
      memoryId: `m${i}`,
      score: 0.5,
    }));
    await addConversationMemoriesOp(ctx, "c1", items);
    const got = await getConversationMemoriesOp(ctx, "c1");
    expect(got).toHaveLength(MAX_PER_CONVERSATION);
    // Batch alone fills the cap → every pre-existing row is pruned.
    expect(got.some((r) => r.memoryId.startsWith("old"))).toBe(false);
    // Newest MAX of the batch kept, in insertion order (staggered created_at).
    expect(got[0].memoryId).toBe("m5");
    expect(got[got.length - 1].memoryId).toBe(`m${MAX_PER_CONVERSATION + 4}`);
  });

  it("orders rows within a single batch by insertion (staggered created_at)", async () => {
    const { ctx } = makeCtx();
    await addConversationMemoriesOp(ctx, "c1", [
      { memoryId: "first", score: 0.5 },
      { memoryId: "second", score: 0.5 },
      { memoryId: "third", score: 0.5 },
    ]);
    const got = await getConversationMemoriesOp(ctx, "c1");
    expect(got.map((r) => r.memoryId)).toEqual(["first", "second", "third"]);
  });

  it("clear removes only the target conversation's rows", async () => {
    const { ctx } = makeCtx([
      { id: "a", conversation_id: "c1", memory_id: "m1", score: 1, created_at: 1 },
      { id: "b", conversation_id: "c2", memory_id: "m2", score: 1, created_at: 1 },
    ]);
    await clearConversationMemoriesOp(ctx, "c1");
    expect(await getConversationMemoriesOp(ctx, "c1")).toHaveLength(0);
    expect(await getConversationMemoriesOp(ctx, "c2")).toHaveLength(1);
  });
});
