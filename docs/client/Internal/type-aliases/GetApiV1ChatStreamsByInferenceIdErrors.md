# GetApiV1ChatStreamsByInferenceIdErrors

> **GetApiV1ChatStreamsByInferenceIdErrors** = `object`

Defined in: [src/client/types.gen.ts:7314](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7314)

## Properties

### 401

> **401**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:7318](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7318)

Missing or invalid bearer token

***

### 410

> **410**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:7322](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7322)

Stream unknown, expired, cancelled, or not owned by the caller

***

### 500

> **500**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:7326](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7326)

Internal Server Error

***

### 503

> **503**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:7330](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7330)

Replay capacity saturated; retry
