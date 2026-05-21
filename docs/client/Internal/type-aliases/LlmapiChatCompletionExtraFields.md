# LlmapiChatCompletionExtraFields

> **LlmapiChatCompletionExtraFields** = `object`

Defined in: [src/client/types.gen.ts:1738](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1738)

ExtraFields contains additional metadata

## Properties

### latency?

> `optional` **latency**: `number`

Defined in: [src/client/types.gen.ts:1742](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1742)

Latency is the request latency in milliseconds

***

### model\_requested?

> `optional` **model\_requested**: `string`

Defined in: [src/client/types.gen.ts:1746](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1746)

ModelRequested is the model that was requested

***

### provider?

> `optional` **provider**: `string`

Defined in: [src/client/types.gen.ts:1750](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1750)

Provider is the LLM provider used (e.g., "openai", "anthropic")

***

### request\_type?

> `optional` **request\_type**: `string`

Defined in: [src/client/types.gen.ts:1754](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1754)

RequestType is always "chat\_completion"
