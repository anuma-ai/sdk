# PostApiV1UtilityChatCompletionsErrors

> **PostApiV1UtilityChatCompletionsErrors** = `object`

Defined in: [src/client/types.gen.ts:11806](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#11806)

## Properties

### 400

> **400**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:11810](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#11810)

Bad Request

***

### 402

> **402**: [`ResponseInsufficientBalanceResponse`](ResponseInsufficientBalanceResponse.md)

Defined in: [src/client/types.gen.ts:11814](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#11814)

Insufficient balance or spending cap exceeded

***

### 403

> **403**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:11818](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#11818)

Model not available on current subscription tier

***

### 413

> **413**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:11822](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#11822)

Input exceeds model context window

***

### 429

> **429**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:11826](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#11826)

Model provider rate limit exceeded

***

### 499

> **499**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:11830](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#11830)

Client closed the request before a response was produced

***

### 500

> **500**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:11834](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#11834)

Internal Server Error
