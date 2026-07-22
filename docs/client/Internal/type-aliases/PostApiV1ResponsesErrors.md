# PostApiV1ResponsesErrors

> **PostApiV1ResponsesErrors** = `object`

Defined in: [src/client/types.gen.ts:9011](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9011)

## Properties

### 400

> **400**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:9015](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9015)

Bad Request

***

### 402

> **402**: [`ResponseInsufficientBalanceResponse`](ResponseInsufficientBalanceResponse.md)

Defined in: [src/client/types.gen.ts:9019](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9019)

Insufficient balance or spending cap exceeded

***

### 403

> **403**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:9023](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9023)

Model not available on current subscription tier

***

### 413

> **413**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:9027](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9027)

Input exceeds model context window

***

### 429

> **429**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:9031](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9031)

Model provider rate limit exceeded

***

### 500

> **500**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:9035](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9035)

Internal Server Error
