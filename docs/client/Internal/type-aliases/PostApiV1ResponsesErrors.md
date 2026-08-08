# PostApiV1ResponsesErrors

> **PostApiV1ResponsesErrors** = `object`

Defined in: [src/client/types.gen.ts:9776](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9776)

## Properties

### 400

> **400**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:9780](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9780)

Bad Request

***

### 402

> **402**: [`ResponseInsufficientBalanceResponse`](ResponseInsufficientBalanceResponse.md)

Defined in: [src/client/types.gen.ts:9784](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9784)

Insufficient balance or spending cap exceeded

***

### 403

> **403**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:9788](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9788)

Model not available on current subscription tier

***

### 413

> **413**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:9792](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9792)

Input exceeds model context window

***

### 429

> **429**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:9796](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9796)

Model provider rate limit exceeded

***

### 500

> **500**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:9800](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9800)

Internal Server Error
