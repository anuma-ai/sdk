# LlmapiResponseExtraFields

> **LlmapiResponseExtraFields** = `object`

Defined in: [src/client/types.gen.ts:588](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L588)

ExtraFields contains additional metadata

## Properties

### latency?

> `optional` **latency**: `number`

Defined in: [src/client/types.gen.ts:592](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L592)

Latency is the request latency in milliseconds

***

### model\_requested?

> `optional` **model\_requested**: `string`

Defined in: [src/client/types.gen.ts:596](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L596)

ModelRequested is the model that was requested

***

### provider?

> `optional` **provider**: `string`

Defined in: [src/client/types.gen.ts:600](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L600)

Provider is the LLM provider used (e.g., "openai", "anthropic")

***

### request\_type?

> `optional` **request\_type**: `string`

Defined in: [src/client/types.gen.ts:604](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L604)

RequestType is always "responses"
