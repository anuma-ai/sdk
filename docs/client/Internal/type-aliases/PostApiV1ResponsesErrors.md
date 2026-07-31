# PostApiV1ResponsesErrors

> **PostApiV1ResponsesErrors** = `object`

Defined in: [src/client/types.gen.ts:9595](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9595)

## Properties

### 400

> **400**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:9599](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9599)

Bad Request

***

### 402

> **402**: [`ResponseInsufficientBalanceResponse`](ResponseInsufficientBalanceResponse.md)

Defined in: [src/client/types.gen.ts:9603](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9603)

Insufficient balance or spending cap exceeded

***

### 403

> **403**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:9607](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9607)

Model not available on current subscription tier

***

### 413

> **413**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:9611](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9611)

Input exceeds model context window

***

### 429

> **429**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:9615](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9615)

Model provider rate limit exceeded

***

### 500

> **500**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:9619](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9619)

Internal Server Error
