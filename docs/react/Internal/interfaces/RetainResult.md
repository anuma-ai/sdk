# RetainResult

Defined in: [src/lib/memory/types.ts:548](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#548)

## Properties

### action

> **action**: [`RetainAction`](../type-aliases/RetainAction.md)

Defined in: [src/lib/memory/types.ts:549](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#549)

***

### memoryId

> **memoryId**: `string`

Defined in: [src/lib/memory/types.ts:550](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#550)

***

### proofCount

> **proofCount**: `number`

Defined in: [src/lib/memory/types.ts:560](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#560)

Updated proof\_count after this write. 0 when nothing was written (suppressed).

***

### targetId?

> `optional` **targetId**: `string`

Defined in: [src/lib/memory/types.ts:553](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#553)

When action is 'merge' or 'update', the prior memory's id. When action is
'supersede', the stale memory that was retired (`memoryId` is the new one).

***

### tombstoneId?

> `optional` **tombstoneId**: `string`

Defined in: [src/lib/memory/types.ts:558](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#558)

When action is 'suppressed', the id of the soft-deleted memory that blocked
re-creation. `memoryId` is set to the same id (no new memory was written).
