# LlmapiModelsListResponse

> **LlmapiModelsListResponse** = `object`

Defined in: [src/client/types.gen.ts:1388](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1388)

## Properties

### data?

> `optional` **data**: [`LlmapiModel`](LlmapiModel.md)\[]

Defined in: [src/client/types.gen.ts:1392](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1392)

Data contains the list of available models

***

### extra\_fields?

> `optional` **extra\_fields**: [`LlmapiModelsListExtraFields`](LlmapiModelsListExtraFields.md)

Defined in: [src/client/types.gen.ts:1393](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1393)

***

### next\_page\_token?

> `optional` **next\_page\_token**: `string`

Defined in: [src/client/types.gen.ts:1397](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1397)

NextPageToken is the token to retrieve the next page of results (omitted if no more pages)
