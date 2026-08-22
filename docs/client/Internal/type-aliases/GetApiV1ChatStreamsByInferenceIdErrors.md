# GetApiV1ChatStreamsByInferenceIdErrors

> **GetApiV1ChatStreamsByInferenceIdErrors** = `object`

Defined in: [src/client/types.gen.ts:7946](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7946)

## Properties

### 401

> **401**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:7950](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7950)

Missing or invalid bearer token

***

### 410

> **410**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:7954](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7954)

Stream unknown, expired, cancelled, or not owned by the caller

***

### 500

> **500**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:7958](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7958)

Internal Server Error

***

### 503

> **503**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:7962](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7962)

Replay capacity saturated; retry
