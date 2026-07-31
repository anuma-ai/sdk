# GetApiV1ChatStreamsByInferenceIdData

> **GetApiV1ChatStreamsByInferenceIdData** = `object`

Defined in: [src/client/types.gen.ts:6835](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#6835)

## Properties

### body?

> `optional` **body**: `never`

Defined in: [src/client/types.gen.ts:6836](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#6836)

***

### path

> **path**: `object`

Defined in: [src/client/types.gen.ts:6837](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#6837)

**inference\_id**

> **inference\_id**: `string`

Inference ID (the X-Inference-ID returned on the original stream)

***

### query?

> `optional` **query**: `object`

Defined in: [src/client/types.gen.ts:6843](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#6843)

**starting\_after?**

> `optional` **starting\_after**: `number`

Replay frames with sequence strictly greater than this value (reserved; accepted and validated, ignored by current clients)

***

### url

> **url**: `"/api/v1/chat/streams/{inference_id}"`

Defined in: [src/client/types.gen.ts:6849](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#6849)
