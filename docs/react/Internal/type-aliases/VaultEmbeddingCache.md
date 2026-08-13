# VaultEmbeddingCache

> **VaultEmbeddingCache** = `Map`<`string`, `Float32Array`>

Defined in: [src/lib/memoryVault/searchTool.ts:68](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#68)

Embedding cache keyed by content string. Stores pre-computed embeddings
so that search only needs to embed the query, not the vault entries.
