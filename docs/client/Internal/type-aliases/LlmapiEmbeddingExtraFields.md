# LlmapiEmbeddingExtraFields

> **LlmapiEmbeddingExtraFields** = `object`

Defined in: [src/client/types.gen.ts:1550](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1550)

ExtraFields contains additional metadata

## Properties

### chunk\_index?

> `optional` **chunk\_index**: `number`

Defined in: [src/client/types.gen.ts:1554](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1554)

ChunkIndex is the chunk index (0 for single requests)

***

### latency?

> `optional` **latency**: `number`

Defined in: [src/client/types.gen.ts:1558](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1558)

Latency is the request latency in milliseconds

***

### model\_requested?

> `optional` **model\_requested**: `string`

Defined in: [src/client/types.gen.ts:1562](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1562)

ModelRequested is the model that was requested

***

### provider?

> `optional` **provider**: `string`

Defined in: [src/client/types.gen.ts:1566](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1566)

Provider is the LLM provider used (e.g., "openai", "anthropic")

***

### request\_type?

> `optional` **request\_type**: `string`

Defined in: [src/client/types.gen.ts:1570](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1570)

RequestType is always "embedding"
