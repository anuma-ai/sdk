# PostApiV1ResponsesErrors

> **PostApiV1ResponsesErrors** = `object`

Defined in: [src/client/types.gen.ts:9001](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9001)

## Properties

### 400

> **400**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:9005](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9005)

Bad Request

***

### 402

> **402**: [`ResponseInsufficientBalanceResponse`](ResponseInsufficientBalanceResponse.md)

Defined in: [src/client/types.gen.ts:9009](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9009)

Insufficient balance or spending cap exceeded

***

### 403

> **403**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:9013](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9013)

Model not available on current subscription tier

***

### 413

> **413**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:9017](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9017)

Input exceeds model context window

***

### 429

> **429**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:9021](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9021)

Model provider rate limit exceeded

***

### 500

> **500**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:9025](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9025)

Internal Server Error
