# VaultSearchResult

Defined in: [src/lib/memoryVault/searchTool.ts:1686](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1686)

A single vault search result with its similarity score.

## Properties

### content

> **content**: `string`

Defined in: [src/lib/memoryVault/searchTool.ts:1688](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1688)

***

### createdAt?

> `optional` **createdAt**: `Date`

Defined in: [src/lib/memoryVault/searchTool.ts:1692](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1692)

Optional — surfaced by the rankers so downstream `RankedMemory` carries
real timestamps. Omitted when an item lacks the field upstream.

***

### eventTimeEnd?

> `optional` **eventTimeEnd**: `number` | `null`

Defined in: [src/lib/memoryVault/searchTool.ts:1703](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1703)

***

### eventTimeKind?

> `optional` **eventTimeKind**: `"point"` | `"range"` | `"ongoing"` | `null`

Defined in: [src/lib/memoryVault/searchTool.ts:1704](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1704)

***

### eventTimeStart?

> `optional` **eventTimeStart**: `number` | `null`

Defined in: [src/lib/memoryVault/searchTool.ts:1702](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1702)

W6 temporal-lane anchors carried through to downstream `RankedMemory`
so the recall executor can surface dates to the answer model without
a second per-fact DB lookup + decrypt. Unix ms; null when the fact
has no anchored event time.

***

### factType?

> `optional` **factType**: `string` | `null`

Defined in: [src/lib/memoryVault/searchTool.ts:1708](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1708)

Typed memory (PR1) — the fact's FactType, threaded through from the
storage row alongside the event-time anchors. Null/undefined when
untyped. Loose string (originates from a stored column).

***

### lastObservedAt?

> `optional` **lastObservedAt**: `number` | `null`

Defined in: [src/lib/memoryVault/searchTool.ts:1697](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1697)

C3 re-observation watermark (Unix ms) — for C2 trends + C4 CE dates.

***

### proofCount?

> `optional` **proofCount**: `number` | `null`

Defined in: [src/lib/memoryVault/searchTool.ts:1695](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1695)

Times this fact has been re-observed — for C2 trend labels.

***

### similarity

> **similarity**: `number`

Defined in: [src/lib/memoryVault/searchTool.ts:1689](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1689)

***

### sourceChunkIds?

> `optional` **sourceChunkIds**: `string`\[] | `null`

Defined in: [src/lib/memoryVault/searchTool.ts:1711](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1711)

Message ids this fact was extracted from (provenance). recall() uses
these to suppress the originating chunk in the chunk lane.

***

### uniqueId

> **uniqueId**: `string`

Defined in: [src/lib/memoryVault/searchTool.ts:1687](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1687)

***

### updatedAt?

> `optional` **updatedAt**: `Date`

Defined in: [src/lib/memoryVault/searchTool.ts:1693](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1693)
