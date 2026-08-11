# GetApiV1ChatStreamsByInferenceIdErrors

> **GetApiV1ChatStreamsByInferenceIdErrors** = `object`

Defined in: [src/client/types.gen.ts:7563](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7563)

## Properties

### 401

> **401**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:7567](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7567)

Missing or invalid bearer token

***

### 410

> **410**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:7571](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7571)

Stream unknown, expired, cancelled, or not owned by the caller

***

### 500

> **500**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:7575](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7575)

Internal Server Error

***

### 503

> **503**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:7579](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7579)

Replay capacity saturated; retry
