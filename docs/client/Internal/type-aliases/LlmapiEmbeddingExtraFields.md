# LlmapiEmbeddingExtraFields

> **LlmapiEmbeddingExtraFields** = `object`

Defined in: [src/client/types.gen.ts:1134](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1134)

ExtraFields contains additional metadata

## Properties

### chunk\_index?

> `optional` **chunk\_index**: `number`

Defined in: [src/client/types.gen.ts:1138](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1138)

ChunkIndex is the chunk index (0 for single requests)

***

### latency?

> `optional` **latency**: `number`

Defined in: [src/client/types.gen.ts:1142](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1142)

Latency is the request latency in milliseconds

***

### model\_requested?

> `optional` **model\_requested**: `string`

Defined in: [src/client/types.gen.ts:1146](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1146)

ModelRequested is the model that was requested

***

### provider?

> `optional` **provider**: `string`

Defined in: [src/client/types.gen.ts:1150](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1150)

Provider is the LLM provider used (e.g., "openai", "anthropic")

***

### request\_type?

> `optional` **request\_type**: `string`

Defined in: [src/client/types.gen.ts:1154](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1154)

RequestType is always "embedding"
