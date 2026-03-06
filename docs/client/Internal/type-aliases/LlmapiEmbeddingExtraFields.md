# LlmapiEmbeddingExtraFields

> **LlmapiEmbeddingExtraFields** = `object`

Defined in: [src/client/types.gen.ts:1028](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1028)

ExtraFields contains additional metadata

## Properties

### chunk\_index?

> `optional` **chunk\_index**: `number`

Defined in: [src/client/types.gen.ts:1032](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1032)

ChunkIndex is the chunk index (0 for single requests)

***

### latency?

> `optional` **latency**: `number`

Defined in: [src/client/types.gen.ts:1036](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1036)

Latency is the request latency in milliseconds

***

### model\_requested?

> `optional` **model\_requested**: `string`

Defined in: [src/client/types.gen.ts:1040](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1040)

ModelRequested is the model that was requested

***

### provider?

> `optional` **provider**: `string`

Defined in: [src/client/types.gen.ts:1044](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1044)

Provider is the LLM provider used (e.g., "openai", "anthropic")

***

### request\_type?

> `optional` **request\_type**: `string`

Defined in: [src/client/types.gen.ts:1048](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1048)

RequestType is always "embedding"
