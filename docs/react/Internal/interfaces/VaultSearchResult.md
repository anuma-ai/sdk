# VaultSearchResult

Defined in: [src/lib/memoryVault/searchTool.ts:1256](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1256)

A single vault search result with its similarity score.

## Properties

### content

> **content**: `string`

Defined in: [src/lib/memoryVault/searchTool.ts:1258](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1258)

***

### createdAt?

> `optional` **createdAt**: `Date`

Defined in: [src/lib/memoryVault/searchTool.ts:1262](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1262)

Optional — surfaced by the rankers so downstream `RankedMemory` carries
real timestamps. Omitted when an item lacks the field upstream.

***

### eventTimeEnd?

> `optional` **eventTimeEnd**: `number` | `null`

Defined in: [src/lib/memoryVault/searchTool.ts:1273](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1273)

***

### eventTimeKind?

> `optional` **eventTimeKind**: `"point"` | `"range"` | `"ongoing"` | `null`

Defined in: [src/lib/memoryVault/searchTool.ts:1274](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1274)

***

### eventTimeStart?

> `optional` **eventTimeStart**: `number` | `null`

Defined in: [src/lib/memoryVault/searchTool.ts:1272](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1272)

W6 temporal-lane anchors carried through to downstream `RankedMemory`
so the recall executor can surface dates to the answer model without
a second per-fact DB lookup + decrypt. Unix ms; null when the fact
has no anchored event time.

***

### factType?

> `optional` **factType**: `string` | `null`

Defined in: [src/lib/memoryVault/searchTool.ts:1278](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1278)

Typed memory (PR1) — the fact's FactType, threaded through from the
storage row alongside the event-time anchors. Null/undefined when
untyped. Loose string (originates from a stored column).

***

### lastObservedAt?

> `optional` **lastObservedAt**: `number` | `null`

Defined in: [src/lib/memoryVault/searchTool.ts:1267](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1267)

C3 re-observation watermark (Unix ms) — for C2 trend labels.

***

### proofCount?

> `optional` **proofCount**: `number` | `null`

Defined in: [src/lib/memoryVault/searchTool.ts:1265](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1265)

Times this fact has been re-observed — for C2 trend labels.

***

### similarity

> **similarity**: `number`

Defined in: [src/lib/memoryVault/searchTool.ts:1259](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1259)

***

### sourceChunkIds?

> `optional` **sourceChunkIds**: `string`\[] | `null`

Defined in: [src/lib/memoryVault/searchTool.ts:1281](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1281)

Message ids this fact was extracted from (provenance). recall() uses
these to suppress the originating chunk in the chunk lane.

***

### uniqueId

> **uniqueId**: `string`

Defined in: [src/lib/memoryVault/searchTool.ts:1257](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1257)

***

### updatedAt?

> `optional` **updatedAt**: `Date`

Defined in: [src/lib/memoryVault/searchTool.ts:1263](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1263)
