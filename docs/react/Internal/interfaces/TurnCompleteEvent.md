# TurnCompleteEvent

Defined in: [src/lib/memory/autoExtractWorker.ts:88](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#88)

## Properties

### candidates

> **candidates**: [`ExtractedCandidate`](ExtractedCandidate.md)\[]

Defined in: [src/lib/memory/autoExtractWorker.ts:89](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#89)

***

### conversationId?

> `optional` **conversationId**: `string`

Defined in: [src/lib/memory/autoExtractWorker.ts:94](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#94)

***

### durationMs

> **durationMs**: `number`

Defined in: [src/lib/memory/autoExtractWorker.ts:93](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#93)

***

### failedCount

> **failedCount**: `number`

Defined in: [src/lib/memory/autoExtractWorker.ts:92](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#92)

Per-candidate retain() failures. `onError` only fires on pipeline throws.

***

### outcome

> **outcome**: [`ExtractOutcome`](../type-aliases/ExtractOutcome.md)

Defined in: [src/lib/memory/autoExtractWorker.ts:101](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#101)

Why the turn did/didn't produce facts. `empty-after-retry` means the
extractor failed (empty/malformed after exhausting retries) — alarm on a
rising rate of it; `no-facts` is a normal quiet turn. The two were
previously indistinguishable (both surfaced as zero candidates).

***

### results

> **results**: [`RetainResult`](RetainResult.md)\[]

Defined in: [src/lib/memory/autoExtractWorker.ts:90](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#90)
