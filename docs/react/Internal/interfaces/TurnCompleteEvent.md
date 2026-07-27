# TurnCompleteEvent

Defined in: [src/lib/memory/autoExtractWorker.ts:117](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#117)

## Properties

### candidates

> **candidates**: [`ExtractedCandidate`](ExtractedCandidate.md)\[]

Defined in: [src/lib/memory/autoExtractWorker.ts:118](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#118)

***

### conversationId?

> `optional` **conversationId**: `string`

Defined in: [src/lib/memory/autoExtractWorker.ts:123](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#123)

***

### durationMs

> **durationMs**: `number`

Defined in: [src/lib/memory/autoExtractWorker.ts:122](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#122)

***

### failedCount

> **failedCount**: `number`

Defined in: [src/lib/memory/autoExtractWorker.ts:121](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#121)

Per-candidate retain() failures. `onError` only fires on pipeline throws.

***

### outcome

> **outcome**: [`ExtractOutcome`](../type-aliases/ExtractOutcome.md)

Defined in: [src/lib/memory/autoExtractWorker.ts:130](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#130)

Why the turn did/didn't produce facts. `empty-after-retry` means the
extractor failed (empty/malformed after exhausting retries) — alarm on a
rising rate of it; `no-facts` is a normal quiet turn. The two were
previously indistinguishable (both surfaced as zero candidates).

***

### results

> **results**: [`RetainResult`](RetainResult.md)\[]

Defined in: [src/lib/memory/autoExtractWorker.ts:119](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#119)
