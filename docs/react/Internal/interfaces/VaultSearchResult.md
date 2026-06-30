# VaultSearchResult

Defined in: [src/lib/memoryVault/searchTool.ts:1106](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1106)

A single vault search result with its similarity score.

## Properties

### content

> **content**: `string`

Defined in: [src/lib/memoryVault/searchTool.ts:1108](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1108)

***

### createdAt?

> `optional` **createdAt**: `Date`

Defined in: [src/lib/memoryVault/searchTool.ts:1112](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1112)

Optional — surfaced by the rankers so downstream `RankedMemory` carries
real timestamps. Omitted when an item lacks the field upstream.

***

### eventTimeEnd?

> `optional` **eventTimeEnd**: `number` | `null`

Defined in: [src/lib/memoryVault/searchTool.ts:1119](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1119)

***

### eventTimeKind?

> `optional` **eventTimeKind**: `"point"` | `"range"` | `"ongoing"` | `null`

Defined in: [src/lib/memoryVault/searchTool.ts:1120](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1120)

***

### eventTimeStart?

> `optional` **eventTimeStart**: `number` | `null`

Defined in: [src/lib/memoryVault/searchTool.ts:1118](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1118)

W6 temporal-lane anchors carried through to downstream `RankedMemory`
so the recall executor can surface dates to the answer model without
a second per-fact DB lookup + decrypt. Unix ms; null when the fact
has no anchored event time.

***

### similarity

> **similarity**: `number`

Defined in: [src/lib/memoryVault/searchTool.ts:1109](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1109)

***

### uniqueId

> **uniqueId**: `string`

Defined in: [src/lib/memoryVault/searchTool.ts:1107](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1107)

***

### updatedAt?

> `optional` **updatedAt**: `Date`

Defined in: [src/lib/memoryVault/searchTool.ts:1113](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1113)
