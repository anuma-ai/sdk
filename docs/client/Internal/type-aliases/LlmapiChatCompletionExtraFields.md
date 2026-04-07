# LlmapiChatCompletionExtraFields

> **LlmapiChatCompletionExtraFields** = `object`

Defined in: [src/client/types.gen.ts:1365](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1365)

ExtraFields contains additional metadata

## Properties

### latency?

> `optional` **latency**: `number`

Defined in: [src/client/types.gen.ts:1369](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1369)

Latency is the request latency in milliseconds

***

### model\_requested?

> `optional` **model\_requested**: `string`

Defined in: [src/client/types.gen.ts:1373](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1373)

ModelRequested is the model that was requested

***

### provider?

> `optional` **provider**: `string`

Defined in: [src/client/types.gen.ts:1377](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1377)

Provider is the LLM provider used (e.g., "openai", "anthropic")

***

### request\_type?

> `optional` **request\_type**: `string`

Defined in: [src/client/types.gen.ts:1381](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1381)

RequestType is always "chat\_completion"
