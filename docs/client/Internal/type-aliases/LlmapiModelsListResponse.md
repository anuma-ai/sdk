# LlmapiModelsListResponse

> **LlmapiModelsListResponse** = `object`

Defined in: [src/client/types.gen.ts:2231](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2231)

## Properties

### data?

> `optional` **data**: [`LlmapiModel`](LlmapiModel.md)\[]

Defined in: [src/client/types.gen.ts:2235](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2235)

Data contains the list of available models

***

### extra\_fields?

> `optional` **extra\_fields**: [`LlmapiModelsListExtraFields`](LlmapiModelsListExtraFields.md)

Defined in: [src/client/types.gen.ts:2236](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2236)

***

### next\_page\_token?

> `optional` **next\_page\_token**: `string`

Defined in: [src/client/types.gen.ts:2240](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2240)

NextPageToken is the token to retrieve the next page of results (omitted if no more pages)
