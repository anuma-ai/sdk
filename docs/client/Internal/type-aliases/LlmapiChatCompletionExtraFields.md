# LlmapiChatCompletionExtraFields

> **LlmapiChatCompletionExtraFields** = `object`

Defined in: [src/client/types.gen.ts:175](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#175)

ExtraFields contains additional metadata

## Properties

### latency?

> `optional` **latency**: `number`

Defined in: [src/client/types.gen.ts:179](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#179)

Latency is the request latency in milliseconds

***

### model\_requested?

> `optional` **model\_requested**: `string`

Defined in: [src/client/types.gen.ts:183](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#183)

ModelRequested is the model that was requested

***

### provider?

> `optional` **provider**: `string`

Defined in: [src/client/types.gen.ts:187](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#187)

Provider is the LLM provider used (e.g., "openai", "anthropic")

***

### request\_type?

> `optional` **request\_type**: `string`

Defined in: [src/client/types.gen.ts:191](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#191)

RequestType is always "chat\_completion"
