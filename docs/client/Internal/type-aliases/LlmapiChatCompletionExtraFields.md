# LlmapiChatCompletionExtraFields

> **LlmapiChatCompletionExtraFields** = `object`

Defined in: [src/client/types.gen.ts:869](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#869)

ExtraFields contains additional metadata

## Properties

### latency?

> `optional` **latency**: `number`

Defined in: [src/client/types.gen.ts:873](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#873)

Latency is the request latency in milliseconds

***

### model\_requested?

> `optional` **model\_requested**: `string`

Defined in: [src/client/types.gen.ts:877](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#877)

ModelRequested is the model that was requested

***

### provider?

> `optional` **provider**: `string`

Defined in: [src/client/types.gen.ts:881](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#881)

Provider is the LLM provider used (e.g., "openai", "anthropic")

***

### request\_type?

> `optional` **request\_type**: `string`

Defined in: [src/client/types.gen.ts:885](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#885)

RequestType is always "chat\_completion"
