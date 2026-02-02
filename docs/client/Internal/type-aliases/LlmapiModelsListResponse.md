# LlmapiModelsListResponse

> **LlmapiModelsListResponse** = `object`

Defined in: [src/client/types.gen.ts:747](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L747)

## Properties

### data?

> `optional` **data**: [`LlmapiModel`](LlmapiModel.md)\[]

Defined in: [src/client/types.gen.ts:751](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L751)

Data contains the list of available models

***

### extra\_fields?

> `optional` **extra\_fields**: [`LlmapiModelsListExtraFields`](LlmapiModelsListExtraFields.md)

Defined in: [src/client/types.gen.ts:752](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L752)

***

### next\_page\_token?

> `optional` **next\_page\_token**: `string`

Defined in: [src/client/types.gen.ts:756](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L756)

NextPageToken is the token to retrieve the next page of results (omitted if no more pages)
