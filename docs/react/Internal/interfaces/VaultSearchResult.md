# VaultSearchResult

Defined in: [src/lib/memoryVault/searchTool.ts:1144](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1144)

A single vault search result with its similarity score.

## Properties

### content

> **content**: `string`

Defined in: [src/lib/memoryVault/searchTool.ts:1146](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1146)

***

### createdAt?

> `optional` **createdAt**: `Date`

Defined in: [src/lib/memoryVault/searchTool.ts:1150](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1150)

Optional — surfaced by the rankers so downstream `RankedMemory` carries
real timestamps. Omitted when an item lacks the field upstream.

***

### eventTimeEnd?

> `optional` **eventTimeEnd**: `number` | `null`

Defined in: [src/lib/memoryVault/searchTool.ts:1157](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1157)

***

### eventTimeKind?

> `optional` **eventTimeKind**: `"point"` | `"range"` | `"ongoing"` | `null`

Defined in: [src/lib/memoryVault/searchTool.ts:1158](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1158)

***

### eventTimeStart?

> `optional` **eventTimeStart**: `number` | `null`

Defined in: [src/lib/memoryVault/searchTool.ts:1156](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1156)

W6 temporal-lane anchors carried through to downstream `RankedMemory`
so the recall executor can surface dates to the answer model without
a second per-fact DB lookup + decrypt. Unix ms; null when the fact
has no anchored event time.

***

### similarity

> **similarity**: `number`

Defined in: [src/lib/memoryVault/searchTool.ts:1147](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1147)

***

### sourceChunkIds?

> `optional` **sourceChunkIds**: `string`\[] | `null`

Defined in: [src/lib/memoryVault/searchTool.ts:1161](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1161)

Message ids this fact was extracted from (provenance). recall() uses
these to suppress the originating chunk in the chunk lane.

***

### uniqueId

> **uniqueId**: `string`

Defined in: [src/lib/memoryVault/searchTool.ts:1145](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1145)

***

### updatedAt?

> `optional` **updatedAt**: `Date`

Defined in: [src/lib/memoryVault/searchTool.ts:1151](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/searchTool.ts#1151)
