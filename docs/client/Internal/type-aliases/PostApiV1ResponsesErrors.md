# PostApiV1ResponsesErrors

> **PostApiV1ResponsesErrors** = `object`

Defined in: [src/client/types.gen.ts:8942](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8942)

## Properties

### 400

> **400**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:8946](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8946)

Bad Request

***

### 402

> **402**: [`ResponseInsufficientBalanceResponse`](ResponseInsufficientBalanceResponse.md)

Defined in: [src/client/types.gen.ts:8950](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8950)

Insufficient balance or spending cap exceeded

***

### 403

> **403**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:8954](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8954)

Model not available on current subscription tier

***

### 413

> **413**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:8958](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8958)

Input exceeds model context window

***

### 429

> **429**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:8962](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8962)

Model provider rate limit exceeded

***

### 500

> **500**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:8966](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8966)

Internal Server Error
