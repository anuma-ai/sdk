# RetainResult

Defined in: [src/lib/memory/types.ts:692](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#692)

## Properties

### action

> **action**: [`RetainAction`](../type-aliases/RetainAction.md)

Defined in: [src/lib/memory/types.ts:693](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#693)

***

### consolidation?

> `optional` **consolidation**: [`ConsolidationAction`](../type-aliases/ConsolidationAction.md)

Defined in: [src/lib/memory/types.ts:733](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#733)

What the consolidation LLM decided for this candidate, when consolidation
ran — see [ConsolidationAction](../type-aliases/ConsolidationAction.md).

***

### memoryId

> **memoryId**: `string`

Defined in: [src/lib/memory/types.ts:694](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#694)

***

### privateMemoryId?

> `optional` **privateMemoryId**: `string`

Defined in: [src/lib/memory/types.ts:708](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#708)

When action is 'withheld', the id of the private memory that already holds
this fact, left untouched instead of publishing a shared copy. `memoryId` is
set to the same id (no new memory was written).

***

### proofCount

> **proofCount**: `number`

Defined in: [src/lib/memory/types.ts:710](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#710)

Updated proof\_count after this write. 0 when nothing was written (suppressed, withheld).

***

### similarity?

> `optional` **similarity**: `number`

Defined in: [src/lib/memory/types.ts:728](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#728)

How close the write was to the threshold that allowed it. Absent on the
actions that have no such score (`create`, `update`, `supersede`, `skip`).

The two paths report DIFFERENT things and a dashboard has to know which:

* `suppressed` — an exact cosine against the tombstone, computed in
  `findTombstoneMatch`.
* `withheld` — the ranker's score for the private match, read the same way
  as `merge` below.
* `merge` — the RANKER's score for the target, not a pure cosine. The
  cosine is what cleared `minSimilarity`, but the supersession pass may
  then adjust it (`oldScore - delta` / `newScore + delta`) before this
  value is read, and can in principle reorder the winner. Read it as
  "the score the merge was chosen on", within the supersession delta of
  the cosine — not as the raw pairwise similarity.

***

### targetId?

> `optional` **targetId**: `string`

Defined in: [src/lib/memory/types.ts:697](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#697)

When action is 'merge' or 'update', the prior memory's id. When action is
'supersede', the stale memory that was retired (`memoryId` is the new one).

***

### tombstoneId?

> `optional` **tombstoneId**: `string`

Defined in: [src/lib/memory/types.ts:702](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#702)

When action is 'suppressed', the id of the soft-deleted memory that blocked
re-creation. `memoryId` is set to the same id (no new memory was written).
