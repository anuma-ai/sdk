# PostApiV1UtilityResponsesErrors

> **PostApiV1UtilityResponsesErrors** = `object`

Defined in: [src/client/types.gen.ts:11357](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#11357)

## Properties

### 400

> **400**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:11361](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#11361)

Bad Request

***

### 402

> **402**: [`ResponseInsufficientBalanceResponse`](ResponseInsufficientBalanceResponse.md)

Defined in: [src/client/types.gen.ts:11365](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#11365)

Insufficient balance or spending cap exceeded

***

### 403

> **403**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:11369](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#11369)

Model not available on current subscription tier

***

### 413

> **413**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:11373](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#11373)

Input exceeds model context window

***

### 429

> **429**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:11377](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#11377)

Model provider rate limit exceeded

***

### 500

> **500**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:11381](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#11381)

Internal Server Error
