# RetainResult

Defined in: [src/lib/memory/types.ts:708](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#708)

## Properties

### action

> **action**: [`RetainAction`](../type-aliases/RetainAction.md)

Defined in: [src/lib/memory/types.ts:709](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#709)

***

### consolidation?

> `optional` **consolidation**: [`ConsolidationAction`](../type-aliases/ConsolidationAction.md)

Defined in: [src/lib/memory/types.ts:749](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#749)

What the consolidation LLM decided for this candidate, when consolidation
ran — see [ConsolidationAction](../type-aliases/ConsolidationAction.md).

***

### consolidationFallback?

> `optional` **consolidationFallback**: [`ConsolidationFallbackReason`](../type-aliases/ConsolidationFallbackReason.md)

Defined in: [src/lib/memory/types.ts:751](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#751)

Set when consolidation ran but produced no usable decision, so this write fell back to an exact-content merge or a plain create.

***

### memoryId

> **memoryId**: `string`

Defined in: [src/lib/memory/types.ts:710](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#710)

***

### privateMemoryId?

> `optional` **privateMemoryId**: `string`

Defined in: [src/lib/memory/types.ts:724](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#724)

When action is 'withheld', the id of the private memory that already holds
this fact, left untouched instead of publishing a shared copy. `memoryId` is
set to the same id (no new memory was written).

***

### proofCount

> **proofCount**: `number`

Defined in: [src/lib/memory/types.ts:726](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#726)

Updated proof\_count after this write. 0 when nothing was written (suppressed, withheld).

***

### similarity?

> `optional` **similarity**: `number`

Defined in: [src/lib/memory/types.ts:744](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#744)

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

Defined in: [src/lib/memory/types.ts:713](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#713)

When action is 'merge' or 'update', the prior memory's id. When action is
'supersede', the stale memory that was retired (`memoryId` is the new one).

***

### tombstoneId?

> `optional` **tombstoneId**: `string`

Defined in: [src/lib/memory/types.ts:718](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#718)

When action is 'suppressed', the id of the soft-deleted memory that blocked
re-creation. `memoryId` is set to the same id (no new memory was written).
