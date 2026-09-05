# PostApiV1ChatCompletionsErrors

> **PostApiV1ChatCompletionsErrors** = `object`

Defined in: [src/client/types.gen.ts:8382](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8382)

## Properties

### 400

> **400**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:8386](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8386)

Bad Request

***

### 402

> **402**: [`ResponseInsufficientBalanceResponse`](ResponseInsufficientBalanceResponse.md)

Defined in: [src/client/types.gen.ts:8390](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8390)

Insufficient balance or spending cap exceeded

***

### 403

> **403**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:8394](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8394)

Model not available on current subscription tier

***

### 413

> **413**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:8398](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8398)

Input exceeds model context window

***

### 429

> **429**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:8402](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8402)

Model provider rate limit exceeded

***

### 499

> **499**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:8406](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8406)

Client closed the request before a response was produced

***

### 500

> **500**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:8410](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8410)

Internal Server Error
