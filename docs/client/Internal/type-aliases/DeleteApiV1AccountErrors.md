# DeleteApiV1AccountErrors

> **DeleteApiV1AccountErrors** = `object`

Defined in: [src/client/types.gen.ts:4877](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4877)

## Properties

### 401

> **401**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:4881](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4881)

Unauthorized

***

### 403

> **403**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:4885](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4885)

Forbidden — account deletion requires user (JWT) authentication

***

### 404

> **404**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:4889](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4889)

Account not found

***

### 500

> **500**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:4893](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4893)

Internal server error
