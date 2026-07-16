# GetApiV1ChatStreamsByInferenceIdErrors

> **GetApiV1ChatStreamsByInferenceIdErrors** = `object`

Defined in: [src/client/types.gen.ts:6719](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#6719)

## Properties

### 401

> **401**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:6723](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#6723)

Missing or invalid bearer token

***

### 410

> **410**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:6727](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#6727)

Stream unknown, expired, cancelled, or not owned by the caller

***

### 500

> **500**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:6731](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#6731)

Internal Server Error

***

### 503

> **503**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:6735](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#6735)

Replay capacity saturated; retry
