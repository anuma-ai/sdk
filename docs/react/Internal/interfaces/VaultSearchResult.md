# VaultSearchResult

Defined in: [src/lib/memoryVault/searchTool.ts:1901](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1901)

A single vault search result with its similarity score.

## Properties

### content

> **content**: `string`

Defined in: [src/lib/memoryVault/searchTool.ts:1903](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1903)

***

### createdAt?

> `optional` **createdAt**: `Date`

Defined in: [src/lib/memoryVault/searchTool.ts:1907](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1907)

Optional — surfaced by the rankers so downstream `RankedMemory` carries
real timestamps. Omitted when an item lacks the field upstream.

***

### eventTimeEnd?

> `optional` **eventTimeEnd**: `number` | `null`

Defined in: [src/lib/memoryVault/searchTool.ts:1918](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1918)

***

### eventTimeKind?

> `optional` **eventTimeKind**: `"point"` | `"range"` | `"ongoing"` | `null`

Defined in: [src/lib/memoryVault/searchTool.ts:1919](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1919)

***

### eventTimeStart?

> `optional` **eventTimeStart**: `number` | `null`

Defined in: [src/lib/memoryVault/searchTool.ts:1917](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1917)

W6 temporal-lane anchors carried through to downstream `RankedMemory`
so the recall executor can surface dates to the answer model without
a second per-fact DB lookup + decrypt. Unix ms; null when the fact
has no anchored event time.

***

### factType?

> `optional` **factType**: `string` | `null`

Defined in: [src/lib/memoryVault/searchTool.ts:1923](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1923)

Typed memory (PR1) — the fact's FactType, threaded through from the
storage row alongside the event-time anchors. Null/undefined when
untyped. Loose string (originates from a stored column).

***

### lastObservedAt?

> `optional` **lastObservedAt**: `number` | `null`

Defined in: [src/lib/memoryVault/searchTool.ts:1912](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1912)

C3 re-observation watermark (Unix ms) — for C2 trends + C4 CE dates.

***

### proofCount?

> `optional` **proofCount**: `number` | `null`

Defined in: [src/lib/memoryVault/searchTool.ts:1910](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1910)

Times this fact has been re-observed — for C2 trend labels.

***

### similarity

> **similarity**: `number`

Defined in: [src/lib/memoryVault/searchTool.ts:1904](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1904)

***

### sourceChunkIds?

> `optional` **sourceChunkIds**: `string`\[] | `null`

Defined in: [src/lib/memoryVault/searchTool.ts:1926](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1926)

Message ids this fact was extracted from (provenance). recall() uses
these to suppress the originating chunk in the chunk lane.

***

### uniqueId

> **uniqueId**: `string`

Defined in: [src/lib/memoryVault/searchTool.ts:1902](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1902)

***

### updatedAt?

> `optional` **updatedAt**: `Date`

Defined in: [src/lib/memoryVault/searchTool.ts:1908](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1908)
