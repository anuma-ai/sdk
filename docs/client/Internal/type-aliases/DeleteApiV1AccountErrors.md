# DeleteApiV1AccountErrors

> **DeleteApiV1AccountErrors** = `object`

Defined in: [src/client/types.gen.ts:4691](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4691)

## Properties

### 401

> **401**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:4695](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4695)

Unauthorized

***

### 403

> **403**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:4699](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4699)

Forbidden — account deletion requires user (JWT) authentication

***

### 404

> **404**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:4703](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4703)

Account not found

***

### 500

> **500**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:4707](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4707)

Internal server error
