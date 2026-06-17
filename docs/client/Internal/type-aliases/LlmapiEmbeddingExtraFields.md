# LlmapiEmbeddingExtraFields

> **LlmapiEmbeddingExtraFields** = `object`

Defined in: [src/client/types.gen.ts:303](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#303)

ExtraFields contains additional metadata

## Properties

### chunk\_index?

> `optional` **chunk\_index**: `number`

Defined in: [src/client/types.gen.ts:307](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#307)

ChunkIndex is the chunk index (0 for single requests)

***

### latency?

> `optional` **latency**: `number`

Defined in: [src/client/types.gen.ts:311](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#311)

Latency is the request latency in milliseconds

***

### model\_requested?

> `optional` **model\_requested**: `string`

Defined in: [src/client/types.gen.ts:315](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#315)

ModelRequested is the model that was requested

***

### provider?

> `optional` **provider**: `string`

Defined in: [src/client/types.gen.ts:319](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#319)

Provider is the LLM provider used (e.g., "openai", "anthropic")

***

### request\_type?

> `optional` **request\_type**: `string`

Defined in: [src/client/types.gen.ts:323](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#323)

RequestType is always "embedding"
