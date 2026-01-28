# LlmapiChatCompletionExtraFields

> **LlmapiChatCompletionExtraFields** = `object`

Defined in: [src/client/types.gen.ts:135](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L135)

ExtraFields contains additional metadata

## Properties

### latency?

> `optional` **latency**: `number`

Defined in: [src/client/types.gen.ts:139](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L139)

Latency is the request latency in milliseconds

***

### model\_requested?

> `optional` **model\_requested**: `string`

Defined in: [src/client/types.gen.ts:143](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L143)

ModelRequested is the model that was requested

***

### provider?

> `optional` **provider**: `string`

Defined in: [src/client/types.gen.ts:147](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L147)

Provider is the LLM provider used (e.g., "openai", "anthropic")

***

### request\_type?

> `optional` **request\_type**: `string`

Defined in: [src/client/types.gen.ts:151](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L151)

RequestType is always "chat\_completion"
