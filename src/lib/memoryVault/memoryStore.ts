import type { StoredVaultMemory } from "../db/memoryVault/types";

export interface MemoryStoreReader {
  getAll(options?: { scopes?: string[] }): Promise<StoredVaultMemory[]>;
  getById(id: string): Promise<StoredVaultMemory | null>;
}

export interface MemoryStore extends MemoryStoreReader {
  create(opts: { content: string; scope?: string }): Promise<StoredVaultMemory>;
  update(id: string, opts: { content: string; scope?: string }): Promise<StoredVaultMemory | null>;
  delete(id: string): Promise<boolean>;
}
