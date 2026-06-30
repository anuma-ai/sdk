# PostApiV1ResponsesErrors

> **PostApiV1ResponsesErrors** = `object`

Defined in: [src/client/types.gen.ts:8639](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8639)

## Properties

### 400

> **400**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:8643](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8643)

Bad Request

***

### 402

> **402**: [`ResponseInsufficientBalanceResponse`](ResponseInsufficientBalanceResponse.md)

Defined in: [src/client/types.gen.ts:8647](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8647)

Insufficient balance or spending cap exceeded

***

### 403

> **403**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:8651](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8651)

Model not available on current subscription tier

***

### 413

> **413**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:8655](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8655)

Input exceeds model context window

***

### 429

> **429**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:8659](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8659)

Model provider rate limit exceeded

***

### 500

> **500**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:8663](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8663)

Internal Server Error
