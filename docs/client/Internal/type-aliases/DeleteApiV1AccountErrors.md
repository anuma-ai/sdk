# DeleteApiV1AccountErrors

> **DeleteApiV1AccountErrors** = `object`

Defined in: [src/client/types.gen.ts:4364](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4364)

## Properties

### 401

> **401**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:4368](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4368)

Unauthorized

***

### 403

> **403**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:4372](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4372)

Forbidden — account deletion requires user (JWT) authentication

***

### 404

> **404**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:4376](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4376)

Account not found

***

### 500

> **500**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:4380](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4380)

Internal server error
