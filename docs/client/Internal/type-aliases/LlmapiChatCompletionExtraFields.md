# LlmapiChatCompletionExtraFields

> **LlmapiChatCompletionExtraFields** = `object`

Defined in: [src/client/types.gen.ts:333](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L333)

ExtraFields contains additional metadata

## Properties

### latency?

> `optional` **latency**: `number`

Defined in: [src/client/types.gen.ts:337](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L337)

Latency is the request latency in milliseconds

***

### model\_requested?

> `optional` **model\_requested**: `string`

Defined in: [src/client/types.gen.ts:341](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L341)

ModelRequested is the model that was requested

***

### provider?

> `optional` **provider**: `string`

Defined in: [src/client/types.gen.ts:345](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L345)

Provider is the LLM provider used (e.g., "openai", "anthropic")

***

### request\_type?

> `optional` **request\_type**: `string`

Defined in: [src/client/types.gen.ts:349](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L349)

RequestType is always "chat\_completion"
