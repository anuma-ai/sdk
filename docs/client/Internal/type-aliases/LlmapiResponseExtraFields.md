# LlmapiResponseExtraFields

> **LlmapiResponseExtraFields** = `object`

Defined in: [src/client/types.gen.ts:1862](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1862)

ExtraFields contains additional metadata

## Properties

### latency?

> `optional` **latency**: `number`

Defined in: [src/client/types.gen.ts:1866](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1866)

Latency is the request latency in milliseconds

***

### model\_requested?

> `optional` **model\_requested**: `string`

Defined in: [src/client/types.gen.ts:1870](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1870)

ModelRequested is the model that was requested

***

### provider?

> `optional` **provider**: `string`

Defined in: [src/client/types.gen.ts:1874](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1874)

Provider is the LLM provider used (e.g., "openai", "anthropic")

***

### request\_type?

> `optional` **request\_type**: `string`

Defined in: [src/client/types.gen.ts:1878](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1878)

RequestType is always "responses"
