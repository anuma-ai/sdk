# GetApiV1ChatStreamsByInferenceIdErrors

> **GetApiV1ChatStreamsByInferenceIdErrors** = `object`

Defined in: [src/client/types.gen.ts:6788](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#6788)

## Properties

### 401

> **401**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:6792](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#6792)

Missing or invalid bearer token

***

### 410

> **410**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:6796](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#6796)

Stream unknown, expired, cancelled, or not owned by the caller

***

### 500

> **500**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:6800](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#6800)

Internal Server Error

***

### 503

> **503**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:6804](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#6804)

Replay capacity saturated; retry
