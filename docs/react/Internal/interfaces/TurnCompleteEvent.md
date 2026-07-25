# TurnCompleteEvent

Defined in: [src/lib/memory/autoExtractWorker.ts:111](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#111)

## Properties

### candidates

> **candidates**: [`ExtractedCandidate`](ExtractedCandidate.md)\[]

Defined in: [src/lib/memory/autoExtractWorker.ts:112](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#112)

***

### conversationId?

> `optional` **conversationId**: `string`

Defined in: [src/lib/memory/autoExtractWorker.ts:117](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#117)

***

### durationMs

> **durationMs**: `number`

Defined in: [src/lib/memory/autoExtractWorker.ts:116](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#116)

***

### failedCount

> **failedCount**: `number`

Defined in: [src/lib/memory/autoExtractWorker.ts:115](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#115)

Per-candidate retain() failures. `onError` only fires on pipeline throws.

***

### outcome

> **outcome**: [`ExtractOutcome`](../type-aliases/ExtractOutcome.md)

Defined in: [src/lib/memory/autoExtractWorker.ts:124](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#124)

Why the turn did/didn't produce facts. `empty-after-retry` means the
extractor failed (empty/malformed after exhausting retries) — alarm on a
rising rate of it; `no-facts` is a normal quiet turn. The two were
previously indistinguishable (both surfaced as zero candidates).

***

### results

> **results**: [`RetainResult`](RetainResult.md)\[]

Defined in: [src/lib/memory/autoExtractWorker.ts:113](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#113)
