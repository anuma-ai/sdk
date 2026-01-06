# LlmapiImageGenerationExtraFields

> **LlmapiImageGenerationExtraFields** = \{ `model_requested?`: `string`; `provider?`: `string`; `request_type?`: `string`; \}

Defined in: [src/client/types.gen.ts:327](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L327)

ExtraFields contains additional metadata such as provider/model information.

## Properties

### model\_requested?

> `optional` **model\_requested**: `string`

Defined in: [src/client/types.gen.ts:331](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L331)

ModelRequested is the model identifier that the client asked for.

***

### provider?

> `optional` **provider**: `string`

Defined in: [src/client/types.gen.ts:335](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L335)

Provider is the gateway that serviced this request.

***

### request\_type?

> `optional` **request\_type**: `string`

Defined in: [src/client/types.gen.ts:339](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L339)

RequestType is always "image_generation".
