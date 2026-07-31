# PostApiV1ResponsesErrors

> **PostApiV1ResponsesErrors** = `object`

Defined in: [src/client/types.gen.ts:9144](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9144)

## Properties

### 400

> **400**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:9148](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9148)

Bad Request

***

### 402

> **402**: [`ResponseInsufficientBalanceResponse`](ResponseInsufficientBalanceResponse.md)

Defined in: [src/client/types.gen.ts:9152](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9152)

Insufficient balance or spending cap exceeded

***

### 403

> **403**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:9156](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9156)

Model not available on current subscription tier

***

### 413

> **413**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:9160](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9160)

Input exceeds model context window

***

### 429

> **429**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:9164](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9164)

Model provider rate limit exceeded

***

### 500

> **500**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:9168](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9168)

Internal Server Error
