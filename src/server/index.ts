/**
 * Server entry point for @anuma/sdk
 *
 * Provides memory vault operations without browser or React Native dependencies.
 * Use this for Node.js servers (e.g., SMS/iMessage integrations).
 *
 * @example
 * ```ts
 * import {
 *   PostgresMemoryStore,
 *   searchVaultMemories,
 *   createVaultEmbeddingCache,
 *   preEmbedVaultMemories,
 * } from "@anuma/sdk/server";
 *
 * const store = new PostgresMemoryStore({
 *   client: pool,
 *   accountId: "user-123",
 *   appId: "my-app",
 * });
 *
 * const cache = createVaultEmbeddingCache();
 * await preEmbedVaultMemories(store, { apiKey: "sk-..." }, cache);
 * const results = await searchVaultMemories("query", store, { apiKey: "sk-..." }, cache);
 * ```
 *
 * @module server
 */

// Interfaces
export type { MemoryStore, MemoryStoreReader } from "../lib/memoryVault/memoryStore";

// Server adapter
export { PostgresMemoryStore, type PostgresClient } from "../lib/memoryVault/postgresStore";

// Search
export {
  cosineSimilarity,
  createMemoryVaultSearchTool,
  createVaultEmbeddingCache,
  DEFAULT_VAULT_CACHE_SIZE,
  eagerEmbedContent,
  preEmbedVaultMemories,
  searchVaultMemories,
} from "../lib/memoryVault/searchTool";

// Tools
export { createMemoryVaultTool } from "../lib/memoryVault/tool";

// Embeddings
export { generateEmbedding, generateEmbeddings } from "../lib/memoryEngine/embeddings";

// Types
export type { EmbeddingOptions } from "../lib/memoryEngine/types";
export type { StoredVaultMemory } from "../lib/db/memoryVault/types";
export type {
  MemoryVaultSearchOptions,
  VaultEmbeddingCache,
  VaultSearchResult,
} from "../lib/memoryVault/searchTool";
export type { MemoryVaultToolOptions, VaultSaveOperation } from "../lib/memoryVault/tool";
export type { ToolConfig } from "../lib/chat/useChat/types";
