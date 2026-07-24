# GetApiV1ChatStreamsByInferenceIdData

> **GetApiV1ChatStreamsByInferenceIdData** = `object`

Defined in: [src/client/types.gen.ts:6807](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#6807)

## Properties

### body?

> `optional` **body**: `never`

Defined in: [src/client/types.gen.ts:6808](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#6808)

***

### path

> **path**: `object`

Defined in: [src/client/types.gen.ts:6809](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#6809)

**inference\_id**

> **inference\_id**: `string`

Inference ID (the X-Inference-ID returned on the original stream)

***

### query?

> `optional` **query**: `object`

Defined in: [src/client/types.gen.ts:6815](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#6815)

**starting\_after?**

> `optional` **starting\_after**: `number`

Replay frames with sequence strictly greater than this value (reserved; accepted and validated, ignored by current clients)

***

### url

> **url**: `"/api/v1/chat/streams/{inference_id}"`

Defined in: [src/client/types.gen.ts:6821](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#6821)
