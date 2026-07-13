# RetainResult

Defined in: [src/lib/memory/types.ts:267](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#267)

## Properties

### action

> **action**: [`RetainAction`](../type-aliases/RetainAction.md)

Defined in: [src/lib/memory/types.ts:268](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#268)

***

### memoryId

> **memoryId**: `string`

Defined in: [src/lib/memory/types.ts:269](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#269)

***

### proofCount

> **proofCount**: `number`

Defined in: [src/lib/memory/types.ts:273](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#273)

Updated proof\_count after this write.

***

### targetId?

> `optional` **targetId**: `string`

Defined in: [src/lib/memory/types.ts:271](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#271)

When action is 'merge' or 'update', the prior memory's id.
