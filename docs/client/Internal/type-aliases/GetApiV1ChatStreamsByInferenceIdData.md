# GetApiV1ChatStreamsByInferenceIdData

> **GetApiV1ChatStreamsByInferenceIdData** = `object`

Defined in: [src/client/types.gen.ts:6233](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#6233)

## Properties

### body?

> `optional` **body**: `never`

Defined in: [src/client/types.gen.ts:6234](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#6234)

***

### path

> **path**: `object`

Defined in: [src/client/types.gen.ts:6235](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#6235)

**inference\_id**

> **inference\_id**: `string`

Inference ID (the X-Inference-ID returned on the original stream)

***

### query?

> `optional` **query**: `object`

Defined in: [src/client/types.gen.ts:6241](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#6241)

**starting\_after?**

> `optional` **starting\_after**: `number`

Replay frames with sequence strictly greater than this value (reserved; accepted and validated, ignored by current clients)

***

### url

> **url**: `"/api/v1/chat/streams/{inference_id}"`

Defined in: [src/client/types.gen.ts:6247](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#6247)
