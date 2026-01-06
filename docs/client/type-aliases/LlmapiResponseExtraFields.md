# LlmapiResponseExtraFields

> **LlmapiResponseExtraFields** = \{ `latency?`: `number`; `model_requested?`: `string`; `provider?`: `string`; `request_type?`: `string`; \}

Defined in: [src/client/types.gen.ts:626](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L626)

ExtraFields contains additional metadata

## Properties

### latency?

> `optional` **latency**: `number`

Defined in: [src/client/types.gen.ts:630](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L630)

Latency is the request latency in milliseconds

***

### model\_requested?

> `optional` **model\_requested**: `string`

Defined in: [src/client/types.gen.ts:634](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L634)

ModelRequested is the model that was requested

***

### provider?

> `optional` **provider**: `string`

Defined in: [src/client/types.gen.ts:638](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L638)

Provider is the LLM provider used (e.g., "openai", "anthropic")

***

### request\_type?

> `optional` **request\_type**: `string`

Defined in: [src/client/types.gen.ts:642](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L642)

RequestType is always "responses"
