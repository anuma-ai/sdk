# RankedMemory

Defined in: [src/lib/memory/types.ts:41](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#41)

A ranked memory returned by `recall()`. Shape is uniform across kinds —
`kind` discriminates, kind-specific metadata is optional.

## Properties

### content

> **content**: `string`

Defined in: [src/lib/memory/types.ts:44](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#44)

***

### conversationId?

> `optional` **conversationId**: `string`

Defined in: [src/lib/memory/types.ts:55](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#55)

***

### createdAt

> **createdAt**: `Date`

Defined in: [src/lib/memory/types.ts:59](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#59)

***

### folderId?

> `optional` **folderId**: `string` | `null`

Defined in: [src/lib/memory/types.ts:52](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#52)

***

### id

> **id**: `string`

Defined in: [src/lib/memory/types.ts:42](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#42)

***

### kind

> **kind**: [`MemoryKind`](../type-aliases/MemoryKind.md)

Defined in: [src/lib/memory/types.ts:43](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#43)

***

### messageId?

> `optional` **messageId**: `string`

Defined in: [src/lib/memory/types.ts:56](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#56)

***

### proofCount?

> `optional` **proofCount**: `number`

Defined in: [src/lib/memory/types.ts:50](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#50)

***

### role?

> `optional` **role**: `"user"` | `"assistant"`

Defined in: [src/lib/memory/types.ts:57](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#57)

***

### score

> **score**: `number`

Defined in: [src/lib/memory/types.ts:45](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#45)

***

### scoreBreakdown?

> `optional` **scoreBreakdown**: [`ScoreBreakdown`](ScoreBreakdown.md)

Defined in: [src/lib/memory/types.ts:46](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#46)

***

### source?

> `optional` **source**: `string`

Defined in: [src/lib/memory/types.ts:51](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#51)

***

### sourceChunkIds?

> `optional` **sourceChunkIds**: `string`\[]

Defined in: [src/lib/memory/types.ts:49](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#49)

***

### updatedAt

> **updatedAt**: `Date`

Defined in: [src/lib/memory/types.ts:60](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#60)
