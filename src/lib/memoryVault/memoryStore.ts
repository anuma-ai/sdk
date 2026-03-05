import type { StoredVaultMemory } from "../db/memoryVault/types";

export interface MemoryStoreReader {
  /** Returns all memories, optionally filtered by scope. */
  getAll(options?: { scopes?: string[] }): Promise<StoredVaultMemory[]>;
  /** Returns a single memory by ID, or `null` if not found. */
  getById(id: string): Promise<StoredVaultMemory | null>;
}

export interface MemoryStore extends MemoryStoreReader {
  create(opts: { content: string; scope?: string }): Promise<StoredVaultMemory>;
  /** Updates a memory's content. Returns `null` if the memory was not found. */
  update(id: string, opts: { content: string; scope?: string }): Promise<StoredVaultMemory | null>;
  /** Soft-deletes a memory. Returns `true` if the memory was found and deleted. */
  delete(id: string): Promise<boolean>;
}
