# LlmapiChatCompletionExtraFields

> **LlmapiChatCompletionExtraFields** = `object`

Defined in: [src/client/types.gen.ts:61](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L61)

ExtraFields contains additional metadata

## Properties

### latency?

> `optional` **latency**: `number`

Defined in: [src/client/types.gen.ts:65](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L65)

Latency is the request latency in milliseconds

***

### model\_requested?

> `optional` **model\_requested**: `string`

Defined in: [src/client/types.gen.ts:69](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L69)

ModelRequested is the model that was requested

***

### provider?

> `optional` **provider**: `string`

Defined in: [src/client/types.gen.ts:73](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L73)

Provider is the LLM provider used (e.g., "openai", "anthropic")

***

### request\_type?

> `optional` **request\_type**: `string`

Defined in: [src/client/types.gen.ts:77](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L77)

RequestType is always "chat_completion"
