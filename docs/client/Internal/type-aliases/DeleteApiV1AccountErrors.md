# DeleteApiV1AccountErrors

> **DeleteApiV1AccountErrors** = `object`

Defined in: [src/client/types.gen.ts:4328](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4328)

## Properties

### 401

> **401**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:4332](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4332)

Unauthorized

***

### 403

> **403**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:4336](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4336)

Forbidden — account deletion requires user (JWT) authentication

***

### 404

> **404**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:4340](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4340)

Account not found

***

### 500

> **500**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:4344](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4344)

Internal server error
