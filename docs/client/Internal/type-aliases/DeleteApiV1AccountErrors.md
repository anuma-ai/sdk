# DeleteApiV1AccountErrors

> **DeleteApiV1AccountErrors** = `object`

Defined in: [src/client/types.gen.ts:4308](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4308)

## Properties

### 401

> **401**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:4312](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4312)

Unauthorized

***

### 403

> **403**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:4316](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4316)

Forbidden — account deletion requires user (JWT) authentication

***

### 404

> **404**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:4320](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4320)

Account not found

***

### 500

> **500**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:4324](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4324)

Internal server error
