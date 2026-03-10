# LlmapiChatCompletionExtraFields

> **LlmapiChatCompletionExtraFields** = `object`

Defined in: [src/client/types.gen.ts:823](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#823)

ExtraFields contains additional metadata

## Properties

### latency?

> `optional` **latency**: `number`

Defined in: [src/client/types.gen.ts:827](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#827)

Latency is the request latency in milliseconds

***

### model\_requested?

> `optional` **model\_requested**: `string`

Defined in: [src/client/types.gen.ts:831](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#831)

ModelRequested is the model that was requested

***

### provider?

> `optional` **provider**: `string`

Defined in: [src/client/types.gen.ts:835](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#835)

Provider is the LLM provider used (e.g., "openai", "anthropic")

***

### request\_type?

> `optional` **request\_type**: `string`

Defined in: [src/client/types.gen.ts:839](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#839)

RequestType is always "chat\_completion"
