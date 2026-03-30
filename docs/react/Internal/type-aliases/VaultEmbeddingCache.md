# VaultEmbeddingCache

> **VaultEmbeddingCache** = `Map`<`string`, `number`\[]>

Defined in: [src/lib/memoryVault/searchTool.ts:25](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#25)

Embedding cache keyed by content string. Stores pre-computed embeddings
so that search only needs to embed the query, not the vault entries.
