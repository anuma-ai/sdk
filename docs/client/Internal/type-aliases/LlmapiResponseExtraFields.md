# LlmapiResponseExtraFields

> **LlmapiResponseExtraFields** = `object`

Defined in: [src/client/types.gen.ts:730](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#730)

ExtraFields contains additional metadata

## Properties

### latency?

> `optional` **latency**: `number`

Defined in: [src/client/types.gen.ts:734](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#734)

Latency is the request latency in milliseconds

***

### model\_requested?

> `optional` **model\_requested**: `string`

Defined in: [src/client/types.gen.ts:738](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#738)

ModelRequested is the model that was requested

***

### provider?

> `optional` **provider**: `string`

Defined in: [src/client/types.gen.ts:742](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#742)

Provider is the LLM provider used (e.g., "openai", "anthropic")

***

### request\_type?

> `optional` **request\_type**: `string`

Defined in: [src/client/types.gen.ts:746](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#746)

RequestType is always "responses"
