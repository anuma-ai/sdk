# DeleteApiV1AccountErrors

> **DeleteApiV1AccountErrors** = `object`

Defined in: [src/client/types.gen.ts:4356](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4356)

## Properties

### 401

> **401**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:4360](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4360)

Unauthorized

***

### 403

> **403**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:4364](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4364)

Forbidden — account deletion requires user (JWT) authentication

***

### 404

> **404**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:4368](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4368)

Account not found

***

### 500

> **500**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:4372](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4372)

Internal server error
