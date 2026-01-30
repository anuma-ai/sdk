# LlmapiEmbeddingExtraFields

> **LlmapiEmbeddingExtraFields** = `object`

Defined in: [src/client/types.gen.ts:342](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L342)

ExtraFields contains additional metadata

## Properties

### chunk\_index?

> `optional` **chunk\_index**: `number`

Defined in: [src/client/types.gen.ts:346](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L346)

ChunkIndex is the chunk index (0 for single requests)

***

### latency?

> `optional` **latency**: `number`

Defined in: [src/client/types.gen.ts:350](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L350)

Latency is the request latency in milliseconds

***

### model\_requested?

> `optional` **model\_requested**: `string`

Defined in: [src/client/types.gen.ts:354](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L354)

ModelRequested is the model that was requested

***

### provider?

> `optional` **provider**: `string`

Defined in: [src/client/types.gen.ts:358](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L358)

Provider is the LLM provider used (e.g., "openai", "anthropic")

***

### request\_type?

> `optional` **request\_type**: `string`

Defined in: [src/client/types.gen.ts:362](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L362)

RequestType is always "embedding"
