# LlmapiResponseExtraFields

> **LlmapiResponseExtraFields** = `object`

Defined in: [src/client/types.gen.ts:534](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L534)

ExtraFields contains additional metadata

## Properties

### latency?

> `optional` **latency**: `number`

Defined in: [src/client/types.gen.ts:538](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L538)

Latency is the request latency in milliseconds

***

### model\_requested?

> `optional` **model\_requested**: `string`

Defined in: [src/client/types.gen.ts:542](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L542)

ModelRequested is the model that was requested

***

### provider?

> `optional` **provider**: `string`

Defined in: [src/client/types.gen.ts:546](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L546)

Provider is the LLM provider used (e.g., "openai", "anthropic")

***

### request\_type?

> `optional` **request\_type**: `string`

Defined in: [src/client/types.gen.ts:550](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L550)

RequestType is always "responses"
