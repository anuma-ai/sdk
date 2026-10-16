// @vitest-environment node
import { createRequire } from "node:module";

import { Database } from "@nozbe/watermelondb";
import LokiJSAdapter from "@nozbe/watermelondb/adapters/lokijs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createChunkVectorCache } from "../../memory/chunkVectorCache";
import { sdkMigrations, sdkModelClasses, sdkSchema } from "../schema";
import { Conversation } from "./models";
import {
  type ChunkSearchStats,
  createConversationOp,
  createMessageOp,
  deleteConversationOp,
  searchChunksOp,
  type StorageOperationsContext,
  updateMessageChunksOp,
  updateMessageEmbeddingOp,
} from "./operations";
import type { MessageChunk } from "./types";

type SqlValue = string | number | null;
type SqliteDb = {
  exec: (sql: string) => void;
  prepare: (sql: string) => {
    all: (...values: SqlValue[]) => Record<string, unknown>[];
    run: (...values: SqlValue[]) => unknown;
  };
};

const requireNode = createRequire(import.meta.url);
const { DatabaseSync } = requireNode("node:sqlite") as {
  DatabaseSync: new (path: string) => SqliteDb;
};
const { encodeSchema } = requireNode("@nozbe/watermelondb/adapters/sqlite/encodeSchema") as {
  encodeSchema: (schema: typeof sdkSchema) => string;
};

const MODEL = "qwen/qwen3-embedding-8b";

function makeLokiCtx(): StorageOperationsContext {
  const db = new Database({
    adapter: new LokiJSAdapter({
      schema: sdkSchema,
      migrations: sdkMigrations,
      useWebWorker: false,
      useIncrementalIndexedDB: false,
      dbName: `projected-test-${Math.random().toString(36).slice(2)}`,
    }),
    modelClasses: sdkModelClasses,
  });
  return {
    database: db,
    messagesCollection: db.get("history"),
    conversationsCollection: db.get<Conversation>("conversations"),
  };
}

function chunk(text: string, vector: number[], startOffset: number): MessageChunk {
  return { text, vector, startOffset, endOffset: startOffset + text.length };
}

async function seedChunked(
  ctx: StorageOperationsContext,
  conversationId: string,
  uniqueId: string,
  parts: Array<[string, number[]]>,
  model = MODEL
): Promise<void> {
  let cursor = 0;
  const chunks = parts.map(([text, vector]) => {
    const c = chunk(text, vector, cursor);
    cursor = c.endOffset + 1;
    return c;
  });
  await createMessageOp(ctx, {
    conversationId,
    role: "assistant",
    content: parts.map(([text]) => text).join(" "),
    uniqueId,
  });
  await updateMessageChunksOp(ctx, uniqueId, chunks, model);
}

async function seedFixture(ctx: StorageOperationsContext): Promise<void> {
  await createConversationOp(ctx, { conversationId: "live" });
  await createConversationOp(ctx, { conversationId: "current" });
  await createConversationOp(ctx, { conversationId: "gone" });
  await seedChunked(ctx, "live", "m-coffee", [
    ["coffee shops nearby", [1, 0, 0]],
    ["late night plans", [0.6, 0.8, 0]],
  ]);
  await seedChunked(ctx, "live", "m-weather", [["the weather today", [0, 1, 0]]]);
  await seedChunked(ctx, "live", "m-stale", [["coffee in old space", [1, 0, 0]]], "old/model");
  await createMessageOp(ctx, {
    conversationId: "live",
    role: "user",
    content: "espresso tasting",
    uniqueId: "m-vector-only",
  });
  await updateMessageEmbeddingOp(ctx, "m-vector-only", [0.9, 0.1, 0], MODEL);
  await createMessageOp(ctx, {
    conversationId: "live",
    role: "user",
    content: "never embedded",
    uniqueId: "m-plain",
  });
  await seedChunked(ctx, "current", "m-current", [["coffee right now", [1, 0, 0]]]);
  await seedChunked(ctx, "gone", "m-gone", [["coffee from a deleted chat", [1, 0, 0]]]);
  await deleteConversationOp(ctx, "gone");
}

async function copyToSqlite(ctx: StorageOperationsContext): Promise<SqliteDb> {
  const db = new DatabaseSync(":memory:");
  db.exec(encodeSchema(sdkSchema));
  for (const table of ["history", "conversations"] as const) {
    const columns = db
      .prepare(`pragma table_info("${table}")`)
      .all()
      .map((c) => c.name as string);
    const collection = table === "history" ? ctx.messagesCollection : ctx.conversationsCollection;
    const rows = (await collection.query().unsafeFetchRaw()) as Record<string, unknown>[];
    const insert = db.prepare(
      `insert into "${table}" (${columns.map((c) => `"${c}"`).join(",")}) values (${columns.map(() => "?").join(",")})`
    );
    for (const row of rows) {
      insert.run(
        ...columns.map((c) => {
          const value = row[c];
          if (typeof value === "boolean") return value ? 1 : 0;
          return (value ?? null) as SqlValue;
        })
      );
    }
  }
  return db;
}

type ClauseLike = {
  type?: string;
  sql?: string;
  values?: SqlValue[];
  left?: string;
  comparison?: { operator?: string; right?: { values?: SqlValue[] } };
};

function makeSqliteCtx(
  db: SqliteDb,
  executed: string[],
  beforeFullRead?: () => void
): StorageOperationsContext {
  const query = (...clauses: ClauseLike[]) => ({
    unsafeFetchRaw: async () => {
      const [first] = clauses;
      if (first?.type === "sqlQuery") {
        executed.push(first.sql!);
        return db.prepare(first.sql!).all(...(first.values ?? []));
      }
      if (clauses.length === 1 && first?.left === "id" && first.comparison?.operator === "oneOf") {
        const ids = first.comparison.right?.values ?? [];
        if (ids.length === 0) return [];
        beforeFullRead?.();
        return db
          .prepare(
            `select * from "history" where "_status" is not 'deleted' and "id" in (${ids.map(() => "?").join(",")})`
          )
          .all(...ids);
      }
      throw new Error(`unexpected query in test: ${JSON.stringify(clauses)}`);
    },
    fetch: async () => {
      throw new Error("searchChunksOp must not instantiate Models on the SQL path");
    },
  });
  const unused = () => {
    throw new Error("conversations must not be read separately on the SQL path");
  };
  return {
    database: {} as StorageOperationsContext["database"],
    messagesCollection: { query } as unknown as StorageOperationsContext["messagesCollection"],
    conversationsCollection: {
      query: unused,
    } as unknown as StorageOperationsContext["conversationsCollection"],
  };
}

function summarize(results: Awaited<ReturnType<typeof searchChunksOp>>) {
  return results.map((r) => ({
    id: r.message.uniqueId,
    chunkText: r.chunkText,
    similarity: Number(r.similarity.toFixed(6)),
  }));
}

describe("searchChunksOp — projected SQL path", () => {
  let lokiCtx: StorageOperationsContext;
  let sqlite: SqliteDb;

  beforeEach(async () => {
    lokiCtx = makeLokiCtx();
    await seedFixture(lokiCtx);
    sqlite = await copyToSqlite(lokiCtx);
  });

  const options = {
    minSimilarity: 0.1,
    limit: 10,
    embeddingModel: MODEL,
    excludeConversationId: "current",
  };

  it("returns the same ranking as the full-load path on real SQLite", async () => {
    const executed: string[] = [];
    const fallback = await searchChunksOp(lokiCtx, [1, 0, 0], options);
    const projected = await searchChunksOp(makeSqliteCtx(sqlite, executed), [1, 0, 0], options);

    expect(summarize(projected)).toEqual(summarize(fallback));
    expect(summarize(projected).map((r) => r.id)).toEqual([
      "m-coffee",
      "m-vector-only",
      "m-coffee",
    ]);
    expect(executed.length).toBeGreaterThan(0);
  });

  it("never reads message content or blobs for the candidate key scan", async () => {
    const executed: string[] = [];
    await searchChunksOp(makeSqliteCtx(sqlite, executed), [1, 0, 0], options);

    const keyScan = executed[0];
    expect(keyScan).toMatch(
      /^select "id", "conversation_id", "updated_at", "embedding_model" from "history" where /
    );
    expect(executed.some((sql) => /select [^]*"content"/.test(sql))).toBe(false);
  });

  it("scores a warm cache without fetching any vector rows and returns identical results", async () => {
    const cache = createChunkVectorCache();
    const sqlCtx = makeSqliteCtx(sqlite, []);
    const stats: ChunkSearchStats[] = [];

    const cold = await searchChunksOp(sqlCtx, [1, 0, 0], {
      ...options,
      chunkCache: cache,
      onStats: (s) => stats.push(s),
    });
    const warm = await searchChunksOp(sqlCtx, [1, 0, 0], {
      ...options,
      chunkCache: cache,
      onStats: (s) => stats.push(s),
    });

    expect(summarize(warm)).toEqual(summarize(cold));
    expect(stats[0]).toEqual({ rowsScanned: 4, rowsFetched: 3, cacheHits: 0 });
    expect(stats[1]).toEqual({ rowsScanned: 4, rowsFetched: 0, cacheHits: 3 });
  });

  it("restricts to one conversation when conversationId is set", async () => {
    const projected = await searchChunksOp(makeSqliteCtx(sqlite, []), [1, 0, 0], {
      minSimilarity: 0.1,
      embeddingModel: MODEL,
      conversationId: "current",
    });
    const fallback = await searchChunksOp(lokiCtx, [1, 0, 0], {
      minSimilarity: 0.1,
      embeddingModel: MODEL,
      conversationId: "current",
    });

    expect(summarize(projected)).toEqual(summarize(fallback));
    expect(summarize(projected).map((r) => r.id)).toEqual(["m-current"]);
  });

  it("skips rows WatermelonDB has marked deleted", async () => {
    const [template] = sqlite.prepare(`select * from "history" where "id" = 'm-coffee'`).all();
    const columns = Object.keys(template);
    sqlite
      .prepare(
        `insert into "history" (${columns.map((c) => `"${c}"`).join(",")}) values (${columns.map(() => "?").join(",")})`
      )
      .run(
        ...columns.map((c) =>
          c === "id" ? "m-tombstone" : c === "_status" ? "deleted" : (template[c] as SqlValue)
        )
      );

    const stats: ChunkSearchStats[] = [];
    const projected = await searchChunksOp(makeSqliteCtx(sqlite, []), [1, 0, 0], {
      ...options,
      onStats: (st) => stats.push(st),
    });

    expect(stats).toEqual([{ rowsScanned: 4, rowsFetched: 3, cacheHits: 0 }]);
    expect(summarize(projected).map((r) => r.id)).not.toContain("m-tombstone");
    expect(summarize(projected).map((r) => r.id)).toEqual([
      "m-coffee",
      "m-vector-only",
      "m-coffee",
    ]);
  });

  it("drops a result whose message changed after it was scored", async () => {
    const projected = await searchChunksOp(
      makeSqliteCtx(sqlite, [], () => {
        sqlite
          .prepare(
            `update "history" set "updated_at" = "updated_at" + 1 where "id" = 'm-vector-only'`
          )
          .run();
      }),
      [1, 0, 0],
      options
    );

    expect(summarize(projected).map((r) => r.id)).toEqual(["m-coffee", "m-coffee"]);
  });

  it("reports the same stats on the full-load fallback", async () => {
    const stats: ChunkSearchStats[] = [];
    await searchChunksOp(lokiCtx, [1, 0, 0], { ...options, onStats: (s) => stats.push(s) });

    expect(stats).toEqual([{ rowsScanned: 4, rowsFetched: 3, cacheHits: 0 }]);
  });
});

describe("searchChunksOp — ties", () => {
  it("keeps scan order for tied scores whether or not a row is cached", async () => {
    const ctx = makeLokiCtx();
    await createConversationOp(ctx, { conversationId: "tie" });
    await seedChunked(ctx, "tie", "m-first", [["first twin", [1, 0, 0]]]);
    await seedChunked(ctx, "tie", "m-second", [["second twin", [1, 0, 0]]]);
    const tieOptions = { minSimilarity: 0.1, embeddingModel: MODEL, limit: 1 };

    const cold = await searchChunksOp(ctx, [1, 0, 0], tieOptions);
    const cache = createChunkVectorCache();
    await searchChunksOp(ctx, [1, 0, 0], { ...tieOptions, chunkCache: cache });
    const [firstKey] = [...cache.keys()].filter((id) => id !== cold[0].message.uniqueId);
    cache.delete(cold[0].message.uniqueId);
    expect(cache.has(firstKey)).toBe(true);

    const partiallyWarm = await searchChunksOp(ctx, [1, 0, 0], {
      ...tieOptions,
      chunkCache: cache,
    });

    expect(summarize(partiallyWarm)).toEqual(summarize(cold));
  });
});

describe("searchChunksOp — yields during a long scan", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  function spendEveryCheck() {
    let clock = 0;
    vi.spyOn(performance, "now").mockImplementation(() => (clock += 20));
    const scheduler = { yield: vi.fn(() => Promise.resolve()) };
    vi.stubGlobal("scheduler", scheduler);
    return scheduler.yield;
  }

  it("yields in both the key scan and the vector reads once the slice budget is spent", async () => {
    const ctx = makeLokiCtx();
    await createConversationOp(ctx, { conversationId: "big" });
    for (let i = 0; i < 6; i++) {
      await seedChunked(ctx, "big", `m-${i}`, [[`row ${i}`, [1, 0, 0]]]);
    }
    const yields = spendEveryCheck();
    let yieldsBeforeStats = 0;

    await searchChunksOp(ctx, [1, 0, 0], {
      minSimilarity: 0.1,
      embeddingModel: MODEL,
      onStats: (stats) => {
        expect(stats.rowsFetched).toBe(6);
        yieldsBeforeStats = yields.mock.calls.length;
      },
    });

    expect(yieldsBeforeStats).toBeGreaterThan(6);
  });

  it("yields while skipping rows that never reach a vector read", async () => {
    const ctx = makeLokiCtx();
    await createConversationOp(ctx, { conversationId: "stale" });
    for (let i = 0; i < 6; i++) {
      await seedChunked(ctx, "stale", `m-${i}`, [[`row ${i}`, [1, 0, 0]]], "old/model");
    }
    const yields = spendEveryCheck();
    let yieldsBeforeStats = 0;

    await searchChunksOp(ctx, [1, 0, 0], {
      minSimilarity: 0.1,
      embeddingModel: MODEL,
      onStats: (stats) => {
        expect(stats.rowsFetched).toBe(0);
        yieldsBeforeStats = yields.mock.calls.length;
      },
    });

    expect(yieldsBeforeStats).toBeGreaterThan(0);
  });
});
