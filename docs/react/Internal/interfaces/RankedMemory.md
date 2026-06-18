# RankedMemory

Defined in: [src/lib/memory/types.ts:56](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#56)

A ranked memory returned by `recall()`. Shape is uniform across kinds —
`kind` discriminates, kind-specific metadata is optional.

## Properties

### content

> **content**: `string`

Defined in: [src/lib/memory/types.ts:59](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#59)

***

### conversationId?

> `optional` **conversationId**: `string`

Defined in: [src/lib/memory/types.ts:80](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#80)

***

### createdAt

> **createdAt**: `Date`

Defined in: [src/lib/memory/types.ts:84](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#84)

***

### eventTimeEnd?

> `optional` **eventTimeEnd**: `number` | `null`

Defined in: [src/lib/memory/types.ts:76](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#76)

***

### eventTimeKind?

> `optional` **eventTimeKind**: `"point"` | `"range"` | `"ongoing"` | `null`

Defined in: [src/lib/memory/types.ts:77](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#77)

***

### eventTimeStart?

> `optional` **eventTimeStart**: `number` | `null`

Defined in: [src/lib/memory/types.ts:75](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#75)

Anchored event-time for the fact (the date the underlying event
occurred, not the write time). When present, the recall executor
surfaces it to the LLM as `(event: YYYY-MM-DD)` so the answer model
can do date arithmetic for temporal-reasoning questions. Null /
undefined means the fact has no anchored date.

***

### folderId?

> `optional` **folderId**: `string` | `null`

Defined in: [src/lib/memory/types.ts:67](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#67)

***

### id

> **id**: `string`

Defined in: [src/lib/memory/types.ts:57](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#57)

***

### kind

> **kind**: [`MemoryKind`](../type-aliases/MemoryKind.md)

Defined in: [src/lib/memory/types.ts:58](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#58)

***

### messageId?

> `optional` **messageId**: `string`

Defined in: [src/lib/memory/types.ts:81](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#81)

***

### proofCount?

> `optional` **proofCount**: `number`

Defined in: [src/lib/memory/types.ts:65](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#65)

***

### role?

> `optional` **role**: `"user"` | `"assistant"`

Defined in: [src/lib/memory/types.ts:82](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#82)

***

### score

> **score**: `number`

Defined in: [src/lib/memory/types.ts:60](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#60)

***

### scoreBreakdown?

> `optional` **scoreBreakdown**: [`ScoreBreakdown`](ScoreBreakdown.md)

Defined in: [src/lib/memory/types.ts:61](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#61)

***

### source?

> `optional` **source**: `string`

Defined in: [src/lib/memory/types.ts:66](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#66)

***

### sourceChunkIds?

> `optional` **sourceChunkIds**: `string`\[]

Defined in: [src/lib/memory/types.ts:64](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#64)

***

### updatedAt

> **updatedAt**: `Date`

Defined in: [src/lib/memory/types.ts:85](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#85)
