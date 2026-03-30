# MemoryVaultSearchOptions

Defined in: [src/lib/memoryVault/searchTool.ts:30](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#30)

Options for the vault search tool.

## Properties

### folderId?

> `optional` **folderId**: `string` | `null`

Defined in: [src/lib/memoryVault/searchTool.ts:38](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#38)

When provided, only search memories in this folder (null for unfiled)

***

### limit?

> `optional` **limit**: `number`

Defined in: [src/lib/memoryVault/searchTool.ts:32](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#32)

Maximum number of results to return (default: 5)

***

### minSimilarity?

> `optional` **minSimilarity**: `number`

Defined in: [src/lib/memoryVault/searchTool.ts:34](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#34)

Minimum similarity threshold below which results are discarded (default: 0.1)

***

### scopes?

> `optional` **scopes**: `string`\[]

Defined in: [src/lib/memoryVault/searchTool.ts:36](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#36)

When provided, only search memories with these scopes
