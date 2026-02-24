# MemoryVaultSearchOptions

Defined in: [src/lib/memoryVault/searchTool.ts:25](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#L25)

Options for the vault search tool.

## Properties

### limit?

> `optional` **limit**: `number`

Defined in: [src/lib/memoryVault/searchTool.ts:27](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#L27)

Maximum number of results to return (default: 5)

***

### minSimilarity?

> `optional` **minSimilarity**: `number`

Defined in: [src/lib/memoryVault/searchTool.ts:29](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#L29)

Minimum similarity threshold below which results are discarded (default: 0.1)

***

### scopes?

> `optional` **scopes**: `string`\[]

Defined in: [src/lib/memoryVault/searchTool.ts:31](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#L31)

When provided, only search memories with these scopes
