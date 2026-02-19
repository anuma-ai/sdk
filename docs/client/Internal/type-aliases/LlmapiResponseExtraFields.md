# LlmapiResponseExtraFields

> **LlmapiResponseExtraFields** = `object`

Defined in: [src/client/types.gen.ts:893](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L893)

ExtraFields contains additional metadata

## Properties

### latency?

> `optional` **latency**: `number`

Defined in: [src/client/types.gen.ts:897](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L897)

Latency is the request latency in milliseconds

***

### model\_requested?

> `optional` **model\_requested**: `string`

Defined in: [src/client/types.gen.ts:901](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L901)

ModelRequested is the model that was requested

***

### provider?

> `optional` **provider**: `string`

Defined in: [src/client/types.gen.ts:905](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L905)

Provider is the LLM provider used (e.g., "openai", "anthropic")

***

### request\_type?

> `optional` **request\_type**: `string`

Defined in: [src/client/types.gen.ts:909](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L909)

RequestType is always "responses"
