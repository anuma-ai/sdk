# RetainResult

Defined in: [src/lib/memory/types.ts:437](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#437)

## Properties

### action

> **action**: [`RetainAction`](../type-aliases/RetainAction.md)

Defined in: [src/lib/memory/types.ts:438](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#438)

***

### memoryId

> **memoryId**: `string`

Defined in: [src/lib/memory/types.ts:439](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#439)

***

### proofCount

> **proofCount**: `number`

Defined in: [src/lib/memory/types.ts:449](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#449)

Updated proof\_count after this write. 0 when nothing was written (suppressed).

***

### targetId?

> `optional` **targetId**: `string`

Defined in: [src/lib/memory/types.ts:442](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#442)

When action is 'merge' or 'update', the prior memory's id. When action is
'supersede', the stale memory that was retired (`memoryId` is the new one).

***

### tombstoneId?

> `optional` **tombstoneId**: `string`

Defined in: [src/lib/memory/types.ts:447](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#447)

When action is 'suppressed', the id of the soft-deleted memory that blocked
re-creation. `memoryId` is set to the same id (no new memory was written).
