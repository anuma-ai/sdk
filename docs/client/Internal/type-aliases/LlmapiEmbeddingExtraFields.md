# LlmapiEmbeddingExtraFields

> **LlmapiEmbeddingExtraFields** = `object`

Defined in: [src/client/types.gen.ts:250](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L250)

ExtraFields contains additional metadata

## Properties

### chunk\_index?

> `optional` **chunk\_index**: `number`

Defined in: [src/client/types.gen.ts:254](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L254)

ChunkIndex is the chunk index (0 for single requests)

***

### latency?

> `optional` **latency**: `number`

Defined in: [src/client/types.gen.ts:258](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L258)

Latency is the request latency in milliseconds

***

### model\_requested?

> `optional` **model\_requested**: `string`

Defined in: [src/client/types.gen.ts:262](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L262)

ModelRequested is the model that was requested

***

### provider?

> `optional` **provider**: `string`

Defined in: [src/client/types.gen.ts:266](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L266)

Provider is the LLM provider used (e.g., "openai", "anthropic")

***

### request\_type?

> `optional` **request\_type**: `string`

Defined in: [src/client/types.gen.ts:270](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L270)

RequestType is always "embedding"
