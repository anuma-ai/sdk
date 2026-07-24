# TurnCompleteEvent

Defined in: [src/lib/memory/autoExtractWorker.ts:105](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#105)

## Properties

### candidates

> **candidates**: [`ExtractedCandidate`](ExtractedCandidate.md)\[]

Defined in: [src/lib/memory/autoExtractWorker.ts:106](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#106)

***

### conversationId?

> `optional` **conversationId**: `string`

Defined in: [src/lib/memory/autoExtractWorker.ts:111](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#111)

***

### durationMs

> **durationMs**: `number`

Defined in: [src/lib/memory/autoExtractWorker.ts:110](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#110)

***

### failedCount

> **failedCount**: `number`

Defined in: [src/lib/memory/autoExtractWorker.ts:109](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#109)

Per-candidate retain() failures. `onError` only fires on pipeline throws.

***

### outcome

> **outcome**: [`ExtractOutcome`](../type-aliases/ExtractOutcome.md)

Defined in: [src/lib/memory/autoExtractWorker.ts:118](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#118)

Why the turn did/didn't produce facts. `empty-after-retry` means the
extractor failed (empty/malformed after exhausting retries) — alarm on a
rising rate of it; `no-facts` is a normal quiet turn. The two were
previously indistinguishable (both surfaced as zero candidates).

***

### results

> **results**: [`RetainResult`](RetainResult.md)\[]

Defined in: [src/lib/memory/autoExtractWorker.ts:107](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#107)
