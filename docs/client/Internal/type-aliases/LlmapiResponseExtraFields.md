# LlmapiResponseExtraFields

> **LlmapiResponseExtraFields** = `object`

Defined in: [src/client/types.gen.ts:762](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L762)

ExtraFields contains additional metadata

## Properties

### latency?

> `optional` **latency**: `number`

Defined in: [src/client/types.gen.ts:766](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L766)

Latency is the request latency in milliseconds

***

### model\_requested?

> `optional` **model\_requested**: `string`

Defined in: [src/client/types.gen.ts:770](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L770)

ModelRequested is the model that was requested

***

### provider?

> `optional` **provider**: `string`

Defined in: [src/client/types.gen.ts:774](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L774)

Provider is the LLM provider used (e.g., "openai", "anthropic")

***

### request\_type?

> `optional` **request\_type**: `string`

Defined in: [src/client/types.gen.ts:778](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L778)

RequestType is always "responses"
