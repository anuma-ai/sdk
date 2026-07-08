# DeleteApiV1AccountErrors

> **DeleteApiV1AccountErrors** = `object`

Defined in: [src/client/types.gen.ts:4224](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4224)

## Properties

### 401

> **401**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:4228](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4228)

Unauthorized

***

### 403

> **403**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:4232](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4232)

Forbidden — account deletion requires user (JWT) authentication

***

### 404

> **404**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:4236](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4236)

Account not found

***

### 500

> **500**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:4240](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4240)

Internal server error
