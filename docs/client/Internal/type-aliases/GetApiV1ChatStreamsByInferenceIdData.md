# GetApiV1ChatStreamsByInferenceIdData

> **GetApiV1ChatStreamsByInferenceIdData** = `object`

Defined in: [src/client/types.gen.ts:8424](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8424)

## Properties

### body?

> `optional` **body**: `never`

Defined in: [src/client/types.gen.ts:8425](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8425)

***

### path

> **path**: `object`

Defined in: [src/client/types.gen.ts:8426](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8426)

**inference\_id**

> **inference\_id**: `string`

Inference ID (the X-Inference-ID returned on the original stream)

***

### query?

> `optional` **query**: `object`

Defined in: [src/client/types.gen.ts:8432](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8432)

**starting\_after?**

> `optional` **starting\_after**: `number`

Replay frames with sequence strictly greater than this value (reserved; accepted and validated, ignored by current clients)

***

### url

> **url**: `"/api/v1/chat/streams/{inference_id}"`

Defined in: [src/client/types.gen.ts:8438](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8438)
