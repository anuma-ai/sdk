# LlmapiEmbeddingExtraFields

> **LlmapiEmbeddingExtraFields** = `object`

Defined in: [src/client/types.gen.ts:327](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#327)

ExtraFields contains additional metadata

## Properties

### chunk\_index?

> `optional` **chunk\_index**: `number`

Defined in: [src/client/types.gen.ts:331](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#331)

ChunkIndex is the chunk index (0 for single requests)

***

### latency?

> `optional` **latency**: `number`

Defined in: [src/client/types.gen.ts:335](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#335)

Latency is the request latency in milliseconds

***

### model\_requested?

> `optional` **model\_requested**: `string`

Defined in: [src/client/types.gen.ts:339](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#339)

ModelRequested is the model that was requested

***

### provider?

> `optional` **provider**: `string`

Defined in: [src/client/types.gen.ts:343](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#343)

Provider is the LLM provider used (e.g., "openai", "anthropic")

***

### request\_type?

> `optional` **request\_type**: `string`

Defined in: [src/client/types.gen.ts:347](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#347)

RequestType is always "embedding"
