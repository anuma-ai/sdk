# DeleteApiV1AccountErrors

> **DeleteApiV1AccountErrors** = `object`

Defined in: [src/client/types.gen.ts:4521](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4521)

## Properties

### 401

> **401**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:4525](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4525)

Unauthorized

***

### 403

> **403**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:4529](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4529)

Forbidden — account deletion requires user (JWT) authentication

***

### 404

> **404**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:4533](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4533)

Account not found

***

### 500

> **500**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:4537](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4537)

Internal server error
