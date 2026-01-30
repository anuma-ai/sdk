# LlmapiChatCompletionExtraFields

> **LlmapiChatCompletionExtraFields** = `object`

Defined in: [src/client/types.gen.ts:216](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L216)

ExtraFields contains additional metadata

## Properties

### latency?

> `optional` **latency**: `number`

Defined in: [src/client/types.gen.ts:220](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L220)

Latency is the request latency in milliseconds

***

### model\_requested?

> `optional` **model\_requested**: `string`

Defined in: [src/client/types.gen.ts:224](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L224)

ModelRequested is the model that was requested

***

### provider?

> `optional` **provider**: `string`

Defined in: [src/client/types.gen.ts:228](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L228)

Provider is the LLM provider used (e.g., "openai", "anthropic")

***

### request\_type?

> `optional` **request\_type**: `string`

Defined in: [src/client/types.gen.ts:232](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L232)

RequestType is always "chat\_completion"
