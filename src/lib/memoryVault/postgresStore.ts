import type { StoredVaultMemory } from "../db/memoryVault/types";
import type { MemoryStoreReader } from "./memoryStore";

export interface PostgresClient {
  query<T extends Record<string, unknown> = Record<string, unknown>>(
    sql: string,
    params?: unknown[]
  ): Promise<{ rows: T[] }>;
}

interface PostgresMemoryStoreOptions {
  client: PostgresClient;
  accountId: string;
  appId: string;
  table?: string;
}

interface MemoryCacheRow extends Record<string, unknown> {
  id: string;
  content: string;
  scope: string;
  created_at: string | Date;
  updated_at: string | Date;
  is_deleted: boolean;
}

export class PostgresMemoryStore implements MemoryStoreReader {
  private client: PostgresClient;
  private accountId: string;
  private appId: string;
  private table: string;

  constructor(options: PostgresMemoryStoreOptions) {
    this.client = options.client;
    this.accountId = options.accountId;
    this.appId = options.appId;
    this.table = options.table ?? "memory_cache";
  }

  async getAll(options?: { scopes?: string[] }): Promise<StoredVaultMemory[]> {
    let sql = `SELECT id, content, scope, created_at, updated_at, is_deleted FROM ${this.table} WHERE account_id = $1 AND app_id = $2 AND is_deleted = false`;
    const params: unknown[] = [this.accountId, this.appId];

    if (options?.scopes?.length) {
      sql += ` AND scope = ANY($3)`;
      params.push(options.scopes);
    }

    sql += ` ORDER BY created_at DESC`;

    const { rows } = await this.client.query<MemoryCacheRow>(sql, params);
    return rows.map(rowToStoredVaultMemory);
  }

  async getById(id: string): Promise<StoredVaultMemory | null> {
    const { rows } = await this.client.query<MemoryCacheRow>(
      `SELECT id, content, scope, created_at, updated_at, is_deleted FROM ${this.table} WHERE id = $1 AND account_id = $2 AND app_id = $3 AND is_deleted = false`,
      [id, this.accountId, this.appId]
    );
    return rows.length > 0 ? rowToStoredVaultMemory(rows[0]) : null;
  }
}

function rowToStoredVaultMemory(row: MemoryCacheRow): StoredVaultMemory {
  return {
    uniqueId: row.id,
    content: row.content,
    scope: row.scope,
    createdAt: row.created_at instanceof Date ? row.created_at : new Date(row.created_at),
    updatedAt: row.updated_at instanceof Date ? row.updated_at : new Date(row.updated_at),
    isDeleted: row.is_deleted,
  };
}
