# LlmapiModelsListExtraFields

> **LlmapiModelsListExtraFields** = `object`

Defined in: [src/client/types.gen.ts:645](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#645)

ExtraFields contains additional metadata

## Properties

### chunk\_index?

> `optional` **chunk\_index**: `number`

Defined in: [src/client/types.gen.ts:649](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#649)

ChunkIndex is the chunk index (0 for single requests)

***

### latency?

> `optional` **latency**: `number`

Defined in: [src/client/types.gen.ts:653](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#653)

Latency is the request latency in milliseconds

***

### request\_type?

> `optional` **request\_type**: `string`

Defined in: [src/client/types.gen.ts:657](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#657)

RequestType is always "list\_models"
