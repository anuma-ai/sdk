# RetainResult

Defined in: [src/lib/memory/types.ts:178](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#178)

## Properties

### action

> **action**: [`RetainAction`](../type-aliases/RetainAction.md)

Defined in: [src/lib/memory/types.ts:179](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#179)

***

### memoryId

> **memoryId**: `string`

Defined in: [src/lib/memory/types.ts:180](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#180)

***

### proofCount

> **proofCount**: `number`

Defined in: [src/lib/memory/types.ts:184](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#184)

Updated proof\_count after this write.

***

### targetId?

> `optional` **targetId**: `string`

Defined in: [src/lib/memory/types.ts:182](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#182)

When action is 'merge' or 'update', the prior memory's id.
