# LlmapiChatCompletionExtraFields

> **LlmapiChatCompletionExtraFields** = `object`

Defined in: [src/client/types.gen.ts:288](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#288)

ExtraFields contains additional metadata

## Properties

### latency?

> `optional` **latency**: `number`

Defined in: [src/client/types.gen.ts:292](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#292)

Latency is the request latency in milliseconds

***

### model\_requested?

> `optional` **model\_requested**: `string`

Defined in: [src/client/types.gen.ts:296](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#296)

ModelRequested is the model that was requested

***

### provider?

> `optional` **provider**: `string`

Defined in: [src/client/types.gen.ts:300](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#300)

Provider is the LLM provider used (e.g., "openai", "anthropic")

***

### request\_type?

> `optional` **request\_type**: `string`

Defined in: [src/client/types.gen.ts:304](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#304)

RequestType is always "chat\_completion"
