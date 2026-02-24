# LlmapiChatCompletionExtraFields

> **LlmapiChatCompletionExtraFields** = `object`

Defined in: [src/client/types.gen.ts:462](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L462)

ExtraFields contains additional metadata

## Properties

### latency?

> `optional` **latency**: `number`

Defined in: [src/client/types.gen.ts:466](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L466)

Latency is the request latency in milliseconds

***

### model\_requested?

> `optional` **model\_requested**: `string`

Defined in: [src/client/types.gen.ts:470](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L470)

ModelRequested is the model that was requested

***

### provider?

> `optional` **provider**: `string`

Defined in: [src/client/types.gen.ts:474](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L474)

Provider is the LLM provider used (e.g., "openai", "anthropic")

***

### request\_type?

> `optional` **request\_type**: `string`

Defined in: [src/client/types.gen.ts:478](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L478)

RequestType is always "chat\_completion"
