# GetApiV1ChatStreamsByInferenceIdErrors

> **GetApiV1ChatStreamsByInferenceIdErrors** = `object`

Defined in: [src/client/types.gen.ts:6325](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#6325)

## Properties

### 401

> **401**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:6329](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#6329)

Missing or invalid bearer token

***

### 410

> **410**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:6333](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#6333)

Stream unknown, expired, cancelled, or not owned by the caller

***

### 500

> **500**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:6337](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#6337)

Internal Server Error

***

### 503

> **503**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:6341](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#6341)

Replay capacity saturated; retry
