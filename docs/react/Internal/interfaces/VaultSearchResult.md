# VaultSearchResult

Defined in: [src/lib/memoryVault/searchTool.ts:1291](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1291)

A single vault search result with its similarity score.

## Properties

### content

> **content**: `string`

Defined in: [src/lib/memoryVault/searchTool.ts:1293](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1293)

***

### createdAt?

> `optional` **createdAt**: `Date`

Defined in: [src/lib/memoryVault/searchTool.ts:1297](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1297)

Optional — surfaced by the rankers so downstream `RankedMemory` carries
real timestamps. Omitted when an item lacks the field upstream.

***

### eventTimeEnd?

> `optional` **eventTimeEnd**: `number` | `null`

Defined in: [src/lib/memoryVault/searchTool.ts:1308](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1308)

***

### eventTimeKind?

> `optional` **eventTimeKind**: `"point"` | `"range"` | `"ongoing"` | `null`

Defined in: [src/lib/memoryVault/searchTool.ts:1309](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1309)

***

### eventTimeStart?

> `optional` **eventTimeStart**: `number` | `null`

Defined in: [src/lib/memoryVault/searchTool.ts:1307](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1307)

W6 temporal-lane anchors carried through to downstream `RankedMemory`
so the recall executor can surface dates to the answer model without
a second per-fact DB lookup + decrypt. Unix ms; null when the fact
has no anchored event time.

***

### factType?

> `optional` **factType**: `string` | `null`

Defined in: [src/lib/memoryVault/searchTool.ts:1313](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1313)

Typed memory (PR1) — the fact's FactType, threaded through from the
storage row alongside the event-time anchors. Null/undefined when
untyped. Loose string (originates from a stored column).

***

### lastObservedAt?

> `optional` **lastObservedAt**: `number` | `null`

Defined in: [src/lib/memoryVault/searchTool.ts:1302](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1302)

C3 re-observation watermark (Unix ms) — for C2 trends + C4 CE dates.

***

### proofCount?

> `optional` **proofCount**: `number` | `null`

Defined in: [src/lib/memoryVault/searchTool.ts:1300](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1300)

Times this fact has been re-observed — for C2 trend labels.

***

### similarity

> **similarity**: `number`

Defined in: [src/lib/memoryVault/searchTool.ts:1294](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1294)

***

### sourceChunkIds?

> `optional` **sourceChunkIds**: `string`\[] | `null`

Defined in: [src/lib/memoryVault/searchTool.ts:1316](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1316)

Message ids this fact was extracted from (provenance). recall() uses
these to suppress the originating chunk in the chunk lane.

***

### uniqueId

> **uniqueId**: `string`

Defined in: [src/lib/memoryVault/searchTool.ts:1292](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1292)

***

### updatedAt?

> `optional` **updatedAt**: `Date`

Defined in: [src/lib/memoryVault/searchTool.ts:1298](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1298)
