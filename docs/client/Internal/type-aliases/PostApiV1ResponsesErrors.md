# PostApiV1ResponsesErrors

> **PostApiV1ResponsesErrors** = `object`

Defined in: [src/client/types.gen.ts:9606](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9606)

## Properties

### 400

> **400**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:9610](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9610)

Bad Request

***

### 402

> **402**: [`ResponseInsufficientBalanceResponse`](ResponseInsufficientBalanceResponse.md)

Defined in: [src/client/types.gen.ts:9614](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9614)

Insufficient balance or spending cap exceeded

***

### 403

> **403**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:9618](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9618)

Model not available on current subscription tier

***

### 413

> **413**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:9622](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9622)

Input exceeds model context window

***

### 429

> **429**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:9626](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9626)

Model provider rate limit exceeded

***

### 500

> **500**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:9630](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9630)

Internal Server Error
