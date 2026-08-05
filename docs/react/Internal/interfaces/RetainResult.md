# RetainResult

Defined in: [src/lib/memory/types.ts:531](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#531)

## Properties

### action

> **action**: [`RetainAction`](../type-aliases/RetainAction.md)

Defined in: [src/lib/memory/types.ts:532](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#532)

***

### memoryId

> **memoryId**: `string`

Defined in: [src/lib/memory/types.ts:533](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#533)

***

### proofCount

> **proofCount**: `number`

Defined in: [src/lib/memory/types.ts:543](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#543)

Updated proof\_count after this write. 0 when nothing was written (suppressed).

***

### targetId?

> `optional` **targetId**: `string`

Defined in: [src/lib/memory/types.ts:536](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#536)

When action is 'merge' or 'update', the prior memory's id. When action is
'supersede', the stale memory that was retired (`memoryId` is the new one).

***

### tombstoneId?

> `optional` **tombstoneId**: `string`

Defined in: [src/lib/memory/types.ts:541](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#541)

When action is 'suppressed', the id of the soft-deleted memory that blocked
re-creation. `memoryId` is set to the same id (no new memory was written).
