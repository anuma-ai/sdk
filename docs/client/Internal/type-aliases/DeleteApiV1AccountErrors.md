# DeleteApiV1AccountErrors

> **DeleteApiV1AccountErrors** = `object`

Defined in: [src/client/types.gen.ts:4334](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4334)

## Properties

### 401

> **401**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:4338](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4338)

Unauthorized

***

### 403

> **403**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:4342](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4342)

Forbidden — account deletion requires user (JWT) authentication

***

### 404

> **404**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:4346](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4346)

Account not found

***

### 500

> **500**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:4350](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4350)

Internal server error
