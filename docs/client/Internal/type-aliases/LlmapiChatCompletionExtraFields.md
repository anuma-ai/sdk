# LlmapiChatCompletionExtraFields

> **LlmapiChatCompletionExtraFields** = `object`

Defined in: src/client/types.gen.ts:126

ExtraFields contains additional metadata

## Properties

### latency?

> `optional` **latency**: `number`

Defined in: src/client/types.gen.ts:130

Latency is the request latency in milliseconds

***

### model\_requested?

> `optional` **model\_requested**: `string`

Defined in: src/client/types.gen.ts:134

ModelRequested is the model that was requested

***

### provider?

> `optional` **provider**: `string`

Defined in: src/client/types.gen.ts:138

Provider is the LLM provider used (e.g., "openai", "anthropic")

***

### request\_type?

> `optional` **request\_type**: `string`

Defined in: src/client/types.gen.ts:142

RequestType is always "chat\_completion"
