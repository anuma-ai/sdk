# LlmapiModelsListResponse

> **LlmapiModelsListResponse** = `object`

Defined in: [src/client/types.gen.ts:913](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#913)

## Properties

### data?

> `optional` **data**: [`LlmapiModel`](LlmapiModel.md)\[]

Defined in: [src/client/types.gen.ts:917](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#917)

Data contains the list of available models

***

### extra\_fields?

> `optional` **extra\_fields**: [`LlmapiModelsListExtraFields`](LlmapiModelsListExtraFields.md)

Defined in: [src/client/types.gen.ts:918](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#918)

***

### next\_page\_token?

> `optional` **next\_page\_token**: `string`

Defined in: [src/client/types.gen.ts:922](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#922)

NextPageToken is the token to retrieve the next page of results (omitted if no more pages)
