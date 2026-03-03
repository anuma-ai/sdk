# MemoryEngineEmbeddingOptions

Defined in: [src/lib/memoryEngine/types.ts:61](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryEngine/types.ts#61)

Options for embedding generation

Supports two auth methods:

* `getToken`: For Privy identity tokens (uses Authorization: Bearer header)
* `apiKey`: For direct API keys (uses X-API-Key header)

At least one of `getToken` or `apiKey` must be provided.

## Properties

### apiKey?

> `optional` **apiKey**: `string`

Defined in: [src/lib/memoryEngine/types.ts:65](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryEngine/types.ts#65)

Direct API key for server-side usage. Uses X-API-Key header.

***

### baseUrl?

> `optional` **baseUrl**: `string`

Defined in: [src/lib/memoryEngine/types.ts:67](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryEngine/types.ts#67)

Base URL for the API

***

### batchSize?

> `optional` **batchSize**: `number`

Defined in: [src/lib/memoryEngine/types.ts:71](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryEngine/types.ts#71)

Max texts per API call for batch embeddings (default: 100). Larger arrays are split into chunks.

***

### getToken()?

> `optional` **getToken**: () => `Promise`<`string` | `null`>

Defined in: [src/lib/memoryEngine/types.ts:63](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryEngine/types.ts#63)

Function to get auth token (e.g., Privy's getIdentityToken). Uses Authorization: Bearer header.

**Returns**

`Promise`<`string` | `null`>

***

### model?

> `optional` **model**: `string`

Defined in: [src/lib/memoryEngine/types.ts:69](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryEngine/types.ts#69)

Embedding model to use
