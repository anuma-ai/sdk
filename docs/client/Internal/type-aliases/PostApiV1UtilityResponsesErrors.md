# PostApiV1UtilityResponsesErrors

> **PostApiV1UtilityResponsesErrors** = `object`

Defined in: [src/client/types.gen.ts:10295](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10295)

## Properties

### 400

> **400**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:10299](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10299)

Bad Request

***

### 402

> **402**: [`ResponseInsufficientBalanceResponse`](ResponseInsufficientBalanceResponse.md)

Defined in: [src/client/types.gen.ts:10303](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10303)

Insufficient balance or spending cap exceeded

***

### 403

> **403**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:10307](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10307)

Model not available on current subscription tier

***

### 413

> **413**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:10311](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10311)

Input exceeds model context window

***

### 429

> **429**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:10315](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10315)

Model provider rate limit exceeded

***

### 500

> **500**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:10319](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10319)

Internal Server Error
