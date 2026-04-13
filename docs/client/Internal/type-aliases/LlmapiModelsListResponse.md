# LlmapiModelsListResponse

> **LlmapiModelsListResponse** = `object`

Defined in: [src/client/types.gen.ts:1806](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1806)

## Properties

### data?

> `optional` **data**: [`LlmapiModel`](LlmapiModel.md)\[]

Defined in: [src/client/types.gen.ts:1810](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1810)

Data contains the list of available models

***

### extra\_fields?

> `optional` **extra\_fields**: [`LlmapiModelsListExtraFields`](LlmapiModelsListExtraFields.md)

Defined in: [src/client/types.gen.ts:1811](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1811)

***

### next\_page\_token?

> `optional` **next\_page\_token**: `string`

Defined in: [src/client/types.gen.ts:1815](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1815)

NextPageToken is the token to retrieve the next page of results (omitted if no more pages)
