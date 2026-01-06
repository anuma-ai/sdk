# LlmapiImageGenerationExtraFields

> **LlmapiImageGenerationExtraFields** = \{ `model_requested?`: `string`; `provider?`: `string`; `request_type?`: `string`; \}

Defined in: [src/client/types.gen.ts:271](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L271)

ExtraFields contains additional metadata such as provider/model information.

## Properties

### model\_requested?

> `optional` **model\_requested**: `string`

Defined in: [src/client/types.gen.ts:275](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L275)

ModelRequested is the model identifier that the client asked for.

***

### provider?

> `optional` **provider**: `string`

Defined in: [src/client/types.gen.ts:279](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L279)

Provider is the gateway that serviced this request.

***

### request\_type?

> `optional` **request\_type**: `string`

Defined in: [src/client/types.gen.ts:283](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L283)

RequestType is always "image_generation".
