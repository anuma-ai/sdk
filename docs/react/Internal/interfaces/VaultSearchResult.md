# VaultSearchResult

Defined in: [src/lib/memoryVault/searchTool.ts:1205](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1205)

A single vault search result with its similarity score.

## Properties

### content

> **content**: `string`

Defined in: [src/lib/memoryVault/searchTool.ts:1207](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1207)

***

### createdAt?

> `optional` **createdAt**: `Date`

Defined in: [src/lib/memoryVault/searchTool.ts:1211](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1211)

Optional — surfaced by the rankers so downstream `RankedMemory` carries
real timestamps. Omitted when an item lacks the field upstream.

***

### eventTimeEnd?

> `optional` **eventTimeEnd**: `number` | `null`

Defined in: [src/lib/memoryVault/searchTool.ts:1218](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1218)

***

### eventTimeKind?

> `optional` **eventTimeKind**: `"point"` | `"range"` | `"ongoing"` | `null`

Defined in: [src/lib/memoryVault/searchTool.ts:1219](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1219)

***

### eventTimeStart?

> `optional` **eventTimeStart**: `number` | `null`

Defined in: [src/lib/memoryVault/searchTool.ts:1217](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1217)

W6 temporal-lane anchors carried through to downstream `RankedMemory`
so the recall executor can surface dates to the answer model without
a second per-fact DB lookup + decrypt. Unix ms; null when the fact
has no anchored event time.

***

### similarity

> **similarity**: `number`

Defined in: [src/lib/memoryVault/searchTool.ts:1208](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1208)

***

### sourceChunkIds?

> `optional` **sourceChunkIds**: `string`\[] | `null`

Defined in: [src/lib/memoryVault/searchTool.ts:1222](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1222)

Message ids this fact was extracted from (provenance). recall() uses
these to suppress the originating chunk in the chunk lane.

***

### uniqueId

> **uniqueId**: `string`

Defined in: [src/lib/memoryVault/searchTool.ts:1206](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1206)

***

### updatedAt?

> `optional` **updatedAt**: `Date`

Defined in: [src/lib/memoryVault/searchTool.ts:1212](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1212)
