# ExtractionFunnel

Defined in: [src/lib/memory/autoExtract.ts:365](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtract.ts#365)

Where a turn's candidates went between the model's completion and the vault —
every stage that can drop one, as a count. Returned by [extractAndRetain](../functions/extractAndRetain.md)
and forwarded on `TurnCompleteEvent` so a host can emit it; nothing here is
content.

Reads as a funnel: `raw ≥ valid ≥ afterRedaction ≥ aboveConfidence`, then
`aboveConfidence = quarantined + retained + failed`.

## Properties

### aboveConfidenceCount

> **aboveConfidenceCount**: `number`

Defined in: [src/lib/memory/autoExtract.ts:373](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtract.ts#373)

Survivors of the `minConfidence` floor — the candidates that reached the injection screen.

***

### afterRedactionCount

> **afterRedactionCount**: `number`

Defined in: [src/lib/memory/autoExtract.ts:371](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtract.ts#371)

Survivors of PII de-anonymization (equals `validCandidateCount` when redaction is off).

***

### failedCount

> **failedCount**: `number`

Defined in: [src/lib/memory/autoExtract.ts:383](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtract.ts#383)

`retain()` threw.

***

### quarantinedCount

> **quarantinedCount**: `number`

Defined in: [src/lib/memory/autoExtract.ts:379](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtract.ts#379)

Held for review by the injection screen and SUCCESSFULLY persisted — the
same set as `extractAndRetain`'s `quarantined`. A screened candidate whose
`retain()` threw is in `failedCount` instead, never both.

***

### rawCandidateCount

> **rawCandidateCount**: `number`

Defined in: [src/lib/memory/autoExtract.ts:367](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtract.ts#367)

Candidates in the model's completion, before any validation.

***

### retainedCount

> **retainedCount**: `number`

Defined in: [src/lib/memory/autoExtract.ts:381](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtract.ts#381)

Written through `retain()` (any disposition).

***

### validCandidateCount

> **validCandidateCount**: `number`

Defined in: [src/lib/memory/autoExtract.ts:369](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtract.ts#369)

Survivors of validateCandidates (shape, length, low-signal, confidence-is-a-number).
