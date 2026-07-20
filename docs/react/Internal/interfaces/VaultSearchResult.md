# VaultSearchResult

Defined in: [src/lib/memoryVault/searchTool.ts:1181](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1181)

A single vault search result with its similarity score.

## Properties

### content

> **content**: `string`

Defined in: [src/lib/memoryVault/searchTool.ts:1183](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1183)

***

### createdAt?

> `optional` **createdAt**: `Date`

Defined in: [src/lib/memoryVault/searchTool.ts:1187](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1187)

Optional — surfaced by the rankers so downstream `RankedMemory` carries
real timestamps. Omitted when an item lacks the field upstream.

***

### eventTimeEnd?

> `optional` **eventTimeEnd**: `number` | `null`

Defined in: [src/lib/memoryVault/searchTool.ts:1194](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1194)

***

### eventTimeKind?

> `optional` **eventTimeKind**: `"point"` | `"range"` | `"ongoing"` | `null`

Defined in: [src/lib/memoryVault/searchTool.ts:1195](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1195)

***

### eventTimeStart?

> `optional` **eventTimeStart**: `number` | `null`

Defined in: [src/lib/memoryVault/searchTool.ts:1193](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1193)

W6 temporal-lane anchors carried through to downstream `RankedMemory`
so the recall executor can surface dates to the answer model without
a second per-fact DB lookup + decrypt. Unix ms; null when the fact
has no anchored event time.

***

### similarity

> **similarity**: `number`

Defined in: [src/lib/memoryVault/searchTool.ts:1184](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1184)

***

### sourceChunkIds?

> `optional` **sourceChunkIds**: `string`\[] | `null`

Defined in: [src/lib/memoryVault/searchTool.ts:1198](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1198)

Message ids this fact was extracted from (provenance). recall() uses
these to suppress the originating chunk in the chunk lane.

***

### uniqueId

> **uniqueId**: `string`

Defined in: [src/lib/memoryVault/searchTool.ts:1182](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1182)

***

### updatedAt?

> `optional` **updatedAt**: `Date`

Defined in: [src/lib/memoryVault/searchTool.ts:1188](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1188)
