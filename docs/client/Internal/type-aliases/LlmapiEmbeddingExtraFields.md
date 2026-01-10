# LlmapiEmbeddingExtraFields

> **LlmapiEmbeddingExtraFields** = `object`

Defined in: src/client/types.gen.ts:247

ExtraFields contains additional metadata

## Properties

### chunk\_index?

> `optional` **chunk\_index**: `number`

Defined in: src/client/types.gen.ts:251

ChunkIndex is the chunk index (0 for single requests)

***

### latency?

> `optional` **latency**: `number`

Defined in: src/client/types.gen.ts:255

Latency is the request latency in milliseconds

***

### model\_requested?

> `optional` **model\_requested**: `string`

Defined in: src/client/types.gen.ts:259

ModelRequested is the model that was requested

***

### provider?

> `optional` **provider**: `string`

Defined in: src/client/types.gen.ts:263

Provider is the LLM provider used (e.g., "openai", "anthropic")

***

### request\_type?

> `optional` **request\_type**: `string`

Defined in: src/client/types.gen.ts:267

RequestType is always "embedding"
