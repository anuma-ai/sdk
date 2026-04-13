# LlmapiModelsListResponse

> **LlmapiModelsListResponse** = `object`

Defined in: [src/client/types.gen.ts:1840](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1840)

## Properties

### data?

> `optional` **data**: [`LlmapiModel`](LlmapiModel.md)\[]

Defined in: [src/client/types.gen.ts:1844](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1844)

Data contains the list of available models

***

### extra\_fields?

> `optional` **extra\_fields**: [`LlmapiModelsListExtraFields`](LlmapiModelsListExtraFields.md)

Defined in: [src/client/types.gen.ts:1845](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1845)

***

### next\_page\_token?

> `optional` **next\_page\_token**: `string`

Defined in: [src/client/types.gen.ts:1849](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1849)

NextPageToken is the token to retrieve the next page of results (omitted if no more pages)
