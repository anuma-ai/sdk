# RetainResult

Defined in: [src/lib/memory/types.ts:196](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#196)

## Properties

### action

> **action**: [`RetainAction`](../type-aliases/RetainAction.md)

Defined in: [src/lib/memory/types.ts:197](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#197)

***

### memoryId

> **memoryId**: `string`

Defined in: [src/lib/memory/types.ts:198](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#198)

***

### proofCount

> **proofCount**: `number`

Defined in: [src/lib/memory/types.ts:202](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#202)

Updated proof\_count after this write.

***

### targetId?

> `optional` **targetId**: `string`

Defined in: [src/lib/memory/types.ts:200](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#200)

When action is 'merge' or 'update', the prior memory's id.
