# PreProcessorArtifact

> **PreProcessorArtifact** = `object`

Defined in: [src/lib/chat/preProcessor.ts:30](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/preProcessor.ts#30)

Optional UI artifact a pre-processor may emit alongside its enrichment
messages. The SDK does not interpret `payload` — it surfaces the artifact
via the `onPreProcessorArtifact` callback (pre-LLM render) and on
`RunToolLoopResult.preProcessorArtifacts` (post-stream / persistence).

Renderers on the consumer side route by `type` and dedupe by `(type, key)`.

## Properties

### key?

> `optional` **key**: `string`

Defined in: [src/lib/chat/preProcessor.ts:49](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/preProcessor.ts#49)

Dedupe key — consumers skip re-rendering the same `(type, key)` tuple
inside a single response. Optional; omit when the artifact has no
natural collision dimension.

***

### payload

> **payload**: `unknown`

Defined in: [src/lib/chat/preProcessor.ts:43](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/preProcessor.ts#43)

Renderer-specific payload. Must be JSON-serializable. Wrappers are
responsible for trimming to under 10KB after `JSON.stringify` before
emitting — the SDK does not enforce or trim.

***

### type

> **type**: `string`

Defined in: [src/lib/chat/preProcessor.ts:37](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/preProcessor.ts#37)

Open string. Well-known types: `"weather"`, `"crypto_chart"`,
`"stock_chart"`, `"search_citations"`. Custom pre-processors are free to
emit any type — consumers route known types to renderers and ignore
unknown ones.
