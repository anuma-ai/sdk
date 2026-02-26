# LlmapiEmbeddingExtraFields

> **LlmapiEmbeddingExtraFields** = `object`

Defined in: [src/client/types.gen.ts:670](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#670)

ExtraFields contains additional metadata

## Properties

### chunk\_index?

> `optional` **chunk\_index**: `number`

Defined in: [src/client/types.gen.ts:674](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#674)

ChunkIndex is the chunk index (0 for single requests)

***

### latency?

> `optional` **latency**: `number`

Defined in: [src/client/types.gen.ts:678](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#678)

Latency is the request latency in milliseconds

***

### model\_requested?

> `optional` **model\_requested**: `string`

Defined in: [src/client/types.gen.ts:682](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#682)

ModelRequested is the model that was requested

***

### provider?

> `optional` **provider**: `string`

Defined in: [src/client/types.gen.ts:686](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#686)

Provider is the LLM provider used (e.g., "openai", "anthropic")

***

### request\_type?

> `optional` **request\_type**: `string`

Defined in: [src/client/types.gen.ts:690](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#690)

RequestType is always "embedding"
