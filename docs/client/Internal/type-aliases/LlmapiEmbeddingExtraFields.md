# LlmapiEmbeddingExtraFields

> **LlmapiEmbeddingExtraFields** = `object`

Defined in: [src/client/types.gen.ts:1096](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1096)

ExtraFields contains additional metadata

## Properties

### chunk\_index?

> `optional` **chunk\_index**: `number`

Defined in: [src/client/types.gen.ts:1100](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1100)

ChunkIndex is the chunk index (0 for single requests)

***

### latency?

> `optional` **latency**: `number`

Defined in: [src/client/types.gen.ts:1104](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1104)

Latency is the request latency in milliseconds

***

### model\_requested?

> `optional` **model\_requested**: `string`

Defined in: [src/client/types.gen.ts:1108](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1108)

ModelRequested is the model that was requested

***

### provider?

> `optional` **provider**: `string`

Defined in: [src/client/types.gen.ts:1112](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1112)

Provider is the LLM provider used (e.g., "openai", "anthropic")

***

### request\_type?

> `optional` **request\_type**: `string`

Defined in: [src/client/types.gen.ts:1116](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1116)

RequestType is always "embedding"
