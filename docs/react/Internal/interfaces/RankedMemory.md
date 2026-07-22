# RankedMemory

Defined in: [src/lib/memory/types.ts:57](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#57)

A ranked memory returned by `recall()`. Shape is uniform across kinds —
`kind` discriminates, kind-specific metadata is optional.

## Properties

### content

> **content**: `string`

Defined in: [src/lib/memory/types.ts:60](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#60)

***

### conversationId?

> `optional` **conversationId**: `string`

Defined in: [src/lib/memory/types.ts:94](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#94)

***

### createdAt

> **createdAt**: `Date`

Defined in: [src/lib/memory/types.ts:98](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#98)

***

### eventTimeEnd?

> `optional` **eventTimeEnd**: `number` | `null`

Defined in: [src/lib/memory/types.ts:82](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#82)

***

### eventTimeKind?

> `optional` **eventTimeKind**: `"point"` | `"range"` | `"ongoing"` | `null`

Defined in: [src/lib/memory/types.ts:83](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#83)

***

### eventTimeStart?

> `optional` **eventTimeStart**: `number` | `null`

Defined in: [src/lib/memory/types.ts:81](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#81)

Anchored event-time for the fact (the date the underlying event
occurred, not the write time). When present, the recall executor
surfaces it to the LLM as `(event: YYYY-MM-DD)` so the answer model
can do date arithmetic for temporal-reasoning questions. Null /
undefined means the fact has no anchored date.

***

### factType?

> `optional` **factType**: `string` | `null`

Defined in: [src/lib/memory/types.ts:91](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#91)

Typed memory (PR1) — the extractor's FactType classification for this
fact, threaded through the same channel as the event-time anchors so
recall results (and UI) can show the type without a second DB read.
Null/undefined on legacy/untyped/manual facts. Kept as a loose string
(not narrowed to FactType) since it originates from a stored column.

***

### folderId?

> `optional` **folderId**: `string` | `null`

Defined in: [src/lib/memory/types.ts:68](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#68)

***

### id

> **id**: `string`

Defined in: [src/lib/memory/types.ts:58](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#58)

***

### kind

> **kind**: [`MemoryKind`](../type-aliases/MemoryKind.md)

Defined in: [src/lib/memory/types.ts:59](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#59)

***

### lastObservedAt?

> `optional` **lastObservedAt**: `number` | `null`

Defined in: [src/lib/memory/types.ts:73](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#73)

C3 re-observation watermark (Unix ms). Null/undefined when the fact
has never been merge-reinforced since the column landed.

***

### messageId?

> `optional` **messageId**: `string`

Defined in: [src/lib/memory/types.ts:95](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#95)

***

### proofCount?

> `optional` **proofCount**: `number`

Defined in: [src/lib/memory/types.ts:66](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#66)

***

### role?

> `optional` **role**: `"user"` | `"assistant"`

Defined in: [src/lib/memory/types.ts:96](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#96)

***

### score

> **score**: `number`

Defined in: [src/lib/memory/types.ts:61](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#61)

***

### scoreBreakdown?

> `optional` **scoreBreakdown**: [`ScoreBreakdown`](ScoreBreakdown.md)

Defined in: [src/lib/memory/types.ts:62](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#62)

***

### source?

> `optional` **source**: `string`

Defined in: [src/lib/memory/types.ts:67](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#67)

***

### sourceChunkIds?

> `optional` **sourceChunkIds**: `string`\[]

Defined in: [src/lib/memory/types.ts:65](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#65)

***

### updatedAt

> **updatedAt**: `Date`

Defined in: [src/lib/memory/types.ts:99](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#99)
