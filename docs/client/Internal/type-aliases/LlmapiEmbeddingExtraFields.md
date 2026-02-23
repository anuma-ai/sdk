# LlmapiEmbeddingExtraFields

> **LlmapiEmbeddingExtraFields** = `object`

Defined in: [src/client/types.gen.ts:621](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L621)

ExtraFields contains additional metadata

## Properties

### chunk\_index?

> `optional` **chunk\_index**: `number`

Defined in: [src/client/types.gen.ts:625](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L625)

ChunkIndex is the chunk index (0 for single requests)

***

### latency?

> `optional` **latency**: `number`

Defined in: [src/client/types.gen.ts:629](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L629)

Latency is the request latency in milliseconds

***

### model\_requested?

> `optional` **model\_requested**: `string`

Defined in: [src/client/types.gen.ts:633](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L633)

ModelRequested is the model that was requested

***

### provider?

> `optional` **provider**: `string`

Defined in: [src/client/types.gen.ts:637](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L637)

Provider is the LLM provider used (e.g., "openai", "anthropic")

***

### request\_type?

> `optional` **request\_type**: `string`

Defined in: [src/client/types.gen.ts:641](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L641)

RequestType is always "embedding"
