# LlmapiEmbeddingExtraFields

> **LlmapiEmbeddingExtraFields** = `object`

Defined in: [src/client/types.gen.ts:982](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#982)

ExtraFields contains additional metadata

## Properties

### chunk\_index?

> `optional` **chunk\_index**: `number`

Defined in: [src/client/types.gen.ts:986](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#986)

ChunkIndex is the chunk index (0 for single requests)

***

### latency?

> `optional` **latency**: `number`

Defined in: [src/client/types.gen.ts:990](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#990)

Latency is the request latency in milliseconds

***

### model\_requested?

> `optional` **model\_requested**: `string`

Defined in: [src/client/types.gen.ts:994](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#994)

ModelRequested is the model that was requested

***

### provider?

> `optional` **provider**: `string`

Defined in: [src/client/types.gen.ts:998](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#998)

Provider is the LLM provider used (e.g., "openai", "anthropic")

***

### request\_type?

> `optional` **request\_type**: `string`

Defined in: [src/client/types.gen.ts:1002](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1002)

RequestType is always "embedding"
