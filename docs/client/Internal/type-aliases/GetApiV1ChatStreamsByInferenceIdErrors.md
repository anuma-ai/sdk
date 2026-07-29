# GetApiV1ChatStreamsByInferenceIdErrors

> **GetApiV1ChatStreamsByInferenceIdErrors** = `object`

Defined in: [src/client/types.gen.ts:6864](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#6864)

## Properties

### 401

> **401**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:6868](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#6868)

Missing or invalid bearer token

***

### 410

> **410**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:6872](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#6872)

Stream unknown, expired, cancelled, or not owned by the caller

***

### 500

> **500**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:6876](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#6876)

Internal Server Error

***

### 503

> **503**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:6880](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#6880)

Replay capacity saturated; retry
