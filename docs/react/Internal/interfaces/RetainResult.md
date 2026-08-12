# RetainResult

Defined in: [src/lib/memory/types.ts:521](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#521)

## Properties

### action

> **action**: [`RetainAction`](../type-aliases/RetainAction.md)

Defined in: [src/lib/memory/types.ts:522](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#522)

***

### memoryId

> **memoryId**: `string`

Defined in: [src/lib/memory/types.ts:523](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#523)

***

### proofCount

> **proofCount**: `number`

Defined in: [src/lib/memory/types.ts:533](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#533)

Updated proof\_count after this write. 0 when nothing was written (suppressed).

***

### targetId?

> `optional` **targetId**: `string`

Defined in: [src/lib/memory/types.ts:526](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#526)

When action is 'merge' or 'update', the prior memory's id. When action is
'supersede', the stale memory that was retired (`memoryId` is the new one).

***

### tombstoneId?

> `optional` **tombstoneId**: `string`

Defined in: [src/lib/memory/types.ts:531](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#531)

When action is 'suppressed', the id of the soft-deleted memory that blocked
re-creation. `memoryId` is set to the same id (no new memory was written).
