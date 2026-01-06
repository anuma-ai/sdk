# LlmapiModelsListResponse

> **LlmapiModelsListResponse** = `object`

Defined in: [src/client/types.gen.ts:611](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L611)

## Properties

### data?

> `optional` **data**: [`LlmapiModel`](LlmapiModel.md)[]

Defined in: [src/client/types.gen.ts:615](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L615)

Data contains the list of available models

***

### extra\_fields?

> `optional` **extra\_fields**: [`LlmapiModelsListExtraFields`](LlmapiModelsListExtraFields.md)

Defined in: [src/client/types.gen.ts:616](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L616)

***

### next\_page\_token?

> `optional` **next\_page\_token**: `string`

Defined in: [src/client/types.gen.ts:620](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L620)

NextPageToken is the token to retrieve the next page of results (omitted if no more pages)
