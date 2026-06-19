# PostApiV1ResponsesErrors

> **PostApiV1ResponsesErrors** = `object`

Defined in: [src/client/types.gen.ts:8418](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8418)

## Properties

### 400

> **400**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:8422](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8422)

Bad Request

***

### 402

> **402**: [`ResponseInsufficientBalanceResponse`](ResponseInsufficientBalanceResponse.md)

Defined in: [src/client/types.gen.ts:8426](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8426)

Insufficient balance or spending cap exceeded

***

### 403

> **403**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:8430](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8430)

Model not available on current subscription tier

***

### 413

> **413**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:8434](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8434)

Input exceeds model context window

***

### 429

> **429**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:8438](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8438)

Model provider rate limit exceeded

***

### 500

> **500**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:8442](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8442)

Internal Server Error
