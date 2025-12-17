# LlmapiEmbeddingExtraFields

> **LlmapiEmbeddingExtraFields** = `object`

Defined in: [src/client/types.gen.ts:164](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L164)

ExtraFields contains additional metadata

## Properties

### chunk\_index?

> `optional` **chunk\_index**: `number`

Defined in: [src/client/types.gen.ts:168](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L168)

ChunkIndex is the chunk index (0 for single requests)

***

### latency?

> `optional` **latency**: `number`

Defined in: [src/client/types.gen.ts:172](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L172)

Latency is the request latency in milliseconds

***

### model\_requested?

> `optional` **model\_requested**: `string`

Defined in: [src/client/types.gen.ts:176](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L176)

ModelRequested is the model that was requested

***

### provider?

> `optional` **provider**: `string`

Defined in: [src/client/types.gen.ts:180](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L180)

Provider is the LLM provider used (e.g., "openai", "anthropic")

***

### request\_type?

> `optional` **request\_type**: `string`

Defined in: [src/client/types.gen.ts:184](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L184)

RequestType is always "embedding"
