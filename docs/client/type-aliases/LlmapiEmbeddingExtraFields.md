# LlmapiEmbeddingExtraFields

> **LlmapiEmbeddingExtraFields** = `object`

Defined in: [src/client/types.gen.ts:191](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L191)

ExtraFields contains additional metadata

## Properties

### chunk\_index?

> `optional` **chunk\_index**: `number`

Defined in: [src/client/types.gen.ts:195](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L195)

ChunkIndex is the chunk index (0 for single requests)

***

### latency?

> `optional` **latency**: `number`

Defined in: [src/client/types.gen.ts:199](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L199)

Latency is the request latency in milliseconds

***

### model\_requested?

> `optional` **model\_requested**: `string`

Defined in: [src/client/types.gen.ts:203](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L203)

ModelRequested is the model that was requested

***

### provider?

> `optional` **provider**: `string`

Defined in: [src/client/types.gen.ts:207](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L207)

Provider is the LLM provider used (e.g., "openai", "anthropic")

***

### request\_type?

> `optional` **request\_type**: `string`

Defined in: [src/client/types.gen.ts:211](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L211)

RequestType is always "embedding"
