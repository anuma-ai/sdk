# LlmapiChatCompletionExtraFields

> **LlmapiChatCompletionExtraFields** = `object`

Defined in: [src/client/types.gen.ts:1331](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1331)

ExtraFields contains additional metadata

## Properties

### latency?

> `optional` **latency**: `number`

Defined in: [src/client/types.gen.ts:1335](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1335)

Latency is the request latency in milliseconds

***

### model\_requested?

> `optional` **model\_requested**: `string`

Defined in: [src/client/types.gen.ts:1339](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1339)

ModelRequested is the model that was requested

***

### provider?

> `optional` **provider**: `string`

Defined in: [src/client/types.gen.ts:1343](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1343)

Provider is the LLM provider used (e.g., "openai", "anthropic")

***

### request\_type?

> `optional` **request\_type**: `string`

Defined in: [src/client/types.gen.ts:1347](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1347)

RequestType is always "chat\_completion"
