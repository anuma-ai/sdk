# LlmapiChatCompletionExtraFields

> **LlmapiChatCompletionExtraFields** = `object`

Defined in: [src/client/types.gen.ts:937](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#937)

ExtraFields contains additional metadata

## Properties

### latency?

> `optional` **latency**: `number`

Defined in: [src/client/types.gen.ts:941](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#941)

Latency is the request latency in milliseconds

***

### model\_requested?

> `optional` **model\_requested**: `string`

Defined in: [src/client/types.gen.ts:945](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#945)

ModelRequested is the model that was requested

***

### provider?

> `optional` **provider**: `string`

Defined in: [src/client/types.gen.ts:949](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#949)

Provider is the LLM provider used (e.g., "openai", "anthropic")

***

### request\_type?

> `optional` **request\_type**: `string`

Defined in: [src/client/types.gen.ts:953](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#953)

RequestType is always "chat\_completion"
