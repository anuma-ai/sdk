# PortalLlmAuth

Defined in: [src/lib/memory/portalLlm.ts:112](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/portalLlm.ts#112)

Auth for portal LLM calls (extraction, consolidation, decomposition,
reflection). Mirrors `memoryEngine`'s `EmbeddingOptions` dual-auth:

* `apiKey`: For direct API keys (uses x-api-key header)
* `getToken`: For Privy identity tokens (uses Authorization: Bearer header)

At least one of `apiKey` or `getToken` must be provided (enforced at
runtime); `apiKey` takes precedence when both are set.

## Extended by

* [`ExtractFactsOptions`](ExtractFactsOptions.md)
* [`InjectionClassifierOptions`](InjectionClassifierOptions.md)
* [`LlmDecayClassifierOptions`](LlmDecayClassifierOptions.md)
* [`LlmNeighborRefinerOptions`](LlmNeighborRefinerOptions.md)
* [`ReflectOptions`](ReflectOptions.md)
* [`SynthesizeProfileOptions`](SynthesizeProfileOptions.md)
* [`TopicExtractOptions`](TopicExtractOptions.md)
* [`VerifyMemoriesForPublishOptions`](VerifyMemoriesForPublishOptions.md)

## Properties

### apiKey?

> `optional` **apiKey**: `string`

Defined in: [src/lib/memory/portalLlm.ts:114](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/portalLlm.ts#114)

Direct API key — sent as `x-api-key` (server-side / CLI usage). Wins when both are provided.

***

### getToken()?

> `optional` **getToken**: () => `Promise`<`string` | `null`>

Defined in: [src/lib/memory/portalLlm.ts:116](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/portalLlm.ts#116)

Function to get an auth token (e.g., Privy's getIdentityToken). Token is sent as `Authorization: Bearer`.

**Returns**

`Promise`<`string` | `null`>
