# VaultEmbeddingCache

> **VaultEmbeddingCache** = `Map`<`string`, `number`\[]>

Defined in: [src/lib/memoryVault/searchTool.ts:18](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/memoryVault/searchTool.ts#L18)

Embedding cache keyed by content hash. Stores pre-computed embeddings
so that search only needs to embed the query, not the vault entries.
