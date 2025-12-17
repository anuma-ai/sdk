# LlmapiModelsListResponse

> **LlmapiModelsListResponse** = `object`

Defined in: [src/client/types.gen.ts:493](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L493)

## Properties

### data?

> `optional` **data**: [`LlmapiModel`](LlmapiModel.md)[]

Defined in: [src/client/types.gen.ts:497](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L497)

Data contains the list of available models

***

### extra\_fields?

> `optional` **extra\_fields**: [`LlmapiModelsListExtraFields`](LlmapiModelsListExtraFields.md)

Defined in: [src/client/types.gen.ts:498](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L498)

***

### next\_page\_token?

> `optional` **next\_page\_token**: `string`

Defined in: [src/client/types.gen.ts:502](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L502)

NextPageToken is the token to retrieve the next page of results (omitted if no more pages)
