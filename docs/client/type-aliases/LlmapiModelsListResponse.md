# LlmapiModelsListResponse

> **LlmapiModelsListResponse** = \{ `data?`: [`LlmapiModel`](LlmapiModel.md)[]; `extra_fields?`: [`LlmapiModelsListExtraFields`](LlmapiModelsListExtraFields.md); `next_page_token?`: `string`; \}

Defined in: [src/client/types.gen.ts:524](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L524)

## Properties

### data?

> `optional` **data**: [`LlmapiModel`](LlmapiModel.md)[]

Defined in: [src/client/types.gen.ts:528](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L528)

Data contains the list of available models

***

### extra\_fields?

> `optional` **extra\_fields**: [`LlmapiModelsListExtraFields`](LlmapiModelsListExtraFields.md)

Defined in: [src/client/types.gen.ts:529](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L529)

***

### next\_page\_token?

> `optional` **next\_page\_token**: `string`

Defined in: [src/client/types.gen.ts:533](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L533)

NextPageToken is the token to retrieve the next page of results (omitted if no more pages)
