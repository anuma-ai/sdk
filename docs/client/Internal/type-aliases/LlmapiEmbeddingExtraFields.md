# LlmapiEmbeddingExtraFields

> **LlmapiEmbeddingExtraFields** = `object`

Defined in: [src/client/types.gen.ts:440](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#440)

ExtraFields contains additional metadata

## Properties

### chunk\_index?

> `optional` **chunk\_index**: `number`

Defined in: [src/client/types.gen.ts:444](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#444)

ChunkIndex is the chunk index (0 for single requests)

***

### latency?

> `optional` **latency**: `number`

Defined in: [src/client/types.gen.ts:448](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#448)

Latency is the request latency in milliseconds

***

### model\_requested?

> `optional` **model\_requested**: `string`

Defined in: [src/client/types.gen.ts:452](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#452)

ModelRequested is the model that was requested

***

### provider?

> `optional` **provider**: `string`

Defined in: [src/client/types.gen.ts:456](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#456)

Provider is the LLM provider used (e.g., "openai", "anthropic")

***

### request\_type?

> `optional` **request\_type**: `string`

Defined in: [src/client/types.gen.ts:460](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#460)

RequestType is always "embedding"
