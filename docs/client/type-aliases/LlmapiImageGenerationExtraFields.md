# LlmapiImageGenerationExtraFields

> **LlmapiImageGenerationExtraFields** = `object`

Defined in: [src/client/types.gen.ts:244](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L244)

ExtraFields contains additional metadata such as provider/model information.

## Properties

### model\_requested?

> `optional` **model\_requested**: `string`

Defined in: [src/client/types.gen.ts:248](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L248)

ModelRequested is the model identifier that the client asked for.

***

### provider?

> `optional` **provider**: `string`

Defined in: [src/client/types.gen.ts:252](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L252)

Provider is the gateway that serviced this request.

***

### request\_type?

> `optional` **request\_type**: `string`

Defined in: [src/client/types.gen.ts:256](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L256)

RequestType is always "image_generation".
