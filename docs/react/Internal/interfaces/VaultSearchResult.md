# VaultSearchResult

Defined in: [src/lib/memoryVault/searchTool.ts:884](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#884)

A single vault search result with its similarity score.

## Properties

### content

> **content**: `string`

Defined in: [src/lib/memoryVault/searchTool.ts:886](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#886)

***

### createdAt?

> `optional` **createdAt**: `Date`

Defined in: [src/lib/memoryVault/searchTool.ts:890](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#890)

Optional — surfaced by the rankers so downstream `RankedMemory` carries
real timestamps. Omitted when an item lacks the field upstream.

***

### similarity

> **similarity**: `number`

Defined in: [src/lib/memoryVault/searchTool.ts:887](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#887)

***

### uniqueId

> **uniqueId**: `string`

Defined in: [src/lib/memoryVault/searchTool.ts:885](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#885)

***

### updatedAt?

> `optional` **updatedAt**: `Date`

Defined in: [src/lib/memoryVault/searchTool.ts:891](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#891)
