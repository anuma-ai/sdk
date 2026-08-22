# LlmapiModelsListResponse

> **LlmapiModelsListResponse** = `object`

Defined in: [src/client/types.gen.ts:660](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#660)

## Properties

### data?

> `optional` **data**: [`LlmapiModel`](LlmapiModel.md)\[]

Defined in: [src/client/types.gen.ts:664](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#664)

Data contains the list of available models

***

### extra\_fields?

> `optional` **extra\_fields**: [`LlmapiModelsListExtraFields`](LlmapiModelsListExtraFields.md)

Defined in: [src/client/types.gen.ts:665](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#665)

***

### next\_page\_token?

> `optional` **next\_page\_token**: `string`

Defined in: [src/client/types.gen.ts:669](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#669)

NextPageToken is the token to retrieve the next page of results (omitted if no more pages)
