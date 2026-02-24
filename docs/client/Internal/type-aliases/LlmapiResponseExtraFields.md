# LlmapiResponseExtraFields

> **LlmapiResponseExtraFields** = `object`

Defined in: [src/client/types.gen.ts:928](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#L928)

ExtraFields contains additional metadata

## Properties

### latency?

> `optional` **latency**: `number`

Defined in: [src/client/types.gen.ts:932](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#L932)

Latency is the request latency in milliseconds

***

### model\_requested?

> `optional` **model\_requested**: `string`

Defined in: [src/client/types.gen.ts:936](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#L936)

ModelRequested is the model that was requested

***

### provider?

> `optional` **provider**: `string`

Defined in: [src/client/types.gen.ts:940](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#L940)

Provider is the LLM provider used (e.g., "openai", "anthropic")

***

### request\_type?

> `optional` **request\_type**: `string`

Defined in: [src/client/types.gen.ts:944](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#L944)

RequestType is always "responses"
