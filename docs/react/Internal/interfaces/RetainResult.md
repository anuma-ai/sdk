# RetainResult

Defined in: [src/lib/memory/types.ts:505](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#505)

## Properties

### action

> **action**: [`RetainAction`](../type-aliases/RetainAction.md)

Defined in: [src/lib/memory/types.ts:506](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#506)

***

### memoryId

> **memoryId**: `string`

Defined in: [src/lib/memory/types.ts:507](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#507)

***

### proofCount

> **proofCount**: `number`

Defined in: [src/lib/memory/types.ts:517](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#517)

Updated proof\_count after this write. 0 when nothing was written (suppressed).

***

### targetId?

> `optional` **targetId**: `string`

Defined in: [src/lib/memory/types.ts:510](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#510)

When action is 'merge' or 'update', the prior memory's id. When action is
'supersede', the stale memory that was retired (`memoryId` is the new one).

***

### tombstoneId?

> `optional` **tombstoneId**: `string`

Defined in: [src/lib/memory/types.ts:515](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#515)

When action is 'suppressed', the id of the soft-deleted memory that blocked
re-creation. `memoryId` is set to the same id (no new memory was written).
