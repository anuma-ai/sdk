# TurnCompleteEvent

Defined in: [src/lib/memory/autoExtractWorker.ts:69](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#69)

## Properties

### abandonedAfterFailures?

> `optional` **abandonedAfterFailures**: `number`

Defined in: [src/lib/memory/autoExtractWorker.ts:118](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#118)

Set when the watermark was advanced past this window although it failed, with the number of
consecutive failed turns that triggered it; `onError` fires alongside.

***

### candidates

> **candidates**: [`ExtractedCandidate`](ExtractedCandidate.md)\[]

Defined in: [src/lib/memory/autoExtractWorker.ts:70](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#70)

***

### conversationId?

> `optional` **conversationId**: `string`

Defined in: [src/lib/memory/autoExtractWorker.ts:76](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#76)

***

### durationMs

> **durationMs**: `number`

Defined in: [src/lib/memory/autoExtractWorker.ts:75](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#75)

***

### failedCount

> **failedCount**: `number`

Defined in: [src/lib/memory/autoExtractWorker.ts:73](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#73)

Per-candidate retain() failures. `onError` only fires on pipeline throws.

***

### failure?

> `optional` **failure**: [`PortalLlmFailure`](PortalLlmFailure.md)

Defined in: [src/lib/memory/autoExtractWorker.ts:99](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#99)

Present only alongside `outcome: "empty-after-retry"` — WHICH failure ended
the turn (#888).

`outcome` says extraction gave up; this says why, from a stable enum. The
distinction is the whole point: a 2026-08-11 audit measured ~63% of
production extraction turns ending in `empty-after-retry` and could not tell
from telemetry whether the cause was the freeloader 403 everyone assumed or
something else. It took a Prometheus cross-check to find the real one — the
portal returning HTTP 200 with an empty body, which it counts as a success.

Forward `failure.reason` into your extraction analytics event; all three
fields are bounded (an enum, an HTTP status, a small attempt count) and none
carries content.

***

### funnel?

> `optional` **funnel**: [`ExtractionFunnel`](ExtractionFunnel.md)

Defined in: [src/lib/memory/autoExtractWorker.ts:105](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#105)

Where the candidates went between the model and the vault, as counts — the
drops before `retain()` that `candidates`/`results` cannot show. See
[ExtractionFunnel](ExtractionFunnel.md).

***

### model?

> `optional` **model**: `string`

Defined in: [src/lib/memory/autoExtractWorker.ts:109](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#109)

The extraction model this turn asked for.

***

### outcome

> **outcome**: [`ExtractOutcome`](../type-aliases/ExtractOutcome.md)

Defined in: [src/lib/memory/autoExtractWorker.ts:83](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#83)

Why the turn did/didn't produce facts. `empty-after-retry` means the
extractor failed (empty/malformed after exhausting retries) — alarm on a
rising rate of it; `no-facts` is a normal quiet turn. The two were
previously indistinguishable (both surfaced as zero candidates).

***

### results

> **results**: [`RetainResult`](RetainResult.md)\[]

Defined in: [src/lib/memory/autoExtractWorker.ts:71](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#71)

***

### timings?

> `optional` **timings**: [`ExtractionTimings`](ExtractionTimings.md)

Defined in: [src/lib/memory/autoExtractWorker.ts:107](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#107)

Extract vs. retain wall-clock split of `durationMs`. See [ExtractionTimings](ExtractionTimings.md).

***

### transcriptChars?

> `optional` **transcriptChars**: `number`

Defined in: [src/lib/memory/autoExtractWorker.ts:113](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#113)

Characters in the transcript sent to the extraction model.

***

### windowMessageCount?

> `optional` **windowMessageCount**: `number`

Defined in: [src/lib/memory/autoExtractWorker.ts:111](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#111)

Messages in the window sent to the extraction model.

***

### writeFailureReason?

> `optional` **writeFailureReason**: [`WriteFailureReason`](../type-aliases/WriteFailureReason.md)

Defined in: [src/lib/memory/autoExtractWorker.ts:74](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#74)
