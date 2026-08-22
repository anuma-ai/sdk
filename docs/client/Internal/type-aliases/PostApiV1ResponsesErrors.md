# PostApiV1ResponsesErrors

> **PostApiV1ResponsesErrors** = `object`

Defined in: [src/client/types.gen.ts:10206](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10206)

## Properties

### 400

> **400**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:10210](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10210)

Bad Request

***

### 402

> **402**: [`ResponseInsufficientBalanceResponse`](ResponseInsufficientBalanceResponse.md)

Defined in: [src/client/types.gen.ts:10214](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10214)

Insufficient balance or spending cap exceeded

***

### 403

> **403**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:10218](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10218)

Model not available on current subscription tier

***

### 413

> **413**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:10222](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10222)

Input exceeds model context window

***

### 429

> **429**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:10226](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10226)

Model provider rate limit exceeded

***

### 500

> **500**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:10230](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10230)

Internal Server Error
