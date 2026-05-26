# VaultSearchResult

Defined in: [src/lib/memoryVault/searchTool.ts:900](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#900)

A single vault search result with its similarity score.

## Properties

### content

> **content**: `string`

Defined in: [src/lib/memoryVault/searchTool.ts:902](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#902)

***

### createdAt?

> `optional` **createdAt**: `Date`

Defined in: [src/lib/memoryVault/searchTool.ts:906](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#906)

Optional — surfaced by the rankers so downstream `RankedMemory` carries
real timestamps. Omitted when an item lacks the field upstream.

***

### similarity

> **similarity**: `number`

Defined in: [src/lib/memoryVault/searchTool.ts:903](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#903)

***

### uniqueId

> **uniqueId**: `string`

Defined in: [src/lib/memoryVault/searchTool.ts:901](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#901)

***

### updatedAt?

> `optional` **updatedAt**: `Date`

Defined in: [src/lib/memoryVault/searchTool.ts:907](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#907)
