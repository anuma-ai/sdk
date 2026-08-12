# TurnCompleteEvent

Defined in: [src/lib/memory/autoExtractWorker.ts:118](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#118)

## Properties

### candidates

> **candidates**: [`ExtractedCandidate`](ExtractedCandidate.md)\[]

Defined in: [src/lib/memory/autoExtractWorker.ts:119](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#119)

***

### conversationId?

> `optional` **conversationId**: `string`

Defined in: [src/lib/memory/autoExtractWorker.ts:124](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#124)

***

### durationMs

> **durationMs**: `number`

Defined in: [src/lib/memory/autoExtractWorker.ts:123](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#123)

***

### failedCount

> **failedCount**: `number`

Defined in: [src/lib/memory/autoExtractWorker.ts:122](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#122)

Per-candidate retain() failures. `onError` only fires on pipeline throws.

***

### failure?

> `optional` **failure**: [`PortalLlmFailure`](PortalLlmFailure.md)

Defined in: [src/lib/memory/autoExtractWorker.ts:147](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#147)

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

### outcome

> **outcome**: [`ExtractOutcome`](../type-aliases/ExtractOutcome.md)

Defined in: [src/lib/memory/autoExtractWorker.ts:131](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#131)

Why the turn did/didn't produce facts. `empty-after-retry` means the
extractor failed (empty/malformed after exhausting retries) — alarm on a
rising rate of it; `no-facts` is a normal quiet turn. The two were
previously indistinguishable (both surfaced as zero candidates).

***

### results

> **results**: [`RetainResult`](RetainResult.md)\[]

Defined in: [src/lib/memory/autoExtractWorker.ts:120](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtractWorker.ts#120)
