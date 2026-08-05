# GetApiV1ChatStreamsByInferenceIdData

> **GetApiV1ChatStreamsByInferenceIdData** = `object`

Defined in: [src/client/types.gen.ts:7297](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7297)

## Properties

### body?

> `optional` **body**: `never`

Defined in: [src/client/types.gen.ts:7298](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7298)

***

### path

> **path**: `object`

Defined in: [src/client/types.gen.ts:7299](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7299)

**inference\_id**

> **inference\_id**: `string`

Inference ID (the X-Inference-ID returned on the original stream)

***

### query?

> `optional` **query**: `object`

Defined in: [src/client/types.gen.ts:7305](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7305)

**starting\_after?**

> `optional` **starting\_after**: `number`

Replay frames with sequence strictly greater than this value (reserved; accepted and validated, ignored by current clients)

***

### url

> **url**: `"/api/v1/chat/streams/{inference_id}"`

Defined in: [src/client/types.gen.ts:7311](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7311)
