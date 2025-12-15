# LlmapiModelsListResponse

> **LlmapiModelsListResponse** = `object`

Defined in: [src/client/types.gen.ts:453](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L453)

## Properties

### data?

> `optional` **data**: [`LlmapiModel`](LlmapiModel.md)[]

Defined in: [src/client/types.gen.ts:457](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L457)

Data contains the list of available models

***

### extra\_fields?

> `optional` **extra\_fields**: [`LlmapiModelsListExtraFields`](LlmapiModelsListExtraFields.md)

Defined in: [src/client/types.gen.ts:458](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L458)

***

### next\_page\_token?

> `optional` **next\_page\_token**: `string`

Defined in: [src/client/types.gen.ts:462](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L462)

NextPageToken is the token to retrieve the next page of results (omitted if no more pages)
