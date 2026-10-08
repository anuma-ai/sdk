# ExtractionFunnel

Defined in: [src/lib/memory/autoExtract.ts:319](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtract.ts#319)

Where a turn's candidates went between the model's completion and the vault —
every stage that can drop one, as a count. Returned by [extractAndRetain](../functions/extractAndRetain.md)
and forwarded on `TurnCompleteEvent` so a host can emit it; nothing here is
content.

Reads as a funnel: `raw ≥ valid ≥ afterRedaction ≥ aboveConfidence`, then
`aboveConfidence = quarantined + retained + failed`.

## Properties

### aboveConfidenceCount

> **aboveConfidenceCount**: `number`

Defined in: [src/lib/memory/autoExtract.ts:327](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtract.ts#327)

Survivors of the `minConfidence` floor — the candidates that reached the injection screen.

***

### afterRedactionCount

> **afterRedactionCount**: `number`

Defined in: [src/lib/memory/autoExtract.ts:325](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtract.ts#325)

Survivors of PII de-anonymization (equals `validCandidateCount` when redaction is off).

***

### failedCount

> **failedCount**: `number`

Defined in: [src/lib/memory/autoExtract.ts:337](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtract.ts#337)

`retain()` threw.

***

### quarantinedCount

> **quarantinedCount**: `number`

Defined in: [src/lib/memory/autoExtract.ts:333](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtract.ts#333)

Held for review by the injection screen and SUCCESSFULLY persisted — the
same set as `extractAndRetain`'s `quarantined`. A screened candidate whose
`retain()` threw is in `failedCount` instead, never both.

***

### rawCandidateCount

> **rawCandidateCount**: `number`

Defined in: [src/lib/memory/autoExtract.ts:321](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtract.ts#321)

Candidates in the model's completion, before any validation.

***

### retainedCount

> **retainedCount**: `number`

Defined in: [src/lib/memory/autoExtract.ts:335](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtract.ts#335)

Written through `retain()` (any disposition).

***

### validCandidateCount

> **validCandidateCount**: `number`

Defined in: [src/lib/memory/autoExtract.ts:323](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtract.ts#323)

Survivors of validateCandidates (shape, length, low-signal, confidence-is-a-number).
