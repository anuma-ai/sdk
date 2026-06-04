# EnrichedPreProcessorResult

> **EnrichedPreProcessorResult** = `object`

Defined in: [src/lib/chat/preProcessor.ts:72](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/preProcessor.ts#72)

Pre-processor return shape that carries UI artifacts alongside the
conversation enrichment messages. The runtime appends `messages` to the
LLM request and surfaces `artifacts` via `onPreProcessorArtifact` plus
the final result.

Use this shape from a pre-processor (or a built-in `fetch*Data` callback)
when you want to render a UI card without making the LLM follow up with
a `display_*` tool call. Returning a plain `LlmapiMessage[]` from a
pre-processor remains valid for the text-only case.

## Properties

### artifacts?

> `optional` **artifacts**: [`PreProcessorArtifact`](PreProcessorArtifact.md)\[]

Defined in: [src/lib/chat/preProcessor.ts:77](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/preProcessor.ts#77)

UI artifacts to surface to the consumer. Order is preserved.

***

### messages

> **messages**: [`LlmapiMessage`](../../../client/Internal/type-aliases/LlmapiMessage.md)\[]

Defined in: [src/lib/chat/preProcessor.ts:75](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/preProcessor.ts#75)

Enrichment messages appended to the LLM request. May be empty when the
artifact is the only payload.
