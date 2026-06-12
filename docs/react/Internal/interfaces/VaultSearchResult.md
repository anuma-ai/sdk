# VaultSearchResult

Defined in: [src/lib/memoryVault/searchTool.ts:1086](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1086)

A single vault search result with its similarity score.

## Properties

### content

> **content**: `string`

Defined in: [src/lib/memoryVault/searchTool.ts:1088](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1088)

***

### createdAt?

> `optional` **createdAt**: `Date`

Defined in: [src/lib/memoryVault/searchTool.ts:1092](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1092)

Optional — surfaced by the rankers so downstream `RankedMemory` carries
real timestamps. Omitted when an item lacks the field upstream.

***

### eventTimeEnd?

> `optional` **eventTimeEnd**: `number` | `null`

Defined in: [src/lib/memoryVault/searchTool.ts:1099](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1099)

***

### eventTimeKind?

> `optional` **eventTimeKind**: `"point"` | `"range"` | `"ongoing"` | `null`

Defined in: [src/lib/memoryVault/searchTool.ts:1100](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1100)

***

### eventTimeStart?

> `optional` **eventTimeStart**: `number` | `null`

Defined in: [src/lib/memoryVault/searchTool.ts:1098](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1098)

W6 temporal-lane anchors carried through to downstream `RankedMemory`
so the recall executor can surface dates to the answer model without
a second per-fact DB lookup + decrypt. Unix ms; null when the fact
has no anchored event time.

***

### similarity

> **similarity**: `number`

Defined in: [src/lib/memoryVault/searchTool.ts:1089](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1089)

***

### uniqueId

> **uniqueId**: `string`

Defined in: [src/lib/memoryVault/searchTool.ts:1087](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1087)

***

### updatedAt?

> `optional` **updatedAt**: `Date`

Defined in: [src/lib/memoryVault/searchTool.ts:1093](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1093)
