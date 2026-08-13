# RecallContext

Defined in: [src/lib/memory/types.ts:242](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#242)

## Properties

### chunkCache?

> `optional` **chunkCache**: [`ChunkVectorCache`](../type-aliases/ChunkVectorCache.md)

Defined in: [src/lib/memory/types.ts:256](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#256)

Optional chunk-vector LRU cache. When provided, the chunk lane skips the
per-query decrypt + JSON.parse of every message's chunk vectors on warm
entries. Build via `createChunkVectorCache`. Omit for legacy behavior.

***

### embeddingOptions

> **embeddingOptions**: [`MemoryEngineEmbeddingOptions`](MemoryEngineEmbeddingOptions.md)

Defined in: [src/lib/memory/types.ts:248](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#248)

Embedding API options.

***

### entityCtx?

> `optional` **entityCtx**: [`EntityOperationsContext`](EntityOperationsContext.md)

Defined in: [src/lib/memory/types.ts:263](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#263)

Optional — when provided, recall extracts entities from the query
and adds a graph lane to the RRF fusion (memories sharing entities
with the query rank higher). Build via `entityCollection` +
`memoryEntityCollection` from your DatabaseManager.

***

### storageCtx?

> `optional` **storageCtx**: [`StorageOperationsContext`](StorageOperationsContext.md)

Defined in: [src/lib/memory/types.ts:246](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#246)

Required when `types` includes 'chunk'.

***

### vaultCache?

> `optional` **vaultCache**: [`VaultEmbeddingCache`](../type-aliases/VaultEmbeddingCache.md)

Defined in: [src/lib/memory/types.ts:250](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#250)

Vault embedding LRU cache.

***

### vaultCtx?

> `optional` **vaultCtx**: [`VaultMemoryOperationsContext`](VaultMemoryOperationsContext.md)

Defined in: [src/lib/memory/types.ts:244](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#244)

Required when `types` includes 'fact'.
