# ScreenResult

Defined in: [src/lib/memory/injectionScreen.ts:27](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/injectionScreen.ts#27)

Result of screening a candidate batch.

## Properties

### clean

> **clean**: [`ExtractedCandidate`](ExtractedCandidate.md)\[]

Defined in: [src/lib/memory/injectionScreen.ts:29](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/injectionScreen.ts#29)

Candidates with no injection signature — persist normally.

***

### quarantined

> **quarantined**: [`ScreenedCandidate`](ScreenedCandidate.md)\[]

Defined in: [src/lib/memory/injectionScreen.ts:31](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/injectionScreen.ts#31)

Candidates that matched a signature — persist quarantined.
