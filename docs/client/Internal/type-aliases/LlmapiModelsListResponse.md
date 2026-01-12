# LlmapiModelsListResponse

> **LlmapiModelsListResponse** = `object`

Defined in: [src/client/types.gen.ts:519](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L519)

## Properties

### data?

> `optional` **data**: [`LlmapiModel`](LlmapiModel.md)\[]

Defined in: [src/client/types.gen.ts:523](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L523)

Data contains the list of available models

***

### extra\_fields?

> `optional` **extra\_fields**: [`LlmapiModelsListExtraFields`](LlmapiModelsListExtraFields.md)

Defined in: [src/client/types.gen.ts:524](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L524)

***

### next\_page\_token?

> `optional` **next\_page\_token**: `string`

Defined in: [src/client/types.gen.ts:528](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L528)

NextPageToken is the token to retrieve the next page of results (omitted if no more pages)
