import type { VaultMemoryOperationsContext } from "../db/memoryVault/operations";
import {
  createVaultMemoryOp,
  deleteVaultMemoryOp,
  getAllVaultMemoriesOp,
  getVaultMemoryOp,
  updateVaultMemoryOp,
} from "../db/memoryVault/operations";
import type { StoredVaultMemory } from "../db/memoryVault/types";
import type { MemoryStore } from "./memoryStore";

export class WatermelonDBMemoryStore implements MemoryStore {
  constructor(private ctx: VaultMemoryOperationsContext) {}

  getAll(options?: { scopes?: string[] }): Promise<StoredVaultMemory[]> {
    return getAllVaultMemoriesOp(this.ctx, options);
  }

  getById(id: string): Promise<StoredVaultMemory | null> {
    return getVaultMemoryOp(this.ctx, id);
  }

  create(opts: { content: string; scope?: string }): Promise<StoredVaultMemory> {
    return createVaultMemoryOp(this.ctx, opts);
  }

  update(
    id: string,
    opts: { content: string; scope?: string }
  ): Promise<StoredVaultMemory | null> {
    return updateVaultMemoryOp(this.ctx, id, opts);
  }

  delete(id: string): Promise<boolean> {
    return deleteVaultMemoryOp(this.ctx, id);
  }
}
