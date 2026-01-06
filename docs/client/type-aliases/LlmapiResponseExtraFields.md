# LlmapiResponseExtraFields

> **LlmapiResponseExtraFields** = \{ `latency?`: `number`; `model_requested?`: `string`; `provider?`: `string`; `request_type?`: `string`; \}

Defined in: [src/client/types.gen.ts:539](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L539)

ExtraFields contains additional metadata

## Properties

### latency?

> `optional` **latency**: `number`

Defined in: [src/client/types.gen.ts:543](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L543)

Latency is the request latency in milliseconds

***

### model\_requested?

> `optional` **model\_requested**: `string`

Defined in: [src/client/types.gen.ts:547](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L547)

ModelRequested is the model that was requested

***

### provider?

> `optional` **provider**: `string`

Defined in: [src/client/types.gen.ts:551](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L551)

Provider is the LLM provider used (e.g., "openai", "anthropic")

***

### request\_type?

> `optional` **request\_type**: `string`

Defined in: [src/client/types.gen.ts:555](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L555)

RequestType is always "responses"
