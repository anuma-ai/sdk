# PostApiV1ResponsesErrors

> **PostApiV1ResponsesErrors** = `object`

Defined in: [src/client/types.gen.ts:9006](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9006)

## Properties

### 400

> **400**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:9010](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9010)

Bad Request

***

### 402

> **402**: [`ResponseInsufficientBalanceResponse`](ResponseInsufficientBalanceResponse.md)

Defined in: [src/client/types.gen.ts:9014](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9014)

Insufficient balance or spending cap exceeded

***

### 403

> **403**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:9018](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9018)

Model not available on current subscription tier

***

### 413

> **413**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:9022](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9022)

Input exceeds model context window

***

### 429

> **429**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:9026](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9026)

Model provider rate limit exceeded

***

### 500

> **500**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:9030](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9030)

Internal Server Error
