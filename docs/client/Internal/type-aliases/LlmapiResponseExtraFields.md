# LlmapiResponseExtraFields

> **LlmapiResponseExtraFields** = `object`

Defined in: [src/client/types.gen.ts:2246](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2246)

ExtraFields contains additional metadata

## Properties

### latency?

> `optional` **latency**: `number`

Defined in: [src/client/types.gen.ts:2250](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2250)

Latency is the request latency in milliseconds

***

### model\_requested?

> `optional` **model\_requested**: `string`

Defined in: [src/client/types.gen.ts:2254](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2254)

ModelRequested is the model that was requested

***

### provider?

> `optional` **provider**: `string`

Defined in: [src/client/types.gen.ts:2258](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2258)

Provider is the LLM provider used (e.g., "openai", "anthropic")

***

### request\_type?

> `optional` **request\_type**: `string`

Defined in: [src/client/types.gen.ts:2262](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2262)

RequestType is always "responses"
