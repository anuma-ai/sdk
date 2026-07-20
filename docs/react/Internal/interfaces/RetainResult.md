# RetainResult

Defined in: [src/lib/memory/types.ts:254](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#254)

## Properties

### action

> **action**: [`RetainAction`](../type-aliases/RetainAction.md)

Defined in: [src/lib/memory/types.ts:255](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#255)

***

### memoryId

> **memoryId**: `string`

Defined in: [src/lib/memory/types.ts:256](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#256)

***

### proofCount

> **proofCount**: `number`

Defined in: [src/lib/memory/types.ts:265](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#265)

Updated proof\_count after this write. 0 when nothing was written (suppressed).

***

### targetId?

> `optional` **targetId**: `string`

Defined in: [src/lib/memory/types.ts:258](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#258)

When action is 'merge' or 'update', the prior memory's id.

***

### tombstoneId?

> `optional` **tombstoneId**: `string`

Defined in: [src/lib/memory/types.ts:263](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#263)

When action is 'suppressed', the id of the soft-deleted memory that blocked
re-creation. `memoryId` is set to the same id (no new memory was written).
