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

Defined in: [src/lib/memory/types.ts:73](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#73)

***

### createdAt

> **createdAt**: `Date`

Defined in: [src/lib/memory/types.ts:77](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#77)

***

### eventTimeEnd?

> `optional` **eventTimeEnd**: `number` | `null`

Defined in: [src/lib/memory/types.ts:69](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#69)

***

### eventTimeKind?

> `optional` **eventTimeKind**: `"point"` | `"range"` | `"ongoing"` | `null`

Defined in: [src/lib/memory/types.ts:70](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#70)

***

### eventTimeStart?

> `optional` **eventTimeStart**: `number` | `null`

Defined in: [src/lib/memory/types.ts:68](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#68)

Anchored event-time for the fact (the date the underlying event
occurred, not the write time). When present, the recall executor
surfaces it to the LLM as `(event: YYYY-MM-DD)` so the answer model
can do date arithmetic for temporal-reasoning questions. Null /
undefined means the fact has no anchored date.

***

### folderId?

> `optional` **folderId**: `string` | `null`

Defined in: [src/lib/memory/types.ts:60](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#60)

***

### id

> **id**: `string`

Defined in: [src/lib/memory/types.ts:50](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#50)

***

### kind

> **kind**: [`MemoryKind`](../type-aliases/MemoryKind.md)

Defined in: [src/lib/memory/types.ts:51](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#51)

***

### messageId?

> `optional` **messageId**: `string`

Defined in: [src/lib/memory/types.ts:74](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#74)

***

### proofCount?

> `optional` **proofCount**: `number`

Defined in: [src/lib/memory/types.ts:58](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#58)

***

### role?

> `optional` **role**: `"user"` | `"assistant"`

Defined in: [src/lib/memory/types.ts:75](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#75)

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

Defined in: [src/lib/memory/types.ts:59](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#59)

***

### sourceChunkIds?

> `optional` **sourceChunkIds**: `string`\[]

Defined in: [src/lib/memory/types.ts:57](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#57)

***

### updatedAt

> **updatedAt**: `Date`

Defined in: [src/lib/memory/types.ts:78](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#78)
