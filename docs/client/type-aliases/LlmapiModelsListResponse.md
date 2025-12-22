# LlmapiModelsListResponse

> **LlmapiModelsListResponse** = `object`

Defined in: [src/client/types.gen.ts:497](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L497)

## Properties

### data?

> `optional` **data**: [`LlmapiModel`](LlmapiModel.md)[]

Defined in: [src/client/types.gen.ts:501](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L501)

Data contains the list of available models

***

### extra\_fields?

> `optional` **extra\_fields**: [`LlmapiModelsListExtraFields`](LlmapiModelsListExtraFields.md)

Defined in: [src/client/types.gen.ts:502](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L502)

***

### next\_page\_token?

> `optional` **next\_page\_token**: `string`

Defined in: [src/client/types.gen.ts:506](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L506)

NextPageToken is the token to retrieve the next page of results (omitted if no more pages)
