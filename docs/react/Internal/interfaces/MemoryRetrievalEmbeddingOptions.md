# MemoryRetrievalEmbeddingOptions

Defined in: [src/lib/memoryRetrieval/types.ts:45](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/memoryRetrieval/types.ts#L45)

Options for embedding generation

## Properties

### baseUrl?

> `optional` **baseUrl**: `string`

Defined in: [src/lib/memoryRetrieval/types.ts:49](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/memoryRetrieval/types.ts#L49)

Base URL for the API

***

### getToken()

> **getToken**: () => `Promise`<`string` | `null`>

Defined in: [src/lib/memoryRetrieval/types.ts:47](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/memoryRetrieval/types.ts#L47)

Function to get auth token (e.g., Privy's getIdentityToken)

**Returns**

`Promise`<`string` | `null`>

***

### model?

> `optional` **model**: `string`

Defined in: [src/lib/memoryRetrieval/types.ts:51](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/memoryRetrieval/types.ts#L51)

Embedding model to use
