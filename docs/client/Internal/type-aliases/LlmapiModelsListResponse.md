# LlmapiModelsListResponse

> **LlmapiModelsListResponse** = `object`

Defined in: [src/client/types.gen.ts:612](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#612)

## Properties

### data?

> `optional` **data**: [`LlmapiModel`](LlmapiModel.md)\[]

Defined in: [src/client/types.gen.ts:616](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#616)

Data contains the list of available models

***

### extra\_fields?

> `optional` **extra\_fields**: [`LlmapiModelsListExtraFields`](LlmapiModelsListExtraFields.md)

Defined in: [src/client/types.gen.ts:617](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#617)

***

### next\_page\_token?

> `optional` **next\_page\_token**: `string`

Defined in: [src/client/types.gen.ts:621](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#621)

NextPageToken is the token to retrieve the next page of results (omitted if no more pages)
