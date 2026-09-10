# RetainResult

Defined in: [src/lib/memory/types.ts:599](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#599)

## Properties

### action

> **action**: [`RetainAction`](../type-aliases/RetainAction.md)

Defined in: [src/lib/memory/types.ts:600](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#600)

***

### memoryId

> **memoryId**: `string`

Defined in: [src/lib/memory/types.ts:601](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#601)

***

### proofCount

> **proofCount**: `number`

Defined in: [src/lib/memory/types.ts:611](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#611)

Updated proof\_count after this write. 0 when nothing was written (suppressed).

***

### targetId?

> `optional` **targetId**: `string`

Defined in: [src/lib/memory/types.ts:604](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#604)

When action is 'merge' or 'update', the prior memory's id. When action is
'supersede', the stale memory that was retired (`memoryId` is the new one).

***

### tombstoneId?

> `optional` **tombstoneId**: `string`

Defined in: [src/lib/memory/types.ts:609](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#609)

When action is 'suppressed', the id of the soft-deleted memory that blocked
re-creation. `memoryId` is set to the same id (no new memory was written).
