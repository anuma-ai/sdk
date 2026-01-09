# LlmapiChatCompletionExtraFields

> **LlmapiChatCompletionExtraFields** = { `latency?`: `number`; `model_requested?`: `string`; `provider?`: `string`; `request_type?`: `string`; }

Defined in: [src/client/types.gen.ts:126](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L126)

ExtraFields contains additional metadata

## Properties

### latency?

> `optional` **latency**: `number`

Defined in: [src/client/types.gen.ts:130](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L130)

Latency is the request latency in milliseconds

***

### model\_requested?

> `optional` **model\_requested**: `string`

Defined in: [src/client/types.gen.ts:134](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L134)

ModelRequested is the model that was requested

***

### provider?

> `optional` **provider**: `string`

Defined in: [src/client/types.gen.ts:138](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L138)

Provider is the LLM provider used (e.g., "openai", "anthropic")

***

### request\_type?

> `optional` **request\_type**: `string`

Defined in: [src/client/types.gen.ts:142](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L142)

RequestType is always "chat\_completion"
