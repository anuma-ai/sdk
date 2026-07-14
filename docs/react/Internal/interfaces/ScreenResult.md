# ScreenResult

Defined in: [src/lib/memory/injectionScreen.ts:59](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/injectionScreen.ts#59)

Result of screening a candidate batch.

## Properties

### clean

> **clean**: [`ExtractedCandidate`](ExtractedCandidate.md)\[]

Defined in: [src/lib/memory/injectionScreen.ts:61](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/injectionScreen.ts#61)

Candidates with no injection signature — persist normally.

***

### quarantined

> **quarantined**: [`ScreenedCandidate`](ScreenedCandidate.md)\[]

Defined in: [src/lib/memory/injectionScreen.ts:63](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/injectionScreen.ts#63)

Candidates that matched a signature — persist quarantined.
