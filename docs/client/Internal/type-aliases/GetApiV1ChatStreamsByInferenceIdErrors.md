# GetApiV1ChatStreamsByInferenceIdErrors

> **GetApiV1ChatStreamsByInferenceIdErrors** = `object`

Defined in: [src/client/types.gen.ts:7484](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7484)

## Properties

### 401

> **401**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:7488](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7488)

Missing or invalid bearer token

***

### 410

> **410**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:7492](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7492)

Stream unknown, expired, cancelled, or not owned by the caller

***

### 500

> **500**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:7496](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7496)

Internal Server Error

***

### 503

> **503**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:7500](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7500)

Replay capacity saturated; retry
