# PostApiV1ChatCompletionsErrors

> **PostApiV1ChatCompletionsErrors** = `object`

Defined in: [src/client/types.gen.ts:7259](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7259)

## Properties

### 400

> **400**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:7263](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7263)

Bad Request

***

### 402

> **402**: [`ResponseInsufficientBalanceResponse`](ResponseInsufficientBalanceResponse.md)

Defined in: [src/client/types.gen.ts:7267](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7267)

Insufficient balance or spending cap exceeded

***

### 403

> **403**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:7271](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7271)

Model not available on current subscription tier

***

### 413

> **413**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:7275](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7275)

Input exceeds model context window

***

### 429

> **429**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:7279](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7279)

Model provider rate limit exceeded

***

### 500

> **500**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:7283](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7283)

Internal Server Error
