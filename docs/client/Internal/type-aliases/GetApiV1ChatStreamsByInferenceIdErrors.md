# GetApiV1ChatStreamsByInferenceIdErrors

> **GetApiV1ChatStreamsByInferenceIdErrors** = `object`

Defined in: [src/client/types.gen.ts:6783](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#6783)

## Properties

### 401

> **401**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:6787](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#6787)

Missing or invalid bearer token

***

### 410

> **410**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:6791](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#6791)

Stream unknown, expired, cancelled, or not owned by the caller

***

### 500

> **500**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:6795](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#6795)

Internal Server Error

***

### 503

> **503**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:6799](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#6799)

Replay capacity saturated; retry
