# RecallContext

Defined in: [src/lib/memory/types.ts:97](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#97)

## Properties

### embeddingOptions

> **embeddingOptions**: [`MemoryEngineEmbeddingOptions`](MemoryEngineEmbeddingOptions.md)

Defined in: [src/lib/memory/types.ts:103](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#103)

Embedding API options.

***

### entityCtx?

> `optional` **entityCtx**: [`EntityOperationsContext`](EntityOperationsContext.md)

Defined in: [src/lib/memory/types.ts:112](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#112)

Optional — when provided, recall extracts entities from the query
and adds a graph lane to the RRF fusion (memories sharing entities
with the query rank higher). Build via `entityCollection` +
`memoryEntityCollection` from your DatabaseManager.

***

### storageCtx?

> `optional` **storageCtx**: [`StorageOperationsContext`](StorageOperationsContext.md)

Defined in: [src/lib/memory/types.ts:101](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#101)

Required when `types` includes 'chunk'.

***

### vaultCache?

> `optional` **vaultCache**: [`VaultEmbeddingCache`](../type-aliases/VaultEmbeddingCache.md)

Defined in: [src/lib/memory/types.ts:105](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#105)

Vault embedding LRU cache.

***

### vaultCtx?

> `optional` **vaultCtx**: [`VaultMemoryOperationsContext`](VaultMemoryOperationsContext.md)

Defined in: [src/lib/memory/types.ts:99](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#99)

Required when `types` includes 'fact'.
