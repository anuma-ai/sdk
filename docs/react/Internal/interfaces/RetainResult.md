# RetainResult

Defined in: [src/lib/memory/types.ts:387](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#387)

## Properties

### action

> **action**: [`RetainAction`](../type-aliases/RetainAction.md)

Defined in: [src/lib/memory/types.ts:388](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#388)

***

### memoryId

> **memoryId**: `string`

Defined in: [src/lib/memory/types.ts:389](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#389)

***

### proofCount

> **proofCount**: `number`

Defined in: [src/lib/memory/types.ts:399](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#399)

Updated proof\_count after this write. 0 when nothing was written (suppressed).

***

### targetId?

> `optional` **targetId**: `string`

Defined in: [src/lib/memory/types.ts:392](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#392)

When action is 'merge' or 'update', the prior memory's id. When action is
'supersede', the stale memory that was retired (`memoryId` is the new one).

***

### tombstoneId?

> `optional` **tombstoneId**: `string`

Defined in: [src/lib/memory/types.ts:397](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#397)

When action is 'suppressed', the id of the soft-deleted memory that blocked
re-creation. `memoryId` is set to the same id (no new memory was written).
