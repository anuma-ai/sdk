# LlmapiChatCompletionExtraFields

> **LlmapiChatCompletionExtraFields** = `object`

Defined in: [src/client/types.gen.ts:767](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#767)

ExtraFields contains additional metadata

## Properties

### latency?

> `optional` **latency**: `number`

Defined in: [src/client/types.gen.ts:771](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#771)

Latency is the request latency in milliseconds

***

### model\_requested?

> `optional` **model\_requested**: `string`

Defined in: [src/client/types.gen.ts:775](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#775)

ModelRequested is the model that was requested

***

### provider?

> `optional` **provider**: `string`

Defined in: [src/client/types.gen.ts:779](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#779)

Provider is the LLM provider used (e.g., "openai", "anthropic")

***

### request\_type?

> `optional` **request\_type**: `string`

Defined in: [src/client/types.gen.ts:783](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#783)

RequestType is always "chat\_completion"
