# GetApiV1ChatStreamsByInferenceIdErrors

> **GetApiV1ChatStreamsByInferenceIdErrors** = `object`

Defined in: [src/client/types.gen.ts:6778](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#6778)

## Properties

### 401

> **401**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:6782](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#6782)

Missing or invalid bearer token

***

### 410

> **410**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:6786](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#6786)

Stream unknown, expired, cancelled, or not owned by the caller

***

### 500

> **500**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:6790](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#6790)

Internal Server Error

***

### 503

> **503**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:6794](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#6794)

Replay capacity saturated; retry
