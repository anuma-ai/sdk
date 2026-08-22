# LlmapiChatCompletionExtraFields

> **LlmapiChatCompletionExtraFields** = `object`

Defined in: [src/client/types.gen.ts:205](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#205)

ExtraFields contains additional metadata

## Properties

### latency?

> `optional` **latency**: `number`

Defined in: [src/client/types.gen.ts:209](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#209)

Latency is the request latency in milliseconds

***

### model\_requested?

> `optional` **model\_requested**: `string`

Defined in: [src/client/types.gen.ts:213](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#213)

ModelRequested is the model that was requested

***

### provider?

> `optional` **provider**: `string`

Defined in: [src/client/types.gen.ts:217](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#217)

Provider is the LLM provider used (e.g., "openai", "anthropic")

***

### request\_type?

> `optional` **request\_type**: `string`

Defined in: [src/client/types.gen.ts:221](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#221)

RequestType is always "chat\_completion"
