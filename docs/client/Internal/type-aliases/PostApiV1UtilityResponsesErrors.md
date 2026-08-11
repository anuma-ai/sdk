# PostApiV1UtilityResponsesErrors

> **PostApiV1UtilityResponsesErrors** = `object`

Defined in: [src/client/types.gen.ts:11006](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#11006)

## Properties

### 400

> **400**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:11010](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#11010)

Bad Request

***

### 402

> **402**: [`ResponseInsufficientBalanceResponse`](ResponseInsufficientBalanceResponse.md)

Defined in: [src/client/types.gen.ts:11014](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#11014)

Insufficient balance or spending cap exceeded

***

### 403

> **403**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:11018](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#11018)

Model not available on current subscription tier

***

### 413

> **413**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:11022](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#11022)

Input exceeds model context window

***

### 429

> **429**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:11026](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#11026)

Model provider rate limit exceeded

***

### 500

> **500**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:11030](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#11030)

Internal Server Error
