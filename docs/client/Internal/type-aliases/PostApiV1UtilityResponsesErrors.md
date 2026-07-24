# PostApiV1UtilityResponsesErrors

> **PostApiV1UtilityResponsesErrors** = `object`

Defined in: [src/client/types.gen.ts:10198](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10198)

## Properties

### 400

> **400**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:10202](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10202)

Bad Request

***

### 402

> **402**: [`ResponseInsufficientBalanceResponse`](ResponseInsufficientBalanceResponse.md)

Defined in: [src/client/types.gen.ts:10206](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10206)

Insufficient balance or spending cap exceeded

***

### 403

> **403**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:10210](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10210)

Model not available on current subscription tier

***

### 413

> **413**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:10214](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10214)

Input exceeds model context window

***

### 429

> **429**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:10218](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10218)

Model provider rate limit exceeded

***

### 500

> **500**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:10222](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10222)

Internal Server Error
