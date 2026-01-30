# LlmapiResponseExtraFields

> **LlmapiResponseExtraFields** = `object`

Defined in: [src/client/types.gen.ts:641](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L641)

ExtraFields contains additional metadata

## Properties

### latency?

> `optional` **latency**: `number`

Defined in: [src/client/types.gen.ts:645](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L645)

Latency is the request latency in milliseconds

***

### model\_requested?

> `optional` **model\_requested**: `string`

Defined in: [src/client/types.gen.ts:649](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L649)

ModelRequested is the model that was requested

***

### provider?

> `optional` **provider**: `string`

Defined in: [src/client/types.gen.ts:653](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L653)

Provider is the LLM provider used (e.g., "openai", "anthropic")

***

### request\_type?

> `optional` **request\_type**: `string`

Defined in: [src/client/types.gen.ts:657](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L657)

RequestType is always "responses"
