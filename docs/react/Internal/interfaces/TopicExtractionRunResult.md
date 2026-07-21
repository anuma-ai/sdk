# TopicExtractionRunResult

Defined in: [src/lib/memory/topicExtract.ts:226](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/topicExtract.ts#226)

Outcome of one [extractAndLinkEntitiesForMemoriesOp](../functions/extractAndLinkEntitiesForMemoriesOp.md) run.

## Properties

### entitiesByMemory

> **entitiesByMemory**: `Map`<`string`, [`ExtractedEntity`](ExtractedEntity.md)\[]>

Defined in: [src/lib/memory/topicExtract.ts:228](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/topicExtract.ts#228)

memoryId → entities the LLM returned (post-validation, post-linking).

***

### skippedIds

> **skippedIds**: `string`\[]

Defined in: [src/lib/memory/topicExtract.ts:236](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/topicExtract.ts#236)

Memories NOT processed: missing/deleted/foreign rows, user-managed rows
(including ones that became user-managed mid-run), and members of failed
LLM batches. Skipped ids are not stamped, so failed batches are retried
by a later sweep — callers should apply their own attempt caps.

***

### stampedIds

> **stampedIds**: `string`\[]

Defined in: [src/lib/memory/topicExtract.ts:231](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/topicExtract.ts#231)

Memories stamped `topics_extracted_at` this run — includes zero-entity
results so quiet memories aren't re-asked every sweep.
