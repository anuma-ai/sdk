# RetainResult

Defined in: [src/lib/memory/types.ts:222](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#222)

## Properties

### action

> **action**: [`RetainAction`](../type-aliases/RetainAction.md)

Defined in: [src/lib/memory/types.ts:223](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#223)

***

### memoryId

> **memoryId**: `string`

Defined in: [src/lib/memory/types.ts:224](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#224)

***

### proofCount

> **proofCount**: `number`

Defined in: [src/lib/memory/types.ts:228](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#228)

Updated proof\_count after this write.

***

### targetId?

> `optional` **targetId**: `string`

Defined in: [src/lib/memory/types.ts:226](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#226)

When action is 'merge' or 'update', the prior memory's id.
