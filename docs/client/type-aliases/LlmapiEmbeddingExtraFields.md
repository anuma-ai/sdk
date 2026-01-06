# LlmapiEmbeddingExtraFields

> **LlmapiEmbeddingExtraFields** = `object`

Defined in: [src/client/types.gen.ts:209](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L209)

ExtraFields contains additional metadata

## Properties

### chunk\_index?

> `optional` **chunk\_index**: `number`

Defined in: [src/client/types.gen.ts:213](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L213)

ChunkIndex is the chunk index (0 for single requests)

***

### latency?

> `optional` **latency**: `number`

Defined in: [src/client/types.gen.ts:217](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L217)

Latency is the request latency in milliseconds

***

### model\_requested?

> `optional` **model\_requested**: `string`

Defined in: [src/client/types.gen.ts:221](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L221)

ModelRequested is the model that was requested

***

### provider?

> `optional` **provider**: `string`

Defined in: [src/client/types.gen.ts:225](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L225)

Provider is the LLM provider used (e.g., "openai", "anthropic")

***

### request\_type?

> `optional` **request\_type**: `string`

Defined in: [src/client/types.gen.ts:229](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L229)

RequestType is always "embedding"
