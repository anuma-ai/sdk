# DeleteApiV1AccountErrors

> **DeleteApiV1AccountErrors** = `object`

Defined in: [src/client/types.gen.ts:4253](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4253)

## Properties

### 401

> **401**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:4257](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4257)

Unauthorized

***

### 403

> **403**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:4261](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4261)

Forbidden — account deletion requires user (JWT) authentication

***

### 404

> **404**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:4265](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4265)

Account not found

***

### 500

> **500**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:4269](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4269)

Internal server error
