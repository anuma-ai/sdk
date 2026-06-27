# TurnCompleteEvent

Defined in: [src/lib/memory/autoExtractWorker.ts:74](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#74)

## Properties

### candidates

> **candidates**: [`ExtractedCandidate`](ExtractedCandidate.md)\[]

Defined in: [src/lib/memory/autoExtractWorker.ts:75](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#75)

***

### conversationId?

> `optional` **conversationId**: `string`

Defined in: [src/lib/memory/autoExtractWorker.ts:80](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#80)

***

### durationMs

> **durationMs**: `number`

Defined in: [src/lib/memory/autoExtractWorker.ts:79](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#79)

***

### failedCount

> **failedCount**: `number`

Defined in: [src/lib/memory/autoExtractWorker.ts:78](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#78)

Per-candidate retain() failures. `onError` only fires on pipeline throws.

***

### results

> **results**: [`RetainResult`](RetainResult.md)\[]

Defined in: [src/lib/memory/autoExtractWorker.ts:76](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#76)
