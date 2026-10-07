# RecallContext

Defined in: [src/lib/memory/types.ts:272](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#272)

## Properties

### chunkCache?

> `optional` **chunkCache**: [`ChunkVectorCache`](../type-aliases/ChunkVectorCache.md)

Defined in: [src/lib/memory/types.ts:288](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#288)

Optional chunk-vector LRU cache. When provided, the chunk lane skips the
per-query decrypt + JSON.parse of every message's chunk vectors on warm
entries. Build via `createChunkVectorCache`. Omit for legacy behavior.

***

### embeddingOptions

> **embeddingOptions**: [`MemoryEngineEmbeddingOptions`](MemoryEngineEmbeddingOptions.md)

Defined in: [src/lib/memory/types.ts:280](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#280)

Embedding API options.

***

### entityCtx?

> `optional` **entityCtx**: [`EntityOperationsContext`](EntityOperationsContext.md)

Defined in: [src/lib/memory/types.ts:295](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#295)

Optional — when provided, recall extracts entities from the query
and adds a graph lane to the RRF fusion (memories sharing entities
with the query rank higher). Build via `entityCollection` +
`memoryEntityCollection` from your DatabaseManager.

***

### factSource?

> `optional` **factSource**: `RecallFactSource`

Defined in: [src/lib/memory/types.ts:274](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#274)

Alternative to a WatermelonDB vault for fact-only recall.

***

### storageCtx?

> `optional` **storageCtx**: [`StorageOperationsContext`](StorageOperationsContext.md)

Defined in: [src/lib/memory/types.ts:278](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#278)

Required when `types` includes 'chunk'.

***

### vaultCache?

> `optional` **vaultCache**: [`VaultEmbeddingCache`](../type-aliases/VaultEmbeddingCache.md)

Defined in: [src/lib/memory/types.ts:282](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#282)

Vault embedding LRU cache.

***

### vaultCtx?

> `optional` **vaultCtx**: [`VaultMemoryOperationsContext`](VaultMemoryOperationsContext.md)

Defined in: [src/lib/memory/types.ts:276](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#276)

Required when `types` includes 'fact'.
