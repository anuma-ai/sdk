# EnrichedPreProcessorResult

> **EnrichedPreProcessorResult** = `object`

Defined in: [src/lib/chat/preProcessor.ts:60](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/preProcessor.ts#60)

Carries an artifact alongside the text the LLM sees.

Returning this shape from a pre-processor (or from one of the built-in
`fetch*Data` callbacks) lets the wrapper deliver structured UI data to
the consumer without involving the LLM. The runtime extracts `artifact`
and inlines `text` as a normal enrichment message via `wrapAsUserText`.

## Properties

### artifact?

> `optional` **artifact**: [`PreProcessorArtifact`](PreProcessorArtifact.md)

Defined in: [src/lib/chat/preProcessor.ts:62](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/preProcessor.ts#62)

***

### text

> **text**: `string`

Defined in: [src/lib/chat/preProcessor.ts:61](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/preProcessor.ts#61)
