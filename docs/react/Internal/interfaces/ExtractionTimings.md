# ExtractionTimings

Defined in: [src/lib/memory/autoExtract.ts:391](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtract.ts#391)

Wall-clock split of one [extractAndRetain](../functions/extractAndRetain.md) call. The worker's
`durationMs` is the sum plus the screen; these say which half is slow.

## Properties

### extractMs

> **extractMs**: `number`

Defined in: [src/lib/memory/autoExtract.ts:393](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtract.ts#393)

The extraction LLM call, all attempts and backoff included.

***

### retainMs

> **retainMs**: `number`

Defined in: [src/lib/memory/autoExtract.ts:395](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtract.ts#395)

The retain loop — embeddings, consolidation LLM calls, writes — over every candidate.
