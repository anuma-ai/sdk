# LlmapiEmbeddingExtraFields

> **LlmapiEmbeddingExtraFields** = `object`

Defined in: [src/client/types.gen.ts:926](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#926)

ExtraFields contains additional metadata

## Properties

### chunk\_index?

> `optional` **chunk\_index**: `number`

Defined in: [src/client/types.gen.ts:930](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#930)

ChunkIndex is the chunk index (0 for single requests)

***

### latency?

> `optional` **latency**: `number`

Defined in: [src/client/types.gen.ts:934](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#934)

Latency is the request latency in milliseconds

***

### model\_requested?

> `optional` **model\_requested**: `string`

Defined in: [src/client/types.gen.ts:938](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#938)

ModelRequested is the model that was requested

***

### provider?

> `optional` **provider**: `string`

Defined in: [src/client/types.gen.ts:942](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#942)

Provider is the LLM provider used (e.g., "openai", "anthropic")

***

### request\_type?

> `optional` **request\_type**: `string`

Defined in: [src/client/types.gen.ts:946](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#946)

RequestType is always "embedding"
