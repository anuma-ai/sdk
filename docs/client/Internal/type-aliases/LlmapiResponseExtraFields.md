# LlmapiResponseExtraFields

> **LlmapiResponseExtraFields** = `object`

Defined in: [src/client/types.gen.ts:1233](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1233)

ExtraFields contains additional metadata

## Properties

### latency?

> `optional` **latency**: `number`

Defined in: [src/client/types.gen.ts:1237](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1237)

Latency is the request latency in milliseconds

***

### model\_requested?

> `optional` **model\_requested**: `string`

Defined in: [src/client/types.gen.ts:1241](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1241)

ModelRequested is the model that was requested

***

### provider?

> `optional` **provider**: `string`

Defined in: [src/client/types.gen.ts:1245](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1245)

Provider is the LLM provider used (e.g., "openai", "anthropic")

***

### request\_type?

> `optional` **request\_type**: `string`

Defined in: [src/client/types.gen.ts:1249](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1249)

RequestType is always "responses"
