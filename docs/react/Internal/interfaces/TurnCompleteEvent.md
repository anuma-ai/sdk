# TurnCompleteEvent

Defined in: [src/lib/memory/autoExtractWorker.ts:120](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#120)

## Properties

### candidates

> **candidates**: [`ExtractedCandidate`](ExtractedCandidate.md)\[]

Defined in: [src/lib/memory/autoExtractWorker.ts:121](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#121)

***

### conversationId?

> `optional` **conversationId**: `string`

Defined in: [src/lib/memory/autoExtractWorker.ts:126](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#126)

***

### durationMs

> **durationMs**: `number`

Defined in: [src/lib/memory/autoExtractWorker.ts:125](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#125)

***

### failedCount

> **failedCount**: `number`

Defined in: [src/lib/memory/autoExtractWorker.ts:124](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#124)

Per-candidate retain() failures. `onError` only fires on pipeline throws.

***

### failure?

> `optional` **failure**: [`PortalLlmFailure`](PortalLlmFailure.md)

Defined in: [src/lib/memory/autoExtractWorker.ts:149](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#149)

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

Defined in: [src/lib/memory/autoExtractWorker.ts:155](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#155)

Where the candidates went between the model and the vault, as counts — the
drops before `retain()` that `candidates`/`results` cannot show. See
[ExtractionFunnel](ExtractionFunnel.md).

***

### model?

> `optional` **model**: `string`

Defined in: [src/lib/memory/autoExtractWorker.ts:159](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#159)

The extraction model this turn asked for.

***

### outcome

> **outcome**: [`ExtractOutcome`](../type-aliases/ExtractOutcome.md)

Defined in: [src/lib/memory/autoExtractWorker.ts:133](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#133)

Why the turn did/didn't produce facts. `empty-after-retry` means the
extractor failed (empty/malformed after exhausting retries) — alarm on a
rising rate of it; `no-facts` is a normal quiet turn. The two were
previously indistinguishable (both surfaced as zero candidates).

***

### results

> **results**: [`RetainResult`](RetainResult.md)\[]

Defined in: [src/lib/memory/autoExtractWorker.ts:122](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#122)

***

### timings?

> `optional` **timings**: [`ExtractionTimings`](ExtractionTimings.md)

Defined in: [src/lib/memory/autoExtractWorker.ts:157](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#157)

Extract vs. retain wall-clock split of `durationMs`. See [ExtractionTimings](ExtractionTimings.md).
