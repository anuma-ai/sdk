# LlmapiModelsListExtraFields

> **LlmapiModelsListExtraFields** = `object`

Defined in: [src/client/types.gen.ts:591](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#591)

ExtraFields contains additional metadata

## Properties

### chunk\_index?

> `optional` **chunk\_index**: `number`

Defined in: [src/client/types.gen.ts:595](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#595)

ChunkIndex is the chunk index (0 for single requests)

***

### latency?

> `optional` **latency**: `number`

Defined in: [src/client/types.gen.ts:599](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#599)

Latency is the request latency in milliseconds

***

### request\_type?

> `optional` **request\_type**: `string`

Defined in: [src/client/types.gen.ts:603](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#603)

RequestType is always "list\_models"
