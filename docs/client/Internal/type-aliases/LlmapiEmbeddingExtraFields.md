# LlmapiEmbeddingExtraFields

> **LlmapiEmbeddingExtraFields** = `object`

Defined in: [src/client/types.gen.ts:357](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#357)

ExtraFields contains additional metadata

## Properties

### chunk\_index?

> `optional` **chunk\_index**: `number`

Defined in: [src/client/types.gen.ts:361](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#361)

ChunkIndex is the chunk index (0 for single requests)

***

### latency?

> `optional` **latency**: `number`

Defined in: [src/client/types.gen.ts:365](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#365)

Latency is the request latency in milliseconds

***

### model\_requested?

> `optional` **model\_requested**: `string`

Defined in: [src/client/types.gen.ts:369](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#369)

ModelRequested is the model that was requested

***

### provider?

> `optional` **provider**: `string`

Defined in: [src/client/types.gen.ts:373](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#373)

Provider is the LLM provider used (e.g., "openai", "anthropic")

***

### request\_type?

> `optional` **request\_type**: `string`

Defined in: [src/client/types.gen.ts:377](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#377)

RequestType is always "embedding"
