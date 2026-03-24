# MemoryVaultSearchOptions

Defined in: [src/lib/memoryVault/searchTool.ts:27](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#27)

Options for the vault search tool.

## Properties

### folderId?

> `optional` **folderId**: `string` | `null`

Defined in: [src/lib/memoryVault/searchTool.ts:35](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#35)

When provided, only search memories in this folder (null for unfiled)

***

### hybridWeights?

> `optional` **hybridWeights**: `HybridSearchWeights`

Defined in: [src/lib/memoryVault/searchTool.ts:37](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#37)

Weights for semantic vs keyword ranking. Default: 0.85 semantic, 0.15 keyword.

***

### limit?

> `optional` **limit**: `number`

Defined in: [src/lib/memoryVault/searchTool.ts:29](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#29)

Maximum number of results to return (default: 5)

***

### minSimilarity?

> `optional` **minSimilarity**: `number`

Defined in: [src/lib/memoryVault/searchTool.ts:31](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#31)

Minimum similarity threshold below which results are discarded (default: 0.1)

***

### scopes?

> `optional` **scopes**: `string`\[]

Defined in: [src/lib/memoryVault/searchTool.ts:33](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#33)

When provided, only search memories with these scopes
