# VaultSearchResult

Defined in: [src/lib/memoryVault/searchTool.ts:1081](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1081)

A single vault search result with its similarity score.

## Properties

### content

> **content**: `string`

Defined in: [src/lib/memoryVault/searchTool.ts:1083](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1083)

***

### createdAt?

> `optional` **createdAt**: `Date`

Defined in: [src/lib/memoryVault/searchTool.ts:1087](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1087)

Optional — surfaced by the rankers so downstream `RankedMemory` carries
real timestamps. Omitted when an item lacks the field upstream.

***

### eventTimeEnd?

> `optional` **eventTimeEnd**: `number` | `null`

Defined in: [src/lib/memoryVault/searchTool.ts:1094](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1094)

***

### eventTimeKind?

> `optional` **eventTimeKind**: `"point"` | `"range"` | `"ongoing"` | `null`

Defined in: [src/lib/memoryVault/searchTool.ts:1095](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1095)

***

### eventTimeStart?

> `optional` **eventTimeStart**: `number` | `null`

Defined in: [src/lib/memoryVault/searchTool.ts:1093](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1093)

W6 temporal-lane anchors carried through to downstream `RankedMemory`
so the recall executor can surface dates to the answer model without
a second per-fact DB lookup + decrypt. Unix ms; null when the fact
has no anchored event time.

***

### similarity

> **similarity**: `number`

Defined in: [src/lib/memoryVault/searchTool.ts:1084](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1084)

***

### uniqueId

> **uniqueId**: `string`

Defined in: [src/lib/memoryVault/searchTool.ts:1082](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1082)

***

### updatedAt?

> `optional` **updatedAt**: `Date`

Defined in: [src/lib/memoryVault/searchTool.ts:1088](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1088)
