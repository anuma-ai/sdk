# RetainResult

Defined in: [src/lib/memory/types.ts:234](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#234)

## Properties

### action

> **action**: [`RetainAction`](../type-aliases/RetainAction.md)

Defined in: [src/lib/memory/types.ts:235](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#235)

***

### memoryId

> **memoryId**: `string`

Defined in: [src/lib/memory/types.ts:236](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#236)

***

### proofCount

> **proofCount**: `number`

Defined in: [src/lib/memory/types.ts:240](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#240)

Updated proof\_count after this write.

***

### targetId?

> `optional` **targetId**: `string`

Defined in: [src/lib/memory/types.ts:238](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#238)

When action is 'merge' or 'update', the prior memory's id.
