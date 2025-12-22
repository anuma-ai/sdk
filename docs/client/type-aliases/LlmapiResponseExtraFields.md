# LlmapiResponseExtraFields

> **LlmapiResponseExtraFields** = `object`

Defined in: [src/client/types.gen.ts:512](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L512)

ExtraFields contains additional metadata

## Properties

### latency?

> `optional` **latency**: `number`

Defined in: [src/client/types.gen.ts:516](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L516)

Latency is the request latency in milliseconds

***

### model\_requested?

> `optional` **model\_requested**: `string`

Defined in: [src/client/types.gen.ts:520](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L520)

ModelRequested is the model that was requested

***

### provider?

> `optional` **provider**: `string`

Defined in: [src/client/types.gen.ts:524](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L524)

Provider is the LLM provider used (e.g., "openai", "anthropic")

***

### request\_type?

> `optional` **request\_type**: `string`

Defined in: [src/client/types.gen.ts:528](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L528)

RequestType is always "responses"
