# GetApiV1ChatStreamsByInferenceIdErrors

> **GetApiV1ChatStreamsByInferenceIdErrors** = `object`

Defined in: [src/client/types.gen.ts:8441](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8441)

## Properties

### 401

> **401**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:8445](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8445)

Missing or invalid bearer token

***

### 410

> **410**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:8449](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8449)

Stream unknown, expired, cancelled, or not owned by the caller

***

### 500

> **500**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:8453](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8453)

Internal Server Error

***

### 503

> **503**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:8457](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8457)

Replay capacity saturated; retry
