# DeleteApiV1AccountErrors

> **DeleteApiV1AccountErrors** = `object`

Defined in: [src/client/types.gen.ts:4724](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4724)

## Properties

### 401

> **401**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:4728](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4728)

Unauthorized

***

### 403

> **403**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:4732](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4732)

Forbidden — account deletion requires user (JWT) authentication

***

### 404

> **404**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:4736](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4736)

Account not found

***

### 500

> **500**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:4740](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4740)

Internal server error
