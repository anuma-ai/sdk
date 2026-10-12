# TopicExtractionRunResult

Defined in: [src/lib/memory/topicExtract.ts:297](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/topicExtract.ts#297)

Outcome of one [extractAndLinkEntitiesForMemoriesOp](../functions/extractAndLinkEntitiesForMemoriesOp.md) run.

## Properties

### batchCount

> **batchCount**: `number`

Defined in: [src/lib/memory/topicExtract.ts:298](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/topicExtract.ts#298)

***

### batches

> **batches**: [`TopicExtractionBatchDiagnostics`](TopicExtractionBatchDiagnostics.md)\[]

Defined in: [src/lib/memory/topicExtract.ts:300](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/topicExtract.ts#300)

***

### durationMs

> **durationMs**: `number`

Defined in: [src/lib/memory/topicExtract.ts:299](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/topicExtract.ts#299)

***

### entitiesByMemory

> **entitiesByMemory**: `Map`<`string`, [`ExtractedEntity`](ExtractedEntity.md)\[]>

Defined in: [src/lib/memory/topicExtract.ts:303](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/topicExtract.ts#303)

memoryId → entities the LLM returned (post-validation, post-linking).

***

### llmFailures

> **llmFailures**: `Map`<`string`, [`PortalLlmFailure`](PortalLlmFailure.md)>

Defined in: [src/lib/memory/topicExtract.ts:301](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/topicExtract.ts#301)

***

### skippedIds

> **skippedIds**: `string`\[]

Defined in: [src/lib/memory/topicExtract.ts:311](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/topicExtract.ts#311)

Memories NOT processed: missing/deleted/foreign rows, user-managed rows
(including ones that became user-managed mid-run), and members of failed
LLM batches. Skipped ids are not stamped, so failed batches are retried
by a later sweep — callers should apply their own attempt caps.

***

### skippedReasons

> **skippedReasons**: `Map`<`string`, [`TopicSkipReason`](../type-aliases/TopicSkipReason.md)>

Defined in: [src/lib/memory/topicExtract.ts:329](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/topicExtract.ts#329)

Why each id in [skippedIds](#skippedids) was skipped.

`skippedIds` alone cannot distinguish a sweep that deliberately declined
work from one that FAILED: a run where every LLM batch errored and a run
over rows the user has taken manual control of produce an identical array.
That is the same blindness `outcome: 'empty-after-retry'` had before #888 —
a degradation wearing the shape of normal control flow.

It matters here because topics feed the entity recall lane, so a silently
failing sweep means memories that exist but cannot be found by entity, with
nothing in production saying so.

Populated in lockstep with `skippedIds` (single `skip()` helper), so the two
cannot drift. Group by [isDegradedTopicSkip](../functions/isDegradedTopicSkip.md) to separate "declined" from
"broke".

***

### stampedIds

> **stampedIds**: `string`\[]

Defined in: [src/lib/memory/topicExtract.ts:306](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/topicExtract.ts#306)

Memories stamped `topics_extracted_at` this run — includes zero-entity
results so quiet memories aren't re-asked every sweep.
