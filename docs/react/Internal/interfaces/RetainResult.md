# RetainResult

Defined in: [src/lib/memory/types.ts:208](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#208)

## Properties

### action

> **action**: [`RetainAction`](../type-aliases/RetainAction.md)

Defined in: [src/lib/memory/types.ts:209](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#209)

***

### memoryId

> **memoryId**: `string`

Defined in: [src/lib/memory/types.ts:210](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#210)

***

### proofCount

> **proofCount**: `number`

Defined in: [src/lib/memory/types.ts:214](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#214)

Updated proof\_count after this write.

***

### targetId?

> `optional` **targetId**: `string`

Defined in: [src/lib/memory/types.ts:212](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#212)

When action is 'merge' or 'update', the prior memory's id.
