# PostApiV1UtilityResponsesErrors

> **PostApiV1UtilityResponsesErrors** = `object`

Defined in: [src/client/types.gen.ts:10200](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10200)

## Properties

### 400

> **400**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:10204](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10204)

Bad Request

***

### 402

> **402**: [`ResponseInsufficientBalanceResponse`](ResponseInsufficientBalanceResponse.md)

Defined in: [src/client/types.gen.ts:10208](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10208)

Insufficient balance or spending cap exceeded

***

### 403

> **403**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:10212](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10212)

Model not available on current subscription tier

***

### 413

> **413**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:10216](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10216)

Input exceeds model context window

***

### 429

> **429**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:10220](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10220)

Model provider rate limit exceeded

***

### 500

> **500**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:10224](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10224)

Internal Server Error
