/**
 * WatermelonDB DatabaseAdapter backed by PostgreSQL.
 *
 * Allows the same SDK operations (createMessageOp, getMessagesOp, etc.)
 * to run unchanged on both browser (LokiJS) and server (PostgreSQL).
 *
 * The adapter accepts any pg.Pool-compatible object via dependency injection,
 * so the SDK itself does not depend on the `pg` package.
 *
 * @example
 * ```typescript
 * import pg from "pg";
 * import { PostgreSQLAdapter } from "@anuma/sdk/server";
 * import { sdkSchema, sdkMigrations } from "@anuma/sdk/server";
 *
 * const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
 * const adapter = new PostgreSQLAdapter({
 *   pool,
 *   schema: sdkSchema,
 *   migrations: sdkMigrations,
 *   dbName: "anuma-server-wallet123",
 * });
 * ```
 */

import type {
  BatchOperation,
  CachedFindResult,
  CachedQueryResult,
  DatabaseAdapter,
  UnsafeExecuteOperations,
} from "@nozbe/watermelondb/adapters/type";
import type { RecordId } from "@nozbe/watermelondb/Model";
import type { SerializedQuery } from "@nozbe/watermelondb/Query";
import type { RawRecord } from "@nozbe/watermelondb/RawRecord";
import type { AppSchema, ColumnSchema, TableName } from "@nozbe/watermelondb/Schema";
import type { SchemaMigrations } from "@nozbe/watermelondb/Schema/migrations";
import type { ResultCallback } from "@nozbe/watermelondb/utils/fp/Result";

// ---------------------------------------------------------------------------
// pg Pool interface (dependency injection — no hard dep on `pg`)
// ---------------------------------------------------------------------------

export interface PgClientLike {
  query(text: string, values?: unknown[]): Promise<{ rows: Record<string, unknown>[] }>;
  release(): void;
}

export interface PgPoolLike {
  query(text: string, values?: unknown[]): Promise<{ rows: Record<string, unknown>[] }>;
  /** Optional. When provided, batch operations run inside a transaction on a dedicated connection. */
  connect?(): Promise<PgClientLike>;
}

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

export interface PostgreSQLAdapterOptions {
  pool: PgPoolLike;
  schema: AppSchema;
  migrations?: SchemaMigrations;
  dbName: string;
  /**
   * PostgreSQL schema (namespace) for all SDK tables.
   * Defaults to "public". Use a custom schema (e.g. "sdk") to avoid
   * conflicts with existing tables in the same database.
   */
  pgSchema?: string;
}

// ---------------------------------------------------------------------------
// Table name qualifier
// ---------------------------------------------------------------------------

/**
 * Returns a function that qualifies table names with a PG schema prefix.
 * When pgSchema is "public", returns bare quoted names (`"table"`).
 * Otherwise returns schema-qualified names (`"sdk"."table"`).
 */
function makeQualify(pgSchema: string): (table: string) => string {
  if (pgSchema === "public") {
    return (table: string) => `"${table}"`;
  }
  return (table: string) => `"${pgSchema}"."${table}"`;
}

// ---------------------------------------------------------------------------
// Helpers: WatermelonDB query → SQL
// ---------------------------------------------------------------------------

/** Push a value into the params array and return its $N placeholder. */
function param(params: unknown[], value: unknown): string {
  params.push(value);
  return `$${params.length}`;
}

/** Push multiple values and return a parenthesized placeholder list: ($1, $2, ...) */
function paramList(params: unknown[], values: unknown[]): string {
  return `(${values.map((v) => param(params, v)).join(", ")})`;
}

type ComparisonRight = { value?: unknown; values?: unknown[]; column?: string };
type Comparison = { operator: string; right: ComparisonRight };
type Where =
  | { type: "where"; left: string; comparison: Comparison }
  | { type: "and"; conditions: Where[] }
  | { type: "or"; conditions: Where[] }
  | { type: "on"; table: string; conditions: Where[] }
  | { type: "sql"; expr: string };

const operators: Record<string, string> = {
  eq: "=",
  notEq: "!=",
  gt: ">",
  gte: ">=",
  weakGt: ">",
  lt: "<",
  lte: "<=",
  oneOf: "in",
  notIn: "not in",
  between: "between",
  like: "like",
  notLike: "not like",
};

function getComparisonRight(params: unknown[], table: string, right: ComparisonRight): string {
  if (right.values) return paramList(params, right.values);
  if (right.column) return `"${table}"."${right.column}"`;
  return right.value !== undefined ? param(params, right.value) : "null";
}

function encodeComparison(params: unknown[], table: string, comparison: Comparison): string {
  if (comparison.operator === "between") {
    const vals = comparison.right.values;
    if (vals) return `between ${param(params, vals[0])} and ${param(params, vals[1])}`;
    return "";
  }
  // PostgreSQL requires IS NULL / IS NOT NULL (not = null / != null)
  const rightValue = comparison.right.value;
  if (
    (rightValue === null || rightValue === undefined) &&
    !comparison.right.values &&
    !comparison.right.column
  ) {
    if (comparison.operator === "eq") return "is null";
    if (comparison.operator === "notEq") return "is not null";
  }
  return `${operators[comparison.operator]} ${getComparisonRight(params, table, comparison.right)}`;
}

interface Association {
  from: string;
  to: string;
  info: { type: "belongs_to" | "has_many"; key?: string; foreignKey?: string };
}

function encodeWhere(
  params: unknown[],
  table: string,
  associations: Association[],
  clause: Where
): string {
  switch (clause.type) {
    case "and":
      return `(${clause.conditions.map((c) => encodeWhere(params, table, associations, c)).join(" and ")})`;
    case "or":
      return `(${clause.conditions.map((c) => encodeWhere(params, table, associations, c)).join(" or ")})`;
    case "where": {
      const { left, comparison } = clause;
      if (comparison.operator === "includes") {
        return `position(${getComparisonRight(params, table, comparison.right)} in "${table}"."${left}") > 0`;
      }
      return `"${table}"."${left}" ${encodeComparison(params, table, comparison)}`;
    }
    case "on":
      return `(${clause.conditions.map((c) => encodeWhere(params, clause.table, associations, c)).join(" and ")})`;
    case "sql":
      return clause.expr;
    default:
      throw new Error(`Unknown clause type: ${(clause as Where).type}`);
  }
}

interface QueryDescription {
  where: Where[];
  joinTables: string[];
  nestedJoinTables: { from: string; to: string }[];
  sortBy: { sortColumn: string; sortOrder: "asc" | "desc" }[];
  take?: number;
  skip?: number;
  sql?: { sql: string; values: unknown[] };
}

/**
 * Encode a WatermelonDB SerializedQuery to SQL.
 *
 * The `qualify` function is used to add schema prefixes to table names
 * in FROM/JOIN clauses, while column references keep the bare table alias.
 */
function encodeQuery(
  query: SerializedQuery,
  qualify: (table: string) => string,
  countMode = false,
  idsOnly = false
): [string, unknown[]] {
  const { table, description, associations } = query as unknown as {
    table: string;
    description: QueryDescription;
    associations: Association[];
  };

  // Raw SQL passthrough
  if (description.sql) {
    return [description.sql.sql, description.sql.values];
  }

  const params: unknown[] = [];
  const hasToManyJoins = associations.some((a) => a.info.type === "has_many");
  const distinct = hasToManyJoins ? "distinct " : "";
  const qualifiedTable = qualify(table);

  // SELECT clause
  let select: string;
  if (countMode) {
    select = hasToManyJoins
      ? `select count(distinct "${table}"."id") as "count" from ${qualifiedTable}`
      : `select count(*) as "count" from ${qualifiedTable}`;
  } else if (idsOnly) {
    select = `select ${distinct}"${table}"."id" from ${qualifiedTable}`;
  } else {
    select = `select ${distinct}"${table}".* from ${qualifiedTable}`;
  }

  // JOINs
  const joins = associations
    .map((a) => {
      const usesOldJoinStyle = description.where.some(
        (w) => w.type === "on" && (w as { table: string }).table === a.to
      );
      const joinKw = usesOldJoinStyle ? " join " : " left join ";
      const qualifiedJoinTable = qualify(a.to);
      const prefix = `${joinKw}${qualifiedJoinTable} on "${a.to}".`;
      if (a.info.type === "belongs_to") {
        return `${prefix}"id" = "${a.from}"."${a.info.key}"`;
      }
      return `${prefix}"${a.info.foreignKey}" = "${a.from}"."id"`;
    })
    .join("");

  // WHERE
  const whereClauses = description.where
    .map((w) => encodeWhere(params, table, associations, w))
    .filter(Boolean);
  const whereStr = whereClauses.length ? ` where ${whereClauses.join(" and ")}` : "";

  // ORDER BY
  const orderBy =
    description.sortBy.length > 0
      ? ` order by ${description.sortBy.map((s) => `"${table}"."${s.sortColumn}" ${s.sortOrder}`).join(", ")}`
      : "";

  // LIMIT / OFFSET
  let limitOffset = "";
  if (description.take) {
    limitOffset = ` limit ${description.take}`;
    if (description.skip) {
      limitOffset += ` offset ${description.skip}`;
    }
  }

  return [`${select}${joins}${whereStr}${orderBy}${limitOffset}`, params];
}

// ---------------------------------------------------------------------------
// Schema → DDL
// ---------------------------------------------------------------------------

function columnTypeToPg(col: ColumnSchema): string {
  switch (col.type) {
    case "string":
      return "text";
    case "number":
      return "double precision";
    case "boolean":
      return "boolean";
    default:
      return "text";
  }
}

function columnDefault(col: ColumnSchema): string {
  if (col.isOptional) return "null";
  switch (col.type) {
    case "string":
      return "''";
    case "number":
      return "0";
    case "boolean":
      return "false";
    default:
      return "''";
  }
}

/**
 * Generate CREATE TABLE statements from a WatermelonDB AppSchema.
 * Includes the standard WatermelonDB internal columns (`id`, `_status`, `_changed`)
 * and creates indexes for columns marked `isIndexed`.
 *
 * @param schema - WatermelonDB AppSchema
 * @param pgSchema - PostgreSQL schema namespace (defaults to "public")
 */
export function schemaToCreateSQL(schema: AppSchema, pgSchema = "public"): string[] {
  const qualify = makeQualify(pgSchema);
  const statements: string[] = [];

  for (const [tableName, tableSchema] of Object.entries(schema.tables)) {
    const cols = [
      `"id" text primary key`,
      `"_status" text not null default 'created'`,
      `"_changed" text not null default ''`,
    ];

    const indexes: string[] = [];

    for (const col of tableSchema.columnArray) {
      const pgType = columnTypeToPg(col);
      const nullable = col.isOptional ? "" : " not null";
      const def = ` default ${columnDefault(col)}`;
      cols.push(`"${col.name}" ${pgType}${nullable}${def}`);

      if (col.isIndexed) {
        const indexName =
          pgSchema === "public"
            ? `"${tableName}_${col.name}"`
            : `"${pgSchema}_${tableName}_${col.name}"`;
        indexes.push(
          `create index if not exists ${indexName} on ${qualify(tableName)} ("${col.name}");`
        );
      }
    }

    statements.push(`create table if not exists ${qualify(tableName)} (${cols.join(", ")});`);
    statements.push(...indexes);
  }

  // Local storage table (used by getLocal/setLocal/removeLocal)
  statements.push(
    `create table if not exists ${qualify("local_storage")} ("key" text primary key, "value" text not null);`
  );

  return statements;
}

// ---------------------------------------------------------------------------
// Row ↔ RawRecord conversion
// ---------------------------------------------------------------------------

function rowToRaw(row: Record<string, unknown>): RawRecord {
  const raw: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    // PostgreSQL returns booleans natively — WatermelonDB expects 0/1 for booleans
    // but the sanitizedRaw function handles coercion. We pass values through as-is.
    raw[key] = value;
  }
  return raw as unknown as RawRecord;
}

// ---------------------------------------------------------------------------
// PostgreSQLAdapter
// ---------------------------------------------------------------------------

export class PostgreSQLAdapter implements DatabaseAdapter {
  schema: AppSchema;
  dbName: string;
  migrations?: SchemaMigrations;

  private pool: PgPoolLike;
  private qualify: (table: string) => string;
  private _pgSchema: string;
  private initialized: Promise<void>;

  constructor(options: PostgreSQLAdapterOptions) {
    this.schema = options.schema;
    this.dbName = options.dbName;
    this.migrations = options.migrations;
    this.pool = options.pool;
    this._pgSchema = options.pgSchema ?? "public";
    this.qualify = makeQualify(this._pgSchema);
    this.initialized = this._initialize();
  }

  private async _initialize(): Promise<void> {
    if (this._pgSchema !== "public") {
      await this.pool.query(`create schema if not exists "${this._pgSchema}"`);
    }
    const statements = schemaToCreateSQL(this.schema, this._pgSchema);
    for (const sql of statements) {
      await this.pool.query(sql);
    }
  }

  private async _ready(): Promise<void> {
    await this.initialized;
  }

  // Helper: bridge async to WatermelonDB callback pattern
  private _fromPromise<T>(promise: Promise<T>, callback: ResultCallback<T>): void {
    promise.then(
      (value) => callback({ value } as { value: T }),
      (error: unknown) => callback({ error } as { error: Error })
    );
  }

  /** Qualify a table name with the PG schema. */
  private q(table: string): string {
    return this.qualify(table);
  }

  // ---------- DatabaseAdapter interface ----------

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- WatermelonDB DatabaseAdapter interface
  find(table: TableName<any>, id: RecordId, callback: ResultCallback<CachedFindResult>): void {
    this._fromPromise(
      (async () => {
        await this._ready();
        const { rows } = await this.pool.query(
          `select * from ${this.q(table)} where "id" = $1 limit 1`,
          [id]
        );
        if (rows.length === 0) return undefined;
        return rowToRaw(rows[0]) as CachedFindResult;
      })(),
      callback
    );
  }

  query(query: SerializedQuery, callback: ResultCallback<CachedQueryResult>): void {
    this._fromPromise(
      (async () => {
        await this._ready();
        const [sql, values] = encodeQuery(query, this.qualify);
        const { rows } = await this.pool.query(sql, values);
        return rows.map(rowToRaw) as CachedQueryResult;
      })(),
      callback
    );
  }

  queryIds(query: SerializedQuery, callback: ResultCallback<RecordId[]>): void {
    this._fromPromise(
      (async () => {
        await this._ready();
        const [sql, values] = encodeQuery(query, this.qualify, false, true);
        const { rows } = await this.pool.query(sql, values);
        return rows.map((r) => r.id as RecordId);
      })(),
      callback
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- WatermelonDB DatabaseAdapter interface
  unsafeQueryRaw(query: SerializedQuery, callback: ResultCallback<any[]>): void {
    this._fromPromise(
      (async () => {
        await this._ready();
        const [sql, values] = encodeQuery(query, this.qualify);
        const { rows } = await this.pool.query(sql, values);
        return rows;
      })(),
      callback
    );
  }

  count(query: SerializedQuery, callback: ResultCallback<number>): void {
    this._fromPromise(
      (async () => {
        await this._ready();
        const [sql, values] = encodeQuery(query, this.qualify, true);
        const { rows } = await this.pool.query(sql, values);
        return Number(rows[0]?.count ?? 0);
      })(),
      callback
    );
  }

  batch(operations: BatchOperation[], callback: ResultCallback<void>): void {
    this._fromPromise(
      (async () => {
        await this._ready();

        const runOps = async (q: Pick<PgPoolLike, "query">) => {
          for (const operation of operations) {
            const [type, table, rawOrId] = operation;

            switch (type) {
              case "create": {
                const raw = rawOrId as unknown as RawRecord;
                const record = raw as unknown as Record<string, unknown>;
                const keys = Object.keys(record);
                const cols = keys.map((k) => `"${k}"`).join(", ");
                const placeholders = keys.map((_, i) => `$${i + 1}`).join(", ");
                const values = keys.map((k) => record[k]);
                await q.query(
                  `insert into ${this.q(table)} (${cols}) values (${placeholders})`,
                  values
                );
                break;
              }
              case "update": {
                const raw = rawOrId as unknown as RawRecord;
                const record = raw as unknown as Record<string, unknown>;
                const id = record.id;
                const keys = Object.keys(record).filter((k) => k !== "id");
                const sets = keys.map((k, i) => `"${k}" = $${i + 1}`).join(", ");
                const values = keys.map((k) => record[k]);
                values.push(id);
                await q.query(
                  `update ${this.q(table)} set ${sets} where "id" = $${values.length}`,
                  values
                );
                break;
              }
              case "markAsDeleted": {
                const id = rawOrId as unknown as RecordId;
                await q.query(`update ${this.q(table)} set "_status" = 'deleted' where "id" = $1`, [
                  id,
                ]);
                break;
              }
              case "destroyPermanently": {
                const id = rawOrId as unknown as RecordId;
                await q.query(`delete from ${this.q(table)} where "id" = $1`, [id]);
                break;
              }
            }
          }
        };

        if (this.pool.connect) {
          const client = await this.pool.connect();
          try {
            await client.query("BEGIN");
            await runOps(client);
            await client.query("COMMIT");
          } catch (err) {
            await client.query("ROLLBACK");
            throw err;
          } finally {
            client.release();
          }
        } else {
          await runOps(this.pool);
        }
      })(),
      callback
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- WatermelonDB DatabaseAdapter interface
  getDeletedRecords(table: TableName<any>, callback: ResultCallback<RecordId[]>): void {
    this._fromPromise(
      (async () => {
        await this._ready();
        const { rows } = await this.pool.query(
          `select "id" from ${this.q(table)} where "_status" = 'deleted'`
        );
        return rows.map((r) => r.id as RecordId);
      })(),
      callback
    );
  }

  destroyDeletedRecords(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- WatermelonDB DatabaseAdapter interface
    table: TableName<any>,
    recordIds: RecordId[],
    callback: ResultCallback<void>
  ): void {
    this._fromPromise(
      (async () => {
        await this._ready();
        if (recordIds.length === 0) return;
        const placeholders = recordIds.map((_, i) => `$${i + 1}`).join(", ");
        await this.pool.query(
          `delete from ${this.q(table)} where "id" in (${placeholders})`,
          recordIds
        );
      })(),
      callback
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- WatermelonDB DatabaseAdapter interface
  unsafeLoadFromSync(_jsonId: number, callback: ResultCallback<any>): void {
    callback({ error: new Error("unsafeLoadFromSync is not supported by PostgreSQLAdapter") } as {
      error: Error;
    });
  }

  provideSyncJson(_id: number, _syncPullResultJson: string, callback: ResultCallback<void>): void {
    callback({ error: new Error("provideSyncJson is not supported by PostgreSQLAdapter") } as {
      error: Error;
    });
  }

  unsafeResetDatabase(callback: ResultCallback<void>): void {
    this._fromPromise(
      (async () => {
        await this._ready();
        for (const tableName of Object.keys(this.schema.tables)) {
          await this.pool.query(`delete from ${this.q(tableName)}`);
        }
        await this.pool.query(`delete from ${this.q("local_storage")}`);
      })(),
      callback
    );
  }

  unsafeExecute(_operations: UnsafeExecuteOperations, callback: ResultCallback<void>): void {
    // SQL-string mode support
    const ops = _operations as unknown as {
      sqlString?: string;
      sqls?: [string, unknown[]][];
    };
    if (ops.sqlString) {
      this._fromPromise(
        (async () => {
          await this._ready();
          await this.pool.query(ops.sqlString!);
        })(),
        callback
      );
      return;
    }
    if (ops.sqls) {
      this._fromPromise(
        (async () => {
          await this._ready();
          for (const [sql, args] of ops.sqls!) {
            await this.pool.query(sql, args);
          }
        })(),
        callback
      );
      return;
    }
    callback({
      error: new Error("unsafeExecute: only sql modes supported by PostgreSQLAdapter"),
    } as {
      error: Error;
    });
  }

  getLocal(key: string, callback: ResultCallback<string | undefined>): void {
    this._fromPromise(
      (async () => {
        await this._ready();
        const { rows } = await this.pool.query(
          `select "value" from ${this.q("local_storage")} where "key" = $1`,
          [key]
        );
        return rows.length > 0 ? (rows[0].value as string) : undefined;
      })(),
      callback
    );
  }

  setLocal(key: string, value: string, callback: ResultCallback<void>): void {
    this._fromPromise(
      (async () => {
        await this._ready();
        await this.pool.query(
          `insert into ${this.q("local_storage")} ("key", "value") values ($1, $2) on conflict ("key") do update set "value" = $2`,
          [key, value]
        );
      })(),
      callback
    );
  }

  removeLocal(key: string, callback: ResultCallback<void>): void {
    this._fromPromise(
      (async () => {
        await this._ready();
        await this.pool.query(`delete from ${this.q("local_storage")} where "key" = $1`, [key]);
      })(),
      callback
    );
  }
}
