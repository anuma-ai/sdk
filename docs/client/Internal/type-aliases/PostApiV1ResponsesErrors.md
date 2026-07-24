# PostApiV1ResponsesErrors

> **PostApiV1ResponsesErrors** = `object`

Defined in: [src/client/types.gen.ts:9047](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9047)

## Properties

### 400

> **400**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:9051](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9051)

Bad Request

***

### 402

> **402**: [`ResponseInsufficientBalanceResponse`](ResponseInsufficientBalanceResponse.md)

Defined in: [src/client/types.gen.ts:9055](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9055)

Insufficient balance or spending cap exceeded

***

### 403

> **403**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:9059](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9059)

Model not available on current subscription tier

***

### 413

> **413**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:9063](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9063)

Input exceeds model context window

***

### 429

> **429**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:9067](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9067)

Model provider rate limit exceeded

***

### 500

> **500**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:9071](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9071)

Internal Server Error
