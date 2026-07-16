# DeleteApiV1AccountErrors

> **DeleteApiV1AccountErrors** = `object`

Defined in: [src/client/types.gen.ts:4290](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4290)

## Properties

### 401

> **401**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:4294](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4294)

Unauthorized

***

### 403

> **403**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:4298](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4298)

Forbidden — account deletion requires user (JWT) authentication

***

### 404

> **404**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:4302](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4302)

Account not found

***

### 500

> **500**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:4306](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4306)

Internal server error
