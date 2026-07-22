# VaultSearchResult

Defined in: [src/lib/memoryVault/searchTool.ts:1207](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1207)

A single vault search result with its similarity score.

## Properties

### content

> **content**: `string`

Defined in: [src/lib/memoryVault/searchTool.ts:1209](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1209)

***

### createdAt?

> `optional` **createdAt**: `Date`

Defined in: [src/lib/memoryVault/searchTool.ts:1213](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1213)

Optional — surfaced by the rankers so downstream `RankedMemory` carries
real timestamps. Omitted when an item lacks the field upstream.

***

### eventTimeEnd?

> `optional` **eventTimeEnd**: `number` | `null`

Defined in: [src/lib/memoryVault/searchTool.ts:1224](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1224)

***

### eventTimeKind?

> `optional` **eventTimeKind**: `"point"` | `"range"` | `"ongoing"` | `null`

Defined in: [src/lib/memoryVault/searchTool.ts:1225](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1225)

***

### eventTimeStart?

> `optional` **eventTimeStart**: `number` | `null`

Defined in: [src/lib/memoryVault/searchTool.ts:1223](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1223)

W6 temporal-lane anchors carried through to downstream `RankedMemory`
so the recall executor can surface dates to the answer model without
a second per-fact DB lookup + decrypt. Unix ms; null when the fact
has no anchored event time.

***

### lastObservedAt?

> `optional` **lastObservedAt**: `number` | `null`

Defined in: [src/lib/memoryVault/searchTool.ts:1218](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1218)

C3 re-observation watermark (Unix ms) — for C2 trend labels.

***

### proofCount?

> `optional` **proofCount**: `number` | `null`

Defined in: [src/lib/memoryVault/searchTool.ts:1216](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1216)

Times this fact has been re-observed — for C2 trend labels.

***

### similarity

> **similarity**: `number`

Defined in: [src/lib/memoryVault/searchTool.ts:1210](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1210)

***

### sourceChunkIds?

> `optional` **sourceChunkIds**: `string`\[] | `null`

Defined in: [src/lib/memoryVault/searchTool.ts:1228](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1228)

Message ids this fact was extracted from (provenance). recall() uses
these to suppress the originating chunk in the chunk lane.

***

### uniqueId

> **uniqueId**: `string`

Defined in: [src/lib/memoryVault/searchTool.ts:1208](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1208)

***

### updatedAt?

> `optional` **updatedAt**: `Date`

Defined in: [src/lib/memoryVault/searchTool.ts:1214](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1214)
