# RecallContext

Defined in: [src/lib/memory/types.ts:96](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#96)

## Properties

### embeddingOptions

> **embeddingOptions**: [`MemoryEngineEmbeddingOptions`](MemoryEngineEmbeddingOptions.md)

Defined in: [src/lib/memory/types.ts:102](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#102)

Embedding API options.

***

### storageCtx?

> `optional` **storageCtx**: [`StorageOperationsContext`](StorageOperationsContext.md)

Defined in: [src/lib/memory/types.ts:100](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#100)

Required when `types` includes 'chunk'.

***

### vaultCache?

> `optional` **vaultCache**: [`VaultEmbeddingCache`](../type-aliases/VaultEmbeddingCache.md)

Defined in: [src/lib/memory/types.ts:104](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#104)

Vault embedding LRU cache.

***

### vaultCtx?

> `optional` **vaultCtx**: [`VaultMemoryOperationsContext`](VaultMemoryOperationsContext.md)

Defined in: [src/lib/memory/types.ts:98](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#98)

Required when `types` includes 'fact'.
