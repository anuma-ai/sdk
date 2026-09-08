# PostApiV1ResponsesErrors

> **PostApiV1ResponsesErrors** = `object`

Defined in: [src/client/types.gen.ts:10008](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10008)

## Properties

### 400

> **400**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:10012](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10012)

Bad Request

***

### 402

> **402**: [`ResponseInsufficientBalanceResponse`](ResponseInsufficientBalanceResponse.md)

Defined in: [src/client/types.gen.ts:10016](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10016)

Insufficient balance or spending cap exceeded

***

### 403

> **403**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:10020](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10020)

Model not available on current subscription tier

***

### 413

> **413**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:10024](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10024)

Input exceeds model context window

***

### 429

> **429**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:10028](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10028)

Model provider rate limit exceeded

***

### 500

> **500**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:10032](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10032)

Internal Server Error
