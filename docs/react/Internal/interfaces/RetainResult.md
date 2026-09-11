# RetainResult

Defined in: [src/lib/memory/types.ts:621](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#621)

## Properties

### action

> **action**: [`RetainAction`](../type-aliases/RetainAction.md)

Defined in: [src/lib/memory/types.ts:622](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#622)

***

### consolidation?

> `optional` **consolidation**: [`ConsolidationAction`](../type-aliases/ConsolidationAction.md)

Defined in: [src/lib/memory/types.ts:660](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#660)

What the consolidation LLM decided for this candidate, when consolidation
ran — see [ConsolidationAction](../type-aliases/ConsolidationAction.md).

Reported for the DECISION, not for what the write ended up doing, so the
two can disagree and be read as such: a `merge` carrying
`consolidation: "create"` is the model saying "new fact" and the strict
cosine stage merging anyway. Absent when consolidation did not run, and
absent on a degraded fallback create (`onFallback` owns that signal).

***

### memoryId

> **memoryId**: `string`

Defined in: [src/lib/memory/types.ts:623](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#623)

***

### proofCount

> **proofCount**: `number`

Defined in: [src/lib/memory/types.ts:633](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#633)

Updated proof\_count after this write. 0 when nothing was written (suppressed).

***

### similarity?

> `optional` **similarity**: `number`

Defined in: [src/lib/memory/types.ts:649](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#649)

How close the write was to the threshold that allowed it. Absent on the
actions that have no such score (`create`, `update`, `supersede`, `skip`).

The two paths report DIFFERENT things and a dashboard has to know which:

* `suppressed` — an exact cosine against the tombstone, computed in
  `findTombstoneMatch`.
* `merge` — the RANKER's score for the target, not a pure cosine. The
  cosine is what cleared `minSimilarity`, but the supersession pass may
  then adjust it (`oldScore - delta` / `newScore + delta`) before this
  value is read, and can in principle reorder the winner. Read it as
  "the score the merge was chosen on", within the supersession delta of
  the cosine — not as the raw pairwise similarity.

***

### targetId?

> `optional` **targetId**: `string`

Defined in: [src/lib/memory/types.ts:626](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#626)

When action is 'merge' or 'update', the prior memory's id. When action is
'supersede', the stale memory that was retired (`memoryId` is the new one).

***

### tombstoneId?

> `optional` **tombstoneId**: `string`

Defined in: [src/lib/memory/types.ts:631](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#631)

When action is 'suppressed', the id of the soft-deleted memory that blocked
re-creation. `memoryId` is set to the same id (no new memory was written).
