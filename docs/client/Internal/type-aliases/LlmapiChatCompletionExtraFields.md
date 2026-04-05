# LlmapiChatCompletionExtraFields

> **LlmapiChatCompletionExtraFields** = `object`

Defined in: [src/client/types.gen.ts:1372](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1372)

ExtraFields contains additional metadata

## Properties

### latency?

> `optional` **latency**: `number`

Defined in: [src/client/types.gen.ts:1376](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1376)

Latency is the request latency in milliseconds

***

### model\_requested?

> `optional` **model\_requested**: `string`

Defined in: [src/client/types.gen.ts:1380](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1380)

ModelRequested is the model that was requested

***

### provider?

> `optional` **provider**: `string`

Defined in: [src/client/types.gen.ts:1384](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1384)

Provider is the LLM provider used (e.g., "openai", "anthropic")

***

### request\_type?

> `optional` **request\_type**: `string`

Defined in: [src/client/types.gen.ts:1388](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1388)

RequestType is always "chat\_completion"
