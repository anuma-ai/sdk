# LlmapiEmbeddingExtraFields

> **LlmapiEmbeddingExtraFields** = `object`

Defined in: [src/client/types.gen.ts:463](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L463)

ExtraFields contains additional metadata

## Properties

### chunk\_index?

> `optional` **chunk\_index**: `number`

Defined in: [src/client/types.gen.ts:467](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L467)

ChunkIndex is the chunk index (0 for single requests)

***

### latency?

> `optional` **latency**: `number`

Defined in: [src/client/types.gen.ts:471](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L471)

Latency is the request latency in milliseconds

***

### model\_requested?

> `optional` **model\_requested**: `string`

Defined in: [src/client/types.gen.ts:475](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L475)

ModelRequested is the model that was requested

***

### provider?

> `optional` **provider**: `string`

Defined in: [src/client/types.gen.ts:479](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L479)

Provider is the LLM provider used (e.g., "openai", "anthropic")

***

### request\_type?

> `optional` **request\_type**: `string`

Defined in: [src/client/types.gen.ts:483](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L483)

RequestType is always "embedding"
