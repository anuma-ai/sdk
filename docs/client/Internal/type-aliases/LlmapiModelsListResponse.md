# LlmapiModelsListResponse

> **LlmapiModelsListResponse** = `object`

Defined in: [src/client/types.gen.ts:791](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L791)

## Properties

### data?

> `optional` **data**: [`LlmapiModel`](LlmapiModel.md)\[]

Defined in: [src/client/types.gen.ts:795](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L795)

Data contains the list of available models

***

### extra\_fields?

> `optional` **extra\_fields**: [`LlmapiModelsListExtraFields`](LlmapiModelsListExtraFields.md)

Defined in: [src/client/types.gen.ts:796](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L796)

***

### next\_page\_token?

> `optional` **next\_page\_token**: `string`

Defined in: [src/client/types.gen.ts:800](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L800)

NextPageToken is the token to retrieve the next page of results (omitted if no more pages)
