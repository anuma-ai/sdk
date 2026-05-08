# RetainResult

Defined in: [src/lib/memory/types.ts:171](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#171)

## Properties

### action

> **action**: [`RetainAction`](../type-aliases/RetainAction.md)

Defined in: [src/lib/memory/types.ts:172](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#172)

***

### memoryId

> **memoryId**: `string`

Defined in: [src/lib/memory/types.ts:173](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#173)

***

### proofCount

> **proofCount**: `number`

Defined in: [src/lib/memory/types.ts:177](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#177)

Updated proof\_count after this write.

***

### targetId?

> `optional` **targetId**: `string`

Defined in: [src/lib/memory/types.ts:175](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#175)

When action is 'merge' or 'update', the prior memory's id.
