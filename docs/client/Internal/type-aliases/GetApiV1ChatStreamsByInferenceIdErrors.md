# GetApiV1ChatStreamsByInferenceIdErrors

> **GetApiV1ChatStreamsByInferenceIdErrors** = `object`

Defined in: [src/client/types.gen.ts:6250](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#6250)

## Properties

### 401

> **401**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:6254](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#6254)

Missing or invalid bearer token

***

### 410

> **410**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:6258](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#6258)

Stream unknown, expired, cancelled, or not owned by the caller

***

### 500

> **500**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:6262](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#6262)

Internal Server Error

***

### 503

> **503**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:6266](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#6266)

Replay capacity saturated; retry
