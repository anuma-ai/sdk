# LlmapiEmbeddingExtraFields

> **LlmapiEmbeddingExtraFields** = `object`

Defined in: [src/client/types.gen.ts:1925](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1925)

ExtraFields contains additional metadata

## Properties

### chunk\_index?

> `optional` **chunk\_index**: `number`

Defined in: [src/client/types.gen.ts:1929](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1929)

ChunkIndex is the chunk index (0 for single requests)

***

### latency?

> `optional` **latency**: `number`

Defined in: [src/client/types.gen.ts:1933](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1933)

Latency is the request latency in milliseconds

***

### model\_requested?

> `optional` **model\_requested**: `string`

Defined in: [src/client/types.gen.ts:1937](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1937)

ModelRequested is the model that was requested

***

### provider?

> `optional` **provider**: `string`

Defined in: [src/client/types.gen.ts:1941](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1941)

Provider is the LLM provider used (e.g., "openai", "anthropic")

***

### request\_type?

> `optional` **request\_type**: `string`

Defined in: [src/client/types.gen.ts:1945](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1945)

RequestType is always "embedding"
