# PostApiV1ResponsesErrors

> **PostApiV1ResponsesErrors** = `object`

Defined in: [src/client/types.gen.ts:9049](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9049)

## Properties

### 400

> **400**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:9053](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9053)

Bad Request

***

### 402

> **402**: [`ResponseInsufficientBalanceResponse`](ResponseInsufficientBalanceResponse.md)

Defined in: [src/client/types.gen.ts:9057](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9057)

Insufficient balance or spending cap exceeded

***

### 403

> **403**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:9061](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9061)

Model not available on current subscription tier

***

### 413

> **413**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:9065](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9065)

Input exceeds model context window

***

### 429

> **429**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:9069](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9069)

Model provider rate limit exceeded

***

### 500

> **500**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:9073](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9073)

Internal Server Error
