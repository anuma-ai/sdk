# PostApiV1ChatCompletionsErrors

> **PostApiV1ChatCompletionsErrors** = `object`

Defined in: [src/client/types.gen.ts:7248](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7248)

## Properties

### 400

> **400**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:7252](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7252)

Bad Request

***

### 402

> **402**: [`ResponseInsufficientBalanceResponse`](ResponseInsufficientBalanceResponse.md)

Defined in: [src/client/types.gen.ts:7256](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7256)

Insufficient balance or spending cap exceeded

***

### 403

> **403**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:7260](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7260)

Model not available on current subscription tier

***

### 413

> **413**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:7264](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7264)

Input exceeds model context window

***

### 429

> **429**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:7268](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7268)

Model provider rate limit exceeded

***

### 500

> **500**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:7272](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7272)

Internal Server Error
