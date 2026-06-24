# LlmapiModelsListExtraFields

> **LlmapiModelsListExtraFields** = `object`

Defined in: [src/client/types.gen.ts:615](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#615)

ExtraFields contains additional metadata

## Properties

### chunk\_index?

> `optional` **chunk\_index**: `number`

Defined in: [src/client/types.gen.ts:619](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#619)

ChunkIndex is the chunk index (0 for single requests)

***

### latency?

> `optional` **latency**: `number`

Defined in: [src/client/types.gen.ts:623](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#623)

Latency is the request latency in milliseconds

***

### request\_type?

> `optional` **request\_type**: `string`

Defined in: [src/client/types.gen.ts:627](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#627)

RequestType is always "list\_models"
