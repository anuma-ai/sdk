# VaultSearchResult

Defined in: [src/lib/memoryVault/searchTool.ts:1157](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1157)

A single vault search result with its similarity score.

## Properties

### content

> **content**: `string`

Defined in: [src/lib/memoryVault/searchTool.ts:1159](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1159)

***

### createdAt?

> `optional` **createdAt**: `Date`

Defined in: [src/lib/memoryVault/searchTool.ts:1163](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1163)

Optional — surfaced by the rankers so downstream `RankedMemory` carries
real timestamps. Omitted when an item lacks the field upstream.

***

### eventTimeEnd?

> `optional` **eventTimeEnd**: `number` | `null`

Defined in: [src/lib/memoryVault/searchTool.ts:1170](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1170)

***

### eventTimeKind?

> `optional` **eventTimeKind**: `"point"` | `"range"` | `"ongoing"` | `null`

Defined in: [src/lib/memoryVault/searchTool.ts:1171](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1171)

***

### eventTimeStart?

> `optional` **eventTimeStart**: `number` | `null`

Defined in: [src/lib/memoryVault/searchTool.ts:1169](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1169)

W6 temporal-lane anchors carried through to downstream `RankedMemory`
so the recall executor can surface dates to the answer model without
a second per-fact DB lookup + decrypt. Unix ms; null when the fact
has no anchored event time.

***

### factType?

> `optional` **factType**: `string` | `null`

Defined in: [src/lib/memoryVault/searchTool.ts:1175](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1175)

Typed memory (PR1) — the fact's FactType, threaded through from the
storage row alongside the event-time anchors. Null/undefined when
untyped. Loose string (originates from a stored column).

***

### similarity

> **similarity**: `number`

Defined in: [src/lib/memoryVault/searchTool.ts:1160](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1160)

***

### sourceChunkIds?

> `optional` **sourceChunkIds**: `string`\[] | `null`

Defined in: [src/lib/memoryVault/searchTool.ts:1178](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1178)

Message ids this fact was extracted from (provenance). recall() uses
these to suppress the originating chunk in the chunk lane.

***

### uniqueId

> **uniqueId**: `string`

Defined in: [src/lib/memoryVault/searchTool.ts:1158](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1158)

***

### updatedAt?

> `optional` **updatedAt**: `Date`

Defined in: [src/lib/memoryVault/searchTool.ts:1164](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1164)
