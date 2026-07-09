# GetApiV1ChatStreamsByInferenceIdErrors

> **GetApiV1ChatStreamsByInferenceIdErrors** = `object`

Defined in: [src/client/types.gen.ts:6529](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#6529)

## Properties

### 401

> **401**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:6533](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#6533)

Missing or invalid bearer token

***

### 410

> **410**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:6537](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#6537)

Stream unknown, expired, cancelled, or not owned by the caller

***

### 500

> **500**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:6541](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#6541)

Internal Server Error

***

### 503

> **503**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:6545](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#6545)

Replay capacity saturated; retry
