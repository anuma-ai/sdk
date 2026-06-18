# RecallContext

Defined in: [src/lib/memory/types.ts:154](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#154)

## Properties

### embeddingOptions

> **embeddingOptions**: [`MemoryEngineEmbeddingOptions`](MemoryEngineEmbeddingOptions.md)

Defined in: [src/lib/memory/types.ts:160](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#160)

Embedding API options.

***

### entityCtx?

> `optional` **entityCtx**: [`EntityOperationsContext`](EntityOperationsContext.md)

Defined in: [src/lib/memory/types.ts:169](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#169)

Optional — when provided, recall extracts entities from the query
and adds a graph lane to the RRF fusion (memories sharing entities
with the query rank higher). Build via `entityCollection` +
`memoryEntityCollection` from your DatabaseManager.

***

### storageCtx?

> `optional` **storageCtx**: [`StorageOperationsContext`](StorageOperationsContext.md)

Defined in: [src/lib/memory/types.ts:158](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#158)

Required when `types` includes 'chunk'.

***

### vaultCache?

> `optional` **vaultCache**: [`VaultEmbeddingCache`](../type-aliases/VaultEmbeddingCache.md)

Defined in: [src/lib/memory/types.ts:162](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#162)

Vault embedding LRU cache.

***

### vaultCtx?

> `optional` **vaultCtx**: [`VaultMemoryOperationsContext`](VaultMemoryOperationsContext.md)

Defined in: [src/lib/memory/types.ts:156](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#156)

Required when `types` includes 'fact'.
