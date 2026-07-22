# RecallContext

Defined in: [src/lib/memory/types.ts:203](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#203)

## Properties

### chunkCache?

> `optional` **chunkCache**: [`ChunkVectorCache`](../type-aliases/ChunkVectorCache.md)

Defined in: [src/lib/memory/types.ts:217](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#217)

Optional chunk-vector LRU cache. When provided, the chunk lane skips the
per-query decrypt + JSON.parse of every message's chunk vectors on warm
entries. Build via `createChunkVectorCache`. Omit for legacy behavior.

***

### embeddingOptions

> **embeddingOptions**: [`MemoryEngineEmbeddingOptions`](MemoryEngineEmbeddingOptions.md)

Defined in: [src/lib/memory/types.ts:209](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#209)

Embedding API options.

***

### entityCtx?

> `optional` **entityCtx**: [`EntityOperationsContext`](EntityOperationsContext.md)

Defined in: [src/lib/memory/types.ts:224](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#224)

Optional — when provided, recall extracts entities from the query
and adds a graph lane to the RRF fusion (memories sharing entities
with the query rank higher). Build via `entityCollection` +
`memoryEntityCollection` from your DatabaseManager.

***

### storageCtx?

> `optional` **storageCtx**: [`StorageOperationsContext`](StorageOperationsContext.md)

Defined in: [src/lib/memory/types.ts:207](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#207)

Required when `types` includes 'chunk'.

***

### vaultCache?

> `optional` **vaultCache**: [`VaultEmbeddingCache`](../type-aliases/VaultEmbeddingCache.md)

Defined in: [src/lib/memory/types.ts:211](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#211)

Vault embedding LRU cache.

***

### vaultCtx?

> `optional` **vaultCtx**: [`VaultMemoryOperationsContext`](VaultMemoryOperationsContext.md)

Defined in: [src/lib/memory/types.ts:205](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#205)

Required when `types` includes 'fact'.
