# RecallContext

Defined in: [src/lib/memory/types.ts:153](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#153)

## Properties

### embeddingOptions

> **embeddingOptions**: [`MemoryEngineEmbeddingOptions`](MemoryEngineEmbeddingOptions.md)

Defined in: [src/lib/memory/types.ts:159](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#159)

Embedding API options.

***

### entityCtx?

> `optional` **entityCtx**: [`EntityOperationsContext`](EntityOperationsContext.md)

Defined in: [src/lib/memory/types.ts:168](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#168)

Optional — when provided, recall extracts entities from the query
and adds a graph lane to the RRF fusion (memories sharing entities
with the query rank higher). Build via `entityCollection` +
`memoryEntityCollection` from your DatabaseManager.

***

### storageCtx?

> `optional` **storageCtx**: [`StorageOperationsContext`](StorageOperationsContext.md)

Defined in: [src/lib/memory/types.ts:157](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#157)

Required when `types` includes 'chunk'.

***

### vaultCache?

> `optional` **vaultCache**: [`VaultEmbeddingCache`](../type-aliases/VaultEmbeddingCache.md)

Defined in: [src/lib/memory/types.ts:161](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#161)

Vault embedding LRU cache.

***

### vaultCtx?

> `optional` **vaultCtx**: [`VaultMemoryOperationsContext`](VaultMemoryOperationsContext.md)

Defined in: [src/lib/memory/types.ts:155](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#155)

Required when `types` includes 'fact'.
