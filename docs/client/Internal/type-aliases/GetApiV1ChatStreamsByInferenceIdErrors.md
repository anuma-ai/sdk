# GetApiV1ChatStreamsByInferenceIdErrors

> **GetApiV1ChatStreamsByInferenceIdErrors** = `object`

Defined in: [src/client/types.gen.ts:7716](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7716)

## Properties

### 401

> **401**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:7720](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7720)

Missing or invalid bearer token

***

### 410

> **410**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:7724](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7724)

Stream unknown, expired, cancelled, or not owned by the caller

***

### 500

> **500**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:7728](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7728)

Internal Server Error

***

### 503

> **503**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:7732](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7732)

Replay capacity saturated; retry
