# RetainResult

Defined in: [src/lib/memory/types.ts:239](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#239)

## Properties

### action

> **action**: [`RetainAction`](../type-aliases/RetainAction.md)

Defined in: [src/lib/memory/types.ts:240](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#240)

***

### memoryId

> **memoryId**: `string`

Defined in: [src/lib/memory/types.ts:241](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#241)

***

### proofCount

> **proofCount**: `number`

Defined in: [src/lib/memory/types.ts:245](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#245)

Updated proof\_count after this write.

***

### targetId?

> `optional` **targetId**: `string`

Defined in: [src/lib/memory/types.ts:243](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#243)

When action is 'merge' or 'update', the prior memory's id.
