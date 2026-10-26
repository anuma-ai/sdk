# RankedMemory

Defined in: [src/lib/memory/types.ts:49](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#49)

A ranked memory returned by `recall()`. Shape is uniform across kinds —
`kind` discriminates, kind-specific metadata is optional.

## Properties

### content

> **content**: `string`

Defined in: [src/lib/memory/types.ts:52](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#52)

***

### conversationId?

> `optional` **conversationId**: `string`

Defined in: [src/lib/memory/types.ts:89](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#89)

***

### createdAt

> **createdAt**: `Date`

Defined in: [src/lib/memory/types.ts:93](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#93)

***

### eventTimeEnd?

> `optional` **eventTimeEnd**: `number` | `null`

Defined in: [src/lib/memory/types.ts:78](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#78)

***

### eventTimeKind?

> `optional` **eventTimeKind**: `"point"` | `"range"` | `"ongoing"` | `null`

Defined in: [src/lib/memory/types.ts:79](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#79)

***

### eventTimeStart?

> `optional` **eventTimeStart**: `number` | `null`

Defined in: [src/lib/memory/types.ts:77](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#77)

Anchored event-time for the fact (the date the underlying event
occurred, not the write time). When present, the recall executor
surfaces it to the LLM as `(event: YYYY-MM-DD)` so the answer model
can do date arithmetic for temporal-reasoning questions. Null /
undefined means the fact has no anchored date.

***

### factType?

> `optional` **factType**: `string` | `null`

Defined in: [src/lib/memory/types.ts:87](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#87)

Typed memory (PR1) — the extractor's FactType classification for this
fact, threaded through the same channel as the event-time anchors so
recall results (and UI) can show the type without a second DB read.
Null/undefined on legacy/untyped/manual facts. Kept as a loose string
(not narrowed to FactType) since it originates from a stored column.

***

### folderId?

> `optional` **folderId**: `string` | `null`

Defined in: [src/lib/memory/types.ts:59](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#59)

***

### id

> **id**: `string`

Defined in: [src/lib/memory/types.ts:50](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#50)

***

### kind

> **kind**: [`MemoryKind`](../type-aliases/MemoryKind.md)

Defined in: [src/lib/memory/types.ts:51](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#51)

***

### lastObservedAt?

> `optional` **lastObservedAt**: `number` | `null`

Defined in: [src/lib/memory/types.ts:64](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#64)

C3 re-observation watermark (Unix ms). Null/undefined when the fact
has never been merge-reinforced since the column landed.

***

### messageId?

> `optional` **messageId**: `string`

Defined in: [src/lib/memory/types.ts:90](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#90)

***

### observationTrend?

> `optional` **observationTrend**: [`ObservationTrend`](../type-aliases/ObservationTrend.md)

Defined in: [src/lib/memory/types.ts:69](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#69)

C2 observation-trend label derived from createdAt / lastObservedAt /
proofCount over 30/90-day windows. Fact-only; omitted for chunks.

***

### proofCount?

> `optional` **proofCount**: `number`

Defined in: [src/lib/memory/types.ts:57](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#57)

***

### role?

> `optional` **role**: `"user"` | `"assistant"`

Defined in: [src/lib/memory/types.ts:91](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#91)

***

### score

> **score**: `number`

Defined in: [src/lib/memory/types.ts:53](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#53)

***

### scoreBreakdown?

> `optional` **scoreBreakdown**: [`ScoreBreakdown`](ScoreBreakdown.md)

Defined in: [src/lib/memory/types.ts:54](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#54)

***

### source?

> `optional` **source**: `string`

Defined in: [src/lib/memory/types.ts:58](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#58)

***

### sourceChunkIds?

> `optional` **sourceChunkIds**: `string`\[]

Defined in: [src/lib/memory/types.ts:56](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#56)

***

### updatedAt

> **updatedAt**: `Date`

Defined in: [src/lib/memory/types.ts:94](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#94)
