# VaultSearchResult

Defined in: [src/lib/memoryVault/searchTool.ts:1645](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1645)

A single vault search result with its similarity score.

## Properties

### content

> **content**: `string`

Defined in: [src/lib/memoryVault/searchTool.ts:1647](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1647)

***

### createdAt?

> `optional` **createdAt**: `Date`

Defined in: [src/lib/memoryVault/searchTool.ts:1651](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1651)

Optional — surfaced by the rankers so downstream `RankedMemory` carries
real timestamps. Omitted when an item lacks the field upstream.

***

### eventTimeEnd?

> `optional` **eventTimeEnd**: `number` | `null`

Defined in: [src/lib/memoryVault/searchTool.ts:1662](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1662)

***

### eventTimeKind?

> `optional` **eventTimeKind**: `"point"` | `"range"` | `"ongoing"` | `null`

Defined in: [src/lib/memoryVault/searchTool.ts:1663](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1663)

***

### eventTimeStart?

> `optional` **eventTimeStart**: `number` | `null`

Defined in: [src/lib/memoryVault/searchTool.ts:1661](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1661)

W6 temporal-lane anchors carried through to downstream `RankedMemory`
so the recall executor can surface dates to the answer model without
a second per-fact DB lookup + decrypt. Unix ms; null when the fact
has no anchored event time.

***

### factType?

> `optional` **factType**: `string` | `null`

Defined in: [src/lib/memoryVault/searchTool.ts:1667](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1667)

Typed memory (PR1) — the fact's FactType, threaded through from the
storage row alongside the event-time anchors. Null/undefined when
untyped. Loose string (originates from a stored column).

***

### lastObservedAt?

> `optional` **lastObservedAt**: `number` | `null`

Defined in: [src/lib/memoryVault/searchTool.ts:1656](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1656)

C3 re-observation watermark (Unix ms) — for C2 trends + C4 CE dates.

***

### proofCount?

> `optional` **proofCount**: `number` | `null`

Defined in: [src/lib/memoryVault/searchTool.ts:1654](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1654)

Times this fact has been re-observed — for C2 trend labels.

***

### similarity

> **similarity**: `number`

Defined in: [src/lib/memoryVault/searchTool.ts:1648](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1648)

***

### sourceChunkIds?

> `optional` **sourceChunkIds**: `string`\[] | `null`

Defined in: [src/lib/memoryVault/searchTool.ts:1670](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1670)

Message ids this fact was extracted from (provenance). recall() uses
these to suppress the originating chunk in the chunk lane.

***

### uniqueId

> **uniqueId**: `string`

Defined in: [src/lib/memoryVault/searchTool.ts:1646](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1646)

***

### updatedAt?

> `optional` **updatedAt**: `Date`

Defined in: [src/lib/memoryVault/searchTool.ts:1652](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1652)
