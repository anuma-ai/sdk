# LlmapiEmbeddingExtraFields

> **LlmapiEmbeddingExtraFields** = `object`

Defined in: [src/client/types.gen.ts:574](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L574)

ExtraFields contains additional metadata

## Properties

### chunk\_index?

> `optional` **chunk\_index**: `number`

Defined in: [src/client/types.gen.ts:578](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L578)

ChunkIndex is the chunk index (0 for single requests)

***

### latency?

> `optional` **latency**: `number`

Defined in: [src/client/types.gen.ts:582](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L582)

Latency is the request latency in milliseconds

***

### model\_requested?

> `optional` **model\_requested**: `string`

Defined in: [src/client/types.gen.ts:586](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L586)

ModelRequested is the model that was requested

***

### provider?

> `optional` **provider**: `string`

Defined in: [src/client/types.gen.ts:590](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L590)

Provider is the LLM provider used (e.g., "openai", "anthropic")

***

### request\_type?

> `optional` **request\_type**: `string`

Defined in: [src/client/types.gen.ts:594](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L594)

RequestType is always "embedding"
