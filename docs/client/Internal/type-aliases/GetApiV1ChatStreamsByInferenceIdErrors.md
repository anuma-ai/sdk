# GetApiV1ChatStreamsByInferenceIdErrors

> **GetApiV1ChatStreamsByInferenceIdErrors** = `object`

Defined in: [src/client/types.gen.ts:7303](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7303)

## Properties

### 401

> **401**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:7307](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7307)

Missing or invalid bearer token

***

### 410

> **410**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:7311](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7311)

Stream unknown, expired, cancelled, or not owned by the caller

***

### 500

> **500**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:7315](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7315)

Internal Server Error

***

### 503

> **503**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:7319](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7319)

Replay capacity saturated; retry
