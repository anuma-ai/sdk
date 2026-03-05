/**
 * Memory Vault Module
 *
 * Provides a tool for LLMs to save and update persistent memories
 * in the user's local database. Each operation can be intercepted
 * by the host app for confirmation/cancellation.
 *
 * @example
 * ```ts
 * import { createMemoryVaultTool, WatermelonDBMemoryStore } from "@anuma/sdk";
 *
 * const store = new WatermelonDBMemoryStore(vaultCtx);
 * const tool = createMemoryVaultTool(store, {
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
  cosineSimilarity,
  createMemoryVaultSearchTool,
  createVaultEmbeddingCache,
  DEFAULT_VAULT_CACHE_SIZE,
  eagerEmbedContent,
  preEmbedVaultMemories,
  searchVaultMemories,
} from "./searchTool";
export type { MemoryStore, MemoryStoreReader } from "./memoryStore";
export type { MemoryVaultToolOptions, VaultSaveOperation } from "./tool";
export { createMemoryVaultTool } from "./tool";
export { WatermelonDBMemoryStore } from "./watermelonStore";
