# LlmapiResponseExtraFields

> **LlmapiResponseExtraFields** = `object`

Defined in: [src/client/types.gen.ts:806](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L806)

ExtraFields contains additional metadata

## Properties

### latency?

> `optional` **latency**: `number`

Defined in: [src/client/types.gen.ts:810](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L810)

Latency is the request latency in milliseconds

***

### model\_requested?

> `optional` **model\_requested**: `string`

Defined in: [src/client/types.gen.ts:814](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L814)

ModelRequested is the model that was requested

***

### provider?

> `optional` **provider**: `string`

Defined in: [src/client/types.gen.ts:818](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L818)

Provider is the LLM provider used (e.g., "openai", "anthropic")

***

### request\_type?

> `optional` **request\_type**: `string`

Defined in: [src/client/types.gen.ts:822](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L822)

RequestType is always "responses"
