# ScreenResult

Defined in: [src/lib/memory/injectionScreen.ts:51](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/injectionScreen.ts#51)

Result of screening a candidate batch.

## Properties

### clean

> **clean**: [`ExtractedCandidate`](ExtractedCandidate.md)\[]

Defined in: [src/lib/memory/injectionScreen.ts:53](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/injectionScreen.ts#53)

Candidates with no injection signature — persist normally.

***

### quarantined

> **quarantined**: [`ScreenedCandidate`](ScreenedCandidate.md)\[]

Defined in: [src/lib/memory/injectionScreen.ts:55](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/injectionScreen.ts#55)

Candidates that matched a signature — persist quarantined.
