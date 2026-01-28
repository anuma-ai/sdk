# MemoryRetrievalEmbeddingOptions

Defined in: [src/lib/memoryRetrieval/types.ts:51](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/memoryRetrieval/types.ts#L51)

Options for embedding generation

Supports two auth methods:

* `getToken`: For Privy identity tokens (uses Authorization: Bearer header)
* `apiKey`: For direct API keys (uses X-API-Key header)

At least one of `getToken` or `apiKey` must be provided.

## Properties

### apiKey?

> `optional` **apiKey**: `string`

Defined in: [src/lib/memoryRetrieval/types.ts:55](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/memoryRetrieval/types.ts#L55)

Direct API key for server-side usage. Uses X-API-Key header.

***

### baseUrl?

> `optional` **baseUrl**: `string`

Defined in: [src/lib/memoryRetrieval/types.ts:57](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/memoryRetrieval/types.ts#L57)

Base URL for the API

***

### getToken()?

> `optional` **getToken**: () => `Promise`<`string` | `null`>

Defined in: [src/lib/memoryRetrieval/types.ts:53](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/memoryRetrieval/types.ts#L53)

Function to get auth token (e.g., Privy's getIdentityToken). Uses Authorization: Bearer header.

**Returns**

`Promise`<`string` | `null`>

***

### model?

> `optional` **model**: `string`

Defined in: [src/lib/memoryRetrieval/types.ts:59](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/memoryRetrieval/types.ts#L59)

Embedding model to use
