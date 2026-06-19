# LlmapiEmbeddingExtraFields

> **LlmapiEmbeddingExtraFields** = `object`

Defined in: [src/client/types.gen.ts:326](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#326)

ExtraFields contains additional metadata

## Properties

### chunk\_index?

> `optional` **chunk\_index**: `number`

Defined in: [src/client/types.gen.ts:330](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#330)

ChunkIndex is the chunk index (0 for single requests)

***

### latency?

> `optional` **latency**: `number`

Defined in: [src/client/types.gen.ts:334](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#334)

Latency is the request latency in milliseconds

***

### model\_requested?

> `optional` **model\_requested**: `string`

Defined in: [src/client/types.gen.ts:338](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#338)

ModelRequested is the model that was requested

***

### provider?

> `optional` **provider**: `string`

Defined in: [src/client/types.gen.ts:342](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#342)

Provider is the LLM provider used (e.g., "openai", "anthropic")

***

### request\_type?

> `optional` **request\_type**: `string`

Defined in: [src/client/types.gen.ts:346](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#346)

RequestType is always "embedding"
