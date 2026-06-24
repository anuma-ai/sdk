# PostApiV1ResponsesErrors

> **PostApiV1ResponsesErrors** = `object`

Defined in: [src/client/types.gen.ts:8433](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8433)

## Properties

### 400

> **400**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:8437](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8437)

Bad Request

***

### 402

> **402**: [`ResponseInsufficientBalanceResponse`](ResponseInsufficientBalanceResponse.md)

Defined in: [src/client/types.gen.ts:8441](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8441)

Insufficient balance or spending cap exceeded

***

### 403

> **403**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:8445](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8445)

Model not available on current subscription tier

***

### 413

> **413**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:8449](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8449)

Input exceeds model context window

***

### 429

> **429**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:8453](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8453)

Model provider rate limit exceeded

***

### 500

> **500**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:8457](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8457)

Internal Server Error
