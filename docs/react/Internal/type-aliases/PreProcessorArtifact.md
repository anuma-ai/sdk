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

Defined in: [src/lib/chat/preProcessor.ts:58](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/preProcessor.ts#58)

Dedupe key — consumers skip re-rendering the same `(type, key)` tuple
inside a single response. Optional; omit when the artifact has no
natural collision dimension.

***

### payload

> **payload**: `unknown`

Defined in: [src/lib/chat/preProcessor.ts:52](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/preProcessor.ts#52)

Renderer-specific payload. Must be JSON-serializable. Wrappers are
responsible for trimming to under 10KB after `JSON.stringify` before
emitting — the SDK does not enforce or trim, but emits a console
warning at the `runPreProcessors` boundary so oversized payloads
surface during development.

***

### type

> **type**: `string`

Defined in: [src/lib/chat/preProcessor.ts:44](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/preProcessor.ts#44)

Open string. Well-known (built-in) types: `"weather"`, `"crypto_chart"`,
`"stock_chart"`, `"search_citations"`. Consumers route known types to
renderers and ignore unknown ones.

**Namespacing convention**: built-in types are unprefixed. Third-party
and custom emitters SHOULD use a reverse-DNS-style prefix to avoid
collisions with future built-ins or other emitters — e.g.
`"com.myorg.calendar_event"` or `"acme.contact_card"`. Renderers route
by exact string match, so a third-party `"weather"` would collide with
the built-in and the user-facing card would route to whichever renderer
the consumer registered last.
