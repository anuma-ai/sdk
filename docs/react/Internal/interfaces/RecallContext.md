# RecallContext

Defined in: [src/lib/memory/types.ts:234](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#234)

## Properties

### chunkCache?

> `optional` **chunkCache**: [`ChunkVectorCache`](../type-aliases/ChunkVectorCache.md)

Defined in: [src/lib/memory/types.ts:248](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#248)

Optional chunk-vector LRU cache. When provided, the chunk lane skips the
per-query decrypt + JSON.parse of every message's chunk vectors on warm
entries. Build via `createChunkVectorCache`. Omit for legacy behavior.

***

### embeddingOptions

> **embeddingOptions**: [`MemoryEngineEmbeddingOptions`](MemoryEngineEmbeddingOptions.md)

Defined in: [src/lib/memory/types.ts:240](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#240)

Embedding API options.

***

### entityCtx?

> `optional` **entityCtx**: [`EntityOperationsContext`](EntityOperationsContext.md)

Defined in: [src/lib/memory/types.ts:255](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#255)

Optional — when provided, recall extracts entities from the query
and adds a graph lane to the RRF fusion (memories sharing entities
with the query rank higher). Build via `entityCollection` +
`memoryEntityCollection` from your DatabaseManager.

***

### entityVocabularyCache?

> `optional` **entityVocabularyCache**: [`EntityVocabularyCache`](EntityVocabularyCache.md)

Defined in: [src/lib/memory/types.ts:267](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#267)

Optional entity-vocabulary cache for the W5 graph lane. When provided, the
lane resolves query tokens against the vault's stored entity names instead
of guessing at them, and reuses the built index across every recall in the
session (rebuilding only when the entity table actually moves). Build via
`createEntityVocabularyCache`.

Omit it and the tier still runs — it just rebuilds the index per call. Omit
`entityCtx` and the lane is off entirely. Clear the cache on any identity
switch: entity names are derived from decrypted user content.

***

### storageCtx?

> `optional` **storageCtx**: [`StorageOperationsContext`](StorageOperationsContext.md)

Defined in: [src/lib/memory/types.ts:238](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#238)

Required when `types` includes 'chunk'.

***

### vaultCache?

> `optional` **vaultCache**: [`VaultEmbeddingCache`](../type-aliases/VaultEmbeddingCache.md)

Defined in: [src/lib/memory/types.ts:242](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#242)

Vault embedding LRU cache.

***

### vaultCtx?

> `optional` **vaultCtx**: [`VaultMemoryOperationsContext`](VaultMemoryOperationsContext.md)

Defined in: [src/lib/memory/types.ts:236](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#236)

Required when `types` includes 'fact'.
