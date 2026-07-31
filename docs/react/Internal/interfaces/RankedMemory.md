# RankedMemory

Defined in: [src/lib/memory/types.ts:60](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#60)

A ranked memory returned by `recall()`. Shape is uniform across kinds —
`kind` discriminates, kind-specific metadata is optional.

## Properties

### content

> **content**: `string`

Defined in: [src/lib/memory/types.ts:63](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#63)

***

### conversationId?

> `optional` **conversationId**: `string`

Defined in: [src/lib/memory/types.ts:102](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#102)

***

### createdAt

> **createdAt**: `Date`

Defined in: [src/lib/memory/types.ts:106](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#106)

***

### eventTimeEnd?

> `optional` **eventTimeEnd**: `number` | `null`

Defined in: [src/lib/memory/types.ts:90](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#90)

***

### eventTimeKind?

> `optional` **eventTimeKind**: `"point"` | `"range"` | `"ongoing"` | `null`

Defined in: [src/lib/memory/types.ts:91](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#91)

***

### eventTimeStart?

> `optional` **eventTimeStart**: `number` | `null`

Defined in: [src/lib/memory/types.ts:89](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#89)

Anchored event-time for the fact (the date the underlying event
occurred, not the write time). When present, the recall executor
surfaces it to the LLM as `(event: YYYY-MM-DD)` so the answer model
can do date arithmetic for temporal-reasoning questions. Null /
undefined means the fact has no anchored date.

***

### factType?

> `optional` **factType**: `string` | `null`

Defined in: [src/lib/memory/types.ts:99](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#99)

Typed memory (PR1) — the extractor's FactType classification for this
fact, threaded through the same channel as the event-time anchors so
recall results (and UI) can show the type without a second DB read.
Null/undefined on legacy/untyped/manual facts. Kept as a loose string
(not narrowed to FactType) since it originates from a stored column.

***

### folderId?

> `optional` **folderId**: `string` | `null`

Defined in: [src/lib/memory/types.ts:71](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#71)

***

### id

> **id**: `string`

Defined in: [src/lib/memory/types.ts:61](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#61)

***

### kind

> **kind**: [`MemoryKind`](../type-aliases/MemoryKind.md)

Defined in: [src/lib/memory/types.ts:62](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#62)

***

### lastObservedAt?

> `optional` **lastObservedAt**: `number` | `null`

Defined in: [src/lib/memory/types.ts:76](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#76)

C3 re-observation watermark (Unix ms). Null/undefined when the fact
has never been merge-reinforced since the column landed.

***

### messageId?

> `optional` **messageId**: `string`

Defined in: [src/lib/memory/types.ts:103](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#103)

***

### observationTrend?

> `optional` **observationTrend**: [`ObservationTrend`](../type-aliases/ObservationTrend.md)

Defined in: [src/lib/memory/types.ts:81](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#81)

C2 observation-trend label derived from createdAt / lastObservedAt /
proofCount over 30/90-day windows. Fact-only; omitted for chunks.

***

### proofCount?

> `optional` **proofCount**: `number`

Defined in: [src/lib/memory/types.ts:69](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#69)

***

### role?

> `optional` **role**: `"user"` | `"assistant"`

Defined in: [src/lib/memory/types.ts:104](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#104)

***

### score

> **score**: `number`

Defined in: [src/lib/memory/types.ts:64](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#64)

***

### scoreBreakdown?

> `optional` **scoreBreakdown**: [`ScoreBreakdown`](ScoreBreakdown.md)

Defined in: [src/lib/memory/types.ts:65](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#65)

***

### source?

> `optional` **source**: `string`

Defined in: [src/lib/memory/types.ts:70](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#70)

***

### sourceChunkIds?

> `optional` **sourceChunkIds**: `string`\[]

Defined in: [src/lib/memory/types.ts:68](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#68)

***

### updatedAt

> **updatedAt**: `Date`

Defined in: [src/lib/memory/types.ts:107](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#107)
