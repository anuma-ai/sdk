# RecallContext

Defined in: [src/lib/memory/types.ts:179](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#179)

## Properties

### embeddingOptions

> **embeddingOptions**: [`MemoryEngineEmbeddingOptions`](MemoryEngineEmbeddingOptions.md)

Defined in: [src/lib/memory/types.ts:185](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#185)

Embedding API options.

***

### entityCtx?

> `optional` **entityCtx**: [`EntityOperationsContext`](EntityOperationsContext.md)

Defined in: [src/lib/memory/types.ts:194](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#194)

Optional — when provided, recall extracts entities from the query
and adds a graph lane to the RRF fusion (memories sharing entities
with the query rank higher). Build via `entityCollection` +
`memoryEntityCollection` from your DatabaseManager.

***

### storageCtx?

> `optional` **storageCtx**: [`StorageOperationsContext`](StorageOperationsContext.md)

Defined in: [src/lib/memory/types.ts:183](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#183)

Required when `types` includes 'chunk'.

***

### vaultCache?

> `optional` **vaultCache**: [`VaultEmbeddingCache`](../type-aliases/VaultEmbeddingCache.md)

Defined in: [src/lib/memory/types.ts:187](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#187)

Vault embedding LRU cache.

***

### vaultCtx?

> `optional` **vaultCtx**: [`VaultMemoryOperationsContext`](VaultMemoryOperationsContext.md)

Defined in: [src/lib/memory/types.ts:181](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#181)

Required when `types` includes 'fact'.
