# PostApiV1ResponsesErrors

> **PostApiV1ResponsesErrors** = `object`

Defined in: [src/client/types.gen.ts:8358](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8358)

## Properties

### 400

> **400**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:8362](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8362)

Bad Request

***

### 402

> **402**: [`ResponseInsufficientBalanceResponse`](ResponseInsufficientBalanceResponse.md)

Defined in: [src/client/types.gen.ts:8366](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8366)

Insufficient balance or spending cap exceeded

***

### 403

> **403**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:8370](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8370)

Model not available on current subscription tier

***

### 413

> **413**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:8374](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8374)

Input exceeds model context window

***

### 429

> **429**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:8378](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8378)

Model provider rate limit exceeded

***

### 500

> **500**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:8382](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8382)

Internal Server Error
