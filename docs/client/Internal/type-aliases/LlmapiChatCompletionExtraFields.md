# LlmapiChatCompletionExtraFields

> **LlmapiChatCompletionExtraFields** = `object`

Defined in: [src/client/types.gen.ts:975](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#975)

ExtraFields contains additional metadata

## Properties

### latency?

> `optional` **latency**: `number`

Defined in: [src/client/types.gen.ts:979](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#979)

Latency is the request latency in milliseconds

***

### model\_requested?

> `optional` **model\_requested**: `string`

Defined in: [src/client/types.gen.ts:983](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#983)

ModelRequested is the model that was requested

***

### provider?

> `optional` **provider**: `string`

Defined in: [src/client/types.gen.ts:987](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#987)

Provider is the LLM provider used (e.g., "openai", "anthropic")

***

### request\_type?

> `optional` **request\_type**: `string`

Defined in: [src/client/types.gen.ts:991](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#991)

RequestType is always "chat\_completion"
