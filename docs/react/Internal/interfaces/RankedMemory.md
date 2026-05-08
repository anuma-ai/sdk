# RankedMemory

Defined in: [src/lib/memory/types.ts:42](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#42)

A ranked memory returned by `recall()`. Shape is uniform across kinds —
`kind` discriminates, kind-specific metadata is optional.

## Properties

### content

> **content**: `string`

Defined in: [src/lib/memory/types.ts:45](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#45)

***

### conversationId?

> `optional` **conversationId**: `string`

Defined in: [src/lib/memory/types.ts:56](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#56)

***

### createdAt

> **createdAt**: `Date`

Defined in: [src/lib/memory/types.ts:60](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#60)

***

### folderId?

> `optional` **folderId**: `string` | `null`

Defined in: [src/lib/memory/types.ts:53](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#53)

***

### id

> **id**: `string`

Defined in: [src/lib/memory/types.ts:43](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#43)

***

### kind

> **kind**: [`MemoryKind`](../type-aliases/MemoryKind.md)

Defined in: [src/lib/memory/types.ts:44](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#44)

***

### messageId?

> `optional` **messageId**: `string`

Defined in: [src/lib/memory/types.ts:57](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#57)

***

### proofCount?

> `optional` **proofCount**: `number`

Defined in: [src/lib/memory/types.ts:51](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#51)

***

### role?

> `optional` **role**: `"user"` | `"assistant"`

Defined in: [src/lib/memory/types.ts:58](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#58)

***

### score

> **score**: `number`

Defined in: [src/lib/memory/types.ts:46](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#46)

***

### scoreBreakdown?

> `optional` **scoreBreakdown**: [`ScoreBreakdown`](ScoreBreakdown.md)

Defined in: [src/lib/memory/types.ts:47](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#47)

***

### source?

> `optional` **source**: `string`

Defined in: [src/lib/memory/types.ts:52](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#52)

***

### sourceChunkIds?

> `optional` **sourceChunkIds**: `string`\[]

Defined in: [src/lib/memory/types.ts:50](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#50)

***

### updatedAt

> **updatedAt**: `Date`

Defined in: [src/lib/memory/types.ts:61](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#61)
