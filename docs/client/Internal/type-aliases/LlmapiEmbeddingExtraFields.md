# LlmapiEmbeddingExtraFields

> **LlmapiEmbeddingExtraFields** = `object`

Defined in: [src/client/types.gen.ts:309](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#309)

ExtraFields contains additional metadata

## Properties

### chunk\_index?

> `optional` **chunk\_index**: `number`

Defined in: [src/client/types.gen.ts:313](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#313)

ChunkIndex is the chunk index (0 for single requests)

***

### latency?

> `optional` **latency**: `number`

Defined in: [src/client/types.gen.ts:317](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#317)

Latency is the request latency in milliseconds

***

### model\_requested?

> `optional` **model\_requested**: `string`

Defined in: [src/client/types.gen.ts:321](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#321)

ModelRequested is the model that was requested

***

### provider?

> `optional` **provider**: `string`

Defined in: [src/client/types.gen.ts:325](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#325)

Provider is the LLM provider used (e.g., "openai", "anthropic")

***

### request\_type?

> `optional` **request\_type**: `string`

Defined in: [src/client/types.gen.ts:329](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#329)

RequestType is always "embedding"
