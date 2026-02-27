# LlmapiEmbeddingExtraFields

> **LlmapiEmbeddingExtraFields** = `object`

Defined in: [src/client/types.gen.ts:870](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#870)

ExtraFields contains additional metadata

## Properties

### chunk\_index?

> `optional` **chunk\_index**: `number`

Defined in: [src/client/types.gen.ts:874](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#874)

ChunkIndex is the chunk index (0 for single requests)

***

### latency?

> `optional` **latency**: `number`

Defined in: [src/client/types.gen.ts:878](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#878)

Latency is the request latency in milliseconds

***

### model\_requested?

> `optional` **model\_requested**: `string`

Defined in: [src/client/types.gen.ts:882](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#882)

ModelRequested is the model that was requested

***

### provider?

> `optional` **provider**: `string`

Defined in: [src/client/types.gen.ts:886](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#886)

Provider is the LLM provider used (e.g., "openai", "anthropic")

***

### request\_type?

> `optional` **request\_type**: `string`

Defined in: [src/client/types.gen.ts:890](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#890)

RequestType is always "embedding"
