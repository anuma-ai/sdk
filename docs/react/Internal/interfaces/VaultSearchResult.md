# VaultSearchResult

Defined in: [src/lib/memoryVault/searchTool.ts:889](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#889)

A single vault search result with its similarity score.

## Properties

### content

> **content**: `string`

Defined in: [src/lib/memoryVault/searchTool.ts:891](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#891)

***

### createdAt?

> `optional` **createdAt**: `Date`

Defined in: [src/lib/memoryVault/searchTool.ts:895](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#895)

Optional — surfaced by the rankers so downstream `RankedMemory` carries
real timestamps. Omitted when an item lacks the field upstream.

***

### similarity

> **similarity**: `number`

Defined in: [src/lib/memoryVault/searchTool.ts:892](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#892)

***

### uniqueId

> **uniqueId**: `string`

Defined in: [src/lib/memoryVault/searchTool.ts:890](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#890)

***

### updatedAt?

> `optional` **updatedAt**: `Date`

Defined in: [src/lib/memoryVault/searchTool.ts:896](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#896)
