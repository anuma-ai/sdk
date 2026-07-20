# RetainResult

Defined in: [src/lib/memory/types.ts:260](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#260)

## Properties

### action

> **action**: [`RetainAction`](../type-aliases/RetainAction.md)

Defined in: [src/lib/memory/types.ts:261](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#261)

***

### memoryId

> **memoryId**: `string`

Defined in: [src/lib/memory/types.ts:262](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#262)

***

### proofCount

> **proofCount**: `number`

Defined in: [src/lib/memory/types.ts:271](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#271)

Updated proof\_count after this write. 0 when nothing was written (suppressed).

***

### targetId?

> `optional` **targetId**: `string`

Defined in: [src/lib/memory/types.ts:264](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#264)

When action is 'merge' or 'update', the prior memory's id.

***

### tombstoneId?

> `optional` **tombstoneId**: `string`

Defined in: [src/lib/memory/types.ts:269](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#269)

When action is 'suppressed', the id of the soft-deleted memory that blocked
re-creation. `memoryId` is set to the same id (no new memory was written).
