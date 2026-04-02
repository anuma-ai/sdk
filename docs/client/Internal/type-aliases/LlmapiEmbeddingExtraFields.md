# LlmapiEmbeddingExtraFields

> **LlmapiEmbeddingExtraFields** = `object`

Defined in: [src/client/types.gen.ts:1543](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1543)

ExtraFields contains additional metadata

## Properties

### chunk\_index?

> `optional` **chunk\_index**: `number`

Defined in: [src/client/types.gen.ts:1547](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1547)

ChunkIndex is the chunk index (0 for single requests)

***

### latency?

> `optional` **latency**: `number`

Defined in: [src/client/types.gen.ts:1551](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1551)

Latency is the request latency in milliseconds

***

### model\_requested?

> `optional` **model\_requested**: `string`

Defined in: [src/client/types.gen.ts:1555](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1555)

ModelRequested is the model that was requested

***

### provider?

> `optional` **provider**: `string`

Defined in: [src/client/types.gen.ts:1559](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1559)

Provider is the LLM provider used (e.g., "openai", "anthropic")

***

### request\_type?

> `optional` **request\_type**: `string`

Defined in: [src/client/types.gen.ts:1563](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1563)

RequestType is always "embedding"
