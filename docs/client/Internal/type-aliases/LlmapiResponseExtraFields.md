# LlmapiResponseExtraFields

> **LlmapiResponseExtraFields** = `object`

Defined in: [src/client/types.gen.ts:1855](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1855)

ExtraFields contains additional metadata

## Properties

### latency?

> `optional` **latency**: `number`

Defined in: [src/client/types.gen.ts:1859](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1859)

Latency is the request latency in milliseconds

***

### model\_requested?

> `optional` **model\_requested**: `string`

Defined in: [src/client/types.gen.ts:1863](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1863)

ModelRequested is the model that was requested

***

### provider?

> `optional` **provider**: `string`

Defined in: [src/client/types.gen.ts:1867](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1867)

Provider is the LLM provider used (e.g., "openai", "anthropic")

***

### request\_type?

> `optional` **request\_type**: `string`

Defined in: [src/client/types.gen.ts:1871](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1871)

RequestType is always "responses"
