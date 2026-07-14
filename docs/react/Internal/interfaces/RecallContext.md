# RecallContext

Defined in: [src/lib/memory/types.ts:195](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#195)

## Properties

### embeddingOptions

> **embeddingOptions**: [`MemoryEngineEmbeddingOptions`](MemoryEngineEmbeddingOptions.md)

Defined in: [src/lib/memory/types.ts:201](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#201)

Embedding API options.

***

### entityCtx?

> `optional` **entityCtx**: [`EntityOperationsContext`](EntityOperationsContext.md)

Defined in: [src/lib/memory/types.ts:210](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#210)

Optional — when provided, recall extracts entities from the query
and adds a graph lane to the RRF fusion (memories sharing entities
with the query rank higher). Build via `entityCollection` +
`memoryEntityCollection` from your DatabaseManager.

***

### storageCtx?

> `optional` **storageCtx**: [`StorageOperationsContext`](StorageOperationsContext.md)

Defined in: [src/lib/memory/types.ts:199](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#199)

Required when `types` includes 'chunk'.

***

### vaultCache?

> `optional` **vaultCache**: [`VaultEmbeddingCache`](../type-aliases/VaultEmbeddingCache.md)

Defined in: [src/lib/memory/types.ts:203](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#203)

Vault embedding LRU cache.

***

### vaultCtx?

> `optional` **vaultCtx**: [`VaultMemoryOperationsContext`](VaultMemoryOperationsContext.md)

Defined in: [src/lib/memory/types.ts:197](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#197)

Required when `types` includes 'fact'.
