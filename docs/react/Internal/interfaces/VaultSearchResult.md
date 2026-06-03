# VaultSearchResult

Defined in: [src/lib/memoryVault/searchTool.ts:940](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#940)

A single vault search result with its similarity score.

## Properties

### content

> **content**: `string`

Defined in: [src/lib/memoryVault/searchTool.ts:942](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#942)

***

### createdAt?

> `optional` **createdAt**: `Date`

Defined in: [src/lib/memoryVault/searchTool.ts:946](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#946)

Optional — surfaced by the rankers so downstream `RankedMemory` carries
real timestamps. Omitted when an item lacks the field upstream.

***

### eventTimeEnd?

> `optional` **eventTimeEnd**: `number` | `null`

Defined in: [src/lib/memoryVault/searchTool.ts:953](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#953)

***

### eventTimeKind?

> `optional` **eventTimeKind**: `"point"` | `"range"` | `"ongoing"` | `null`

Defined in: [src/lib/memoryVault/searchTool.ts:954](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#954)

***

### eventTimeStart?

> `optional` **eventTimeStart**: `number` | `null`

Defined in: [src/lib/memoryVault/searchTool.ts:952](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#952)

W6 temporal-lane anchors carried through to downstream `RankedMemory`
so the recall executor can surface dates to the answer model without
a second per-fact DB lookup + decrypt. Unix ms; null when the fact
has no anchored event time.

***

### similarity

> **similarity**: `number`

Defined in: [src/lib/memoryVault/searchTool.ts:943](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#943)

***

### uniqueId

> **uniqueId**: `string`

Defined in: [src/lib/memoryVault/searchTool.ts:941](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#941)

***

### updatedAt?

> `optional` **updatedAt**: `Date`

Defined in: [src/lib/memoryVault/searchTool.ts:947](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#947)
