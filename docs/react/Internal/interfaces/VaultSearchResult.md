# VaultSearchResult

Defined in: [src/lib/memoryVault/searchTool.ts:904](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#904)

A single vault search result with its similarity score.

## Properties

### content

> **content**: `string`

Defined in: [src/lib/memoryVault/searchTool.ts:906](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#906)

***

### createdAt?

> `optional` **createdAt**: `Date`

Defined in: [src/lib/memoryVault/searchTool.ts:910](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#910)

Optional — surfaced by the rankers so downstream `RankedMemory` carries
real timestamps. Omitted when an item lacks the field upstream.

***

### similarity

> **similarity**: `number`

Defined in: [src/lib/memoryVault/searchTool.ts:907](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#907)

***

### uniqueId

> **uniqueId**: `string`

Defined in: [src/lib/memoryVault/searchTool.ts:905](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#905)

***

### updatedAt?

> `optional` **updatedAt**: `Date`

Defined in: [src/lib/memoryVault/searchTool.ts:911](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#911)
