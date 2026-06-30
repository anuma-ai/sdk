# VaultSearchResult

Defined in: [src/lib/memoryVault/searchTool.ts:1108](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1108)

A single vault search result with its similarity score.

## Properties

### content

> **content**: `string`

Defined in: [src/lib/memoryVault/searchTool.ts:1110](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1110)

***

### createdAt?

> `optional` **createdAt**: `Date`

Defined in: [src/lib/memoryVault/searchTool.ts:1114](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1114)

Optional — surfaced by the rankers so downstream `RankedMemory` carries
real timestamps. Omitted when an item lacks the field upstream.

***

### eventTimeEnd?

> `optional` **eventTimeEnd**: `number` | `null`

Defined in: [src/lib/memoryVault/searchTool.ts:1121](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1121)

***

### eventTimeKind?

> `optional` **eventTimeKind**: `"point"` | `"range"` | `"ongoing"` | `null`

Defined in: [src/lib/memoryVault/searchTool.ts:1122](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1122)

***

### eventTimeStart?

> `optional` **eventTimeStart**: `number` | `null`

Defined in: [src/lib/memoryVault/searchTool.ts:1120](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1120)

W6 temporal-lane anchors carried through to downstream `RankedMemory`
so the recall executor can surface dates to the answer model without
a second per-fact DB lookup + decrypt. Unix ms; null when the fact
has no anchored event time.

***

### similarity

> **similarity**: `number`

Defined in: [src/lib/memoryVault/searchTool.ts:1111](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1111)

***

### uniqueId

> **uniqueId**: `string`

Defined in: [src/lib/memoryVault/searchTool.ts:1109](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1109)

***

### updatedAt?

> `optional` **updatedAt**: `Date`

Defined in: [src/lib/memoryVault/searchTool.ts:1115](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1115)
