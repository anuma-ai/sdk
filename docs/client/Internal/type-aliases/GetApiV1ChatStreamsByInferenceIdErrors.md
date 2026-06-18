# GetApiV1ChatStreamsByInferenceIdErrors

> **GetApiV1ChatStreamsByInferenceIdErrors** = `object`

Defined in: [src/client/types.gen.ts:6273](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#6273)

## Properties

### 401

> **401**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:6277](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#6277)

Missing or invalid bearer token

***

### 410

> **410**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:6281](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#6281)

Stream unknown, expired, cancelled, or not owned by the caller

***

### 500

> **500**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:6285](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#6285)

Internal Server Error

***

### 503

> **503**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:6289](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#6289)

Replay capacity saturated; retry
