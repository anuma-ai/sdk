# RetainResult

Defined in: [src/lib/memory/types.ts:287](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#287)

## Properties

### action

> **action**: [`RetainAction`](../type-aliases/RetainAction.md)

Defined in: [src/lib/memory/types.ts:288](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#288)

***

### memoryId

> **memoryId**: `string`

Defined in: [src/lib/memory/types.ts:289](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#289)

***

### proofCount

> **proofCount**: `number`

Defined in: [src/lib/memory/types.ts:293](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#293)

Updated proof\_count after this write.

***

### targetId?

> `optional` **targetId**: `string`

Defined in: [src/lib/memory/types.ts:291](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#291)

When action is 'merge' or 'update', the prior memory's id.
