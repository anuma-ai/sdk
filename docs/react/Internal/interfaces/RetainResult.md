# RetainResult

Defined in: [src/lib/memory/types.ts:558](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#558)

## Properties

### action

> **action**: [`RetainAction`](../type-aliases/RetainAction.md)

Defined in: [src/lib/memory/types.ts:559](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#559)

***

### consolidation?

> `optional` **consolidation**: [`ConsolidationAction`](../type-aliases/ConsolidationAction.md)

Defined in: [src/lib/memory/types.ts:578](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#578)

The consolidation LLM's decision, when the write followed one — see [ConsolidationAction](../type-aliases/ConsolidationAction.md).

***

### memoryId

> **memoryId**: `string`

Defined in: [src/lib/memory/types.ts:560](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#560)

***

### proofCount

> **proofCount**: `number`

Defined in: [src/lib/memory/types.ts:570](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#570)

Updated proof\_count after this write. 0 when nothing was written (suppressed).

***

### similarity?

> `optional` **similarity**: `number`

Defined in: [src/lib/memory/types.ts:576](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#576)

The cosine similarity that decided a `merge` (against the target) or a
`suppressed` (against the tombstone). Absent on the other actions. Lets a
host read how close to the threshold the merges it sees actually are.

***

### targetId?

> `optional` **targetId**: `string`

Defined in: [src/lib/memory/types.ts:563](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#563)

When action is 'merge' or 'update', the prior memory's id. When action is
'supersede', the stale memory that was retired (`memoryId` is the new one).

***

### tombstoneId?

> `optional` **tombstoneId**: `string`

Defined in: [src/lib/memory/types.ts:568](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#568)

When action is 'suppressed', the id of the soft-deleted memory that blocked
re-creation. `memoryId` is set to the same id (no new memory was written).
