# RecallContext

Defined in: [src/lib/memory/types.ts:269](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#269)

## Properties

### chats?

> `optional` **chats**: `Pick`<[`ChatBackend`](ChatBackend.md), `"searchChunks"`>

Defined in: [src/lib/memory/types.ts:277](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#277)

Chat chunk search; takes precedence over `storageCtx`.

***

### chunkCache?

> `optional` **chunkCache**: [`ChunkVectorCache`](../type-aliases/ChunkVectorCache.md)

Defined in: [src/lib/memory/types.ts:287](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#287)

Optional chunk-vector LRU cache. When provided, the chunk lane skips the
per-query decrypt + JSON.parse of every message's chunk vectors on warm
entries. Build via `createChunkVectorCache`. Omit for legacy behavior.

***

### embeddingOptions

> **embeddingOptions**: [`MemoryEngineEmbeddingOptions`](MemoryEngineEmbeddingOptions.md)

Defined in: [src/lib/memory/types.ts:279](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#279)

Embedding API options.

***

### entityCtx?

> `optional` **entityCtx**: [`EntityOperationsContext`](EntityOperationsContext.md)

Defined in: [src/lib/memory/types.ts:294](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#294)

Optional — when provided, recall extracts entities from the query
and adds a graph lane to the RRF fusion (memories sharing entities
with the query rank higher). Build via `entityCollection` +
`memoryEntityCollection` from your DatabaseManager.

***

### factSource?

> `optional` **factSource**: `RecallFactSource`

Defined in: [src/lib/memory/types.ts:271](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#271)

Alternative to a WatermelonDB vault for fact-only recall.

***

### storageCtx?

> `optional` **storageCtx**: [`StorageOperationsContext`](StorageOperationsContext.md)

Defined in: [src/lib/memory/types.ts:275](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#275)

Required when `types` includes 'chunk', unless `chats` is given.

***

### vaultCache?

> `optional` **vaultCache**: [`VaultEmbeddingCache`](../type-aliases/VaultEmbeddingCache.md)

Defined in: [src/lib/memory/types.ts:281](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#281)

Vault embedding LRU cache.

***

### vaultCtx?

> `optional` **vaultCtx**: [`VaultMemoryOperationsContext`](VaultMemoryOperationsContext.md)

Defined in: [src/lib/memory/types.ts:273](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#273)

Required when `types` includes 'fact'.
