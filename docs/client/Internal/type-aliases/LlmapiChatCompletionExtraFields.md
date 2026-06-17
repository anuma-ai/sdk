# LlmapiChatCompletionExtraFields

> **LlmapiChatCompletionExtraFields** = `object`

Defined in: [src/client/types.gen.ts:151](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#151)

ExtraFields contains additional metadata

## Properties

### latency?

> `optional` **latency**: `number`

Defined in: [src/client/types.gen.ts:155](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#155)

Latency is the request latency in milliseconds

***

### model\_requested?

> `optional` **model\_requested**: `string`

Defined in: [src/client/types.gen.ts:159](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#159)

ModelRequested is the model that was requested

***

### provider?

> `optional` **provider**: `string`

Defined in: [src/client/types.gen.ts:163](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#163)

Provider is the LLM provider used (e.g., "openai", "anthropic")

***

### request\_type?

> `optional` **request\_type**: `string`

Defined in: [src/client/types.gen.ts:167](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#167)

RequestType is always "chat\_completion"
