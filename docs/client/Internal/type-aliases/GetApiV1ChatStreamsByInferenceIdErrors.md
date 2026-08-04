# GetApiV1ChatStreamsByInferenceIdErrors

> **GetApiV1ChatStreamsByInferenceIdErrors** = `object`

Defined in: [src/client/types.gen.ts:6852](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#6852)

## Properties

### 401

> **401**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:6856](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#6856)

Missing or invalid bearer token

***

### 410

> **410**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:6860](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#6860)

Stream unknown, expired, cancelled, or not owned by the caller

***

### 500

> **500**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:6864](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#6864)

Internal Server Error

***

### 503

> **503**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:6868](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#6868)

Replay capacity saturated; retry
