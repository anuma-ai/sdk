# LlmapiImageGenerationExtraFields

> **LlmapiImageGenerationExtraFields** = `object`

Defined in: [src/client/types.gen.ts:289](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L289)

ExtraFields contains additional metadata such as provider/model information.

## Properties

### model\_requested?

> `optional` **model\_requested**: `string`

Defined in: [src/client/types.gen.ts:293](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L293)

ModelRequested is the model identifier that the client asked for.

***

### provider?

> `optional` **provider**: `string`

Defined in: [src/client/types.gen.ts:297](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L297)

Provider is the gateway that serviced this request.

***

### request\_type?

> `optional` **request\_type**: `string`

Defined in: [src/client/types.gen.ts:301](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L301)

RequestType is always "image_generation".
