# PostApiV1ResponsesErrors

> **PostApiV1ResponsesErrors** = `object`

Defined in: [src/client/types.gen.ts:9855](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9855)

## Properties

### 400

> **400**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:9859](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9859)

Bad Request

***

### 402

> **402**: [`ResponseInsufficientBalanceResponse`](ResponseInsufficientBalanceResponse.md)

Defined in: [src/client/types.gen.ts:9863](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9863)

Insufficient balance or spending cap exceeded

***

### 403

> **403**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:9867](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9867)

Model not available on current subscription tier

***

### 413

> **413**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:9871](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9871)

Input exceeds model context window

***

### 429

> **429**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:9875](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9875)

Model provider rate limit exceeded

***

### 500

> **500**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:9879](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9879)

Internal Server Error
