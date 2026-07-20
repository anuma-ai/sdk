# RetainResult

Defined in: [src/lib/memory/types.ts:252](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#252)

## Properties

### action

> **action**: [`RetainAction`](../type-aliases/RetainAction.md)

Defined in: [src/lib/memory/types.ts:253](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#253)

***

### memoryId

> **memoryId**: `string`

Defined in: [src/lib/memory/types.ts:254](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#254)

***

### proofCount

> **proofCount**: `number`

Defined in: [src/lib/memory/types.ts:258](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#258)

Updated proof\_count after this write.

***

### targetId?

> `optional` **targetId**: `string`

Defined in: [src/lib/memory/types.ts:256](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#256)

When action is 'merge' or 'update', the prior memory's id.
