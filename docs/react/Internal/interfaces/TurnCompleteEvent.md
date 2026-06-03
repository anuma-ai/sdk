# TurnCompleteEvent

Defined in: [src/lib/memory/autoExtractWorker.ts:45](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#45)

## Properties

### candidates

> **candidates**: [`ExtractedCandidate`](ExtractedCandidate.md)\[]

Defined in: [src/lib/memory/autoExtractWorker.ts:46](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#46)

***

### conversationId?

> `optional` **conversationId**: `string`

Defined in: [src/lib/memory/autoExtractWorker.ts:51](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#51)

***

### durationMs

> **durationMs**: `number`

Defined in: [src/lib/memory/autoExtractWorker.ts:50](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#50)

***

### failedCount

> **failedCount**: `number`

Defined in: [src/lib/memory/autoExtractWorker.ts:49](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#49)

Per-candidate retain() failures. `onError` only fires on pipeline throws.

***

### results

> **results**: [`RetainResult`](RetainResult.md)\[]

Defined in: [src/lib/memory/autoExtractWorker.ts:47](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#47)
