# LlmapiEmbeddingExtraFields

> **LlmapiEmbeddingExtraFields** = `object`

Defined in: [src/client/types.gen.ts:507](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L507)

ExtraFields contains additional metadata

## Properties

### chunk\_index?

> `optional` **chunk\_index**: `number`

Defined in: [src/client/types.gen.ts:511](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L511)

ChunkIndex is the chunk index (0 for single requests)

***

### latency?

> `optional` **latency**: `number`

Defined in: [src/client/types.gen.ts:515](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L515)

Latency is the request latency in milliseconds

***

### model\_requested?

> `optional` **model\_requested**: `string`

Defined in: [src/client/types.gen.ts:519](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L519)

ModelRequested is the model that was requested

***

### provider?

> `optional` **provider**: `string`

Defined in: [src/client/types.gen.ts:523](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L523)

Provider is the LLM provider used (e.g., "openai", "anthropic")

***

### request\_type?

> `optional` **request\_type**: `string`

Defined in: [src/client/types.gen.ts:527](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L527)

RequestType is always "embedding"
