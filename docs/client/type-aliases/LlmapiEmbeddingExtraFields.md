# LlmapiEmbeddingExtraFields

> **LlmapiEmbeddingExtraFields** = \{ `chunk_index?`: `number`; `latency?`: `number`; `model_requested?`: `string`; `provider?`: `string`; `request_type?`: `string`; \}

Defined in: [src/client/types.gen.ts:247](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L247)

ExtraFields contains additional metadata

## Properties

### chunk\_index?

> `optional` **chunk\_index**: `number`

Defined in: [src/client/types.gen.ts:251](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L251)

ChunkIndex is the chunk index (0 for single requests)

***

### latency?

> `optional` **latency**: `number`

Defined in: [src/client/types.gen.ts:255](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L255)

Latency is the request latency in milliseconds

***

### model\_requested?

> `optional` **model\_requested**: `string`

Defined in: [src/client/types.gen.ts:259](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L259)

ModelRequested is the model that was requested

***

### provider?

> `optional` **provider**: `string`

Defined in: [src/client/types.gen.ts:263](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L263)

Provider is the LLM provider used (e.g., "openai", "anthropic")

***

### request\_type?

> `optional` **request\_type**: `string`

Defined in: [src/client/types.gen.ts:267](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L267)

RequestType is always "embedding"
