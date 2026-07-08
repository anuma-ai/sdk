# GetApiV1ChatStreamsByInferenceIdErrors

> **GetApiV1ChatStreamsByInferenceIdErrors** = `object`

Defined in: [src/client/types.gen.ts:6500](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#6500)

## Properties

### 401

> **401**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:6504](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#6504)

Missing or invalid bearer token

***

### 410

> **410**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:6508](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#6508)

Stream unknown, expired, cancelled, or not owned by the caller

***

### 500

> **500**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:6512](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#6512)

Internal Server Error

***

### 503

> **503**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:6516](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#6516)

Replay capacity saturated; retry
