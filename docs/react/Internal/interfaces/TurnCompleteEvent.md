# TurnCompleteEvent

Defined in: [src/lib/memory/autoExtractWorker.ts:76](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#76)

## Properties

### candidates

> **candidates**: [`ExtractedCandidate`](ExtractedCandidate.md)\[]

Defined in: [src/lib/memory/autoExtractWorker.ts:77](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#77)

***

### conversationId?

> `optional` **conversationId**: `string`

Defined in: [src/lib/memory/autoExtractWorker.ts:82](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#82)

***

### durationMs

> **durationMs**: `number`

Defined in: [src/lib/memory/autoExtractWorker.ts:81](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#81)

***

### failedCount

> **failedCount**: `number`

Defined in: [src/lib/memory/autoExtractWorker.ts:80](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#80)

Per-candidate retain() failures. `onError` only fires on pipeline throws.

***

### outcome

> **outcome**: [`ExtractOutcome`](../type-aliases/ExtractOutcome.md)

Defined in: [src/lib/memory/autoExtractWorker.ts:89](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#89)

Why the turn did/didn't produce facts. `empty-after-retry` means the
extractor failed (empty/malformed after exhausting retries) — alarm on a
rising rate of it; `no-facts` is a normal quiet turn. The two were
previously indistinguishable (both surfaced as zero candidates).

***

### results

> **results**: [`RetainResult`](RetainResult.md)\[]

Defined in: [src/lib/memory/autoExtractWorker.ts:78](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#78)
