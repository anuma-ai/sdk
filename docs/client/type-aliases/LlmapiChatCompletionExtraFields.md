# LlmapiChatCompletionExtraFields

> **LlmapiChatCompletionExtraFields** = `object`

Defined in: [src/client/types.gen.ts:88](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L88)

ExtraFields contains additional metadata

## Properties

### latency?

> `optional` **latency**: `number`

Defined in: [src/client/types.gen.ts:92](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L92)

Latency is the request latency in milliseconds

***

### model\_requested?

> `optional` **model\_requested**: `string`

Defined in: [src/client/types.gen.ts:96](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L96)

ModelRequested is the model that was requested

***

### provider?

> `optional` **provider**: `string`

Defined in: [src/client/types.gen.ts:100](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L100)

Provider is the LLM provider used (e.g., "openai", "anthropic")

***

### request\_type?

> `optional` **request\_type**: `string`

Defined in: [src/client/types.gen.ts:104](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L104)

RequestType is always "chat_completion"
