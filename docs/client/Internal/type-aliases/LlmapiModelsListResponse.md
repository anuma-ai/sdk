# LlmapiModelsListResponse

> **LlmapiModelsListResponse** = `object`

Defined in: [src/client/types.gen.ts:862](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L862)

## Properties

### data?

> `optional` **data**: [`LlmapiModel`](LlmapiModel.md)\[]

Defined in: [src/client/types.gen.ts:866](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L866)

Data contains the list of available models

***

### extra\_fields?

> `optional` **extra\_fields**: [`LlmapiModelsListExtraFields`](LlmapiModelsListExtraFields.md)

Defined in: [src/client/types.gen.ts:867](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L867)

***

### next\_page\_token?

> `optional` **next\_page\_token**: `string`

Defined in: [src/client/types.gen.ts:871](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L871)

NextPageToken is the token to retrieve the next page of results (omitted if no more pages)
