# RetainResult

Defined in: [src/lib/memory/types.ts:246](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#246)

## Properties

### action

> **action**: [`RetainAction`](../type-aliases/RetainAction.md)

Defined in: [src/lib/memory/types.ts:247](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#247)

***

### memoryId

> **memoryId**: `string`

Defined in: [src/lib/memory/types.ts:248](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#248)

***

### proofCount

> **proofCount**: `number`

Defined in: [src/lib/memory/types.ts:252](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#252)

Updated proof\_count after this write.

***

### targetId?

> `optional` **targetId**: `string`

Defined in: [src/lib/memory/types.ts:250](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#250)

When action is 'merge' or 'update', the prior memory's id.
