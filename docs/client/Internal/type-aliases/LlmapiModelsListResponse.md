# LlmapiModelsListResponse

> **LlmapiModelsListResponse** = `object`

Defined in: [src/client/types.gen.ts:962](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#962)

## Properties

### data?

> `optional` **data**: [`LlmapiModel`](LlmapiModel.md)\[]

Defined in: [src/client/types.gen.ts:966](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#966)

Data contains the list of available models

***

### extra\_fields?

> `optional` **extra\_fields**: [`LlmapiModelsListExtraFields`](LlmapiModelsListExtraFields.md)

Defined in: [src/client/types.gen.ts:967](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#967)

***

### next\_page\_token?

> `optional` **next\_page\_token**: `string`

Defined in: [src/client/types.gen.ts:971](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#971)

NextPageToken is the token to retrieve the next page of results (omitted if no more pages)
