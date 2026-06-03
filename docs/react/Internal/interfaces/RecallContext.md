# RecallContext

Defined in: [src/lib/memory/types.ts:122](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#122)

## Properties

### embeddingOptions

> **embeddingOptions**: [`MemoryEngineEmbeddingOptions`](MemoryEngineEmbeddingOptions.md)

Defined in: [src/lib/memory/types.ts:128](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#128)

Embedding API options.

***

### entityCtx?

> `optional` **entityCtx**: [`EntityOperationsContext`](EntityOperationsContext.md)

Defined in: [src/lib/memory/types.ts:137](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#137)

Optional — when provided, recall extracts entities from the query
and adds a graph lane to the RRF fusion (memories sharing entities
with the query rank higher). Build via `entityCollection` +
`memoryEntityCollection` from your DatabaseManager.

***

### storageCtx?

> `optional` **storageCtx**: [`StorageOperationsContext`](StorageOperationsContext.md)

Defined in: [src/lib/memory/types.ts:126](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#126)

Required when `types` includes 'chunk'.

***

### vaultCache?

> `optional` **vaultCache**: [`VaultEmbeddingCache`](../type-aliases/VaultEmbeddingCache.md)

Defined in: [src/lib/memory/types.ts:130](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#130)

Vault embedding LRU cache.

***

### vaultCtx?

> `optional` **vaultCtx**: [`VaultMemoryOperationsContext`](VaultMemoryOperationsContext.md)

Defined in: [src/lib/memory/types.ts:124](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#124)

Required when `types` includes 'fact'.
