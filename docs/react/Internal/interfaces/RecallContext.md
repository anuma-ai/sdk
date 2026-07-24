# RecallContext

Defined in: [src/lib/memory/types.ts:214](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#214)

## Properties

### chunkCache?

> `optional` **chunkCache**: [`ChunkVectorCache`](../type-aliases/ChunkVectorCache.md)

Defined in: [src/lib/memory/types.ts:228](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#228)

Optional chunk-vector LRU cache. When provided, the chunk lane skips the
per-query decrypt + JSON.parse of every message's chunk vectors on warm
entries. Build via `createChunkVectorCache`. Omit for legacy behavior.

***

### embeddingOptions

> **embeddingOptions**: [`MemoryEngineEmbeddingOptions`](MemoryEngineEmbeddingOptions.md)

Defined in: [src/lib/memory/types.ts:220](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#220)

Embedding API options.

***

### entityCtx?

> `optional` **entityCtx**: [`EntityOperationsContext`](EntityOperationsContext.md)

Defined in: [src/lib/memory/types.ts:235](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#235)

Optional — when provided, recall extracts entities from the query
and adds a graph lane to the RRF fusion (memories sharing entities
with the query rank higher). Build via `entityCollection` +
`memoryEntityCollection` from your DatabaseManager.

***

### storageCtx?

> `optional` **storageCtx**: [`StorageOperationsContext`](StorageOperationsContext.md)

Defined in: [src/lib/memory/types.ts:218](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#218)

Required when `types` includes 'chunk'.

***

### vaultCache?

> `optional` **vaultCache**: [`VaultEmbeddingCache`](../type-aliases/VaultEmbeddingCache.md)

Defined in: [src/lib/memory/types.ts:222](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#222)

Vault embedding LRU cache.

***

### vaultCtx?

> `optional` **vaultCtx**: [`VaultMemoryOperationsContext`](VaultMemoryOperationsContext.md)

Defined in: [src/lib/memory/types.ts:216](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#216)

Required when `types` includes 'fact'.
