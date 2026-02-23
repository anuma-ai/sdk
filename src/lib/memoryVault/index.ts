/**
 * Memory Vault Module
 *
 * Provides a tool for LLMs to save and update persistent memories
 * in the user's local database. Each operation can be intercepted
 * by the host app for confirmation/cancellation.
 *
 * @example
 * ```ts
 * import { createMemoryVaultTool } from "@anthropic/sdk/lib/memoryVault";
 *
 * const tool = createMemoryVaultTool(vaultCtx, {
 *   onSave: async (op) => showConfirmationToast(op),
 * });
 * ```
 */

export type {
  MemoryVaultSearchOptions,
  VaultEmbeddingCache,
  VaultSearchResult,
} from "./searchTool";
export {
  createMemoryVaultSearchTool,
  createVaultEmbeddingCache,
  DEFAULT_VAULT_CACHE_SIZE,
  eagerEmbedContent,
  preEmbedVaultMemories,
  searchVaultMemories,
} from "./searchTool";
export type { MemoryVaultToolOptions, VaultSaveOperation } from "./tool";
export { createMemoryVaultTool } from "./tool";
