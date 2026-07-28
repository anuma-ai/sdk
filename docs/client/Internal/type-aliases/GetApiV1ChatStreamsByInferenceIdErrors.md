# GetApiV1ChatStreamsByInferenceIdErrors

> **GetApiV1ChatStreamsByInferenceIdErrors** = `object`

Defined in: [src/client/types.gen.ts:6830](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#6830)

## Properties

### 401

> **401**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:6834](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#6834)

Missing or invalid bearer token

***

### 410

> **410**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:6838](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#6838)

Stream unknown, expired, cancelled, or not owned by the caller

***

### 500

> **500**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:6842](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#6842)

Internal Server Error

***

### 503

> **503**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:6846](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#6846)

Replay capacity saturated; retry
