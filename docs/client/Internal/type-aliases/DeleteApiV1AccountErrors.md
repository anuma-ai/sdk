# DeleteApiV1AccountErrors

> **DeleteApiV1AccountErrors** = `object`

Defined in: [src/client/types.gen.ts:4303](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4303)

## Properties

### 401

> **401**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:4307](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4307)

Unauthorized

***

### 403

> **403**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:4311](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4311)

Forbidden — account deletion requires user (JWT) authentication

***

### 404

> **404**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:4315](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4315)

Account not found

***

### 500

> **500**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:4319](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4319)

Internal server error
