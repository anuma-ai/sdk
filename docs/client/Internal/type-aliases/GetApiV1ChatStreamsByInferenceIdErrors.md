# GetApiV1ChatStreamsByInferenceIdErrors

> **GetApiV1ChatStreamsByInferenceIdErrors** = `object`

Defined in: [src/client/types.gen.ts:6824](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#6824)

## Properties

### 401

> **401**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:6828](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#6828)

Missing or invalid bearer token

***

### 410

> **410**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:6832](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#6832)

Stream unknown, expired, cancelled, or not owned by the caller

***

### 500

> **500**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:6836](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#6836)

Internal Server Error

***

### 503

> **503**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:6840](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#6840)

Replay capacity saturated; retry
