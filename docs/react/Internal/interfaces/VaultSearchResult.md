# VaultSearchResult

Defined in: [src/lib/memoryVault/searchTool.ts:1034](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1034)

A single vault search result with its similarity score.

## Properties

### content

> **content**: `string`

Defined in: [src/lib/memoryVault/searchTool.ts:1036](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1036)

***

### createdAt?

> `optional` **createdAt**: `Date`

Defined in: [src/lib/memoryVault/searchTool.ts:1040](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1040)

Optional — surfaced by the rankers so downstream `RankedMemory` carries
real timestamps. Omitted when an item lacks the field upstream.

***

### eventTimeEnd?

> `optional` **eventTimeEnd**: `number` | `null`

Defined in: [src/lib/memoryVault/searchTool.ts:1047](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1047)

***

### eventTimeKind?

> `optional` **eventTimeKind**: `"point"` | `"range"` | `"ongoing"` | `null`

Defined in: [src/lib/memoryVault/searchTool.ts:1048](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1048)

***

### eventTimeStart?

> `optional` **eventTimeStart**: `number` | `null`

Defined in: [src/lib/memoryVault/searchTool.ts:1046](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1046)

W6 temporal-lane anchors carried through to downstream `RankedMemory`
so the recall executor can surface dates to the answer model without
a second per-fact DB lookup + decrypt. Unix ms; null when the fact
has no anchored event time.

***

### similarity

> **similarity**: `number`

Defined in: [src/lib/memoryVault/searchTool.ts:1037](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1037)

***

### uniqueId

> **uniqueId**: `string`

Defined in: [src/lib/memoryVault/searchTool.ts:1035](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1035)

***

### updatedAt?

> `optional` **updatedAt**: `Date`

Defined in: [src/lib/memoryVault/searchTool.ts:1041](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1041)
