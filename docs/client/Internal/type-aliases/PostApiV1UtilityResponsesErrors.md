# PostApiV1UtilityResponsesErrors

> **PostApiV1UtilityResponsesErrors** = `object`

Defined in: [src/client/types.gen.ts:11159](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#11159)

## Properties

### 400

> **400**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:11163](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#11163)

Bad Request

***

### 402

> **402**: [`ResponseInsufficientBalanceResponse`](ResponseInsufficientBalanceResponse.md)

Defined in: [src/client/types.gen.ts:11167](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#11167)

Insufficient balance or spending cap exceeded

***

### 403

> **403**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:11171](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#11171)

Model not available on current subscription tier

***

### 413

> **413**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:11175](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#11175)

Input exceeds model context window

***

### 429

> **429**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:11179](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#11179)

Model provider rate limit exceeded

***

### 500

> **500**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:11183](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#11183)

Internal Server Error
