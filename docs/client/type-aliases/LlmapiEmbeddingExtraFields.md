# LlmapiEmbeddingExtraFields

> **LlmapiEmbeddingExtraFields** = `object`

Defined in: [client/types.gen.ts:128](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L128)

ExtraFields contains additional metadata

## Properties

### chunk\_index?

> `optional` **chunk\_index**: `number`

Defined in: [client/types.gen.ts:132](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L132)

ChunkIndex is the chunk index (0 for single requests)

***

### latency?

> `optional` **latency**: `number`

Defined in: [client/types.gen.ts:136](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L136)

Latency is the request latency in milliseconds

***

### model\_requested?

> `optional` **model\_requested**: `string`

Defined in: [client/types.gen.ts:140](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L140)

ModelRequested is the model that was requested

***

### provider?

> `optional` **provider**: `string`

Defined in: [client/types.gen.ts:144](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L144)

Provider is the LLM provider used (e.g., "openai", "anthropic")

***

### request\_type?

> `optional` **request\_type**: `string`

Defined in: [client/types.gen.ts:148](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L148)

RequestType is always "embedding"
