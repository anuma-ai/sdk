# LlmapiResponseExtraFields

> **LlmapiResponseExtraFields** = `object`

Defined in: [src/client/types.gen.ts:1177](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1177)

ExtraFields contains additional metadata

## Properties

### latency?

> `optional` **latency**: `number`

Defined in: [src/client/types.gen.ts:1181](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1181)

Latency is the request latency in milliseconds

***

### model\_requested?

> `optional` **model\_requested**: `string`

Defined in: [src/client/types.gen.ts:1185](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1185)

ModelRequested is the model that was requested

***

### provider?

> `optional` **provider**: `string`

Defined in: [src/client/types.gen.ts:1189](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1189)

Provider is the LLM provider used (e.g., "openai", "anthropic")

***

### request\_type?

> `optional` **request\_type**: `string`

Defined in: [src/client/types.gen.ts:1193](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1193)

RequestType is always "responses"
