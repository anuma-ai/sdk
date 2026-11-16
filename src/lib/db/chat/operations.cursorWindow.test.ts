import { createRequire } from "node:module";

import { Database } from "@nozbe/watermelondb";
import LokiJSAdapter from "@nozbe/watermelondb/adapters/lokijs";
import { beforeAll, describe, expect, it } from "vitest";

import { sdkMigrations, sdkModelClasses, sdkSchema } from "../schema";
import { Conversation } from "./models";
import {
  createConversationOp,
  createMessageOp,
  getMessagesOp,
  type StorageOperationsContext,
  updateMessageChunksOp,
} from "./operations";

type SqlValue = string | number | null;
type SqliteDb = {
  exec: (sql: string) => void;
  prepare: (sql: string) => {
    all: (...values: SqlValue[]) => Record<string, unknown>[];
    run: (...values: SqlValue[]) => unknown;
  };
};
type ClauseLike = {
  type?: string;
  sql?: string;
  values?: SqlValue[];
  left?: string;
  comparison?: { operator?: string; right?: { value?: SqlValue } };
  sortColumn?: string;
  sortOrder?: string;
};

const requireNode = createRequire(import.meta.url);
const { DatabaseSync } = requireNode("node:sqlite") as {
  DatabaseSync: new (path: string) => SqliteDb;
};
const { encodeSchema } = requireNode("@nozbe/watermelondb/adapters/sqlite/encodeSchema") as {
  encodeSchema: (schema: typeof sdkSchema) => string;
};

const WINDOW_CHARS = 1_000_000;
const HUGE = "x".repeat(1_200_000);

function lokiCtx(): StorageOperationsContext {
  const database = new Database({
    adapter: new LokiJSAdapter({
      schema: sdkSchema,
      migrations: sdkMigrations,
      useWebWorker: false,
      useIncrementalIndexedDB: false,
      dbName: `cursor-window-${Math.random().toString(36).slice(2)}`,
    }),
    modelClasses: sdkModelClasses,
  });
  return {
    database,
    messagesCollection: database.get("history"),
    conversationsCollection: database.get<Conversation>("conversations"),
  };
}

async function copyHistory(ctx: StorageOperationsContext): Promise<SqliteDb> {
  const db = new DatabaseSync(":memory:");
  db.exec(encodeSchema(sdkSchema));
  const columns = db
    .prepare(`pragma table_info("history")`)
    .all()
    .map((c) => c.name as string);
  const insert = db.prepare(
    `insert into "history" (${columns.map((c) => `"${c}"`).join(",")}) values (${columns.map(() => "?").join(",")})`
  );
  for (const row of (await ctx.messagesCollection.query().unsafeFetchRaw()) as Record<
    string,
    unknown
  >[]) {
    insert.run(
      ...columns.map((c) => {
        const value = row[c];
        if (typeof value === "boolean") return value ? 1 : 0;
        return (value ?? null) as SqlValue;
      })
    );
  }
  return db;
}

function sqliteCtx(
  db: SqliteDb,
  schemaFrom: StorageOperationsContext,
  windowChars: number
): StorageOperationsContext {
  const fit = (rows: Record<string, unknown>[]) => {
    for (const row of rows) {
      const chars = Object.values(row).reduce<number>(
        (sum, v) => sum + (typeof v === "string" ? v.length : 8),
        0
      );
      if (chars > windowChars)
        throw new Error("Row too big to fit into CursorWindow requiredPos=0, totalRows=1");
    }
    return rows;
  };
  const query = (...clauses: ClauseLike[]) => ({
    unsafeFetchRaw: async () => {
      const [first] = clauses;
      if (first?.type === "sqlQuery")
        return fit(db.prepare(first.sql!).all(...(first.values ?? [])));
      const wheres = clauses.filter((c) => c.type === "where");
      if (wheres.some((c) => c.comparison?.operator !== "eq"))
        throw new Error(`unexpected query in test: ${JSON.stringify(clauses)}`);
      const order = clauses.find((c) => c.type === "sortBy");
      const sql =
        `select * from "history" where "_status" is not 'deleted'` +
        wheres.map((c) => ` and "${c.left}" = ?`).join("") +
        (order ? ` order by "${order.sortColumn}" ${order.sortOrder}` : "");
      return fit(db.prepare(sql).all(...wheres.map((c) => c.comparison!.right!.value ?? null)));
    },
  });
  return {
    database: {} as StorageOperationsContext["database"],
    messagesCollection: {
      table: "history",
      schema: schemaFrom.messagesCollection.schema,
      query,
    } as unknown as StorageOperationsContext["messagesCollection"],
    conversationsCollection: {} as StorageOperationsContext["conversationsCollection"],
  };
}

describe("getMessagesOp past Android's CursorWindow", () => {
  let source: StorageOperationsContext;
  let sqlite: SqliteDb;

  beforeAll(async () => {
    source = lokiCtx();
    await createConversationOp(source, { conversationId: "conv" });
    await createConversationOp(source, { conversationId: "other" });
    await createMessageOp(source, {
      conversationId: "conv",
      role: "user",
      content: "summarise this file",
      uniqueId: "m-1",
    });
    await createMessageOp(source, {
      conversationId: "conv",
      role: "assistant",
      content: HUGE,
      uniqueId: "m-2",
    });
    await updateMessageChunksOp(
      source,
      "m-2",
      [{ text: "x", vector: [1, 0, 0], startOffset: 0, endOffset: 1 }],
      "test/model"
    );
    await createMessageOp(source, {
      conversationId: "conv",
      role: "user",
      content: "thanks",
      uniqueId: "m-3",
    });
    await createMessageOp(source, {
      conversationId: "other",
      role: "user",
      content: "elsewhere",
      uniqueId: "m-other",
    });
    sqlite = await copyHistory(source);
  });

  it("returns every message, the oversized one whole, exactly as an unbounded read does", async () => {
    const unbounded = await getMessagesOp(sqliteCtx(sqlite, source, Infinity), "conv");
    const bounded = await getMessagesOp(sqliteCtx(sqlite, source, WINDOW_CHARS), "conv");

    expect(bounded.map((m) => m.uniqueId)).toEqual(["m-1", "m-2", "m-3"]);
    expect(bounded[1]?.content).toBe(HUGE);
    expect(bounded[1]?.chunks).toEqual([
      expect.objectContaining({ vector: [1, 0, 0], startOffset: 0, endOffset: 1 }),
    ]);
    expect(bounded).toEqual(unbounded);
  });

  it("still fails on any other read error", async () => {
    const ctx = sqliteCtx(sqlite, source, WINDOW_CHARS);
    const broken = {
      ...ctx,
      messagesCollection: {
        ...ctx.messagesCollection,
        query: () => ({
          unsafeFetchRaw: async () => {
            throw new Error("database disk image is malformed");
          },
        }),
      } as unknown as StorageOperationsContext["messagesCollection"],
    };

    await expect(getMessagesOp(broken, "conv")).rejects.toThrow("malformed");
  });
});
