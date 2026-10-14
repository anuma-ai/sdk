# RecallContext

Defined in: [src/lib/memory/types.ts:250](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#250)

## Properties

### chunkCache?

> `optional` **chunkCache**: [`ChunkVectorCache`](../type-aliases/ChunkVectorCache.md)

Defined in: [src/lib/memory/types.ts:266](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#266)

Optional chunk-vector LRU cache. When provided, the chunk lane skips the
per-query decrypt + JSON.parse of every message's chunk vectors on warm
entries. Build via `createChunkVectorCache`. Omit for legacy behavior.

***

### embeddingOptions

> **embeddingOptions**: [`MemoryEngineEmbeddingOptions`](MemoryEngineEmbeddingOptions.md)

Defined in: [src/lib/memory/types.ts:258](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#258)

Embedding API options.

***

### entityCtx?

> `optional` **entityCtx**: [`EntityOperationsContext`](EntityOperationsContext.md)

Defined in: [src/lib/memory/types.ts:273](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#273)

Optional — when provided, recall extracts entities from the query
and adds a graph lane to the RRF fusion (memories sharing entities
with the query rank higher). Build via `entityCollection` +
`memoryEntityCollection` from your DatabaseManager.

***

### factSource?

> `optional` **factSource**: `RecallFactSource`

Defined in: [src/lib/memory/types.ts:252](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#252)

Alternative to a WatermelonDB vault for fact-only recall.

***

### storageCtx?

> `optional` **storageCtx**: [`StorageOperationsContext`](StorageOperationsContext.md)

Defined in: [src/lib/memory/types.ts:256](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#256)

Required when `types` includes 'chunk'.

***

### vaultCache?

> `optional` **vaultCache**: [`VaultEmbeddingCache`](../type-aliases/VaultEmbeddingCache.md)

Defined in: [src/lib/memory/types.ts:260](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#260)

Vault embedding LRU cache.

***

### vaultCtx?

> `optional` **vaultCtx**: [`VaultMemoryOperationsContext`](VaultMemoryOperationsContext.md)

Defined in: [src/lib/memory/types.ts:254](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#254)

Required when `types` includes 'fact'.
