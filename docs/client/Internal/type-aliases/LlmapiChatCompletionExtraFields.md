# LlmapiChatCompletionExtraFields

> **LlmapiChatCompletionExtraFields** = `object`

Defined in: [src/client/types.gen.ts:157](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#157)

ExtraFields contains additional metadata

## Properties

### latency?

> `optional` **latency**: `number`

Defined in: [src/client/types.gen.ts:161](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#161)

Latency is the request latency in milliseconds

***

### model\_requested?

> `optional` **model\_requested**: `string`

Defined in: [src/client/types.gen.ts:165](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#165)

ModelRequested is the model that was requested

***

### provider?

> `optional` **provider**: `string`

Defined in: [src/client/types.gen.ts:169](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#169)

Provider is the LLM provider used (e.g., "openai", "anthropic")

***

### request\_type?

> `optional` **request\_type**: `string`

Defined in: [src/client/types.gen.ts:173](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#173)

RequestType is always "chat\_completion"
