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

export { createMemoryVaultTool } from "./tool";

export type {
  VaultSaveOperation,
  MemoryVaultToolOptions,
} from "./tool";

export {
  createMemoryVaultSearchTool,
  preEmbedVaultMemories,
  eagerEmbedContent,
  createVaultEmbeddingCache,
  DEFAULT_VAULT_CACHE_SIZE,
} from "./searchTool";

export type {
  VaultEmbeddingCache,
  MemoryVaultSearchOptions,
} from "./searchTool";
