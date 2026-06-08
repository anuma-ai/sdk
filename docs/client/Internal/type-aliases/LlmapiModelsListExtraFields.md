# LlmapiModelsListExtraFields

> **LlmapiModelsListExtraFields** = `object`

Defined in: [src/client/types.gen.ts:597](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#597)

ExtraFields contains additional metadata

## Properties

### chunk\_index?

> `optional` **chunk\_index**: `number`

Defined in: [src/client/types.gen.ts:601](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#601)

ChunkIndex is the chunk index (0 for single requests)

***

### latency?

> `optional` **latency**: `number`

Defined in: [src/client/types.gen.ts:605](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#605)

Latency is the request latency in milliseconds

***

### request\_type?

> `optional` **request\_type**: `string`

Defined in: [src/client/types.gen.ts:609](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#609)

RequestType is always "list\_models"
