# TurnCompleteEvent

Defined in: [src/lib/memory/autoExtractWorker.ts:44](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#44)

## Properties

### candidates

> **candidates**: [`ExtractedCandidate`](ExtractedCandidate.md)\[]

Defined in: [src/lib/memory/autoExtractWorker.ts:45](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#45)

***

### conversationId?

> `optional` **conversationId**: `string`

Defined in: [src/lib/memory/autoExtractWorker.ts:50](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#50)

***

### durationMs

> **durationMs**: `number`

Defined in: [src/lib/memory/autoExtractWorker.ts:49](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#49)

***

### failedCount

> **failedCount**: `number`

Defined in: [src/lib/memory/autoExtractWorker.ts:48](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#48)

Per-candidate retain() failures. `onError` only fires on pipeline throws.

***

### results

> **results**: [`RetainResult`](RetainResult.md)\[]

Defined in: [src/lib/memory/autoExtractWorker.ts:46](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#46)
