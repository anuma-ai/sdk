# LlmapiChatCompletionExtraFields

> **LlmapiChatCompletionExtraFields** = `object`

Defined in: [src/client/types.gen.ts:436](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L436)

ExtraFields contains additional metadata

## Properties

### latency?

> `optional` **latency**: `number`

Defined in: [src/client/types.gen.ts:440](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L440)

Latency is the request latency in milliseconds

***

### model\_requested?

> `optional` **model\_requested**: `string`

Defined in: [src/client/types.gen.ts:444](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L444)

ModelRequested is the model that was requested

***

### provider?

> `optional` **provider**: `string`

Defined in: [src/client/types.gen.ts:448](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L448)

Provider is the LLM provider used (e.g., "openai", "anthropic")

***

### request\_type?

> `optional` **request\_type**: `string`

Defined in: [src/client/types.gen.ts:452](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L452)

RequestType is always "chat\_completion"
