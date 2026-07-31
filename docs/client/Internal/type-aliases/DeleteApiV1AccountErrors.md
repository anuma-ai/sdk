# DeleteApiV1AccountErrors

> **DeleteApiV1AccountErrors** = `object`

Defined in: [src/client/types.gen.ts:4510](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4510)

## Properties

### 401

> **401**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:4514](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4514)

Unauthorized

***

### 403

> **403**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:4518](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4518)

Forbidden — account deletion requires user (JWT) authentication

***

### 404

> **404**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:4522](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4522)

Account not found

***

### 500

> **500**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:4526](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4526)

Internal server error
