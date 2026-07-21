# RetainResult

Defined in: [src/lib/memory/types.ts:369](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#369)

## Properties

### action

> **action**: [`RetainAction`](../type-aliases/RetainAction.md)

Defined in: [src/lib/memory/types.ts:370](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#370)

***

### memoryId

> **memoryId**: `string`

Defined in: [src/lib/memory/types.ts:371](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#371)

***

### proofCount

> **proofCount**: `number`

Defined in: [src/lib/memory/types.ts:381](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#381)

Updated proof\_count after this write. 0 when nothing was written (suppressed).

***

### targetId?

> `optional` **targetId**: `string`

Defined in: [src/lib/memory/types.ts:374](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#374)

When action is 'merge' or 'update', the prior memory's id. When action is
'supersede', the stale memory that was retired (`memoryId` is the new one).

***

### tombstoneId?

> `optional` **tombstoneId**: `string`

Defined in: [src/lib/memory/types.ts:379](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#379)

When action is 'suppressed', the id of the soft-deleted memory that blocked
re-creation. `memoryId` is set to the same id (no new memory was written).
