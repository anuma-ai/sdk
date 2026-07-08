# PostApiV1ChatCompletionsErrors

> **PostApiV1ChatCompletionsErrors** = `object`

Defined in: [src/client/types.gen.ts:6445](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#6445)

## Properties

### 400

> **400**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:6449](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#6449)

Bad Request

***

### 402

> **402**: [`ResponseInsufficientBalanceResponse`](ResponseInsufficientBalanceResponse.md)

Defined in: [src/client/types.gen.ts:6453](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#6453)

Insufficient balance or spending cap exceeded

***

### 403

> **403**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:6457](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#6457)

Model not available on current subscription tier

***

### 413

> **413**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:6461](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#6461)

Input exceeds model context window

***

### 429

> **429**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:6465](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#6465)

Model provider rate limit exceeded

***

### 500

> **500**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:6469](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#6469)

Internal Server Error
