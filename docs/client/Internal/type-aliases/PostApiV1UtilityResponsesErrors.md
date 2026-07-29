# PostApiV1UtilityResponsesErrors

> **PostApiV1UtilityResponsesErrors** = `object`

Defined in: [src/client/types.gen.ts:10307](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10307)

## Properties

### 400

> **400**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:10311](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10311)

Bad Request

***

### 402

> **402**: [`ResponseInsufficientBalanceResponse`](ResponseInsufficientBalanceResponse.md)

Defined in: [src/client/types.gen.ts:10315](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10315)

Insufficient balance or spending cap exceeded

***

### 403

> **403**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:10319](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10319)

Model not available on current subscription tier

***

### 413

> **413**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:10323](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10323)

Input exceeds model context window

***

### 429

> **429**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:10327](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10327)

Model provider rate limit exceeded

***

### 500

> **500**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:10331](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10331)

Internal Server Error
